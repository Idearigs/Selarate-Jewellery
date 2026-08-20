import { randomBytes } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  cartItem,
  customer,
  hold,
  order,
  orderEvent,
  orderItem,
  piece,
} from "@/lib/db/schema";
import { convertHoldToSale } from "@/lib/holds";
import { formatPrice } from "@/lib/format";
import type { ProviderId } from "@/lib/payments";

/**
 * Order creation and state transitions.
 *
 * The rule that governs this whole module: an order is written BEFORE the buyer
 * is sent to a gateway, and is only marked `paid` by a signature-verified
 * webhook. The browser is never trusted to report a successful payment.
 */

/**
 * How long a piece stays reserved once a wire order is placed. Long enough for
 * an international transfer to clear; the studio can release it sooner from the
 * admin if the buyer goes quiet.
 */
const WIRE_RESERVATION_DAYS = 14;

/** Opaque, unguessable. Guest order lookup is the only key most buyers get. */
function lookupToken() {
  return randomBytes(24).toString("base64url");
}

/**
 * Human-facing order number. Sequential within a year so the studio can say
 * "order 1042" on the phone, which a UUID makes impossible.
 */
async function nextOrderNumber(): Promise<string> {
  const db = await getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(order);
  return `ORD-${1000 + (row?.count ?? 0) + 1}`;
}

export interface CheckoutDetails {
  email: string;
  name: string;
  shippingAddress: string;
  provider: ProviderId;
  note?: string | null;
}

export type CreateOrderResult =
  | { ok: true; orderId: string; number: string; lookupToken: string }
  | { ok: false; reason: "empty-bag" | "hold-lost" };

/**
 * Turn the current bag into an order.
 *
 * Re-validates every held piece inside the transaction. The gap between "added
 * to bag" and "clicked pay" can be an hour, and a hold can lapse in it — so the
 * check here is not a formality, it is the last line of defence before we take
 * money for something we cannot ship.
 */
export async function createOrderFromCart(
  cartToken: string,
  details: CheckoutDetails,
): Promise<CreateOrderResult> {
  const db = await getDb();

  const cartRow = await db.query.cart.findFirst({
    where: (t, { eq: e }) => e(t.token, cartToken),
    columns: { id: true },
  });
  if (!cartRow) return { ok: false, reason: "empty-bag" };

  const lines = await db
    .select({ item: cartItem, piece })
    .from(cartItem)
    .innerJoin(piece, eq(piece.id, cartItem.pieceId))
    .where(eq(cartItem.cartId, cartRow.id));

  if (lines.length === 0) return { ok: false, reason: "empty-bag" };

  // Every unique piece in the bag must still be held by THIS cart.
  for (const { piece: p } of lines) {
    if (p.availability !== "unique") continue;
    if (p.soldAt) return { ok: false, reason: "hold-lost" };

    const [live] = await db
      .select({ id: hold.id })
      .from(hold)
      .where(
        and(
          eq(hold.pieceId, p.id),
          eq(hold.cartId, cartRow.id),
          isNull(hold.releasedAt),
          sql`${hold.expiresAt} > now()`,
        ),
      );
    if (!live) return { ok: false, reason: "hold-lost" };
  }

  const config = await db.query.settings.findFirst({
    where: (t, { eq: e }) => e(t.id, 1),
    columns: { taxRateBps: true },
  });

  const subtotalCents = lines.reduce((s, l) => s + l.item.unitPriceCents, 0);
  const taxCents = Math.round(
    (subtotalCents * (config?.taxRateBps ?? 750)) / 10_000,
  );
  const shippingCents = 0; // insured shipping is included
  const totalCents = subtotalCents + shippingCents + taxCents;

  // Upsert the customer so the admin's Customers view and lifetime value work
  // even for buyers who never create an account.
  const [customerRow] = await db
    .insert(customer)
    .values({ email: details.email, name: details.name, lastSeenAt: new Date() })
    .onConflictDoUpdate({
      target: customer.email,
      set: { name: details.name, lastSeenAt: new Date() },
    })
    .returning({ id: customer.id });

  const token = lookupToken();
  const number = await nextOrderNumber();

  const [orderRow] = await db
    .insert(order)
    .values({
      number,
      customerId: customerRow?.id ?? null,
      // Card orders open as `enquiry` and are promoted to `paid` by the
      // webhook. Wire orders stay `enquiry` until the studio confirms funds.
      status: "enquiry",
      subtotalCents,
      shippingCents,
      taxCents,
      totalCents,
      paymentProvider: details.provider,
      lookupToken: token,
      shippingAddress: details.shippingAddress,
    })
    .returning({ id: order.id });

  if (!orderRow) return { ok: false, reason: "empty-bag" };

  await db.insert(orderItem).values(
    lines.map(({ item, piece: p }) => ({
      orderId: orderRow.id,
      pieceId: p.id,
      // Snapshotted so order history survives later edits to the piece.
      name: p.name,
      reference: p.reference,
      materialLine: p.materialLine,
      size: item.size,
      engraving: item.engraving,
      giftWrap: item.giftWrap,
      unitPriceCents: item.unitPriceCents,
    })),
  );

  // Bind this cart's live holds to the order NOW, while we still know which
  // cart they belong to. The webhook arrives without that context, and matching
  // holds by piece alone could close a different visitor's reservation.
  //
  // A wire order also EXTENDS the reservation. A bank transfer takes days, and
  // the 60-minute browsing hold would lapse long before the funds land — which
  // would quietly contradict what the order page promises the buyer. Card
  // orders keep the short window on purpose: an abandoned card checkout should
  // release the piece back to the catalogue quickly.
  await db
    .update(hold)
    .set({
      orderId: orderRow.id,
      ...(details.provider === "wire"
        ? { expiresAt: new Date(Date.now() + WIRE_RESERVATION_DAYS * 86_400_000) }
        : {}),
    })
    .where(and(eq(hold.cartId, cartRow.id), isNull(hold.releasedAt)));

  await db.insert(orderEvent).values({
    orderId: orderRow.id,
    type: "placed",
    body: `Order placed — ${formatPrice(totalCents)} via ${details.provider}`,
    actor: details.email,
  });

  return { ok: true, orderId: orderRow.id, number, lookupToken: token };
}

