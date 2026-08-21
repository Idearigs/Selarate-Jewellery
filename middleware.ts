import { NextResponse, type NextRequest } from "next/server";
import { PREVIEW_COOKIE } from "@/lib/preview";
/**
 * Two jobs, both scoped to /admin.
 *
 * 1. A cheap turnstile for anonymous traffic.
 * 2. A per-request nonce so the admin can drop `'unsafe-inline'` for scripts.
 *
 * ── Why nonces are admin-only ─────────────────────────────────────────────
 * A nonce must be unique per request, so it cannot be baked into statically
 * prerendered HTML — adopting nonces sitewide would force every storefront page
 * to render on demand and destroy the static-SEO architecture the build rests
 * on. The admin is already 100% dynamic, so nonces cost nothing there, and it
 * is the surface worth protecting: it reads every order, address and payment
 * reference in the business.
 *
 * The storefront keeps its own (inline-permitting) policy from next.config.ts,
 * which deliberately excludes /admin so the two never both apply.
 */

function adminCsp(nonce: string) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    /**
     * `'strict-dynamic'` lets the nonced bootstrap script load Next's chunks
     * without listing each one. Modern browsers ignore `'self'` once
     * strict-dynamic is present; it stays for older ones.
     *
     * NOTE: no `'unsafe-inline'` here. A nonce in the policy makes browsers
     * ignore it anyway, and its absence is the whole point of this policy.
     */
    // 'unsafe-eval' is DEV ONLY — React Fast Refresh evaluates strings. It must
    // never reach production, where eval is the most useful primitive an
    // injected script can have.
    process.env.NODE_ENV === "development"
      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // Styles still need inline: Next inlines critical CSS and next/font emits
    // a style element. A style injection is far less dangerous than a script.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    // Same reasoning as the storefront policy in next.config.ts.
    ...(process.env.SITE_URL?.startsWith("https://")
      ? ["upgrade-insecure-requests"]
      : []),
  ].join("; ");
}

/**
 * Paths that must keep working while the holding page is up.
 *
 * /admin is the point — the studio has to be able to load stock and test
 * checkout behind the curtain, and it has its own session gate below.
 * /api/health is Coolify's readiness probe: gate it and the platform decides
 * the container never came up and rolls the deploy back.
 */
const PREVIEW_EXEMPT = [
  "/admin",
  "/preview",
  "/coming-soon",
  "/api/health",
  "/api/payments", // provider webhooks are signed, and must never 200 with HTML
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
];

/** The holding page, or null to let the request through untouched. */
function previewGate(request: NextRequest): NextResponse | null {
  if (process.env.PREVIEW_MODE !== "1") return null;

  const { pathname } = request.nextUrl;

  const exempt = PREVIEW_EXEMPT.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (exempt) return null;

  if (request.cookies.has(PREVIEW_COOKIE)) return null;

  /**
   * Rewrite, not redirect: the visitor keeps the URL they typed, so the
   * address bar still reads selaratejewellery.com rather than advertising
   * that a /coming-soon page exists.
   */
  const url = request.nextUrl.clone();
  url.pathname = "/coming-soon";
  url.search = "";

  const response = NextResponse.rewrite(url);
  // The holding page must never be what a crawler banks as the homepage.
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const held = previewGate(request);
  if (held) return held;

  // Everything below is the admin's business only. The matcher spans the whole
  // site now that the preview gate needs it, so this guard is what keeps the
  // nonce and turnstile logic off the storefront.
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const isSignIn = pathname === "/admin/sign-in";
  const hasSession = request.cookies.has("studio_session");
  /**
   * Presence of a cookie only. Middleware runs on the edge and cannot reach the
   * database, so this cannot tell a valid session from a forged one — that is
   * the job of the admin layout and `requirePermission()`. A turnstile, never
   * the authorisation boundary.
   */
  if (!isSignIn && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/sign-in";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = adminCsp(nonce);

  // Next reads the nonce out of the CSP on the REQUEST headers and stamps it
  // onto the scripts it emits, so both halves are required.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  // Nothing in the admin should ever be cached by a shared layer.
  response.headers.set("Cache-Control", "private, no-store");

  return response;
}

export const config = {
  /**
   * Sitewide, because the preview gate has to cover every storefront URL — a
   * gate with a hole in it is not a gate.
   *
   * Static assets are excluded rather than exempted in code: the holding page
   * and the admin both need their own CSS and JS to load, and running
   * middleware on every chunk request costs latency for nothing.
   *
   * This does NOT make the storefront dynamic. Middleware runs ahead of the
   * cache and returns `next()` untouched once PREVIEW_MODE is off, so the
   * statically prerendered pages are still served as static.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|photography/|.*\\.(?:png|jpg|jpeg|svg|webp|avif|ico|txt|xml|webmanifest)$).*)",
  ],
};
