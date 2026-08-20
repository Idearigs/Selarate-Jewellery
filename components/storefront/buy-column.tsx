"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { addToBag } from "@/app/actions/bag";
import { minutesRemaining } from "@/lib/format";
import type { LiveAvailability, PieceDetail } from "@/lib/types";

/**
 * The one dynamic island on the product page.
 *
 * Everything else about the piece is statically rendered for SEO; this fetches
 * live availability on mount (and again before checkout) so an inventory-of-one
 * piece can never be added to a bag it has already left.
 */
export function BuyColumn({ piece }: { piece: PieceDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Seeded from what the server knew at render time so the static HTML already
  // shows the right state (and crawlers see it); the fetch below refines it.
  const [live, setLive] = useState<LiveAvailability | null>(
    piece.sold
      ? { slug: piece.slug, purchasable: false, state: "sold", holdExpiresAt: null }
      : null,
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(
    piece.defaultSize ?? piece.sizes[0] ?? null,
  );
  const [error, setError] = useState<string | null>(null);

  // Revalidate on mount. The statically served HTML may be minutes or hours old.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/availability/${piece.slug}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: LiveAvailability | null) => {
        if (!cancelled) setLive(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [piece.slug]);

  const held = live?.state === "held-by-you" && live.holdExpiresAt;

  async function onAdd() {
    setError(null);
    // Check again immediately before committing — the window between mount and
    // click is exactly where the sold-out race lives.
    const fresh: LiveAvailability | null = await fetch(
      `/api/availability/${piece.slug}`,
      { cache: "no-store" },
    )
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    if (fresh) setLive(fresh);
    if (fresh && !fresh.purchasable) {
      setError(
        fresh.state === "sold"
          ? "This piece has just sold."
          : "Another visitor is holding this piece.",
      );
      return;
    }

    startTransition(async () => {
      const result = await addToBag(piece.slug, selectedSize);
      if (!result.ok) {
        setError(
          result.reason === "held-by-other"
            ? "Another visitor is holding this piece."
            : "This piece has just sold.",
        );
        const refreshed = await fetch(`/api/availability/${piece.slug}`, {
          cache: "no-store",
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
        if (refreshed) setLive(refreshed);
        return;
      }

      // Flip to the reserved state immediately from the server's own expiry —
      // the design requires the button to become "Reserved — n min hold".
      setLive({
        slug: piece.slug,
        purchasable: true,
        state: "held-by-you",
        holdExpiresAt: result.expiresAt,
      });
      router.refresh();
    });
  }

  const soldOut = live?.state === "sold";

  return (
    <div className="flex flex-col gap-4">
      {piece.sizes.length > 0 && !soldOut && (
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-6">
            <span className="font-mono text-label uppercase text-ink/64">Size</span>
            <a
              href="/care/sizing"
              className="border-b border-ink/30 pb-[3px] text-[11px] uppercase tracking-[0.16em] text-ink/60 transition-colors hover:border-ink"
            >
              Sizing guide
            </a>
          </div>
          <div className="flex flex-wrap gap-2">
            {piece.sizes.map((size) => (
              <Chip
                key={size}
                variant="boxed"
                active={selectedSize === size}
                onClick={() => setSelectedSize(size)}
                className="w-[62px] px-0"
              >
                {size}
              </Chip>
            ))}
          </div>
          {piece.sizeNote && (
            <p className="text-body-sm text-ink/55">{piece.sizeNote}</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2.5 pt-1">
        {soldOut ? (
          // Not an error state: a specific, dignified "just sold" message. The
          // page still returns 200 and keeps its links.
          <div className="border border-ink/25 p-5 text-center">
            <p className="font-mono text-label uppercase text-ink/64">
              This piece has found its owner
            </p>
            <p className="mt-3 text-body-sm text-ink/72">
              One-of-a-kind pieces are not remade. The studio takes commissions
              in a similar spirit.
            </p>
          </div>
        ) : held ? (
          <Button variant="inverted" disabled>
            Reserved &mdash; {minutesRemaining(live!.holdExpiresAt!)} min hold
          </Button>
        ) : (
          <Button onClick={onAdd} disabled={pending || live?.state === "held-by-other"}>
            {live?.state === "held-by-other"
              ? "Currently reserved"
              : selectedSize
                ? `Add to bag — US ${selectedSize}`
                : "Add to bag"}
          </Button>
        )}

        <ButtonLink variant="secondary" href={`/contact?piece=${piece.slug}`}>
          {soldOut ? "Enquire about a commission" : "Request to view in studio"}
        </ButtonLink>

        {error && (
          <p role="alert" className="pt-1 text-[13px] text-error">
            {error}
          </p>
        )}

        {held && (
          <p className="pt-1 text-body-sm text-ink/55">
            Held for you while you decide. The hold releases automatically.
          </p>
        )}
      </div>
    </div>
  );
}