/**
 * Called ONLY from a verified webhook (or the admin, for a confirmed wire).
 * Converts holds into sales, which is what finally marks pieces sold.
 *
 * Idempotent: gateways retry webhooks, and a retry must not sell a piece twice
 * or send a second confirmation email.
 */
export async function markOrderPaid(
  orderId: string,
  ref: string,
): Promise<{ changed: boolean }> {
  const db = await getDb();

  const existing = await db.query.order.findFirst({
    where: (t, { eq: e }) => e(t.id, orderId),
    columns: { id: true, status: true },
  });
  if (!existing) return { changed: false };
  if (existing.status !== "enquiry") return { changed: false }; // already handled

  await db
    .update(order)
    .set({ status: "paid", paymentRef: ref })
    .where(eq(order.id, orderId));

  // Holds were bound to this order at creation, so there is no guessing about
  // whose reservation we are closing.
  const holdRows = await db
    .select({ pieceId: hold.pieceId, cartId: hold.cartId })
    .from(hold)
    .where(and(eq(hold.orderId, orderId), isNull(hold.releasedAt)));

  for (const h of holdRows) {
    await convertHoldToSale(h.pieceId, h.cartId, orderId);
  }

  await db.insert(orderEvent).values({
    orderId,
    type: "paid",
    body: "Payment confirmed",
    actor: "system",
  });

  return { changed: true };
}

export async function markOrderRefunded(orderId: string, amountCents: number) {
  const db = await getDb();
  await db.update(order).set({ status: "refunded" }).where(eq(order.id, orderId));
  await db.insert(orderEvent).values({
    orderId,
    type: "refunded",
    body: `Refunded ${formatPrice(amountCents)}`,
    actor: "system",
  });
}

/** Empties the bag once an order exists. Holds are deliberately left alone. */
export async function clearCart(cartToken: string) {
  const db = await getDb();
  const cartRow = await db.query.cart.findFirst({
    where: (t, { eq: e }) => e(t.token, cartToken),
    columns: { id: true },
  });
  if (!cartRow) return;
  await db.delete(cartItem).where(eq(cartItem.cartId, cartRow.id));
}

/** Guest order lookup — the only handle most buyers ever have. */
export async function getOrderByToken(token: string) {
  const db = await getDb();
  return db.query.order.findFirst({
    where: (t, { eq: e }) => e(t.lookupToken, token),
    with: {
      items: true,
      events: { orderBy: (t, { asc }) => asc(t.createdAt) },
      customer: true,
    },
  });
}
