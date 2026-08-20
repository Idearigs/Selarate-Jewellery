import Link from "next/link";
import { Topbar } from "@/components/admin/topbar";
import {
  Dot,
  KpiCell,
  MonoLabel,
  SectionHeading,
  StatusPill,
  TableHead,
  TableRow,
} from "@/components/admin/primitives";
import { getDashboard, ORDER_LABEL, ORDER_TONE } from "@/lib/db/queries/admin";
import { getSessionUser, can } from "@/lib/auth";
import { formatPrice, minutesRemaining } from "@/lib/format";

export const dynamic = "force-dynamic";

const ORDER_COLUMNS = "96px 1.4fr 1fr 100px 110px";

export default async function DashboardPage() {
  const user = (await getSessionUser())!;
  const data = await getDashboard();
  const showMoney = can(user.role, "financials");

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // The queue the owner actually works from, most time-critical first.
  const alerts = [
    ...data.expiringHolds.map((h) => ({
      tone: "warn" as const,
      kind: "Expiring hold",
      body: `${h.name} is held for another ${minutesRemaining(h.expiresAt)} minutes.`,
      cta: "Open piece",
      href: `/piece/${h.slug}`,
    })),
    ...data.unanswered.map((e) => ({
      tone: "bad" as const,
      kind: "Unanswered enquiry",
      body: `${e.name}: ${e.message.slice(0, 90)}${e.message.length > 90 ? "…" : ""}`,
      cta: "Reply",
      href: `mailto:${e.email}`,
    })),
    ...data.lowStock.map((m) => ({
      tone: "bad" as const,
      kind: "Below reorder point",
      body: `${m.name} — ${m.qty} ${m.unit} remaining.`,
      cta: "Open inventory",
      href: "/admin/inventory",
    })),
    ...(data.draftCount > 0
      ? [
          {
            tone: "mute" as const,
            kind: "Unfinished drafts",
            body: `${data.draftCount} ${data.draftCount === 1 ? "piece is" : "pieces are"} still in draft and invisible to the storefront.`,
            cta: "Open pieces",
            href: "/admin/pieces?filter=Draft",
          },
        ]
      : []),
  ];

  return (
    <>
      <Topbar
        title="Dashboard"
        meta={today}
        action={{ label: "New piece", href: "/admin/pieces/new" }}
      />

      {/* Flex column so the two-pane row below the KPIs fills the viewport —
          the bench queue pins to the bottom of the right column. */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="grid shrink-0 grid-cols-4">
          <KpiCell
            label="Revenue 30d"
            value={showMoney ? formatPrice(data.kpis.revenueCents) : "—"}
            note={showMoney ? "Paid and beyond" : "Hidden for your role"}
          />
          <KpiCell
            label="Pieces live"
            value={String(data.kpis.piecesLive)}
            note="One of a kind, unsold"
          />
          <KpiCell
            label="Awaiting dispatch"
            value={String(data.kpis.awaitingDispatch)}
            note="Paid or on the bench"
          />
          <KpiCell
            label="Open enquiries"
            value={String(data.kpis.openConversations)}
            note="Awaiting a reply"
          />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[1.5fr_1fr]">
          {/* Recent orders */}
          <div className="flex flex-col border-r border-ink/12">
            <SectionHeading title="Recent orders">
              <Link
                href="/admin/orders"
                className="border-b border-ink/30 pb-0.5 text-[11px] uppercase tracking-[0.14em] text-ink/70 hover:border-ink hover:text-ink"
              >
                View all
              </Link>
            </SectionHeading>

            <TableHead
              className="border-t border-ink/12"
              template={ORDER_COLUMNS}
              columns={[
                { label: "Order" },
                { label: "Customer" },
                { label: "Piece" },
                { label: "Status" },
                { label: "Total", align: "right" },
              ]}
            />

            {data.recentOrders.map((o) => (
              <TableRow
                key={o.id}
                href={`/admin/orders/${o.id}`}
                columns={ORDER_COLUMNS}
              >
                <span className="font-mono text-[12px]">{o.number}</span>
                <span className="truncate text-[13px]">
                  {o.customerName ?? o.customerEmail ?? "—"}
                </span>
                <span className="truncate text-[13px] text-ink/68">
                  {o.piece ?? "—"}
                </span>
                <StatusPill tone={ORDER_TONE[o.status] ?? "mute"}>
                  {ORDER_LABEL[o.status] ?? o.status}
                </StatusPill>
                <span className="text-right font-mono text-[12px]">
                  {showMoney ? formatPrice(o.totalCents) : "—"}
                </span>
              </TableRow>
            ))}

            {data.recentOrders.length === 0 && (
              <p className="px-7 py-10 text-[13px] text-ink/60">
                No orders yet.
              </p>
            )}
          </div>

          {/* Needs attention */}
          <div className="flex flex-col">
            <div className="flex items-baseline justify-between gap-5 border-b border-ink/12 px-7 pb-3.5 pt-5">
              <h2 className="font-display text-[19px]">Needs attention</h2>
              <span className="font-mono text-[11px] text-ink/60">
                {alerts.length}
              </span>
            </div>

            {alerts.map((alert, i) => (
              <div
                key={`${alert.kind}-${i}`}
                className="flex flex-col gap-1.5 border-b border-ink/10 px-7 py-4"
              >
                <div className="flex items-center gap-2.5">
                  <Dot tone={alert.tone} />
                  <MonoLabel className="tracking-[0.14em]">{alert.kind}</MonoLabel>
                </div>
                <span className="text-[13px] leading-[1.55]">{alert.body}</span>
                <Link
                  href={alert.href}
                  className="w-fit border-b border-ink/30 pb-0.5 text-[11px] uppercase tracking-[0.14em] text-ink/70 hover:border-ink hover:text-ink"
                >
                  {alert.cta}
                </Link>
              </div>
            ))}

            {alerts.length === 0 && (
              <p className="px-7 py-10 text-[13px] text-ink/60">
                Nothing needs attention. The bench is clear.
              </p>
            )}

            {/* Bench queue — workshop status, deliberately NOT order status. */}
            <div className="mt-auto flex flex-col gap-3.5 bg-paper-alt px-7 py-5">
              <MonoLabel>Bench queue</MonoLabel>
              {data.recentOrders
                .filter((o) => o.status === "in_studio" || o.status === "paid")
                .slice(0, 3)
                .map((o, i) => (
                  <div key={o.id} className="flex flex-col gap-[7px]">
                    <div className="flex justify-between text-[13px]">
                      <span className="truncate">{o.piece ?? o.number}</span>
                      <span className="font-mono text-[11px] text-ink/62">
                        {o.status === "paid" ? "Not started" : "In studio"}
                      </span>
                    </div>
                    <div className="h-[3px] w-full bg-ink/12">
                      <div
                        className="h-full bg-ink"
                        style={{ width: `${o.status === "paid" ? 10 : 40 + i * 20}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
