import { Topbar } from "@/components/admin/topbar";
import { TableHead, TableRow } from "@/components/admin/primitives";
import { listCustomers } from "@/lib/db/queries/admin";
import { can, requirePermission } from "@/lib/auth";
import { recordRead } from "@/lib/audit";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * The note column is the most useful field on this page for this business —
 * ring size, metal preference, the occasion — so it gets real width, more than
 * any other column here.
 */
const COLUMNS = "1.4fr 130px 70px 110px 110px 1.6fr";

export default async function CustomersPage() {
  const user = await requirePermission("customers");
  const showMoney = can(user.role, "financials");
  // Names, emails, locations and free-text notes about real people.
  recordRead(user, "customer");
  const customers = await listCustomers();

  return (
    <>
      <Topbar
        title="Customers"
        meta={`${customers.length} ${customers.length === 1 ? "record" : "records"}`}
      />

      <div className="flex-1 overflow-y-auto">
        <TableHead
          template={COLUMNS}
          columns={[
            { label: "Customer" },
            { label: "Location" },
            { label: "Orders", align: "right" },
            { label: "Lifetime", align: "right" },
            { label: "Last seen" },
            { label: "Note" },
          ]}
        />

        {customers.map((c) => {
          const initials = (c.name ?? c.email)
            .split(/[\s@.]/)
            .filter(Boolean)
            .map((p) => p[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();

          return (
            <TableRow key={c.id} columns={COLUMNS}>
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex size-[30px] shrink-0 items-center justify-center bg-ink/8 font-mono text-[10px]">
                  {initials}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[13px]">{c.name ?? "—"}</span>
                  <span className="truncate font-mono text-[11px] text-ink/60">
                    {c.email}
                  </span>
                </span>
              </span>
              <span className="truncate text-[13px] text-ink/68">
                {c.location ?? "—"}
              </span>
              <span className="text-right font-mono text-[12px]">{c.orderCount}</span>
              <span className="text-right font-mono text-[12px]">
                {showMoney ? formatPrice(c.lifetimeCents) : "—"}
              </span>
              <span className="font-mono text-[12px] text-ink/68">
                {c.lastSeenAt
                  ? c.lastSeenAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })
                  : "—"}
              </span>
              <span className="text-[12px] leading-[1.55] text-ink/72">
                {c.note ?? ""}
              </span>
            </TableRow>
          );
        })}

        {customers.length === 0 && (
          <p className="px-7 py-10 text-[13px] text-ink/60">
            No customers yet.
          </p>
        )}
      </div>
    </>
  );
}
