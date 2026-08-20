import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema";
import { cart, cartItem, hold, order, piece, settings } from "./db/schema";

/**
 * Order creation and payment transitions.
 *
 * The invariant under test: money and inventory only move on a verified
 * payment, exactly once, and a lapsed reservation stops a sale rather than
 * completing one we cannot honour.
 */

let db: ReturnType<typeof drizzle<typeof schema>>;
let orders: typeof import("./orders");
let holds: typeof import("./holds");
let uniqueId: string;
let madeToOrderId: string;
let cartId: string;

const CART_TOKEN = "cart-token-a";

beforeAll(async () => {
  db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });

  (globalThis as Record<string, unknown>).__db = db;
  orders = await import("./orders");
  holds = await import("./holds");

  await db.insert(settings).values({ id: 1, holdWindowMinutes: 60, taxRateBps: 750 });

  const inserted = await db
    .insert(piece)
    .values([
      {
        slug: "unique-ring",
        reference: "U—01",
        name: "Unique Ring",
        category: "ooak",
        availability: "unique",
        priceCents: 10_000_00,
        materialLine: "18k gold",
      },
      {
        slug: "made-ring",
        reference: "M—01",
        name: "Made Ring",
        category: "fine",
        availability: "order",
        priceCents: 2_000_00,
        materialLine: "18k gold",
      },
    ])
    .returning({ id: piece.id, slug: piece.slug });

  uniqueId = inserted.find((r) => r.slug === "unique-ring")!.id;
  madeToOrderId = inserted.find((r) => r.slug === "made-ring")!.id;
});

beforeEach(async () => {
  await db.delete(hold);
  await db.delete(cartItem);
  await db.delete(order);
  await db.delete(cart);
  await db.update(piece).set({ soldAt: null }).where(eq(piece.id, uniqueId));

  const [row] = await db
    .insert(cart)
    .values({ token: CART_TOKEN })
    .returning({ id: cart.id });
  cartId = row!.id;
});

const details = {
  email: "buyer@example.com",
  name: "A Buyer",
  shippingAddress: "1 Street, Town, 90210, US",
  provider: "wire" as const,
};

async function addUniqueToBag() {
  await holds.acquireHold(uniqueId, cartId);
  await db.insert(cartItem).values({
    cartId,
    pieceId: uniqueId,
    unitPriceCents: 10_000_00,
  });
}

describe("createOrderFromCart", () => {
  it("refuses an empty bag", async () => {
    const result = await orders.createOrderFromCart(CART_TOKEN, details);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("empty-bag");
  });

  it("computes tax and total from settings, not from the client", async () => {
    await addUniqueToBag();
    const result = await orders.createOrderFromCart(CART_TOKEN, details);
    expect(result.ok).toBe(true);

    const row = await db.query.order.findFirst();
    expect(row?.subtotalCents).toBe(10_000_00);
    expect(row?.taxCents).toBe(75_000); // 7.5% of $10,000
    expect(row?.totalCents).toBe(10_750_00);
    // Never `paid` at creation — that is the webhook's job alone.
    expect(row?.status).toBe("enquiry");
  });

  it("refuses to sell a piece whose hold has lapsed", async () => {
    await addUniqueToBag();

    // The buyer sat on the checkout page until the reservation expired.
    await db
      .update(hold)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(hold.pieceId, uniqueId));

    const result = await orders.createOrderFromCart(CART_TOKEN, details);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("hold-lost");

    // And nothing was written.
    expect(await db.query.order.findFirst()).toBeUndefined();
  });

  it("refuses a piece that sold while checkout was open", async () => {
    await addUniqueToBag();
    await db.update(piece).set({ soldAt: new Date() }).where(eq(piece.id, uniqueId));

    const result = await orders.createOrderFromCart(CART_TOKEN, details);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("hold-lost");
  });

  it("needs no hold for made-to-order pieces", async () => {
    await db.insert(cartItem).values({
      cartId,
      pieceId: madeToOrderId,
      unitPriceCents: 2_000_00,
    });

    const result = await orders.createOrderFromCart(CART_TOKEN, details);
    expect(result.ok).toBe(true);
  });

  it("binds the cart's holds to the order so the webhook cannot guess wrong", async () => {
    await addUniqueToBag();
    const result = await orders.createOrderFromCart(CART_TOKEN, details);
    expect(result.ok).toBe(true);

    const row = await db.query.hold.findFirst();
    expect(row?.orderId).toBe(result.ok ? result.orderId : null);
  });

  it("extends the reservation for a wire order — a transfer takes days", async () => {
    await addUniqueToBag();
    await orders.createOrderFromCart(CART_TOKEN, { ...details, provider: "wire" });

    const row = await db.query.hold.findFirst();
    const daysOut = (row!.expiresAt.getTime() - Date.now()) / 86_400_000;
    expect(daysOut).toBeGreaterThan(13);
  });

  it("keeps the short window for card orders so abandoned checkouts release", async () => {
    await addUniqueToBag();
    await orders.createOrderFromCart(CART_TOKEN, { ...details, provider: "stripe" });

    const row = await db.query.hold.findFirst();
    const minutesOut = (row!.expiresAt.getTime() - Date.now()) / 60_000;
    expect(minutesOut).toBeLessThanOrEqual(60);
  });

  it("snapshots piece details so later edits cannot rewrite history", async () => {
    await addUniqueToBag();
    const result = await orders.createOrderFromCart(CART_TOKEN, details);
    expect(result.ok).toBe(true);

    await db
      .update(piece)
      .set({ name: "Renamed", priceCents: 1 })
      .where(eq(piece.id, uniqueId));

    const item = await db.query.orderItem.findFirst();
    expect(item?.name).toBe("Unique Ring");
    expect(item?.unitPriceCents).toBe(10_000_00);
  });
});

describe("markOrderPaid", () => {
  it("marks the piece sold and closes the hold", async () => {
    await addUniqueToBag();
    const created = await orders.createOrderFromCart(CART_TOKEN, details);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const result = await orders.markOrderPaid(created.orderId, "ref_123");
    expect(result.changed).toBe(true);

    const row = await db.query.order.findFirst();
    expect(row?.status).toBe("paid");
    expect(row?.paymentRef).toBe("ref_123");

    const sold = await db.query.piece.findFirst({
      where: (t, { eq: e }) => e(t.id, uniqueId),
    });
    expect(sold?.soldAt).not.toBeNull();

    // And the piece is now unbuyable to everyone.
    const availability = await holds.getLiveAvailability("unique-ring", CART_TOKEN);
    expect(availability?.state).toBe("sold");
  });

  it("is idempotent — a retried webhook must not sell twice", async () => {
    await addUniqueToBag();
    const created = await orders.createOrderFromCart(CART_TOKEN, details);
    if (!created.ok) throw new Error("setup failed");

    const first = await orders.markOrderPaid(created.orderId, "ref_123");
    const second = await orders.markOrderPaid(created.orderId, "ref_123");

    expect(first.changed).toBe(true);
    // The second call is a no-op, so no duplicate email and no second sale.
    expect(second.changed).toBe(false);

    const events = await db.query.orderEvent.findMany();
    expect(events.filter((e) => e.type === "paid")).toHaveLength(1);
  });

  it("ignores an unknown order id rather than throwing", async () => {
    const result = await orders.markOrderPaid(crypto.randomUUID(), "ref_x");
    expect(result.changed).toBe(false);
  });
});
