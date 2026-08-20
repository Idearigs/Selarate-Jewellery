import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyColumn } from "@/components/storefront/buy-column";
import { PieceDetails } from "@/components/storefront/piece-details";
import { ProductCard } from "@/components/storefront/product-card";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { Reveal } from "@/components/ui/reveal";
import { getPieceBySlug, listAllSlugs } from "@/lib/db/queries/pieces";
import { formatPrice } from "@/lib/format";
import { JsonLd, breadcrumbJsonLd, productJsonLd } from "@/lib/seo/jsonld";

/**
 * Product detail.
 *
 * Statically generated with every SEO-relevant fact in the initial HTML —
 * copy, specs, story, price, JSON-LD. Live availability is deliberately NOT
 * here: it arrives through <BuyColumn>, which fetches a no-store endpoint.
 * That split is what lets the page be both cacheable and correct.
 */
export const revalidate = 3600;

export async function generateStaticParams() {
  // Only meaningful at build time — dev renders on demand regardless. Skipping
  // it in dev also avoids a second worker process opening the embedded
  // database, which it cannot share. See DEVELOPMENT.md.
  if (process.env.NEXT_PHASE !== "phase-production-build") return [];

  const slugs = await listAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const piece = await getPieceBySlug(slug);
  if (!piece) return {};

  const description =
    piece.story || `${piece.material}. ${formatPrice(piece.priceCents)}.`;

  return {
    title: piece.name,
    description,
    alternates: { canonical: `/piece/${piece.slug}` },
    openGraph: {
      title: piece.name,
      description,
      type: "website",
      url: `/piece/${piece.slug}`,
    },
  };
}

export default async function PiecePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const piece = await getPieceBySlug(slug);
  if (!piece) notFound();

  const categoryLabel =
    piece.category === "ooak" ? "One of a Kind" : "Fine Jewelry";
  const categoryHref = `/collection?category=${piece.category}`;

  const [primary, ...rest] = piece.images;

  return (
    <>
      <JsonLd data={productJsonLd(piece, piece.sold)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Collection", path: "/collection" },
          { name: categoryLabel, path: categoryHref },
          { name: piece.name, path: `/piece/${piece.slug}` },
        ])}
      />

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        /* Each crumb kept on one line and the row scrolled sideways instead.
           These labels are long in mono at 0.14em tracking — "One of a Kind"
           alone is most of a phone width — so as flex items they shrank and
           wrapped, breaking every crumb across two lines with the separators
           stranded between them. Same treatment as the category tabs. */
        className="scrollbar-none page-x flex items-center gap-3 overflow-x-auto py-6 font-mono text-[10px] whitespace-nowrap uppercase tracking-[0.14em] text-ink/80 [&>*]:shrink-0 md:overflow-visible"
      >
        <Link href="/collection">Collection</Link>
        <span aria-hidden="true" className="text-ink/30">
          /
        </span>
        <Link href={categoryHref}>{categoryLabel}</Link>
        <span aria-hidden="true" className="text-ink/30">
          /
        </span>
        <span className="text-ink">{piece.name}</span>
      </nav>

      {/* Gallery left, buy column right */}
      <div className="grid items-start xl:grid-cols-2">
        {/*
          Pinned on desktop. The buy column is much the taller of the two, so
          letting the plate scroll away means the specifications are read with
          nothing to look at. Sticky rather than fixed, so it releases by itself
          at the end of the grid row.

          Its width is derived from the viewport HEIGHT rather than the column
          width. At 50vw a 4:5 frame is 1200px tall on a 1920px screen and the
          bottom third of the piece sits below the fold — on a product page,
          being unable to see the piece whole without scrolling is the one
          failure that matters. 0.62 is the reciprocal of the stack own
          proportion: 1.25 for the plate, plus a third again for the thumbnail
          rail and its gap.
        */}
        <div className="page-x xl:sticky xl:top-0 xl:flex xl:h-svh xl:items-center xl:justify-center xl:py-3 xl:pr-8">
          <div className="flex w-full flex-col gap-2">
          <div className="relative">
            <PlaceholderImage
              src={primary?.url}
              alt={primary?.alt ?? piece.name}
              label="PRIMARY — 4:5"
              ratio="product"
              priority
              /* Desktop drops the 4:5 lock. Width and height cannot both be
                 chosen for a fixed ratio, and on this page the horizontal space
                 is what was going spare: at 4:5 the plate stopped ~290px short
                 of the column edge in order to keep its height inside the
                 viewport. Here the height is pinned to the viewport budget and
                 the width takes whatever is left, giving roughly 7:6.

                 Mobile keeps 4:5 — there is no spare width to reclaim there,
                 and the handoff ratio still governs cards and the collection. */
              className="xl:aspect-auto xl:h-[calc(100svh-136px)]"
              sizes="(min-width: 1280px) 50vw, 100vw"
            />
            <span className="absolute left-5 top-5 border border-ink/35 bg-paper px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em]">
              {piece.tag}
            </span>
          </div>

          {/* Thumbnail rail. Mobile swipes the main frame instead. */}
          <div className="grid grid-cols-3 gap-2">
            {(rest.length ? rest : [null, null, null]).map((shot, i) => (
              <PlaceholderImage
                key={shot?.url ?? i}
                src={shot?.url}
                alt={shot?.alt ?? ""}
                label={["DETAIL", "PROFILE", "SCALE"][i] ?? "DETAIL"}
                ratio="square"
                className="xl:aspect-auto xl:h-[104px]"
                sizes="(min-width: 1280px) 13vw, 33vw"
              />
            ))}
          </div>
          </div>
        </div>

        <div className="page-x flex flex-col gap-8 pt-10 xl:pl-8 xl:pt-1">
          <div className="flex flex-col gap-3.5">
            <p className="font-mono text-label uppercase tracking-[0.22em] text-ink/64">
              Ref. {piece.reference}
              {piece.season ? ` · ${piece.season}` : ""}
            </p>
            <h1 className="text-title-m xl:text-[58px] xl:leading-[1.05]">
              {piece.name}
            </h1>
            <p className="text-[20px] tracking-[0.06em]">
              {formatPrice(piece.priceCents)}
            </p>
          </div>

          {/* The material line is the fallback, not the intent — a piece with
              no story still needs something under the price. */}
          <p className="max-w-[520px] text-body leading-[1.8] text-ink/72">
            {piece.story || piece.material}
          </p>

          <BuyColumn piece={piece} />

          <PieceDetails piece={piece} />
        </div>
      </div>

      {/* There is no second "On this piece" section. `piece.story` is a single
          paragraph and the buy column already renders it, directly under the
          price where it informs the decision; repeating the same sentences a
          screen further down read as a template with a slot left unfilled. */}

      {/* Related */}
      {piece.related.length > 0 && (
        <Reveal as="section" className="page-x border-t border-ink/12 py-16 xl:py-26">
          <h2 className="text-section-m xl:text-section">Other pieces</h2>
          <div className="mt-10 grid grid-cols-2 gap-8 xl:grid-cols-3">
            {piece.related.map((p) => (
              <ProductCard key={p.slug} piece={p} />
            ))}
          </div>
        </Reveal>
      )}

    </>
  );
}
