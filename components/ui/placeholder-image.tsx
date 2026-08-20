import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Every image in this build goes through here.
 *
 * No photography exists yet — the client is shooting his own inventory — so
 * until an image record arrives this renders the handoff's hatched placeholder
 * with its role and ratio label. Once `src` is set it becomes a real
 * next/image at the identical ratio, so pages upgrade photo by photo with no
 * layout change and no CLS.
 *
 * The placeholder labels in the .dc.html files are the client's shot list;
 * keep them accurate.
 */

/** Aspect ratios are load-bearing per the handoff — do not improvise new ones. */
const RATIOS = {
  product: "aspect-[4/5]", // product cards, gallery frames
  editorial: "aspect-[3/4]", // portraits
  process: "aspect-[3/2]", // bench / process shots
  square: "aspect-square", // materials
  free: "", // desktop hero — fixed min-height instead
} as const;

/** The hatch has to sit on whichever band it lands on. */
const HATCH = {
  paper:
    "repeating-linear-gradient(135deg,#E7E1D6 0 7px,#DFD8CB 7px 14px)",
  "paper-alt":
    "repeating-linear-gradient(135deg,#E0D9CC 0 7px,#D7CFC0 7px 14px)",
} as const;

export type PlaceholderRatio = keyof typeof RATIOS;

interface PlaceholderImageProps {
  /** Absent until the piece has been photographed. */
  src?: string | null;
  /** Required whenever src is set — enforced at upload time in the admin. */
  alt?: string;
  /** Shot-list label shown on the placeholder, e.g. "HERO — hand on ring, 4:5". */
  label: string;
  ratio: PlaceholderRatio;
  tone?: keyof typeof HATCH;
  /** Product cards label at the bottom; hero and editorial shots label centred. */
  labelPosition?: "center" | "bottom";
  /** Set on the LCP image only. */
  priority?: boolean;
  sizes?: string;
  /**
   * CSS object-position for the crop's focal point, e.g. "50% 20%".
   *
   * The editorial slots change aspect ratio between breakpoints — the maker
   * band is 4:5 on mobile and nearly 2:1 on desktop — so a portrait photograph
   * centre-cropped into the desktop panel loses the subject's head. Bias the
   * crop instead of re-cutting the source for each breakpoint.
   */
  objectPosition?: string;
  className?: string;
}

export function PlaceholderImage({
  src,
  alt,
  label,
  ratio,
  tone = "paper",
  labelPosition = "center",
  priority = false,
  sizes = "100vw",
  objectPosition,
  className,
}: PlaceholderImageProps) {
  const frame = cn("relative overflow-hidden", RATIOS[ratio], className);

  if (src) {
    return (
      <div className={frame}>
        <Image
          src={src}
          alt={alt ?? ""}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          style={objectPosition ? { objectPosition } : undefined}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        frame,
        "flex justify-center",
        labelPosition === "center" ? "items-center" : "items-end pb-4",
      )}
      style={{ background: HATCH[tone] }}
      // Decorative stand-in: announce nothing to assistive tech.
      role="presentation"
    >
      <span
        className={cn(
          "font-mono uppercase text-ink/55",
          labelPosition === "center"
            ? "bg-paper px-3 py-2 text-[11px] tracking-[0.14em]"
            : "text-[10px] tracking-[0.12em] text-ink/64",
        )}
        style={
          labelPosition === "center" && tone === "paper-alt"
            ? { background: "var(--color-paper-alt)" }
            : undefined
        }
      >
        {label}
      </span>
    </div>
  );
}
