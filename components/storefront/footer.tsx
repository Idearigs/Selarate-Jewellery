import Link from "next/link";
import { Wordmark } from "./wordmark";

/**
 * Four columns on desktop (1.4fr 1fr 1fr 1fr), stacked on mobile.
 * Column headings are 11px uppercase at 0.2em, ink/64.
 */

const COLUMNS = [
  {
    heading: "Shop",
    links: [
      { href: "/collection?category=ooak", label: "One of a Kind" },
      { href: "/collection?category=fine", label: "Fine Jewelry" },
      { href: "/gift-cards", label: "Gift Cards" },
    ],
  },
  {
    heading: "Studio",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Visit" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    heading: "Care",
    links: [
      { href: "/care/sizing", label: "Sizing" },
      { href: "/care/shipping", label: "Shipping" },
      { href: "/care/repairs", label: "Repairs" },
    ],
  },
] as const;

export function Footer() {
  return (
    /* Ink, with bone type. The page is one continuous field of paper, so it
       ended rather than closed; an ink block anchors it. The pairing is not
       new — it is the admin sidebar’s, and globals.css already flips
       :focus-visible to bone inside anything carrying .bg-ink, so keyboard
       focus stays visible here without another rule. */
    <footer className="page-x grid gap-10 bg-ink pb-16 pt-14 text-center text-bone md:grid-cols-2 md:text-left xl:grid-cols-[1.4fr_1fr_1fr_1fr] xl:pt-22">
      <div className="flex flex-col items-center gap-4 md:items-start">
        {/* pl matches the tracking, not 0. Letter-spacing adds a trailing gap
            after the final letter, so a centred wordmark — which this is on a
            phone — reads as sitting left of centre without it. */}
        <Wordmark
          as="text"
          className="!text-[24px] !tracking-[0.3em] !pl-[0.3em] xl:!text-[28px]"
        />
        {/* TODO(launch): replace with the studio's real address. */}
        <p className="mx-auto max-w-[260px] text-body-sm text-bone/55 md:mx-0">
          Studio and showroom
          <br />
          By appointment
        </p>
      </div>

      {COLUMNS.map((col) => (
        <div
          key={col.heading}
          className="flex flex-col items-center gap-3 md:items-start"
        >
          <h2 className="mb-1 font-body text-[11px] uppercase tracking-[0.2em] text-bone/50">
            {col.heading}
          </h2>
          {col.links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-body-sm text-bone/70 transition-colors duration-200 hover:text-bone"
            >
              {l.label}
            </Link>
          ))}
        </div>
      ))}
    </footer>
  );
}
