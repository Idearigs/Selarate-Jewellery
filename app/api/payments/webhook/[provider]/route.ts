import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getProvider, isProviderId } from "@/lib/payments";
import { markOrderPaid, markOrderRefunded } from "@/lib/orders";
import { getDb } from "@/lib/db";
import { sendOrderConfirmation, sendStudioNotification } from "@/lib/email";

/**
 * The only endpoint permitted to mark an order paid.
 *
 * Everything here is defensive on purpose:
 *  - the signature is verified against the RAW body before anything is read;
 *  - an unverifiable request gets 400 and changes nothing;
 *  - `markOrderPaid` is idempotent, because gateways retry and a retry must not
 *    sell a piece twice or send a second confirmation;
 *  - a handler error returns 500 so the gateway retries rather than dropping a
 *    real payment on the floor.
 */
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await params;
  if (!isProviderId(providerId)) {
    return NextResponse.json({ error: "unknown_provider" }, { status: 404 });
  }

  const provider = getProvider(providerId);

  let event;
  try {
    event = await provider.verifyWebhook(request);
  } catch (error) {
    // Bad signature, missing header, or a provider that takes no webhooks.
    console.warn(`[webhook:${providerId}] rejected`, error);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  if (event.type === "ignored") return NextResponse.json({ ok: true });

  try {
    if (event.type === "refunded") {
      await markOrderRefunded(event.orderId, event.amountCents);
      return NextResponse.json({ ok: true });
    }

    const { changed } = await markOrderPaid(event.orderId, event.ref);
    if (!changed) return NextResponse.json({ ok: true, duplicate: true });

    const db = await getDb();
    const orderRow = await db.query.order.findFirst({
      where: (t, { eq }) => eq(t.id, event.orderId),
      with: { items: true, customer: true },
    });

    if (orderRow) {
      // Sold pieces must leave the catalogue promptly, not on the next hourly
      // revalidation.
      for (const item of orderRow.items) {
        const slug = await db.query.piece.findFirst({
          where: (t, { eq }) => eq(t.id, item.pieceId ?? ""),
          columns: { slug: true },
        });
        if (slug) revalidateTag(`piece:${slug.slug}`);
      }

      const mail = {
        number: orderRow.number,
        name: orderRow.customer?.name ?? "",
        email: orderRow.customer?.email ?? "",
        lookupToken: orderRow.lookupToken,
        totalCents: orderRow.totalCents,
        lines: orderRow.items.map((i) => ({
          name: i.name,
          reference: i.reference,
          size: i.size,
        })),
      };

      if (mail.email) await sendOrderConfirmation(mail);
      await sendStudioNotification(mail, "Paid");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Return 500 so the gateway retries. Losing a confirmed payment is far
    // worse than processing the same webhook twice.
    console.error(`[webhook:${providerId}] handler failed`, error);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }
}
