import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema";
import { customer, customerSession, passwordReset } from "./db/schema";

/**
 * Password reset. This is credential-handling code, so the tests are about the
 * ways a reset link can be abused rather than the happy path.
 */

// The reset flow sets cookies via startSession only on register/sign-in, not on
// reset — but the module imports next/headers, so it needs a stub.
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: () => {},
    delete: () => {},
  }),
  // startSession decides the cookie Secure flag from the request protocol, so
  // the module now reads headers() too. No x-forwarded-proto here, which is
  // the plain-HTTP case.
  headers: async () => ({ get: () => null }),
}));

let db: ReturnType<typeof drizzle<typeof schema>>;
let auth: typeof import("./customer-auth");
let customerId: string;

const EMAIL = "buyer@example.com";
const PASSWORD = "original-passphrase";

beforeAll(async () => {
  db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  (globalThis as Record<string, unknown>).__db = db;
  auth = await import("./customer-auth");
});

beforeEach(async () => {
  await db.delete(passwordReset);
  await db.delete(customerSession);
  await db.delete(customer);

  const { hashPassword } = await import("./auth");
  const [row] = await db
    .insert(customer)
    .values({
      email: EMAIL,
      name: "A Buyer",
      passwordHash: await hashPassword(PASSWORD),
    })
    .returning({ id: customer.id });
  customerId = row!.id;
});

describe("requestPasswordReset", () => {
  it("issues a token for a real account", async () => {
    const issued = await auth.requestPasswordReset(EMAIL);
    expect(issued?.token).toBeTruthy();
    expect(issued?.email).toBe(EMAIL);
  });

  it("returns nothing for an unknown address", async () => {
    expect(await auth.requestPasswordReset("nobody@example.com")).toBeNull();
  });

  it("returns nothing for a guest record that never had a password", async () => {
    await db.insert(customer).values({ email: "guest@example.com" });
    expect(await auth.requestPasswordReset("guest@example.com")).toBeNull();
  });

  it("stores the token hashed, never in the clear", async () => {
    const issued = await auth.requestPasswordReset(EMAIL);
    const row = await db.query.passwordReset.findFirst();
    expect(row?.tokenHash).toBeTruthy();
    expect(row?.tokenHash).not.toBe(issued!.token);
  });

  it("invalidates the previous link when a new one is requested", async () => {
    const first = await auth.requestPasswordReset(EMAIL);
    await auth.requestPasswordReset(EMAIL);

    // An old link sitting in an old inbox must stop working.
    const result = await auth.resetPassword(first!.token, "a-new-passphrase");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("used");
  });
});

describe("resetPassword", () => {
  it("sets the new password and lets it sign in", async () => {
    const issued = await auth.requestPasswordReset(EMAIL);
    expect((await auth.resetPassword(issued!.token, "a-new-passphrase")).ok).toBe(
      true,
    );

    expect((await auth.signInCustomer(EMAIL, "a-new-passphrase")).ok).toBe(true);
    // And the old one is dead.
    expect((await auth.signInCustomer(EMAIL, PASSWORD)).ok).toBe(false);
  });

  it("is single use", async () => {
    const issued = await auth.requestPasswordReset(EMAIL);
    await auth.resetPassword(issued!.token, "a-new-passphrase");

    const replay = await auth.resetPassword(issued!.token, "attacker-choice");
    expect(replay.ok).toBe(false);
    if (!replay.ok) expect(replay.reason).toBe("used");

    // The replay must not have changed anything.
    expect((await auth.signInCustomer(EMAIL, "attacker-choice")).ok).toBe(false);
  });

  it("refuses an expired link", async () => {
    const issued = await auth.requestPasswordReset(EMAIL);
    await db
      .update(passwordReset)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(passwordReset.customerId, customerId));

    const result = await auth.resetPassword(issued!.token, "a-new-passphrase");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("expired");
  });

  it("refuses a token that was never issued", async () => {
    const result = await auth.resetPassword("made-up-token", "a-new-passphrase");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid");
  });

  it("destroys every existing session", async () => {
    // Someone else is signed in as this customer — that is often exactly why
    // the reset is happening, so their session must not survive it.
    await db.insert(customerSession).values({
      tokenHash: "someone-elses-live-session",
      customerId,
      expiresAt: new Date(Date.now() + 86_400_000),
    });

    const issued = await auth.requestPasswordReset(EMAIL);
    await auth.resetPassword(issued!.token, "a-new-passphrase");

    expect(await db.query.customerSession.findMany()).toHaveLength(0);
  });
});
