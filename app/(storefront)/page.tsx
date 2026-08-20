import { ButtonLink, UnderlineLink } from "@/components/ui/button";
import { CategoryEntries } from "@/components/storefront/category-entries";
import { MAKER_NAME } from "@/lib/brand";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { ProductCard } from "@/components/storefront/product-card";
import { Reveal } from "@/components/ui/reveal";
import { Eyebrow } from "@/components/ui/spec-table";
import { listFeaturedPieces } from "@/lib/db/queries/pieces";

/**
 * Homepage — direction 1a ("Atelier"). Directions 1b (Vitrine) and 1c (Ledger)
 * in the handoff are reference only and are deliberately not built.
 *
 * Statically generated: nothing here is visitor-specific, and this is the page
 * most likely to be a search entry point.
 */
export const revalidate = 3600;

export default async function HomePage() {
  const pieces = await listFeaturedPieces(4);

  return (
    <>
      {/* --- Hero: 1.15fr / 1fr, image right ------------------------------ */}
      <section className="grid items-stretch xl:grid-cols-[1.15fr_1fr]">
        {/* Tighter on a phone. At py-16 with a gap-16 between the two blocks
            the copy filled the entire first screen and the photograph — the
            reason anyone stays — began below the fold. Desktop is unchanged. */}
        <div className="page-x order-2 flex flex-col justify-between gap-8 py-10 xl:order-none xl:gap-16 xl:py-26 xl:pb-24 xl:pr-16">
          <div className="flex flex-col gap-5 xl:gap-7">
            <Eyebrow>No. 01 &mdash; Spring Editions</Eyebrow>
            {/* Hard-wrapped into four lines per the design. */}
            <h1 className="text-hero-m xl:text-hero">
              Each piece
              <br />
              made once,
              <br />
              then never
              <br />
              again.
            </h1>
          </div>

          <div className="flex max-w-[430px] flex-col gap-6.5">
            {/* The opening sentence carries the proposition on its own; the
                rest is held back until there is room for it. Kept in the DOM
                rather than swapped out, so the full copy is always in the
                served HTML for crawlers and never duplicated. */}
            <p className="text-body leading-[1.7] text-ink/72">
              Hand-forged in gold and colored stone, one piece at a time.
              <span className="hidden md:inline">
                {" "}
                The studio releases a small number of finished works each season
                &mdash; when a piece is gone, it does not return.
              </span>
            </p>
            <UnderlineLink
              href="/collection"
              arrow
              className="border-ink tracking-[0.18em]"
            >
              Enter the collection
            </UnderlineLink>
          </div>
        </div>

        {/* LCP image. Free height on desktop, 4:5 on mobile. */}
        <PlaceholderImage
          src="/photography/hero-hand.jpg"
          alt="Two hands resting together, wearing slender stacked gold rings."
          label="HERO — hand on ring, 4:5"
          ratio="free"
          priority
          sizes="(min-width: 1280px) 46vw, 100vw"
          /* First on a phone, right-hand column on desktop.
             Trimming padding was not enough: the shape was still a screenful
             of type with the photograph beneath it, so a phone opened on
             words. Leading with the image is what a jewelry storefront is
             for, and the headline follows immediately under it.

             Ratio stays 4:5. A landscape band would fit the fold whole, but
             the source is a tall portrait and cropping it to 5:4 clipped the
             rings at both edges — the product leaving the frame costs more
             than a scroll does. */
          className="order-1 aspect-[4/5] xl:order-none xl:aspect-auto xl:min-h-[660px]"
        />
      </section>

      {/* --- The two ways in ----------------------------------------------
          Ahead of Available Now: the categories are the durable structure of
          the catalogue, while Available Now is a changing window onto four
          pieces. A visitor who wants to browse should meet the doors before
          the display. */}
      <Reveal>
        <CategoryEntries />
      </Reveal>

      {/* --- Available Now ------------------------------------------------ */}
      <Reveal as="section" className="border-t border-ink/12">
        <div className="page-x flex flex-col gap-2 pt-12 md:flex-row md:items-end md:justify-between xl:pt-26">
          <h2 className="pt-8 text-section-m xl:pt-14 xl:text-section">
            Available Now
          </h2>
          <p className="font-mono text-label uppercase tracking-[0.18em] text-ink/64 md:pb-2">
            {pieces.length === 1
              ? "One piece — unique"
              : `${pieces.length} pieces — each unique`}
          </p>
        </div>

        <div className="page-x grid grid-cols-2 gap-8 pb-16 pt-10 xl:grid-cols-4 xl:pb-26">
          {/* No `priority` on the first card. It sits two full sections down
              now, and preloading it only takes bandwidth from the hero, which
              is the actual LCP element. */}
          {pieces.map((p) => (
            <ProductCard key={p.slug} piece={p} />
          ))}
        </div>
      </Reveal>

      {/* --- Maker band --------------------------------------------------- */}
      <Reveal as="section" className="grid bg-paper-alt xl:grid-cols-2">
        <PlaceholderImage
          src="/photography/maker-portrait.jpg"
          alt="Mr. Chamal Jayasingha at his bench, holding a finished gold ring up to the window light."
          label="PORTRAIT — designer at bench"
          ratio="free"
          tone="paper-alt"
          /* 55% horizontal, not 50%. The source is 16:9 and this slot crops to
             4:5 on a phone, which is aggressive; centring put the bench edge
             through his face. At 55% the crop keeps the tools on the left for
             context with his hands and the ring still clear. */
          objectPosition="55% 40%"
          sizes="(min-width: 1280px) 50vw, 100vw"
          className="aspect-[4/5] xl:aspect-auto xl:min-h-[520px]"
        />
        <div className="page-x flex flex-col justify-center gap-6.5 py-16 xl:px-18 xl:py-24">
          <Eyebrow>The Maker</Eyebrow>
          <h2 className="text-section-m leading-[1.18] xl:text-[40px]">
            Twenty-five years at the same bench.
          </h2>
          <p className="max-w-[420px] text-body text-ink/72">
            Gemologist and goldsmith. Every stone is chosen by hand, every
            setting cut and finished in the studio.
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/64">
            {MAKER_NAME}
          </p>
          <UnderlineLink href="/about" className="border-ink tracking-[0.18em]">
            Read the story
          </UnderlineLink>
        </div>
      </Reveal>
    </>
  );
}
