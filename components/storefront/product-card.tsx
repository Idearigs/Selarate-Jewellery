import Link from "next/link";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { formatPrice } from "@/lib/format";
import type { PieceCard } from "@/lib/types";
import { cn } from "@/lib/cn";

/**
 * Product card, 4:5.
 *
 * Hover crossfades to the second photograph over 500ms. No zoom, no lift, no
 * shadow — the handoff is explicit about this. When a piece has only one
 * photograph (or none yet) the card simply doesn't react, which is correct.
 */
export function ProductCard({
  piece,
  showTag = false,
  priority = false,
  sizes = "(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw",
}: {
  piece: PieceCard;
  /** The corner tag appears on the collection listing, not the homepage grid. */
  showTag?: boolean;
  priority?: boolean;
  sizes?: string;
}) {
  const [primary, secondary] = piece.images;

  return (
    <Link href={`/piece/${piece.slug}`} className="group flex flex-col gap-4.5">
      <div className="relative aspect-[4/5]">
        <PlaceholderImage
          src={primary?.url}
          alt={primary?.alt ?? piece.name}
          label="PRODUCT 4:5"
          ratio="product"
          labelPosition="bottom"
          priority={priority}
          sizes={sizes}
          className="absolute inset-0 h-full w-full"
        />

        {secondary && (
          <PlaceholderImage
            src={secondary.url}
            alt=""
            label=""
            ratio="product"
            sizes={sizes}
            className={cn(
              "absolute inset-0 h-full w-full opacity-0",
              "transition-opacity duration-500 ease-out group-hover:opacity-100",
            )}
          />
        )}

        {showTag && (
          <span className="absolute left-0 top-0 bg-paper px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/80">
            {piece.tag}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-[7px]">
        <h3 className="font-display text-piece">{piece.name}</h3>
        <p className="text-[13px] tracking-[0.04em] text-ink/55">{piece.material}</p>
        <p className="pt-1 text-[14px] tracking-[0.06em]">
          {formatPrice(piece.priceCents)}
        </p>
      </div>
    </Link>
  );
}
