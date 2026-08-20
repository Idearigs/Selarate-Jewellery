"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { order, orderEvent, orderNote } from "@/lib/db/schema";
import { markOrderPaid, markOrderRefunded } from "@/lib/orders";
import { getProvider } from "@/lib/payments";
import { requirePermission } from "@/lib/auth";

/** Order actions from the right rail of the order detail view. */

async function logEvent(orderId: string, type: string, body: string, actor: string) {
  const db = await getDb();
  await db.insert(orderEvent).values({ orderId, type, body, actor });
}

export async function advanceOrder(orderId: string, status: string) {
  const user = await requirePermission("orders");
  const db = await getDb();

  const allowed = ["in_studio", "dispatched", "delivered", "cancelled"];
  if (!allowed.includes(status)) throw new Error(`Cannot set status ${status}`);

  await db
    .update(order)
    .set({ status: status as never })
    .where(eq(order.id, orderId));

  await logEvent(orderId, status, `Marked ${status.replace("_", " ")}`, user.email);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

/**
 * Confirm a bank transfer has landed.
 *
 * This is the manual counterpart to the card webhook: it runs the same
 * `markOrderPaid`, so a wire sale converts holds and marks pieces sold through
 * exactly one code path. Financial permission is required — a `limited` staff
 * member can move an order along the bench but cannot declare money received.
 */
export async function confirmWirePayment(orderId: string) {
  const user = await requirePermission("financials");
  const result = await markOrderPaid(orderId, `wire:confirmed:${Date.now()}`);

  if (result.changed) {
    await logEvent(orderId, "paid", "Wire transfer confirmed by studio", user.email);
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/collection");
}

export async function refundOrder(orderId: string) {
  const user = await requirePermission("financials");
  const db = await getDb();

  const row = await db.query.order.findFirst({
    where: (t, { eq: e }) => e(t.id, orderId),
  });
  if (!row) return;

  // Card refunds go back through the gateway; wire refunds are a bank transfer
  // the studio makes by hand, so the provider refuses and we only record it.
  if (row.paymentProvider === "stripe" && row.paymentRef) {
    try {
      await getProvider("stripe").refund(row.paymentRef, row.totalCents);
    } catch (error) {
      console.error("[refund] gateway refused", error);
      throw new Error("The gateway refused the refund. Check the dashboard.");
    }
  }

  await markOrderRefunded(orderId, row.totalCents);
  await logEvent(orderId, "refunded", "Refund issued", user.email);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

/** Internal note. Never rendered on any customer-facing surface. */
export async function addOrderNote(orderId: string, body: string) {
  const user = await requirePermission("orders");
  if (!body.trim()) return;

  const db = await getDb();
  await db.insert(orderNote).values({ orderId, body: body.trim(), author: user.email });
  revalidatePath(`/admin/orders/${orderId}`);
}
