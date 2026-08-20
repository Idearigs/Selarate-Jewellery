import {
  createHash,
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { useSecureCookies } from "@/lib/cookie-security";
import { and, eq, gt, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { session, user } from "@/lib/db/schema";
import { can, type Permission, type Role } from "@/lib/permissions";

// Re-exported so server code has a single import for auth concerns.
export { can };
export type { Permission, Role };

/**
 * Admin authentication.
 *
 * Deliberately small: this back office has an owner and one or two staff, and
 * every dependency here is a dependency on something that guards customer
 * addresses and payment records. Password hashing is scrypt from Node's own
 * crypto, and sessions are random tokens stored (hashed) in the database.
 *
 * Two decisions worth keeping:
 *  - Sessions are database-backed, not JWTs, so access can be revoked instantly.
 *  - Only the SHA-256 of the cookie value is stored, so a database leak does not
 *    hand over live sessions.
 */

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const COOKIE = "studio_session";
const SESSION_DAYS = 14;
const KEY_LENGTH = 64;

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}

/* --------------------------------------------------------------------------
   Passwords
   -------------------------------------------------------------------------- */

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const derived = await scrypt(password, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== derived.length) return false;

  // Constant-time: a length-independent comparison would leak the hash a byte
  // at a time to anyone willing to measure.
  return timingSafeEqual(expected, derived);
}

/* --------------------------------------------------------------------------
   Sessions
   -------------------------------------------------------------------------- */

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string) {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  await db.insert(session).values({ tokenHash: hashToken(token), userId, expiresAt });

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: await useSecureCookies(),
    path: "/",
    expires: expiresAt,
  });

  // Opportunistic cleanup; there is no scheduled job for this and never needs one.
  await db.delete(session).where(lt(session.expiresAt, new Date()));
}

export async function destroySession() {
  const db = await getDb();
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;

  if (token) {
    await db.delete(session).where(eq(session.tokenHash, hashToken(token)));
  }
  jar.delete(COOKIE);
}

/** Returns the signed-in studio user, or null. Never throws. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const db = await getDb();
  const [row] = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
    .from(session)
    .innerJoin(user, eq(user.id, session.userId))
    .where(
      and(
        eq(session.tokenHash, hashToken(token)),
        gt(session.expiresAt, new Date()),
      ),
    );

  return (row as SessionUser) ?? null;
}

export async function signIn(email: string, password: string) {
  const db = await getDb();
  const row = await db.query.user.findFirst({
    where: (t, { eq: e }) => e(t.email, email.trim().toLowerCase()),
  });

  // Run the hash even when the user does not exist, so response time does not
  // reveal which addresses are real.
  const stored =
    row?.passwordHash ??
    "0000000000000000000000000000000000000000000000000000000000000000:0000";
  const ok = await verifyPassword(password, stored);

  if (!row || !ok) return { ok: false as const };

  await createSession(row.id);
  return { ok: true as const };
}

/**
 * Guard for server actions and route handlers. Throws rather than returning a
 * falsy value, so a forgotten check cannot silently allow the operation.
 */
export async function requirePermission(permission: Permission) {
  const current = await getSessionUser();
  if (!current) throw new Error("Not signed in");
  if (!can(current.role, permission)) {
    throw new Error(`Role "${current.role}" may not access ${permission}`);
  }
  return current;
}
