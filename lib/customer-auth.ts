import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { useSecureCookies } from "@/lib/cookie-security";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { customer, customerSession, passwordReset } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth";

/**
 * Customer accounts.
 *
 * Reuses the studio's password hashing but keeps a separate session table and
 * cookie: a customer session must never be able to satisfy an admin check, and
 * a single table with a nullable role column is exactly the kind of shortcut
 * that eventually lets it.
 *
 * Accounts are optional throughout. Guest checkout is the primary path — most
 * buyers here purchase once and never return — so a customer row exists whether
 * or not it has a password.
 */

const COOKIE = "customer_session";
const SESSION_DAYS = 30;

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export interface CustomerSession {
  id: string;
  email: string;
  name: string | null;
}

async function startSession(customerId: string) {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  await db
    .insert(customerSession)
    .values({ tokenHash: hashToken(token), customerId, expiresAt });

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: await useSecureCookies(),
    path: "/",
    expires: expiresAt,
  });

  await db.delete(customerSession).where(lt(customerSession.expiresAt, new Date()));
}

export async function getCurrentCustomer(): Promise<CustomerSession | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const db = await getDb();
  const [row] = await db
    .select({ id: customer.id, email: customer.email, name: customer.name })
    .from(customerSession)
    .innerJoin(customer, eq(customer.id, customerSession.customerId))
    .where(
      and(
        eq(customerSession.tokenHash, hashToken(token)),
        gt(customerSession.expiresAt, new Date()),
      ),
    );

  return row ?? null;
}

export async function signOutCustomer() {
  const db = await getDb();
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;

  if (token) {
    await db
      .delete(customerSession)
      .where(eq(customerSession.tokenHash, hashToken(token)));
  }
  jar.delete(COOKIE);
}

export async function signInCustomer(email: string, password: string) {
  const db = await getDb();
  const row = await db.query.customer.findFirst({
    where: (t, { eq: e }) => e(t.email, email.trim().toLowerCase()),
  });

  // Always run the hash, so timing does not reveal which addresses exist.
  const stored =
    row?.passwordHash ??
    "0000000000000000000000000000000000000000000000000000000000000000:0000";
  const ok = await verifyPassword(password, stored);

  if (!row?.passwordHash || !ok) return { ok: false as const };

  await startSession(row.id);
  return { ok: true as const };
}

/**
 * Register. A customer row may already exist from a guest purchase — in that
 * case we attach a password rather than refusing, so someone who bought as a
 * guest can claim their own history.
 */
export async function registerCustomer(
  email: string,
  name: string,
  password: string,
) {
  const db = await getDb();
  const normalised = email.trim().toLowerCase();

  const existing = await db.query.customer.findFirst({
    where: (t, { eq: e }) => e(t.email, normalised),
  });

  if (existing?.passwordHash) return { ok: false as const, reason: "exists" };

  const passwordHash = await hashPassword(password);

  const [row] = await db
    .insert(customer)
    .values({ email: normalised, name, passwordHash, lastSeenAt: new Date() })
    .onConflictDoUpdate({
      target: customer.email,
      set: { name, passwordHash, lastSeenAt: new Date() },
    })
    .returning({ id: customer.id });

  if (!row) return { ok: false as const, reason: "failed" };

  await startSession(row.id);
  return { ok: true as const };
}

/* --------------------------------------------------------------------------
   Password reset
   -------------------------------------------------------------------------- */

const RESET_WINDOW_MINUTES = 60;

/**
 * Issue a reset token, if the address belongs to a real account.
 *
 * Returns nothing either way. The CALLER must respond identically whether or
 * not an account exists — otherwise this endpoint becomes a way to enumerate
 * which of your customers own five-figure jewellery.
 */
export async function requestPasswordReset(
  email: string,
): Promise<{ token: string; name: string | null; email: string } | null> {
  const db = await getDb();
  const row = await db.query.customer.findFirst({
    where: (t, { eq: e }) => e(t.email, email.trim().toLowerCase()),
    columns: { id: true, email: true, name: true, passwordHash: true },
  });

  // No account, or a guest record that never had a password: nothing to reset.
  if (!row?.passwordHash) return null;

  // One live token at a time — an old link in an old inbox should stop working
  // the moment a new one is requested.
  await db
    .update(passwordReset)
    .set({ usedAt: new Date() })
    .where(
      and(eq(passwordReset.customerId, row.id), isNull(passwordReset.usedAt)),
    );

  const token = randomBytes(32).toString("base64url");
  await db.insert(passwordReset).values({
    tokenHash: hashToken(token),
    customerId: row.id,
    expiresAt: new Date(Date.now() + RESET_WINDOW_MINUTES * 60_000),
  });

  return { token, name: row.name, email: row.email };
}

export type ResetResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" | "used" };

/**
 * Consume a reset token and set a new password.
 *
 * Every existing session for that customer is destroyed on success. If the
 * reset was triggered because someone else had access, leaving their session
 * alive would make the whole exercise pointless.
 */
export async function resetPassword(
  token: string,
  password: string,
): Promise<ResetResult> {
  const db = await getDb();

  const row = await db.query.passwordReset.findFirst({
    where: (t, { eq: e }) => e(t.tokenHash, hashToken(token)),
  });

  if (!row) return { ok: false, reason: "invalid" };
  if (row.usedAt) return { ok: false, reason: "used" };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };

  const passwordHash = await hashPassword(password);

  await db.transaction(async (tx) => {
    await tx
      .update(customer)
      .set({ passwordHash })
      .where(eq(customer.id, row.customerId));

    // Single use: mark spent inside the same transaction as the password
    // change, so a replayed link cannot set the password twice.
    await tx
      .update(passwordReset)
      .set({ usedAt: new Date() })
      .where(eq(passwordReset.id, row.id));

    await tx
      .delete(customerSession)
      .where(eq(customerSession.customerId, row.customerId));
  });

  return { ok: true };
}

/** Order history for the signed-in customer. */
export async function getCustomerOrders(customerId: string) {
  const db = await getDb();
  return db.query.order.findMany({
    where: (t, { eq }) => eq(t.customerId, customerId),
    with: { items: true },
    orderBy: (t, { desc }) => desc(t.placedAt),
  });
}
