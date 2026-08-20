import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Fixed 60px topbar: page title in Marcellus 22px, mono meta beside it,
 * search, and one primary action per view.
 */
export function Topbar({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex h-[60px] shrink-0 items-center justify-between gap-6 border-b border-ink/14 px-7">
      <div className="flex items-baseline gap-3.5">
        <h1 className="font-display text-[22px]">{title}</h1>
        {meta && (
          <span className="font-mono text-[11px] tracking-[0.12em] text-ink/60">
            {meta}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <form action="/admin/search" className="contents">
          <input
            type="search"
            name="q"
            placeholder="Search pieces, orders, people"
            className={cn(
              "w-[280px] border border-ink/20 bg-transparent px-3 py-2.5",
              "text-[13px] text-ink outline-none focus:border-ink",
            )}
          />
        </form>
        {action && (
          <Link
            href={action.href}
            className="border border-ink bg-ink px-[18px] py-[11px] text-[11px] uppercase tracking-[0.16em] text-paper hover:opacity-88"
          >
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}
