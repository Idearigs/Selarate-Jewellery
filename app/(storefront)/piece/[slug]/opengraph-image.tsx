import { notFound } from "next/navigation";
import { getPieceBySlug } from "@/lib/db/queries/pieces";
import { formatPrice } from "@/lib/format";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/seo/og";

export const alt = "A piece from the studio";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/**
 * Per-piece share card. Until photography exists this is typographic — which
 * for this brand is arguably the right card anyway: name, material and price in
 * Marcellus on paper.
 */
export default async function Image({
  params,
}: {
  params: { slug: string };
}) {
  const piece = await getPieceBySlug(params.slug);
  if (!piece) notFound();

  return renderOgImage({
    eyebrow: piece.sold ? "Sold — one of one" : piece.tag,
    title: piece.name,
    meta: `${piece.material} · ${formatPrice(piece.priceCents)}`,
  });
}
