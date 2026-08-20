import { Topbar } from "@/components/admin/topbar";
import {
  KpiCell,
  StatusPill,
  TableHead,
  TableRow,
} from "@/components/admin/primitives";
import { listMaterials, materialKpis, MATERIAL_TONE } from "@/lib/db/queries/admin";
import { requirePermission } from "@/lib/auth";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

const COLUMNS = "1.5fr 1.2fr 110px 100px 110px 130px";

const STATUS_LABEL: Record<string, string> = {
  loose: "Loose",
  set: "Set",
  reserved: "Reserved",
  in_stock: "In stock",
  low: "Low",
  client_owned: "Client owned",
};

/**
 * Studio inventory — loose stone, metal and heirloom material.
 *
 * This is NOT catalogue stock. A stone row and a piece row are different
 * entities linked by a "set in" relation; a sold piece consumes its stone.
 *
 * Origin and acquisition date are load-bearing columns: provenance is a selling
 * point, and stones are often held for years before they are set.
 */
export default async function InventoryPage() {
  await requirePermission("inventory");

  const [materials, kpis] = await Promise.all([listMaterials(), materialKpis()]);

  return (
    <>
      <Topbar
        title="Inventory"
        meta="Loose stone, metal and heirloom stock"
        action={{ label: "Log a purchase", href: "/admin/inventory/new" }}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-4">
          <KpiCell label="Stones held" value={String(kpis.stones)} note="Loose and set" />
          <KpiCell
            label="Stock value"
            value={formatPrice(kpis.valueCents)}
            note="At cost"
          />
          <KpiCell
            label="Below reorder"
            value={String(kpis.low)}
            note="Needs restocking"
          />
          <KpiCell
            label="Client owned"
            value={String(kpis.clientOwned)}
            note="Held for reset"
          />
        </div>

        <TableHead
          template={COLUMNS}
          columns={[
            { label: "Material" },
            { label: "Origin" },
            { label: "Acquired" },
            { label: "Qty", align: "right" },
            { label: "Cost", align: "right" },
            { label: "Status" },
          ]}
        />

        {materials.map((m) => (
          <TableRow key={m.id} columns={COLUMNS}>
            <span className="flex flex-col gap-1">
              <span className="text-[14px]">{m.name}</span>
              <span className="font-mono text-[11px] text-ink/60">{m.ref}</span>
            </span>
            <span className="text-[13px] text-ink/68">{m.origin ?? "—"}</span>
            <span className="font-mono text-[12px] text-ink/68">
              {m.acquiredAt
                ? m.acquiredAt.toLocaleDateString("en-GB", {
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </span>
            <span className="text-right font-mono text-[12px]">
              {m.qty} {m.unit}
            </span>
            <span className="text-right font-mono text-[12px]">
              {m.costCents === null ? "—" : formatPrice(m.costCents)}
            </span>
            <StatusPill tone={MATERIAL_TONE[m.status] ?? "mute"}>
              {STATUS_LABEL[m.status] ?? m.status}
            </StatusPill>
          </TableRow>
        ))}

        {materials.length === 0 && (
          <p className="px-7 py-10 text-[13px] text-ink/60">
            Nothing logged yet.
          </p>
        )}
      </div>
    </>
  );
}
