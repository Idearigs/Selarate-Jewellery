import Link from "next/link";
import { CARE } from "@/lib/content";
import { cn } from "@/lib/cn";
import { Eyebrow } from "@/components/ui/spec-table";
import type { PieceDetail } from "@/lib/types";

/**
 * Everything under the buy column: what the piece IS, then what buying it
 * involves.
 *
 * Previously two separate tables stacked with no heading between them and
 * different label-column widths, so they read as one broken table rather than
 * two lists — and both could render a row called "Edition" saying the same
 * thing twice. One component now owns both groups, which is the only way the
 * de-duplication below can be guaranteed: two components cannot check each
 * other.
 *
 * Deliberately not built on the shared <SpecTable>. That component is used by
 * six other pages at a 200px label column; this needs a tighter column and a
 * second line for policy links, and widening the shared one to suit a product
 * page would drag About, Atelier, Contact, Care and Order along with it.
 */

interface DetailRow {
  key: string;
  value: string;
  link?: { href: string; label: string };
}

/**
 * The terms of buying this particular piece.
 *
 * Derived from the piece rather than written per product, so all twelve are
 * covered without a copy pass, and the policy lines are the `CARE` intros
 * verbatim — the same strings the /care pages render. A shipping promise that
 * contradicts the shipping page is worse than no shipping promise, and two
 * hand-kept copies of a policy always drift.
 */
function termsFor(piece: PieceDetail): DetailRow[] {
  /*
   * A sold piece gets the commission route and nothing else. Every other line
   * is a promise about a transaction that can no longer happen — quoting
   * dispatch times under "this piece has found its owner" would read as the
   * page not knowing what it is showing.
   */
  if (piece.sold) {
    return [
      {
        key: "Edition",
        value: "One of one. It has been bought, and it will not be remade.",
      },
      {
        key: "Commissions",
        value:
          "The studio takes a small number of commissions a year, worked in the same spirit rather than copied from this piece.",
        link: { href: "/contact", label: "Talk to the studio" },
      },
      {
        key: "Aftercare",
        value: CARE.repairs.intro,
        link: { href: "/care/repairs", label: "Aftercare" },
      },
    ];
  }

  const rows: DetailRow[] = [];

  /* Lead time is the most asked question and differs completely between the
     two categories — a unique piece exists already, a made-to-order one does
     not. Saying so here prevents the enquiry. */
  if (piece.category === "ooak") {
    rows.push({
      key: "Edition",
      value: "One of one. Made once and never reproduced.",
    });
    rows.push({
      key: "Dispatch",
      value: "Ready now — it ships within three working days.",
    });
  } else {
    rows.push({
      key: "Made to order",
      value: "Six to eight weeks at the bench, from the day the order is placed.",
    });
  }

  // Rings and cuffs are the fitted pieces; a stud has nothing to resize.
  if (piece.sizes.length > 0) {
    rows.push({
      key: "Sizing",
      value:
        piece.category === "ooak"
          ? CARE.sizing.intro
          : "Made to your size, so there is nothing to alter later.",
      link: { href: "/care/sizing", label: "Sizing guide" },
    });
  }

  rows.push({
    key: "Shipping",
    value: CARE.shipping.intro,
    link: { href: "/care/shipping", label: "Shipping terms" },
  });

  rows.push({
    key: "Aftercare",
    value: CARE.repairs.intro,
    link: { href: "/care/repairs", label: "Aftercare" },
  });

  return rows;
}

/**
 * Spec keys that the terms group already answers, in its own words.
 *
 * Six of the twelve seeded pieces carry an "Edition" spec and six carry a
 * "Lead time" — both restate a line the terms group states better. Matching is
 * done on the rendered terms rather than a fixed list, so an editor adding a
 * spec that collides is silently absorbed instead of appearing twice.
 */
const LEAD_TIME_SYNONYMS = ["lead time", "dispatch", "made to order", "ready"];

function specsFor(piece: PieceDetail, terms: DetailRow[]): DetailRow[] {
  const taken = new Set(terms.map((t) => t.key.toLowerCase()));
  const termsCoverLeadTime = terms.some((t) =>
    LEAD_TIME_SYNONYMS.includes(t.key.toLowerCase()),
  );

  return piece.specs
    .filter((spec) => {
      const key = spec.key.toLowerCase();
      if (taken.has(key)) return false;
      if (termsCoverLeadTime && LEAD_TIME_SYNONYMS.includes(key)) return false;
      return true;
    })
    .map((spec) => ({ key: spec.key, value: spec.value }));
}

/* One row shape for both groups. The single biggest problem with the old
   layout was that the two lists used different label widths, so their value
   columns did not line up and the whole block looked misaligned. */
function Rows({ rows }: { rows: DetailRow[] }) {
  return (
    <dl className="flex flex-col border-t border-ink/15">
      {rows.map((row) => (
        <div
          key={row.key}
          className={cn(
            "flex flex-col gap-1.5 border-b border-ink/12 py-4",
            "sm:grid sm:grid-cols-[132px_1fr] sm:items-baseline sm:gap-6",
          )}
        >
          <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/64">
            {row.key}
          </dt>
          <dd className="text-[14px] leading-[1.7] text-ink/85">
            {row.value}
            {row.link && (
              /* Its own line, and named. Three identical "Read more" links on
                 one page is meaningless to anyone reading link text out of
                 context — a screen reader's link list, or a search engine's. */
              <Link
                href={row.link.href}
                className="mt-2.5 inline-block border-b border-ink/25 pb-[3px] font-mono text-[10px] uppercase tracking-[0.16em] text-ink/55 transition-colors hover:border-ink hover:text-ink"
              >
                {row.link.label}
              </Link>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Group({ title, rows }: { title: string; rows: DetailRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="flex flex-col gap-3.5">
      {/* Serif, so the group heading cannot be mistaken for another field
          label — mono uppercase is already spoken for by the keys. */}
      <h3 className="font-display text-[17px] leading-none">{title}</h3>
      <Rows rows={rows} />
    </section>
  );
}

export function PieceDetails({ piece }: { piece: PieceDetail }) {
  const terms = termsFor(piece);
  const specs = specsFor(piece, terms);

  if (specs.length === 0 && terms.length === 0) return null;

  return (
    <div className="flex flex-col gap-9">
      <Eyebrow>Details</Eyebrow>
      <Group title="The piece" rows={specs} />
      <Group title={piece.sold ? "After the sale" : "Buying it"} rows={terms} />
    </div>
  );
}
