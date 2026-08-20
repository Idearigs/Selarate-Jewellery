import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/storefront/checkout-form";
import { getBag } from "@/lib/cart";
import { availableProviders } from "@/lib/payments";
import { formatPrice, minutesRemaining } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const bag = await getBag();
  if (bag.lines.length === 0) redirect("/bag");

  /**
   * Only configured providers are offered. With no gateway chosen yet, this is
   * just "Reserve and pay by wire" — which is a complete, working checkout for
   * this studio, not a degraded one. Adding a card gateway later is a matter of
   * setting its keys; nothing on this page changes.
   */
  const providers = availableProviders().map((p) => ({
    id: p.id,
    label: p.label,
  }));

  const heldLines = bag.lines.filter((l) => l.holdExpiresAt);

  return (
    <div className="page-x grid gap-12 pb-16 pt-10 xl:grid-cols-[1.3fr_1fr] xl:gap-20 xl:pb-26">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <p className="font-mono text-label uppercase tracking-[0.22em] text-ink/64">
            Checkout
          </p>
          <h1 className="text-title-m xl:text-[52px] xl:leading-[1.06]">
            Where should it go?
          </h1>
        </div>

        {heldLines.length > 0 && (
          <p className="border border-ink/25 p-5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink/64">
            Reserved for you &mdash;{" "}
            {Math.min(...heldLines.map((l) => minutesRemaining(l.holdExpiresAt!)))}{" "}
            min remaining
          </p>
        )}

        <CheckoutForm providers={providers} />
      </div>

      {/* Order summary. Deliberately repeats the bag's numbers verbatim — the
          buyer should never see a total here they have not already agreed to. */}
      <aside className="flex h-fit flex-col bg-paper-alt p-8">
        <h2 className="font-mono text-label uppercase text-ink/64">Your order</h2>

        <div className="mt-6 flex flex-col">
          {bag.lines.map((line) => (
            <div
              key={line.itemId}
              className="flex justify-between gap-5 border-b border-ink/20 py-4"
            >
              {/* The piece, not just its name. This is the last screen before
                  money moves, and seeing the thing you are buying is worth more
                  reassurance than any promise written beside it. */}
              <Link
                href={`/piece/${line.slug}`}
                className="relative aspect-[4/5] w-[54px] shrink-0 bg-paper"
              >
                {line.imageUrl && (
                  <Image
                    src={line.imageUrl}
                    alt={line.imageAlt}
                    fill
                    sizes="54px"
                    className="object-cover"
                  />
                )}
              </Link>
              <div className="flex flex-1 flex-col gap-1">
                <Link href={`/piece/${line.slug}`} className="font-display text-[17px]">
                  {line.name}
                </Link>
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/64">
                  {line.reference}
                  {line.size ? ` · US ${line.size}` : ""}
                </span>
              </div>
              <span className="shrink-0 text-[14px]">
                {formatPrice(line.unitPriceCents)}
              </span>
            </div>
          ))}
        </div>

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

        <Link
          href="/bag"
          className="mt-8 w-fit border-b border-ink/30 pb-1 text-[11px] uppercase tracking-[0.16em] text-ink/64 transition-colors hover:border-ink hover:text-ink"
        >
          Back to bag
        </Link>
      </aside>
    </div>
  );
}
