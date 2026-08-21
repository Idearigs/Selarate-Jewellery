import type { Metadata } from "next";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

/**
 * Holding page shown at every storefront URL while PREVIEW_MODE is on.
 *
 * Outside the (storefront) route group on purpose: no header, no footer, no
 * navigation. Every link would lead somewhere that is also this page, and a
 * dead nav reads worse than no nav.
 *
 * Static — it takes no data and must stay up even if the database is down,
 * which during a build-out is exactly when a stranger is most likely to visit.
 */
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: `${BRAND_NAME} — Opening soon`,
  description: `${BRAND_TAGLINE}. The studio's online home opens shortly.`,
  // Belt and braces with the middleware header: nothing here should be the
  // page a search engine remembers us by.
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-paper px-6 py-20 text-center">
      <p className="font-mono text-label uppercase tracking-[0.2em] text-ink/56">
        Est. 2026
      </p>

      {/* Not the Wordmark component: that one is a link home, and here home is
          this page. Same type treatment, no anchor. */}
      <h1 className="mt-7 font-display uppercase text-[26px] tracking-[0.3em] pl-[0.3em] text-ink sm:text-[38px] sm:tracking-[0.34em] sm:pl-[0.34em]">
        {BRAND_NAME}
      </h1>

      <div className="mt-9 h-px w-14 bg-ink/20" />

      <p className="mt-9 max-w-[34ch] text-section-m leading-[1.25] text-ink sm:max-w-[24ch] sm:text-[34px]">
        The studio is opening soon.
      </p>

      <p className="mt-6 max-w-[46ch] text-body leading-[1.75] text-ink/68">
        Hand-forged fine jewelry in gold and colored stone, made one piece at a
        time by {" "}
        <span className="whitespace-nowrap">Mr. Chamal Jayasingha</span>.
      </p>

      <p className="mt-12 font-mono text-label uppercase tracking-[0.2em] text-ink/56">
        For enquiries
      </p>
      {/* A real, working way to reach the studio. A holding page with no
          contact route turns an interested visitor into a lost one. */}
      <a
        href="mailto:studio@selaratejewellery.com"
        className="mt-2.5 border-b border-ink/30 pb-0.5 text-body text-ink transition-colors hover:border-ink"
      >
        studio@selaratejewellery.com
      </a>
    </main>
  );
}
