import { Topbar } from "@/components/admin/topbar";
import {
  FilterChip,
  StatusPill,
  TableHead,
  TableRow,
} from "@/components/admin/primitives";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { listAdminPieces, PIECE_TONE } from "@/lib/db/queries/admin";
import { requirePermission } from "@/lib/auth";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

const COLUMNS = "56px 1.6fr 130px 110px 70px 110px 80px";

const FILTERS = ["All", "One of a Kind", "Fine Jewelry", "Draft", "Sold"];

export default async function PiecesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requirePermission("pieces");

  const { filter = "All" } = await searchParams;
  const pieces = await listAdminPieces(filter);
  const all = await listAdminPieces("All");

  const live = all.filter((p) => p.status === "Live").length;
  const drafts = all.filter((p) => p.status === "Draft").length;
  const archived = all.filter((p) => p.status === "Archived").length;

  return (
    <>
      <Topbar
        title="Pieces"
        meta={`${live} live · ${drafts} drafts · ${archived} archived`}
        action={{ label: "New piece", href: "/admin/pieces/new" }}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between gap-5 border-b border-ink/12 px-7 py-3.5">
          <div className="flex gap-2">
            {FILTERS.map((f) => (
              <FilterChip
                key={f}
                href={`/admin/pieces${f === "All" ? "" : `?filter=${encodeURIComponent(f)}`}`}
                active={filter === f}
              >
                {f}
              </FilterChip>
            ))}
          </div>
          <span className="font-mono text-[11px] text-ink/60">
            {pieces.length} shown
          </span>
        </div>

        <TableHead
          template={COLUMNS}
          columns={[
            { label: "" },
            { label: "Piece" },
            { label: "Category" },
            { label: "Status" },
            { label: "Stock" },
            { label: "Price", align: "right" },
            { label: "Views", align: "right" },
          ]}
        />

        {pieces.map((p) => (
          <TableRow key={p.id} href={`/admin/pieces/${p.id}`} columns={COLUMNS}>
            <PlaceholderImage
              src={null}
              label=""
              ratio="product"
              labelPosition="bottom"
              className="w-full"
            />
            <span className="flex flex-col gap-1">
              <span className="font-display text-[16px]">{p.name}</span>
              <span className="font-mono text-[11px] text-ink/60">
                {p.reference} · {p.materialLine}
              </span>
            </span>
            <span className="text-[13px] text-ink/68">{p.category}</span>
            <StatusPill tone={PIECE_TONE[p.status]}>{p.status}</StatusPill>
            <span className="font-mono text-[12px]">{p.stock}</span>
            <span className="text-right font-mono text-[12px]">
              {formatPrice(p.priceCents)}
            </span>
            <span className="text-right font-mono text-[12px] text-ink/60">
              {p.views.toLocaleString("en-US")}
            </span>
          </TableRow>
        ))}

        {pieces.length === 0 && (
          <p className="px-7 py-10 text-[13px] text-ink/60">
            Nothing matches this filter.
          </p>
        )}
      </div>
    </>
  );
}
