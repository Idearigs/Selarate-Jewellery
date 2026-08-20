import type { Metadata } from "next";
import Link from "next/link";
import { BagLineRow } from "@/components/storefront/bag-line";
import { Button, ButtonLink } from "@/components/ui/button";
import { getBag } from "@/lib/cart";

/**
 * Bag / pre-checkout. Grid 1.6fr / 1fr — line items left, summary rail right.
 *
 * Always dynamic: hold state and availability must be fetched fresh here, never
 * cached, for the same reason as the product page.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bag",
  robots: { index: false, follow: true },
};

const ASSURANCES = [
  {
    heading: "Insured shipping",
    body: "Every piece ships fully insured and signature-required, worldwide.",
  },
  {
    heading: "Sizing and adjustment",
    body: "Resizing within two sizes is complimentary in the first year.",
  },
  {
    heading: "Lifetime care",
    body: "Cleaning, re-polishing and stone-tightening at the bench, always.",
  },
];

export default async function BagPage() {
  const bag = await getBag();

  if (bag.lines.length === 0) {
    return (
      <section className="page-x flex flex-col items-start gap-6 py-24 xl:py-40">
        <h1 className="text-title-m xl:text-title">Your bag is empty.</h1>
        <Link
          href="/collection"
          className="border-b border-ink pb-2.5 text-nav uppercase"
        >
          Browse the collection
        </Link>
      </section>
    );
  }

  return (
    <>
      <h1 className="page-x pb-8 pt-10 text-title-m xl:text-title">Your bag</h1>

      <div className="page-x grid gap-12 pb-16 xl:grid-cols-[1.6fr_1fr] xl:gap-16 xl:pb-26">
        {/* Left column: line items, note/promo, sizing reassurance.
            The reassurance block belongs to THIS column — putting it in the
            summary rail leaves a whitespace gap. */}
        <div className="flex flex-col border-t border-ink/12">
          {bag.lines.map((line) => (
            <BagLineRow key={line.itemId} line={line} />
          ))}

          <div className="grid gap-8 py-8 md:grid-cols-2">
            <label className="flex flex-col gap-3">
              <span className="font-mono text-label uppercase text-ink/64">
                Note for the studio
              </span>
              <input
                type="text"
                name="note"
                placeholder="Occasion, deadline, anything we should know"
                className="border-b border-ink/30 bg-transparent pb-3 text-[16px] placeholder:text-ink/40 focus:border-ink focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-3">
              <span className="font-mono text-label uppercase text-ink/64">
                Promo code
              </span>
              <input
                type="text"
                name="promo"
                className="border-b border-ink/30 bg-transparent pb-3 text-[16px] focus:border-ink focus:outline-none"
              />
            </label>
          </div>

          <div className="bg-paper-alt p-8 xl:p-10">
            <h2 className="font-display text-[22px]">Not sure of the size?</h2>
            <p className="mt-3 max-w-[520px] text-body-sm leading-[1.7] text-ink/72">
              Order anyway. Resizing within two sizes is complimentary and takes
              about ten days — or book a studio visit and we will measure you
              properly.
            </p>
          </div>
        </div>

        {/* Summary rail */}
        {/* paper-alt rather than a hairline box. The page is otherwise rules on
            paper, and the one block a buyer must actually read before spending
            five figures had no more weight than the promo field. The tint is
            the site’s existing second ground, not a new colour. */}
        <aside className="flex h-fit flex-col bg-paper-alt p-8">
          <h2 className="font-mono text-label uppercase text-ink/64">Summary</h2>

          <dl className="mt-6 flex flex-col gap-3.5 text-[14px]">
            <div className="flex justify-between">
              <dt className="text-ink/72">Subtotal</dt>
              <dd>{bag.formatted.subtotal}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink/72">Insured shipping</dt>
              <dd>Included</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink/72">Estimated tax</dt>
              <dd>{bag.formatted.tax}</dd>
            </div>
          </dl>

          <div className="mt-6 flex items-baseline justify-between border-t border-ink/20 pt-6">
            <span className="font-mono text-label uppercase text-ink/64">Total</span>
            <span className="font-display text-[32px]">{bag.formatted.total}</span>
          </div>

          <div className="mt-8 flex flex-col gap-2.5">
            <ButtonLink href="/checkout">Proceed to checkout</ButtonLink>
            {/* Real behaviour for five-figure pieces, not a placeholder. */}
            <Button variant="secondary" type="button">
              Reserve and pay by wire
            </Button>
          </div>

          <div className="mt-8 flex flex-col gap-6 border-t border-ink/20 pt-8">
            {ASSURANCES.map((a) => (
              <div key={a.heading}>
                <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/64">
                  {a.heading}
                </h3>
                <p className="mt-2 text-body-sm leading-[1.7] text-ink/72">
                  {a.body}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
