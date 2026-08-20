import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Admin primitives.
 *
 * Same palette as the storefront, opposite intent: the storefront is editorial
 * and slow, the admin is dense and fast. Do NOT carry the storefront type scale
 * in here — Karla 13–14px for UI, mono 10–12px for every id, figure and date,
 * and Marcellus only for the sidebar wordmark, page titles, KPI figures and
 * piece names in tables.
 *
 * Radius stays 0. No shadows. No icons — every control is a word.
 */

export type Tone = "good" | "warn" | "bad" | "mute";

const PILL: Record<Tone, string> = {
  good: "bg-good-fill text-good-ink",
  warn: "bg-warn-fill text-warn-ink",
  bad: "bg-bad-fill text-bad-ink",
  mute: "bg-mute-fill text-mute-ink",
};

const DOT: Record<Tone, string> = {
  good: "bg-[#4A6741]",
  warn: "bg-[#9E742A]",
  bad: "bg-[#8A3B2E]",
  mute: "bg-ink/30",
};

/** Live / paid / in stock → good. Reserved / in studio / low → warn, etc. */
export function StatusPill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "justify-self-start whitespace-nowrap px-[9px] py-[5px]",
        "font-mono text-[10px] uppercase tracking-[0.1em]",
        PILL[tone],
      )}
    >
      {children}
    </span>
  );
}

/** 7px circle in the solid version of the same four colours. */
export function Dot({ tone }: { tone: Tone }) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-[7px] shrink-0 rounded-full", DOT[tone])}
    />
  );
}

/** Column header row: 11px mono uppercase at 60% ink. */
export function TableHead({
  columns,
  template,
  className,
}: {
  columns: { label: string; align?: "right" }[];
  /** CSS grid-template-columns; must match the TableRow beneath it. */
  template: string;
  className?: string;
}) {
  return (
    <div
      style={{ gridTemplateColumns: template }}
      className={cn(
        "grid items-center gap-4 border-b border-ink/12 px-7 py-[11px]",
        "font-mono text-[10px] uppercase tracking-[0.14em] text-ink/60",
        className,
      )}
    >
      {columns.map((c) => (
        <span key={c.label} className={c.align === "right" ? "text-right" : undefined}>
          {c.label}
        </span>
      ))}
    </div>
  );
}

/**
 * A clickable table row.
 *
 * Note from the handoff, and it is a real trap: when styling these as buttons,
 * a `border: none` reset declared AFTER `border-bottom` reverts the rule to a
 * 3px default. Here the hairline is applied via a single Tailwind class so the
 * ordering problem cannot arise.
 */
export function TableRow({
  href,
  columns,
  className,
  children,
}: {
  href?: string;
  columns: string;
  className?: string;
  children: React.ReactNode;
}) {
  const shared = cn(
    "grid w-full items-center gap-4 border-b border-ink/[0.09] px-7 py-3.5 text-left",
    href && "cursor-pointer hover:bg-ink/[0.03]",
    className,
  );

  if (!href) {
    return (
      <div className={shared} style={{ gridTemplateColumns: columns }}>
        {children}
      </div>
    );
  }

  return (
    <Link href={href} className={shared} style={{ gridTemplateColumns: columns }}>
      {children}
    </Link>
  );
}

/** Dashboard KPI cell: mono label, Marcellus figure, 12px note. */
export function KpiCell({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex flex-col gap-2.5 border-b border-r border-ink/12 px-7 py-6">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/60">
        {label}
      </span>
      <span className="font-display text-[34px] leading-none">{value}</span>
      {note && <span className="text-[12px] text-ink/62">{note}</span>}
    </div>
  );
}

/** Filter chip — boxed, fills solid ink when active. URL-driven. */
export function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "whitespace-nowrap border px-3.5 py-2 text-[12px] tracking-[0.06em]",
        active
          ? "border-ink bg-ink text-paper"
          : "border-ink/20 text-ink/75 hover:border-ink/50",
      )}
    >
      {children}
    </Link>
  );
}

/** Small text button used for inline actions ("View all", "Resolve"). */
export function LinkButton({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "w-fit border-b border-ink/30 pb-0.5 text-[11px] uppercase tracking-[0.14em]",
        "text-ink/70 transition-colors hover:border-ink hover:text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function SectionHeading({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-5 px-7 pb-3.5 pt-5">
      <h2 className="font-display text-[19px]">{title}</h2>
      {children}
    </div>
  );
}

export function MonoLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-mono text-[10px] uppercase tracking-[0.16em] text-ink/60",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Admin form input — bordered, unlike the storefront's bottom-rule fields. */
export function AdminField({
  label,
  className,
  span,
  ...props
}: React.ComponentPropsWithoutRef<"input"> & { label: string; span?: boolean }) {
  return (
    <label className={cn("flex flex-col gap-2", span && "col-span-2", className)}>
      <MonoLabel>{label}</MonoLabel>
      <input
        className="border border-ink/20 bg-transparent px-3 py-2.5 text-[13px] text-ink outline-none focus:border-ink"
        {...props}
      />
    </label>
  );
}

export function AdminTextArea({
  label,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"textarea"> & { label: string }) {
  return (
    <label className={cn("col-span-2 flex flex-col gap-2", className)}>
      <MonoLabel>{label}</MonoLabel>
      <textarea
        rows={5}
        className="border border-ink/20 bg-transparent px-3 py-2.5 text-[13px] leading-relaxed text-ink outline-none focus:border-ink"
        {...props}
      />
    </label>
  );
}
