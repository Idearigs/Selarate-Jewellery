import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";
import { piece, user } from "./schema";
import type { Db } from "./index";

/**
 * First-run bootstrap. The whole value of this code is that it runs ONCE — a
 * second pass that overwrote the catalogue or reset the owner's password would
 * do more damage on every deploy than the manual step it replaces.
 */

let db: Db;

const env = {
  SEED_ON_BOOT: "0",
  ADMIN_EMAIL: undefined as string | undefined,
  ADMIN_NAME: undefined as string | undefined,
  ADMIN_PASSWORD: undefined as string | undefined,
};

vi.mock("@/lib/env", () => ({
  get env() {
    return env;
  },
}));

let bootstrap: typeof import("./bootstrap").bootstrap;

beforeAll(async () => {
  db = drizzle(new PGlite(), { schema }) as unknown as Db;
  await migrate(db as never, { migrationsFolder: "./drizzle" });
  ({ bootstrap } = await import("./bootstrap"));
});

beforeEach(async () => {
  await db.delete(user);
  env.SEED_ON_BOOT = "0";
  env.ADMIN_EMAIL = undefined;
  env.ADMIN_NAME = undefined;
  env.ADMIN_PASSWORD = undefined;
});

describe("catalogue seeding", () => {
  it("does nothing unless SEED_ON_BOOT is set", async () => {
    await db.delete(piece);
    await bootstrap(db);
    expect(await db.select().from(piece)).toHaveLength(0);
  });

  it("seeds an empty catalogue when asked", async () => {
    await db.delete(piece);
    env.SEED_ON_BOOT = "1";
    await bootstrap(db);
    expect((await db.select().from(piece)).length).toBeGreaterThan(0);
  });

  it("leaves an existing catalogue alone", async () => {
    // The invariant that matters: a redeploy must not resurrect pieces the
    // studio deleted, nor overwrite prices edited in the admin.
    await db.delete(piece);
    env.SEED_ON_BOOT = "1";
    await bootstrap(db);

    const [first] = await db.select().from(piece);
    await db.update(piece).set({ name: "Edited By Studio" });

    await bootstrap(db);

    const after = await db.select().from(piece);
    expect(after).toHaveLength((await db.select().from(piece)).length);
    expect(after.find((p) => p.id === first!.id)!.name).toBe("Edited By Studio");
  });
});

describe("first owner", () => {
  const creds = {
    ADMIN_EMAIL: "owner@studio.test",
    ADMIN_NAME: "The Studio",
    ADMIN_PASSWORD: "a-long-enough-password",
  };

  it("does nothing without credentials", async () => {
    await bootstrap(db);
    expect(await db.select().from(user)).toHaveLength(0);
  });

  it("creates an owner when there are no users", async () => {
    Object.assign(env, creds);
    await bootstrap(db);

    const [row] = await db.select().from(user);
    expect(row?.email).toBe("owner@studio.test");
    expect(row?.role).toBe("owner");
    // Stored as salt:hash, never in the clear.
    expect(row?.passwordHash).not.toContain(creds.ADMIN_PASSWORD);
  });

  it("normalises the email", async () => {
    Object.assign(env, creds, { ADMIN_EMAIL: "  OWNER@Studio.Test  " });
    await bootstrap(db);
    expect((await db.select().from(user))[0]?.email).toBe("owner@studio.test");
  });

  it("never touches an existing account", async () => {
    // Rotating ADMIN_PASSWORD must not reset a live owner's password, and a
    // stale variable left in the platform must not re-add a removed account.
    Object.assign(env, creds);
    await bootstrap(db);
    const before = (await db.select().from(user))[0]!;

    Object.assign(env, { ADMIN_PASSWORD: "a-completely-different-one" });
    await bootstrap(db);

    const after = await db.select().from(user);
    expect(after).toHaveLength(1);
    expect(after[0]!.passwordHash).toBe(before.passwordHash);
  });
});
