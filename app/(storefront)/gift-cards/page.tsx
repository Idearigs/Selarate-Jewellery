import type { Metadata } from "next";
import { UnderlineLink } from "@/components/ui/button";

/**
 * Gift cards are linked from the footer in the handoff but were never designed,
 * and a real implementation means balances, codes and redemption at checkout.
 *
 * Rather than 404 or ship a half-built commerce feature, this states honestly
 * how a studio this size actually handles it. Replace when gift cards are
 * genuinely implemented.
 */
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Gift cards",
  description:
    "Gift cards are arranged directly with the studio, in any amount, for any piece.",
  alternates: { canonical: "/gift-cards" },
};

export default function GiftCardsPage() {
  return (
    <article className="page-x flex max-w-[600px] flex-col gap-6 py-16 xl:py-26">
      <p className="font-mono text-label uppercase tracking-[0.22em] text-ink/64">
        Gift cards
      </p>
      <h1 className="text-title-m xl:text-title">Arranged by hand.</h1>
      <p className="text-body leading-[1.8] text-ink/75">
        Gift cards are written for any amount and can be put towards a finished
        piece or a commission. Because each one is issued personally, they are
        arranged with the studio directly rather than bought from the site.
      </p>
      <UnderlineLink href="/contact" arrow className="tracking-[0.18em]">
        Write to the studio
      </UnderlineLink>
    </article>
  );
}
