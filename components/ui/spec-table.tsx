import { cn } from "@/lib/cn";

/**
 * The recurring two-column key/value table: product specs, contact details,
 * commission terms, credentials.
 *
 * Desktop is two columns with a 1px rule under each row. Mobile collapses to
 * label-above-value, still ruled — per the mobile deltas in the handoff.
 */

export interface SpecRow {
  key: string;
  value: React.ReactNode;
}

export function SpecTable({
  rows,
  className,
}: {
  rows: readonly SpecRow[];
  className?: string;
}) {
  return (
    <dl className={cn("flex flex-col", className)}>
      {rows.map((row) => (
        <div
          key={row.key}
          className={cn(
            "border-b border-ink/12 py-4",
            "md:grid md:grid-cols-[200px_1fr] md:items-baseline md:gap-6",
          )}
        >
          <dt className="font-mono text-label uppercase text-ink/64">
            {row.key}
          </dt>
          <dd className="mt-2 text-[14px] leading-relaxed text-ink/85 md:mt-0">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Mono eyebrow used above headings and as section counts. */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "font-mono text-label uppercase tracking-[0.22em] text-ink/64",
        className,
      )}
    >
      {children}
    </p>
  );
}
