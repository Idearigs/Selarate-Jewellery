import type { Metadata } from "next";
import Link from "next/link";
import { CategoryTab, ChipLink } from "@/components/ui/chip";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { ProductCard } from "@/components/storefront/product-card";
import { Reveal } from "@/components/ui/reveal";
import { UnderlineLink } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/categories";
import { listPieces } from "@/lib/db/queries/pieces";
import { FILTERS, type Category, type Filter } from "@/lib/types";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";

/**
 * Serves both product categories from one page via tabs.
 *
 * State lives in the URL (?category=&filter=&sort=) rather than in React, which
 * makes every category/filter combination independently linkable, shareable and
 * crawlable. That is an SEO requirement on a ten-piece catalogue, not a
 * stylistic preference.
 */
export const revalidate = 3600;

/* Shared with the homepage entry section — the blurb is also this page's meta
   description, so two copies drifting would be an SEO defect. */
const COPY = CATEGORIES;

type Search = { category?: string; filter?: string; sort?: string };

function parse(search: Search) {
  const category: Category = search.category === "fine" ? "fine" : "ooak";
  const filter: Filter = (FILTERS as readonly string[]).includes(
    search.filter ?? "",
  )
    ? (search.filter as Filter)
    : "All";
  const ascending = search.sort === "asc";
  return { category, filter, ascending };
}

/** Preserves the other params when building a link — tabs must not lose sort. */
function href(base: ReturnType<typeof parse>, patch: Partial<ReturnType<typeof parse>>) {
  const next = { ...base, ...patch };
  const params = new URLSearchParams({ category: next.category });
  if (next.filter !== "All") params.set("filter", next.filter);
  if (next.ascending) params.set("sort", "asc");
  return `/collection?${params.toString()}`;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<Metadata> {
  const { category } = parse(await searchParams);
  const copy = COPY[category];
  return {
    title: copy.title,
    description: copy.blurb,
    alternates: { canonical: `/collection?category=${category}` },
  };
}

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const state = parse(await searchParams);
  const copy = COPY[state.category];
  const pieces = await listPieces(state);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Collection", path: "/collection" },
          { name: copy.title, path: `/collection?category=${state.category}` },
        ])}
      />

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
        <span className="text-ink">{copy.title}</span>
      </nav>

      {/* Title block */}
      <section className="page-x grid gap-8 pb-12 xl:grid-cols-2 xl:items-end">
        <div className="flex flex-col gap-4">
          <h1 className="text-title-m xl:text-title">{copy.title}</h1>
          <p className="font-mono text-label uppercase tracking-[0.18em] text-ink/64">
            {pieces.length === 1
              ? "1 piece available"
              : `${pieces.length} pieces available`}
          </p>
        </div>
        <p className="max-w-[520px] text-body text-ink/72 xl:justify-self-end">
          {copy.blurb}
        </p>
      </section>

      {/* Category tabs — the indicator sits on the section's own 1px rule. */}
      <div className="page-x border-b border-ink/12">
        <div
          role="tablist"
          aria-label="Categories"
          /* Centred on a phone, left-aligned from md. The two labels come to
             ~300px, which fits inside the 350px a 390px screen leaves after the
             page margin, so centring them does not push either out of reach. */
          className="scrollbar-none -mx-5 flex justify-center overflow-x-auto px-5 md:mx-0 md:justify-start md:overflow-visible md:px-0"
        >
          <CategoryTab
            active={state.category === "ooak"}
            href={href(state, { category: "ooak", filter: "All" })}
          >
            One of a Kind
          </CategoryTab>
          <CategoryTab
            active={state.category === "fine"}
            href={href(state, { category: "fine", filter: "All" })}
          >
            Fine Jewelry
          </CategoryTab>
        </div>
      </div>

      {/* Filters + price sort */}
      <div className="page-x flex flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between">
        {/* Underlined on desktop, filled and horizontally scrolling on mobile. */}
        <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:gap-7 md:overflow-visible md:px-0">
          {FILTERS.map((f) => (
            <ChipLink
              key={f}
              href={href(state, { filter: f })}
              active={state.filter === f}
              variant="filled"
              className="md:hidden"
            >
              {f}
            </ChipLink>
          ))}
          {FILTERS.map((f) => (
            <ChipLink
              key={`d-${f}`}
              href={href(state, { filter: f })}
              active={state.filter === f}
              variant="underline"
              className="hidden md:inline-flex"
            >
              {f}
            </ChipLink>
          ))}
        </div>

        <ChipLink
          href={href(state, { ascending: !state.ascending })}
          active
          variant="underline"
          className="shrink-0"
        >
          Price {state.ascending ? "↑" : "↓"}
        </ChipLink>
      </div>

      {/* Grid. The heading is visually hidden — the design has no title over
          the grid, but product names are h3, and jumping h1 → h3 breaks the
          document outline for screen-reader users navigating by heading. */}
      <section
        aria-labelledby="pieces-heading"
        className="page-x grid grid-cols-1 gap-x-8 gap-y-10 pb-16 md:grid-cols-2 xl:grid-cols-3 xl:pb-26"
      >
        <h2 id="pieces-heading" className="sr-only">
          {copy.title} &mdash; {pieces.length}{" "}
          {pieces.length === 1 ? "piece" : "pieces"}
        </h2>
        {pieces.map((p, i) => (
          <ProductCard
            key={p.slug}
            piece={p}
            showTag
            priority={i === 0}
            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
          />
        ))}
        {pieces.length === 0 && (
          <p className="py-16 text-body text-ink/72">
            Nothing in this category at the moment.{" "}
            <Link href="/collection" className="border-b border-ink/30">
              See the whole collection
            </Link>
            .
          </p>
        )}
      </section>

      {/* Commissions band */}
      <Reveal as="section" className="grid bg-paper-alt xl:grid-cols-2">
        <div className="page-x flex flex-col justify-center gap-6 py-16 xl:px-18 xl:py-24">
          <p className="font-mono text-label uppercase tracking-[0.22em] text-ink/64">
            Commissions
          </p>
          <h2 className="text-section-m leading-[1.18] xl:text-[40px]">
            A piece drawn around your own stone.
          </h2>
          <p className="max-w-[420px] text-body text-ink/72">
            The studio takes a small number of commissions each year. It begins
            with a conversation about the stone and how the piece will be worn.
          </p>
          <UnderlineLink href="/contact" className="border-ink tracking-[0.18em]">
            Begin a commission
          </UnderlineLink>
        </div>
        <PlaceholderImage
          src={null}
          label="SKETCH — wax model and drawing"
          ratio="free"
          tone="paper-alt"
          sizes="(min-width: 1280px) 50vw, 100vw"
          className="aspect-[4/5] xl:aspect-auto xl:min-h-[520px]"
        />
      </Reveal>
    </>
  );
}
