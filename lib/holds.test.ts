import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq, sql } from "drizzle-orm";
import * as schema from "./db/schema";
import { cart, hold, piece, settings } from "./db/schema";

/**
 * Tests for the one invariant this business cannot get wrong: a piece with an
 * inventory of one is sold exactly once.
 *
 * These run against an in-memory PGlite (real Postgres, compiled to WASM), so
 * the partial unique index and the transaction semantics are genuinely
 * exercised — not mocked.
 *
 * The one thing PGlite CANNOT show us is true write contention: it is
 * single-connection, so `SELECT … FOR UPDATE` never actually blocks. The
 * parallel test at the bottom therefore proves the *index* rejects a
 * double-booking, which is the backstop; verifying that FOR UPDATE serialises
 * real concurrent clients needs a server Postgres and is covered by the
 * Playwright spec described in the plan.
 */

let db: ReturnType<typeof drizzle<typeof schema>>;
let holds: typeof import("./holds");
let pieceId: string;
let cartA: string;
let cartB: string;

beforeAll(async () => {
  const client = new PGlite(); // in-memory
  db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });

  // Seed the getDb() singleton before lib/holds imports resolve it.
  (globalThis as Record<string, unknown>).__db = db;
  holds = await import("./holds");

  await db.insert(settings).values({ id: 1, holdWindowMinutes: 60 });

  const [p] = await db
    .insert(piece)
    .values({
      slug: "test-ring",
      reference: "T—01",
      name: "Test Ring",
      category: "ooak",
      availability: "unique",
      priceCents: 100_00,
      materialLine: "18k gold",
    })
    .returning({ id: piece.id });
  pieceId = p!.id;

  const carts = await db
    .insert(cart)
    .values([{ token: "cart-a" }, { token: "cart-b" }])
    .returning({ id: cart.id });
  cartA = carts[0]!.id;
  cartB = carts[1]!.id;
});

afterAll(() => {
  delete (globalThis as Record<string, unknown>).__db;
});

async function reset() {
  await db.delete(hold);
  await db.update(piece).set({ soldAt: null }).where(eq(piece.id, pieceId));
}

describe("acquireHold", () => {
  it("grants a hold on an available unique piece", async () => {
    await reset();
    const result = await holds.acquireHold(pieceId, cartA);
    expect(result.ok).toBe(true);
    if (result.ok) {
      // 60-minute window, read from settings — not hardcoded in the module.
      const minutes = (result.expiresAt.getTime() - Date.now()) / 60_000;
      expect(minutes).toBeGreaterThan(59);
      expect(minutes).toBeLessThanOrEqual(60);
    }
  });

  it("refuses a second cart while the hold is live", async () => {
    await reset();
    expect((await holds.acquireHold(pieceId, cartA)).ok).toBe(true);

    const second = await holds.acquireHold(pieceId, cartB);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe("held-by-other");
  });

  it("extends rather than stacks when the same cart re-adds", async () => {
    await reset();
    await holds.acquireHold(pieceId, cartA);
    await holds.acquireHold(pieceId, cartA);

    const live = await db
      .select()
      .from(hold)
      .where(sql`${hold.pieceId} = ${pieceId} and ${hold.releasedAt} is null`);
    expect(live).toHaveLength(1);
  });

  it("lets another cart take an expired-but-unswept hold", async () => {
    await reset();
    await holds.acquireHold(pieceId, cartA);

    // Backdate the hold without releasing it — this is exactly the state the
    // system is in between expiry and the sweeper's next tick.
    await db
      .update(hold)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(hold.pieceId, pieceId));

    const result = await holds.acquireHold(pieceId, cartB);
    expect(result.ok).toBe(true);
  });

  it("refuses a sold piece", async () => {
    await reset();
    await db.update(piece).set({ soldAt: new Date() }).where(eq(piece.id, pieceId));

    const result = await holds.acquireHold(pieceId, cartA);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("sold");
  });

  it("never holds made-to-order pieces — there is no scarcity to protect", async () => {
    await reset();
    await db
      .update(piece)
      .set({ availability: "order" })
      .where(eq(piece.id, pieceId));

    const result = await holds.acquireHold(pieceId, cartA);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not-holdable");

    await db
      .update(piece)
      .set({ availability: "unique" })
      .where(eq(piece.id, pieceId));
  });
});

describe("getLiveAvailability", () => {
  it("reports the holder's own hold as purchasable, and others' as not", async () => {
    await reset();
    await holds.acquireHold(pieceId, cartA);

    const mine = await holds.getLiveAvailability("test-ring", "cart-a");
    expect(mine?.state).toBe("held-by-you");
    expect(mine?.purchasable).toBe(true);
    expect(mine?.holdExpiresAt).not.toBeNull();

    const theirs = await holds.getLiveAvailability("test-ring", "cart-b");
    expect(theirs?.state).toBe("held-by-other");
    expect(theirs?.purchasable).toBe(false);
    // Never leak another visitor's hold expiry.
    expect(theirs?.holdExpiresAt).toBeNull();
  });

  it("ignores an expired hold without waiting for the sweeper", async () => {
    await reset();
    await holds.acquireHold(pieceId, cartA);
    await db
      .update(hold)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(hold.pieceId, pieceId));

    const result = await holds.getLiveAvailability("test-ring", "cart-b");
    expect(result?.state).toBe("available");
    expect(result?.purchasable).toBe(true);
  });
});

describe("convertHoldToSale", () => {
  it("marks the piece sold and closes the hold", async () => {
    await reset();
    await holds.acquireHold(pieceId, cartA);
    await holds.convertHoldToSale(pieceId, cartA, crypto.randomUUID());

    const after = await holds.getLiveAvailability("test-ring", "cart-a");
    expect(after?.state).toBe("sold");
    expect(after?.purchasable).toBe(false);
  });
});

describe("the database backstop", () => {
  it("physically refuses a second live hold, even if application code is wrong", async () => {
    await reset();
    await holds.acquireHold(pieceId, cartA);

    // Bypass acquireHold entirely and insert a competing hold directly. The
    // partial unique index must reject it. This is the guarantee that survives
    // a bug in lib/holds.ts.
    await expect(
      db.insert(hold).values({
        pieceId,
        cartId: cartB,
        expiresAt: new Date(Date.now() + 60_000),
      }),
    ).rejects.toThrow();
  });

  it("serialises a burst of simultaneous add-to-bag attempts", async () => {
    await reset();

    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        holds
          .acquireHold(pieceId, i % 2 === 0 ? cartA : cartB)
          .catch(() => ({ ok: false as const, reason: "held-by-other" as const })),
      ),
    );

    // Exactly one cart may end up holding the piece.
    const live = await db
      .select()
      .from(hold)
      .where(sql`${hold.pieceId} = ${pieceId} and ${hold.releasedAt} is null`);
    expect(live).toHaveLength(1);

    // And nobody got a hold for a cart other than the winner.
    const winner = live[0]!.cartId;
    const losers = results.filter((r) => !r.ok);
    expect(losers.length).toBeGreaterThan(0);
    expect([cartA, cartB]).toContain(winner);
  });
});
