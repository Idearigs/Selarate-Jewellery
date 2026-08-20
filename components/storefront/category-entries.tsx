import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { UnderlineLink } from "@/components/ui/button";
import { CATEGORIES, CATEGORY_ORDER } from "@/lib/categories";
import type { Category } from "@/lib/types";

/**
 * The two entrances to the catalogue, side by side.
 *
 * The whole point of this section is air: a tall frame with the piece small and
 * centred inside it, then a lot of space before the words. That emptiness is
 * the luxury signal, so the padding here is not decoration and should not be
 * tightened to fit more above the fold.
 *
 * Centred, unusually for this build — everything else is left-aligned. Two
 * symmetrical columns are the one place a centred axis reads as composed rather
 * than as a default, and the reference the studio supplied is centred too.
 */

/**
 * Stand-in photography. These want a dedicated pair shot on one ground with the
 * piece small in frame; until then these are the two brightest images to hand,
 * which is what the airy composition needs. See public/photography/CREDITS.md.
 */
const IMAGES: Record<Category, { src: string; alt: string }> = {
  ooak: {
    src: "/photography/ember-band-1.jpg",
    alt: "A gold band set with warm orange stones, photographed against a pale ground.",
  },
  fine: {
    src: "/photography/meridian-cuff-1.jpg",
    alt: "A banded gold cuff standing upright on a pale surface.",
  },
};

export function CategoryEntries() {
  return (
    <section
      aria-label="Browse by category"
      className="border-t border-ink/12"
    >
      <div className="page-x grid gap-16 py-16 md:grid-cols-2 md:gap-10 xl:gap-20 xl:py-26">
        {CATEGORY_ORDER.map((category) => {
          const copy = CATEGORIES[category];
          const image = IMAGES[category];

          return (
            <article key={category} className="flex flex-col items-center gap-8">
              {/* A tall 3:4 frame. The reference gets its air from the
                  photography itself — the piece small on an empty ground — so
                  this is the shot-list instruction, not something the layout
                  can fake. Until those exist, the frame simply fills. */}
              <PlaceholderImage
                src={image.src}
                alt={image.alt}
                label={`${copy.title.toUpperCase()} — 3:4`}
                ratio="editorial"
                sizes="(min-width: 1280px) 440px, (min-width: 768px) 380px, 90vw"
                /* Capped, not fluid. Left to fill a half-column this becomes
                   1500px tall on a wide monitor, which reads as a banner rather
                   than a composed plate — the air around the piece is the
                   point, and air only exists if the image stops growing. */
                className="w-full max-w-[320px] md:max-w-[380px] xl:max-w-[440px]"
              />

              <div className="flex max-w-[420px] flex-col items-center gap-4 text-center">
                <h3 className="font-display text-[28px] leading-[1.15] xl:text-[32px]">
                  {copy.title}
                </h3>
                <p className="text-body-sm leading-[1.7] text-ink/72">
                  {copy.teaser}
                </p>
                <UnderlineLink
                  href={copy.href}
                  className="mt-1 border-ink tracking-[0.18em]"
                >
                  {copy.cta}
                </UnderlineLink>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
