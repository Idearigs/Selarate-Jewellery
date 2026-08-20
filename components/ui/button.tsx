import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * There are exactly three button treatments in this design and no icons —
 * every control is a word.
 *
 * primary   solid ink, bone text            (Add to bag, Proceed to checkout)
 * secondary 1px outline                     (Enquire, Reserve and pay by wire)
 * inverted  bone fill, ink text and border  (the "Reserved — 60 min hold" state)
 */

const VARIANTS = {
  primary:
    "border border-ink bg-ink text-paper hover:opacity-88",
  secondary:
    "border border-ink/35 text-ink hover:border-ink hover:bg-ink/4",
  inverted: "border border-ink bg-paper text-ink",
} as const;

const base = cn(
  "inline-flex items-center justify-center text-center",
  "font-body text-button uppercase",
  "cursor-pointer transition-[opacity,background-color,border-color] duration-200",
  "disabled:cursor-not-allowed disabled:opacity-40",
);

type Variant = keyof typeof VARIANTS;

/** Solid buttons sit at 20px vertical; outlined at 19px so the 1px rule lines up. */
const PAD = { primary: "p-5", inverted: "p-5", secondary: "p-[19px]" } as const;

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ComponentPropsWithoutRef<"button"> & { variant?: Variant }) {
  return (
    <button
      className={cn(base, PAD[variant], VARIANTS[variant], className)}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  className,
  href,
  ...props
}: React.ComponentPropsWithoutRef<typeof Link> & { variant?: Variant }) {
  return (
    <Link
      href={href}
      className={cn(base, PAD[variant], VARIANTS[variant], className)}
      {...props}
    />
  );
}

/**
 * The recurring editorial link: uppercase, tracked, sitting on a 1px rule.
 * Hover lifts the rule from a 30% ink alpha to full ink over 200ms — the only
 * link affordance in the design.
 */
export function UnderlineLink({
  className,
  arrow = false,
  children,
  href,
  ...props
}: React.ComponentPropsWithoutRef<typeof Link> & { arrow?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex w-fit items-center gap-3.5 pb-2.5",
        "border-b border-ink/30 text-nav uppercase",
        "transition-colors duration-200 hover:border-ink",
        className,
      )}
      {...props}
    >
      {children}
      {arrow && (
        <span aria-hidden="true" className="text-[15px]">
          &rarr;
        </span>
      )}
    </Link>
  );
}
