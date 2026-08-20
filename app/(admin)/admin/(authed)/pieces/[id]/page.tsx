import { notFound } from "next/navigation";
import { Topbar } from "@/components/admin/topbar";
import { PieceEditor, type PieceFormValues } from "@/components/admin/piece-editor";
import { getAdminPiece } from "@/lib/db/queries/admin";
import { requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

const BLANK: PieceFormValues = {
  name: "",
  slug: "",
  reference: "",
  category: "ooak",
  availability: "draft",
  priceCents: 0,
  materialLine: "",
  filterTag: "Rings",
  story: "",
  season: "",
  defaultSize: "",
  sizeNote: "",
  sizes: [],
  specs: [],
};

export default async function PieceEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("pieces");
  const { id } = await params;

  // "new" is a route, not an id — nothing else can be managed until pieces
  // exist, so creating one has to be reachable in a click.
  if (id === "new") {
    return (
      <>
        <Topbar title="New piece" meta="Draft" />
        <PieceEditor piece={BLANK} />
      </>
    );
  }

  const row = await getAdminPiece(id);
  if (!row) notFound();

  const piece: PieceFormValues = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    reference: row.reference,
    category: row.category as "ooak" | "fine",
    availability: row.availability,
    priceCents: row.priceCents,
    materialLine: row.materialLine,
    filterTag: row.filterTag,
    story: row.story,
    season: row.season ?? "",
    defaultSize: row.defaultSize ?? "",
    sizeNote: row.sizeNote ?? "",
    sizes: row.sizes.map((s) => s.label),
    specs: row.specs.map((s) => ({ key: s.key, value: s.value })),
  };

  const edited = row.updatedAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <>
      <Topbar title={row.name} meta={`${row.reference} · edited ${edited}`} />
      <PieceEditor piece={piece} />
    </>
  );
}
