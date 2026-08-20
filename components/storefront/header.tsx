"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "./wordmark";
import { cn } from "@/lib/cn";

/**
 * Desktop: three-part flex — left nav, centred wordmark, right nav.
 * Mobile:  Menu (text button) / centred wordmark / Bag n, with the drawer
 *          opening inline *below* the header on paper-alt (not an overlay).
 *
 * No icons: the menu control is the word "Menu", the close is "Close".
 */

const SHOP_LINKS = [
  { href: "/collection?category=ooak", label: "One of a Kind" },
  { href: "/collection?category=fine", label: "Fine Jewelry" },
  { href: "/atelier", label: "The Atelier" },
] as const;

const UTILITY_LINKS = [
  { href: "/contact", label: "Visit" },
  { href: "/account", label: "Account" },
] as const;

const navLink = "text-nav uppercase transition-opacity duration-200 hover:opacity-60";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [bagCount, setBagCount] = useState(0);
  const pathname = usePathname();

  // Fetched client-side rather than server-rendered: the count is
  // visitor-specific, and reading the cookie on the server would make every
  // page dynamic. Re-checked on navigation so it stays honest.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/bag/count", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { count: number } | null) => {
        if (!cancelled && data) setBagCount(data.count);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  /*
   * The drawer animates to a measured height rather than a guessed cap, so the
   * transition ends exactly when the panel stops moving and the menu can never
   * outgrow its own animation. ResizeObserver rather than a single read: the
   * links are set in a web font, and measuring before it loads returns a height
   * a few pixels short of the truth, which clips the last link.
   */
  const navRef = useRef<HTMLElement | null>(null);
  const [drawerHeight, setDrawerHeight] = useState(0);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const measure = () => setDrawerHeight(el.scrollHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    /* paper-alt rather than paper: the header sat on the same ground as the
       page, so on a long scroll the only thing separating navigation from
       content was a 1px rule. The tint is the same one the maker band and the
       mobile drawer already use. */
    <header className="border-b border-ink/12 bg-paper-alt">
      {/* py-3 on mobile, not py-5. The menu and bag controls already carry a
          44px minimum touch target, so the padding was stacking on top of that
          and giving the phone an 84px header — a quarter of the fold spent on
          navigation. The touch targets themselves are untouched. */}
      <div className="page-x flex items-center justify-between py-3 xl:py-6.5">
        {/* Mobile: text menu button */}
        <button
          type="button"
          className="min-h-11 text-nav uppercase xl:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-drawer"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? "Close" : "Menu"}
        </button>

        {/* Desktop: left nav */}
        <nav className="hidden gap-[34px] xl:flex" aria-label="Collections">
          {SHOP_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={navLink}>
              {l.label}
            </Link>
          ))}
        </nav>

        <Wordmark />

        {/* Desktop: right nav */}
        <nav className="hidden gap-[30px] xl:flex" aria-label="Account and bag">
          {UTILITY_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={navLink}>
              {l.label}
            </Link>
          ))}
          <Link href="/bag" className={navLink}>
            Bag{" "}
            <span className={bagCount > 0 ? "font-medium text-ink" : undefined}>
              ({bagCount})
            </span>
          </Link>
        </nav>

        {/* Mobile: bag */}
        <Link href="/bag" className="min-h-11 content-center text-nav uppercase xl:hidden">
          Bag{" "}
          <span className={bagCount > 0 ? "font-medium text-ink" : undefined}>
            {bagCount}
          </span>
        </Link>
      </div>

      {/* Drawer opens inline below the header, on paper-alt. */}
      {/* Not `hidden`: that attribute cannot be transitioned, so the menu
          appeared and vanished instantly. `inert` takes over its real job —
          keeping the closed menu out of the tab order and off screen readers —
          while the panel animates. */}
      <div
        id="mobile-drawer"
        data-open={menuOpen}
        style={
          drawerHeight
            ? ({ "--drawer-h": `${drawerHeight}px` } as React.CSSProperties)
            : undefined
        }
        className={cn("drawer bg-paper-alt xl:hidden", menuOpen && "border-t border-ink/12")}
      >
        <nav ref={navRef} className="page-x flex flex-col py-2" inert={!menuOpen}>
          {[...SHOP_LINKS, ...UTILITY_LINKS, { href: "/bag", label: "Bag" }].map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              style={{ "--i": i } as React.CSSProperties}
              className="drawer-item border-b border-ink/12 py-3.5 font-display text-xl last:border-b-0"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
