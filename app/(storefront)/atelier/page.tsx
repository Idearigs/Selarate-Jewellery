import type { Metadata } from "next";
import { UnderlineLink } from "@/components/ui/button";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { Reveal } from "@/components/ui/reveal";
import { SpecTable } from "@/components/ui/spec-table";
import { MAKER_NAME } from "@/lib/brand";
import { ATELIER } from "@/lib/content";

/**
 * The Atelier — process and materials.
 *
 * Deliberately not About: that page is biography, this one is how the work is
 * done. The four bench stages are full-width rows rather than cards, so the
 * page reads top to bottom like a sequence rather than a menu.
 */
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "The Atelier",
  description: ATELIER.intro[0],
  alternates: { canonical: "/atelier" },
};

export default function AtelierPage() {
  return (
    <>
      {/* Full-bleed bench hero */}
      <PlaceholderImage
        src="/photography/atelier-bench.jpg"
        alt="The studio bench beneath a north window: a leather tool roll, a soldering torch, a rolling mill, and a wall of labelled drawers behind."
        label="BENCH — wide, under the north window"
        ratio="free"
        priority
        sizes="100vw"
        className="aspect-[3/2] xl:aspect-auto xl:h-[620px]"
      />

      {/* Intro */}
      <section className="page-x grid gap-8 py-16 xl:grid-cols-2 xl:gap-16 xl:py-26">
        <div className="flex flex-col gap-3.5">
          <h1 className="text-title-m xl:text-title">{ATELIER.heading}</h1>
          {/* The bench belongs to someone. A process page that never names the
              pair of hands reads as a factory brochure. */}
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/64">
            {MAKER_NAME} &mdash; Goldsmith and gemologist
          </p>
        </div>
        <div className="flex flex-col gap-6 self-end text-body leading-[1.8] text-ink/75">
          {ATELIER.intro.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </div>
      </section>

      {/* At the bench — four numbered stages as full-width rows */}
      <section className="page-x">
        <h2 className="sr-only">At the bench</h2>
        {ATELIER.stages.map((stage) => (
          <Reveal
            key={stage.n}
            as="article"
            className="grid gap-6 border-t border-ink/12 py-11 xl:grid-cols-[90px_1.1fr_1fr] xl:gap-10"
          >
            <span className="font-mono text-label tracking-[0.18em] text-ink/64">
              {stage.n}
            </span>

            <div className="flex flex-col gap-3.5">
              <h3 className="font-display text-[26px] leading-[1.2]">{stage.title}</h3>
              <p className="max-w-[440px] text-[15px] leading-[1.75] text-ink/75">
                {stage.body}
              </p>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/60">
                {stage.tools}
              </p>
            </div>

            {/* Mobile moves the image inline between title and body; at this
                size the ratio does the same job without reordering the DOM. */}
            <PlaceholderImage
              src={"image" in stage ? stage.image : null}
              alt={"alt" in stage ? stage.alt : undefined}
              label={stage.shot}
              ratio="process"
              sizes="(min-width: 1280px) 40vw, 100vw"
            />
          </Reveal>
        ))}
      </section>

      {/* Materials */}
      <Reveal as="section" className="mt-16 bg-paper-alt xl:mt-26">
        <div className="page-x flex flex-col gap-10 py-16 xl:py-26">
          <h2 className="text-section-m xl:text-section">Materials</h2>
          <div className="grid gap-10 md:grid-cols-3">
            {ATELIER.materials.map((material) => (
              <div key={material.title} className="flex flex-col gap-5">
                <PlaceholderImage
                  src={"image" in material ? material.image : null}
                  alt={"alt" in material ? material.alt : undefined}
                  label={material.shot}
                  ratio="square"
                  tone="paper-alt"
                  sizes="(min-width: 768px) 33vw, 100vw"
                />
                <h3 className="font-display text-[22px]">{material.title}</h3>
                <p className="text-[14px] leading-[1.75] text-ink/72">
                  {material.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Commissions */}
      <Reveal as="section" className="grid items-stretch xl:grid-cols-2">
        <PlaceholderImage
          src="/photography/atelier-sketchbook.jpg"
          alt="An open sketchbook of pencil ring drawings on the bench, a green carving wax model and a worn pencil resting across the page."
          label="SKETCHBOOK — drawings and wax"
          ratio="free"
          sizes="(min-width: 1280px) 50vw, 100vw"
          className="aspect-[4/5] xl:aspect-auto xl:min-h-[560px]"
        />

        <div className="page-x flex flex-col justify-center gap-9 py-16 xl:py-26">
          <div className="flex flex-col gap-5">
            <p className="font-mono text-label uppercase tracking-[0.22em] text-ink/64">
              Commissions
            </p>
            <h2 className="max-w-[440px] text-section-m leading-[1.25] xl:text-[34px]">
              A piece drawn around your own stone.
            </h2>
          </div>

          <SpecTable rows={ATELIER.terms} />

          <UnderlineLink href="/contact" arrow className="border-ink tracking-[0.18em]">
            Begin a commission
          </UnderlineLink>
        </div>
      </Reveal>
    </>
  );
}
