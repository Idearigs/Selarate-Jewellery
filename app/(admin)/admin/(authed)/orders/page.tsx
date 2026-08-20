import { Topbar } from "@/components/admin/topbar";
import {
  FilterChip,
  StatusPill,
  TableHead,
  TableRow,
} from "@/components/admin/primitives";
import { listAdminOrders, ORDER_LABEL, ORDER_TONE } from "@/lib/db/queries/admin";
import { can, requirePermission } from "@/lib/auth";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

const COLUMNS = "100px 1.3fr 1.3fr 120px 120px 110px";

/**
 * "Enquiry" is a first-class order state, not a pre-order limbo — five-figure
 * pieces are routinely negotiated (and paid by wire) before any card is charged.
 */
const FILTERS = [
  "All",
  "Enquiry",
  "Paid",
  "In studio",
  "Dispatched",
  "Refunded",
];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requirePermission("orders");
  const showMoney = can(user.role, "financials");

  const { filter = "All" } = await searchParams;
  const orders = await listAdminOrders(filter);
  const all = await listAdminOrders("All");

  const thisMonth = all.filter(
    (o) => o.placedAt.getMonth() === new Date().getMonth(),
  );
  const monthTotal = thisMonth
    .filter((o) => o.status !== "refunded" && o.status !== "cancelled")
    .reduce((sum, o) => sum + o.totalCents, 0);

  return (
    <>
      <Topbar
        title="Orders"
        meta={
          showMoney
            ? `${thisMonth.length} this month · ${formatPrice(monthTotal)}`
            : `${thisMonth.length} this month`
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between gap-5 border-b border-ink/12 px-7 py-3.5">
          <div className="flex gap-2">
            {FILTERS.map((f) => (
              <FilterChip
                key={f}
                href={`/admin/orders${f === "All" ? "" : `?filter=${encodeURIComponent(f)}`}`}
                active={filter === f}
              >
                {f}
              </FilterChip>
            ))}
          </div>
          <span className="font-mono text-[11px] text-ink/60">
            {orders.length} shown
          </span>
        </div>

        <TableHead
          template={COLUMNS}
          columns={[
            { label: "Order" },
            { label: "Customer" },
            { label: "Piece" },
            { label: "Placed" },
            { label: "Status" },
            { label: "Total", align: "right" },
          ]}
        />

        {orders.map((o) => (
          <TableRow key={o.id} href={`/admin/orders/${o.id}`} columns={COLUMNS}>
            <span className="font-mono text-[12px]">{o.number}</span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[13px]">
                {o.customerName ?? "—"}
              </span>
              <span className="truncate font-mono text-[11px] text-ink/60">
                {o.customerEmail ?? ""}
              </span>
            </span>
            <span className="truncate text-[13px] text-ink/68">
              {o.piece ?? "—"}
            </span>
            <span className="font-mono text-[12px] text-ink/68">
              {o.placedAt.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })}
            </span>
            <StatusPill tone={ORDER_TONE[o.status] ?? "mute"}>
              {ORDER_LABEL[o.status] ?? o.status}
            </StatusPill>
            <span className="text-right font-mono text-[12px]">
              {!showMoney
                ? "—"
                : o.status === "refunded"
                  ? `−${formatPrice(o.totalCents)}`
                  : formatPrice(o.totalCents)}
            </span>
          </TableRow>
        ))}

        {orders.length === 0 && (
          <p className="px-7 py-10 text-[13px] text-ink/60">
            No orders match this filter.
          </p>
        )}
      </div>
    </>
  );
}
