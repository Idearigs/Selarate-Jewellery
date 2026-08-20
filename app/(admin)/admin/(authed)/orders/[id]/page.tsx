import { notFound } from "next/navigation";
import { Topbar } from "@/components/admin/topbar";
import { MonoLabel, StatusPill } from "@/components/admin/primitives";
import { InternalNote, OrderActions } from "@/components/admin/order-actions";
import { getAdminOrder, ORDER_LABEL, ORDER_TONE } from "@/lib/db/queries/admin";
import { can, requirePermission } from "@/lib/auth";
import { recordRead } from "@/lib/audit";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("orders");
  const { id } = await params;

  const order = await getAdminOrder(id);
  if (!order) notFound();

  // Shipping address and payment reference.
  recordRead(user, "order", order.number);

  const showMoney = can(user.role, "financials");

  return (
    <>
      <Topbar
        title={`Order ${order.number}`}
        meta={order.customer?.name ?? order.customer?.email ?? undefined}
      />

      <div className="grid flex-1 grid-cols-[1fr_340px] overflow-hidden">
        <div className="flex flex-col gap-8 overflow-y-auto p-7">
          {/* Customer header */}
          <div className="flex items-start justify-between gap-6">
            <div className="flex flex-col gap-1.5">
              <h2 className="font-display text-[24px]">
                {order.customer?.name ?? "Guest"}
              </h2>
              <span className="font-mono text-[11px] text-ink/60">
                {order.customer?.email}
              </span>
              <span className="font-mono text-[11px] text-ink/60">
                Placed{" "}
                {order.placedAt.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <StatusPill tone={ORDER_TONE[order.status] ?? "mute"}>
              {ORDER_LABEL[order.status] ?? order.status}
            </StatusPill>
          </div>

          {/* Line items */}
          <div className="flex flex-col">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-6 border-b border-ink/10 py-4"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-display text-[17px]">{item.name}</span>
                  <span className="font-mono text-[11px] text-ink/60">
                    {item.reference}
                    {item.size ? ` · US ${item.size}` : ""}
                    {item.giftWrap ? " · gift wrapped" : ""}
                  </span>
                  <span className="text-[12px] text-ink/60">{item.materialLine}</span>
                  {item.engraving && (
                    <span className="text-[12px] text-ink/80">
                      Engraving: {item.engraving}
                    </span>
                  )}
                </div>
                <span className="font-mono text-[13px]">
                  {showMoney ? formatPrice(item.unitPriceCents) : "—"}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          {showMoney && (
            <dl className="ml-auto flex w-[280px] flex-col gap-2.5 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-ink/68">Subtotal</dt>
                <dd className="font-mono">{formatPrice(order.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink/68">Shipping</dt>
                <dd className="font-mono">Included</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink/68">Tax</dt>
                <dd className="font-mono">{formatPrice(order.taxCents)}</dd>
              </div>
              <div className="flex justify-between border-t border-ink/12 pt-2.5">
                <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/60">
                  Total
                </dt>
                <dd className="font-display text-[20px]">
                  {order.status === "refunded" ? "−" : ""}
                  {formatPrice(order.totalCents)}
                </dd>
              </div>
            </dl>
          )}

          <div className="grid grid-cols-2 gap-8">
            <div className="flex flex-col gap-2.5">
              <MonoLabel>Ship to</MonoLabel>
              <p className="whitespace-pre-line text-[13px] leading-[1.6] text-ink/85">
                {order.shippingAddress ?? "—"}
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              <MonoLabel>Payment</MonoLabel>
              <p className="text-[13px] leading-[1.6] text-ink/85">
                {order.paymentProvider === "wire"
                  ? "Bank transfer"
                  : order.paymentProvider === "stripe"
                    ? "Card"
                    : "—"}
                {order.paymentRef && (
                  <>
                    <br />
                    <span className="font-mono text-[11px] text-ink/60">
                      {order.paymentRef}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex flex-col gap-3">
            <MonoLabel>Timeline</MonoLabel>
            <ol className="flex flex-col">
              {order.events.map((event) => (
                <li
                  key={event.id}
                  className="grid grid-cols-[130px_1fr_140px] gap-4 border-b border-ink/10 py-3"
                >
                  <span className="font-mono text-[11px] text-ink/60">
                    {event.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span className="text-[13px]">{event.body}</span>
                  <span className="truncate font-mono text-[11px] text-ink/50">
                    {event.actor}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {order.notes.length > 0 && (
            <div className="flex flex-col gap-3">
              <MonoLabel>Studio notes (internal)</MonoLabel>
              {order.notes.map((note) => (
                <div key={note.id} className="border-l-2 border-ink/20 pl-4">
                  <p className="text-[13px] leading-[1.6]">{note.body}</p>
                  <span className="font-mono text-[11px] text-ink/50">
                    {note.author} ·{" "}
                    {note.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right rail */}
        <div className="flex flex-col overflow-y-auto border-l border-ink/12">
          <OrderActions
            orderId={order.id}
            status={order.status}
            provider={order.paymentProvider}
            canTakeMoney={showMoney}
          />
          <InternalNote orderId={order.id} />

          <div className="flex flex-col gap-3 bg-paper-alt px-6 py-[22px]">
            <MonoLabel>Customer</MonoLabel>
            <div className="flex flex-col gap-1.5 text-[13px]">
              <span>{order.customer?.name ?? "Guest"}</span>
              <span className="font-mono text-[11px] text-ink/60">
                {order.customer?.email}
              </span>
              {order.customer?.location && (
                <span className="text-[12px] text-ink/68">
                  {order.customer.location}
                </span>
              )}
              {order.customer?.note && (
                <p className="mt-2 text-[12px] leading-[1.6] text-ink/72">
                  {order.customer.note}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
