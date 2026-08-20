import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Two chip families, deliberately different:
 *
 * `underline` — filter chips and category tabs. Text only, an underline marks
 *   the active one. On mobile these become `filled` and scroll horizontally.
 * `boxed` — size chips and the contact form's reason chips. The only boxed
 *   control set in the design; fills solid ink when active.
 *
 * Indicator position never animates: instant state swap, per the handoff.
 */

const boxed = (active: boolean) =>
  cn(
    // 44px minimum hit target — enforced here so no call site can forget.
    "min-h-11 cursor-pointer px-5 py-3 text-[13px] tracking-[0.04em]",
    "border transition-colors duration-200",
    active
      ? "border-ink bg-ink text-paper"
      : "border-ink/25 text-ink hover:border-ink/60",
  );

const underline = (active: boolean) =>
  cn(
    "cursor-pointer pb-[3px] text-[12px] uppercase tracking-[0.14em]",
    "border-b bg-transparent",
    active ? "border-ink text-ink" : "border-transparent text-ink/60 hover:text-ink",
  );

const filled = (active: boolean) =>
  cn(
    "min-h-11 shrink-0 cursor-pointer whitespace-nowrap px-4 py-2.5",
    "text-[12px] uppercase tracking-[0.14em] border",
    active ? "border-ink bg-ink text-paper" : "border-ink/25 text-ink/70",
  );

const STYLES = { boxed, underline, filled } as const;

type ChipVariant = keyof typeof STYLES;

export function Chip({
  variant = "underline",
  active = false,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"button"> & {
  variant?: ChipVariant;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(STYLES[variant](active), className)}
      {...props}
    />
  );
}

/**
 * Link flavour. Collection filters/tabs are URL-driven (?category=&filter=&sort=)
 * so every category and filter is independently crawlable and shareable —
 * that is an SEO requirement, not a convenience.
 */
export function ChipLink({
  variant = "underline",
  active = false,
  className,
  href,
  ...props
}: React.ComponentPropsWithoutRef<typeof Link> & {
  variant?: ChipVariant;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn("inline-flex items-center justify-center", STYLES[variant](active), className)}
      {...props}
    />
  );
}

/**
 * The category tabs on the collection page. The underline indicator sits *on*
 * the section's own 1px bottom border via -1px, so the two rules occupy the
 * same line rather than stacking.
 */
export function CategoryTab({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      className={cn(
        /* whitespace-nowrap: at 0.18em tracking "One of a Kind" is wider than
           half a 390px screen, so it broke to two lines and the two tabs sat at
           different heights with the underline cutting through the wrap. The
           row scrolls sideways instead — the labels are fixed and short, and a
           wrapped tab reads as a layout fault where a scrolled one does not. */
        "-mb-px shrink-0 whitespace-nowrap border-b pb-3.5 text-[13px] uppercase tracking-[0.18em]",
        "px-4 sm:px-8",
        active ? "border-ink text-ink" : "border-transparent text-ink/55 hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
