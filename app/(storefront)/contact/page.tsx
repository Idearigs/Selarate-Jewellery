import type { Metadata } from "next";
import { Suspense } from "react";
import { EnquiryForm } from "@/components/storefront/enquiry-form";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { Reveal } from "@/components/ui/reveal";
import { SpecTable, Eyebrow } from "@/components/ui/spec-table";
import { UnderlineLink } from "@/components/ui/button";
import { CONTACT } from "@/lib/content";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";

/**
 * Contact & Visit.
 *
 * The address block is the page's real payload — this is the studio's local
 * search surface, so the details here also feed the JewelryStore structured
 * data in the root layout.
 */
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Contact & visit",
  description: CONTACT.intro,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([{ name: "Contact", path: "/contact" }])}
      />

      {/* Header block */}
      <section className="page-x grid gap-8 py-12 xl:grid-cols-2 xl:gap-16 xl:py-20">
        <h1 className="text-title-m xl:text-[66px] xl:leading-[1.05]">
          {CONTACT.heading}
        </h1>
        <p className="max-w-[480px] self-end text-body leading-[1.75] text-ink/72">
          {CONTACT.intro}
        </p>
      </section>

      {/* Body: details left, form right, divided by a 1px rule */}
      <div className="page-x grid gap-12 border-t border-ink/12 py-12 xl:grid-cols-[1fr_1.1fr] xl:gap-16 xl:py-20">
        <div className="flex flex-col gap-10 xl:border-r xl:border-ink/12 xl:pr-16">
          <div className="flex flex-col gap-5">
            <Eyebrow>The studio</Eyebrow>
            <address className="font-display text-[27px] not-italic leading-[1.35]">
              {CONTACT.address.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <UnderlineLink
              href="https://maps.google.com"
              target="_blank"
              rel="noreferrer"
              className="tracking-[0.16em]"
            >
              Directions
            </UnderlineLink>
          </div>

          <SpecTable rows={CONTACT.details} />

          <div className="flex flex-col gap-3">
            <Eyebrow>Hours</Eyebrow>
            <dl className="flex flex-col">
              {CONTACT.hours.map((h) => (
                <div
                  key={h.day}
                  className="flex justify-between gap-6 border-b border-ink/12 py-3.5"
                >
                  <dt className="text-[14px] text-ink/85">{h.day}</dt>
                  <dd className="font-mono text-[13px] text-ink/64">{h.time}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Mobile-only pair, per the handoff's mobile deltas. */}
          <div className="grid grid-cols-2 gap-3 xl:hidden">
            <a
              href="https://maps.google.com"
              className="border border-ink/25 py-4 text-center text-[11px] uppercase tracking-[0.16em]"
            >
              Directions
            </a>
            <a
              href={`tel:${CONTACT.details[1].value.replace(/\s/g, "")}`}
              className="border border-ink/25 py-4 text-center text-[11px] uppercase tracking-[0.16em]"
            >
              Call studio
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <Eyebrow>Write to the studio</Eyebrow>
          {/* The form reads `?piece=` via useSearchParams, which needs a
              boundary for the rest of the page to prerender. The fallback
              matches the form's height so nothing shifts. */}
          <Suspense fallback={<div className="min-h-[520px]" />}>
            <EnquiryForm />
          </Suspense>
        </div>
      </div>

      {/* Map strip with an overlaid "Finding us" card */}
      <Reveal as="section" className="relative">
        <PlaceholderImage
          src={null}
          label="MAP — or the storefront"
          ratio="free"
          sizes="100vw"
          className="aspect-[3/2] xl:aspect-auto xl:h-[520px]"
        />
        <div className="page-x pointer-events-none absolute inset-x-0 bottom-0 pb-10">
          <div className="pointer-events-auto max-w-[420px] bg-paper p-8">
            <h2 className="font-display text-[22px]">Finding us</h2>
            <p className="mt-3 text-body-sm leading-[1.7] text-ink/72">
              The studio sits above the shopfront, up the stair to the left of
              the entrance. Ring the bell — the bench is at the back and the
              torch is loud.
            </p>
          </div>
        </div>
      </Reveal>
    </>
  );
}
