import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SpecTable } from "@/components/ui/spec-table";
import { getOrderByToken, clearCart } from "@/lib/orders";
import { getCartToken } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

/**
 * Order status by opaque token — the guest lookup path.
 *
 * Most buyers here check out once and never return, so this link (emailed, and
 * landed on straight after checkout) is the only handle they get. It must work
 * without an account, forever.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your order",
  // Contains a customer's name, address and purchase. Never index it.
  robots: { index: false, follow: false, nocache: true },
};

const STATUS_COPY: Record<string, { label: string; body: string }> = {
  enquiry: {
    label: "Reserved",
    body: "Your piece is held in your name. The studio will confirm as soon as payment is settled.",
  },
  paid: {
    label: "Confirmed",
    body: "Payment received. Your piece is being prepared and packed by hand in the studio.",
  },
  in_studio: {
    label: "In the studio",
    body: "On the bench now — final finishing, polishing and a last inspection.",
  },
  dispatched: {
    label: "Dispatched",
    body: "On its way, fully insured and signature-required.",
  },
  delivered: { label: "Delivered", body: "Delivered. We hope you love it." },
  refunded: { label: "Refunded", body: "This order has been refunded." },
  cancelled: { label: "Cancelled", body: "This order was cancelled." },
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ checkout?: string; method?: string }>;
}) {
  const { token } = await params;
  const { checkout, method } = await searchParams;

  const order = await getOrderByToken(token);
  if (!order) notFound();

  // Landing here from a completed checkout is the point at which the bag has
  // definitively served its purpose. The webhook already sold the pieces; this
  // just tidies up the buyer's session.
  if (checkout === "complete") {
    const cartToken = await getCartToken();
    if (cartToken) await clearCart(cartToken);
  }

  const status = STATUS_COPY[order.status] ?? STATUS_COPY.enquiry!;
  const isWire = order.paymentProvider === "wire" || method === "wire";

  return (
    <div className="page-x grid gap-12 pb-16 pt-10 xl:grid-cols-[1.3fr_1fr] xl:gap-20 xl:pb-26">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <p className="font-mono text-label uppercase tracking-[0.22em] text-ink/64">
            Order {order.number}
          </p>
          <h1 className="text-title-m xl:text-[52px] xl:leading-[1.06]">
            {checkout === "complete" || isWire ? "Thank you." : status.label}
          </h1>
          <p className="max-w-[460px] text-body leading-[1.7] text-ink/72">
            {status.body}
          </p>
        </div>

        {isWire && order.status === "enquiry" && (
          <div className="bg-paper-alt p-8">
            <h2 className="font-display text-[22px]">Paying by transfer</h2>
            <p className="mt-3 max-w-[520px] text-body-sm leading-[1.7] text-ink/72">
              The studio will email transfer details shortly. Your piece stays
              reserved in your name until the funds arrive — there is no time
              limit on this reservation, and nothing has been charged.
            </p>
          </div>
        )}

        <div className="flex flex-col border-t border-ink/12">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex justify-between gap-6 border-b border-ink/12 py-5"
            >
              <div className="flex flex-col gap-1.5">
                <span className="font-display text-piece">{item.name}</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/64">
                  {item.reference}
                  {item.size ? ` · US ${item.size}` : ""}
                </span>
                <span className="text-body-sm text-ink/55">{item.materialLine}</span>
                {item.engraving && (
                  <span className="text-body-sm text-ink/55">
                    Engraved: {item.engraving}
                  </span>
                )}
              </div>
              <span className="shrink-0 text-[15px]">
                {formatPrice(item.unitPriceCents)}
              </span>
            </div>
          ))}
        </div>

        {/* Timeline */}
        {order.events.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-mono text-label uppercase text-ink/64">History</h2>
            <ol className="flex flex-col">
              {order.events.map((event) => (
                <li
                  key={event.id}
                  className="grid grid-cols-[130px_1fr] gap-5 border-b border-ink/12 py-3.5"
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/64">
                    {event.createdAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="text-[14px] text-ink/85">{event.body}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <p className="text-body-sm text-ink/55">
          Keep this page bookmarked — it is your order link, and it works without
          an account. Questions?{" "}
          <Link href="/contact" className="border-b border-ink/30 hover:border-ink">
            Write to the studio
          </Link>
          .
        </p>
      </div>

      <aside className="flex h-fit flex-col border border-ink/12 p-8">
        <h2 className="font-mono text-label uppercase text-ink/64">Summary</h2>

        <dl className="mt-6 flex flex-col gap-3.5 text-[14px]">
          <div className="flex justify-between">
            <dt className="text-ink/72">Subtotal</dt>
            <dd>{formatPrice(order.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink/72">Insured shipping</dt>
            <dd>Included</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink/72">Tax</dt>
            <dd>{formatPrice(order.taxCents)}</dd>
          </div>
        </dl>

        <div className="mt-6 flex items-baseline justify-between border-t border-ink/12 pt-6">
          <span className="font-mono text-label uppercase text-ink/64">Total</span>
          <span className="font-display text-[32px]">
            {formatPrice(order.totalCents)}
          </span>
        </div>

        <div className="mt-8 border-t border-ink/12 pt-6">
          <SpecTable
            rows={[
              { key: "Status", value: status.label },
              { key: "Placed", value: order.placedAt.toLocaleDateString("en-US") },
              ...(order.shippingAddress
                ? [{ key: "Ship to", value: order.shippingAddress }]
                : []),
            ]}
          />
        </div>
      </aside>
    </div>
  );
}
