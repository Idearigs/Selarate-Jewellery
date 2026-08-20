import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UnderlineLink } from "@/components/ui/button";
import { SpecTable } from "@/components/ui/spec-table";
import { CARE, type CareTopic } from "@/lib/content";

/**
 * Sizing / Shipping / Repairs.
 *
 * Not in the handoff, but linked from the footer of every page. An unstyled 404
 * in the footer of a five-figure storefront reads as abandonment, so these are
 * built from the same primitives rather than left dangling. Copy is placeholder
 * and should be reviewed by the studio.
 */
export const revalidate = 86400;

export function generateStaticParams() {
  return Object.keys(CARE).map((topic) => ({ topic }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const { topic } = await params;
  const content = CARE[topic as CareTopic];
  if (!content) return {};

  return {
    title: content.title,
    description: content.intro,
    alternates: { canonical: `/care/${topic}` },
  };
}

export default async function CarePage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const content = CARE[topic as CareTopic];
  if (!content) notFound();

  return (
    <article className="page-x flex flex-col gap-10 py-16 xl:py-26">
      <div className="flex flex-col gap-6">
        <p className="font-mono text-label uppercase tracking-[0.22em] text-ink/64">
          Care
        </p>
        <h1 className="text-title-m xl:text-title">{content.title}</h1>
        <p className="max-w-[560px] text-body leading-[1.8] text-ink/75">
          {content.intro}
        </p>
      </div>

      <SpecTable rows={content.rows} className="max-w-[720px]" />

      <UnderlineLink href="/contact" arrow className="tracking-[0.18em]">
        Write to the studio
      </UnderlineLink>
    </article>
  );
}
