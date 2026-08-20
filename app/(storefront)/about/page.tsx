import type { Metadata } from "next";
import { UnderlineLink } from "@/components/ui/button";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { Reveal } from "@/components/ui/reveal";
import { Eyebrow, SpecTable } from "@/components/ui/spec-table";
import { ABOUT } from "@/lib/content";

/**
 * About the designer — the person.
 *
 * Distinct from The Atelier, which is process and materials. Keeping that split
 * clean matters: they are the two pages a prospective commission client reads
 * before writing, and duplicating one into the other wastes both.
 */
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "About the designer",
  description: ABOUT.intro,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      {/* Split hero */}
      <section className="grid items-stretch border-b border-ink/12 xl:grid-cols-2">
        <div className="page-x flex flex-col justify-between gap-14 py-16 xl:py-28 xl:pr-16">
          <div className="flex flex-col gap-6.5">
            <Eyebrow>{ABOUT.eyebrow}</Eyebrow>
            {/* Hard-wrapped into three lines, as designed. */}
            <h1 className="text-hero-m xl:text-[72px] xl:leading-[1.04] xl:tracking-[-0.01em]">
              {ABOUT.heading.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h1>
          </div>
          <p className="max-w-[440px] text-[17px] leading-[1.75] text-ink/72">
            {ABOUT.intro}
          </p>
        </div>

        <PlaceholderImage
          src={null}
          label="PORTRAIT — designer at bench, 4:5"
          ratio="free"
          priority
          sizes="(min-width: 1280px) 50vw, 100vw"
          className="aspect-[4/5] xl:aspect-auto xl:min-h-[620px]"
        />
      </section>

      {/* Two-column essay: statement left, paragraphs right */}
      <Reveal as="section" className="page-x grid gap-10 py-16 xl:grid-cols-[1fr_1.35fr] xl:gap-16 xl:py-26">
        <h2 className="text-section-m leading-[1.2] xl:text-section">
          {ABOUT.statement}
        </h2>
        <div className="flex max-w-[600px] flex-col gap-6 text-body leading-[1.8] text-ink/75">
          {ABOUT.essay.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </div>
      </Reveal>

      {/* Three-up square row */}
      <Reveal as="section" className="page-x grid grid-cols-3 gap-2 pb-16 xl:pb-26">
        {["HANDS AT WORK", "ROUGH STONE", "FINISHED PIECE"].map((label) => (
          <PlaceholderImage
            key={label}
            src={null}
            label={label}
            ratio="square"
            sizes="33vw"
          />
        ))}
      </Reveal>

      {/* How a piece is made */}
      <Reveal as="section" className="bg-paper-alt">
        <div className="page-x flex flex-col gap-10 py-16 xl:gap-14 xl:py-26">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <h2 className="text-section-m xl:text-[36px]">How a piece is made</h2>
            <p className="font-mono text-label uppercase tracking-[0.18em] text-ink/64 md:pb-1.5">
              Four stages, six to twelve weeks
            </p>
          </div>

          <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-4">
            {ABOUT.steps.map((step) => (
              <div
                key={step.n}
                className="flex flex-col gap-3.5 border-t border-ink/25 pt-[22px]"
              >
                <span className="font-mono text-label tracking-[0.18em] text-ink/64">
                  {step.n}
                </span>
                <h3 className="font-display text-[22px]">{step.title}</h3>
                <p className="text-[14px] leading-[1.75] text-ink/72">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Credentials */}
      <Reveal as="section" className="grid items-stretch xl:grid-cols-[1.1fr_1fr]">
        <div className="page-x flex flex-col justify-center gap-11 py-16 xl:py-26 xl:pr-16">
          <div className="flex flex-col gap-5">
            <Eyebrow>Credentials</Eyebrow>
            <h2 className="max-w-[420px] text-section-m leading-[1.25] xl:text-[34px]">
              Trained, certified, and still learning at the bench.
            </h2>
          </div>

          <SpecTable rows={ABOUT.facts} />

          <UnderlineLink href="/contact" arrow className="border-ink tracking-[0.18em]">
            Book a studio visit
          </UnderlineLink>
        </div>

        <PlaceholderImage
          src={null}
          label="STUDIO INTERIOR — 3:4"
          ratio="free"
          sizes="(min-width: 1280px) 45vw, 100vw"
          className="aspect-[3/4] xl:aspect-auto xl:min-h-[560px]"
        />
      </Reveal>
    </>
  );
}
