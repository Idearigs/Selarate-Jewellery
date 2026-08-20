"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { removeFromBag } from "@/app/actions/bag";
import { formatPrice, minutesRemaining } from "@/lib/format";
import type { BagLine as Line } from "@/lib/cart";

/**
 * A single bag line.
 *
 * The "Held n min" note counts down in the browser, but it is display only —
 * the server decides whether the hold is still alive, and a refresh will show
 * the truth. We never let the client's clock release a reservation.
 */
export function BagLineRow({ line }: { line: Line }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [minutes, setMinutes] = useState(() =>
    line.holdExpiresAt ? minutesRemaining(line.holdExpiresAt) : null,
  );

  useEffect(() => {
    if (!line.holdExpiresAt) return;
    const tick = () => {
      const left = minutesRemaining(line.holdExpiresAt!);
      setMinutes(left);
      // On expiry, ask the server what is actually true rather than guessing.
      if (left <= 0) router.refresh();
    };
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [line.holdExpiresAt, router]);

  return (
    <div className="flex gap-6 border-b border-ink/12 py-8">
      <Link href={`/piece/${line.slug}`} className="w-[110px] shrink-0 xl:w-[150px]">
        <PlaceholderImage
          src={line.imageUrl}
          alt={line.imageAlt}
          label="4:5"
          ratio="product"
          labelPosition="bottom"
          sizes="150px"
        />
      </Link>

      <div className="flex flex-1 flex-col gap-2">
        <Link href={`/piece/${line.slug}`} className="font-display text-piece">
          {line.name}
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/64">
          Ref. {line.reference}
          {line.size ? ` · US ${line.size}` : ""}
        </p>
        <p className="text-body-sm text-ink/55">{line.material}</p>

        <div className="mt-auto flex flex-wrap gap-5 pt-3 text-[11px] uppercase tracking-[0.16em] text-ink/60">
          <button type="button" className="border-b border-ink/30 pb-[3px] hover:border-ink">
            Engraving
          </button>
          <button type="button" className="border-b border-ink/30 pb-[3px] hover:border-ink">
            Gift wrap
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await removeFromBag(line.slug);
                router.refresh();
              })
            }
            className="border-b border-ink/30 pb-[3px] hover:border-ink disabled:opacity-40"
          >
            {pending ? "Removing" : "Remove"}
          </button>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 text-right">
        <p className="text-[15px] tracking-[0.06em]">
          {formatPrice(line.unitPriceCents)}
        </p>
        {minutes !== null && minutes > 0 && (
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/64">
            Held {minutes} min
          </p>
        )}
      </div>
    </div>
  );
}
