import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-hosted on a VPS behind Caddy — ship a minimal server bundle.
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  // PGlite (the dev-only database fallback) ships a WASM binary and resolves it
  // relative to its own package directory. Bundling rewrites those paths and it
  // fails to boot, so it must be required from node_modules at runtime.
  serverExternalPackages: ["@electric-sql/pglite"],
  /**
   * Lets a phone on the same Wi-Fi hit the dev server by LAN address.
   *
   * Next blocks cross-origin dev requests by default — without this, loading
   * http://192.168.x.x:3000 fails on the internal asset requests rather than
   * on the page, so it presents as a half-rendered site rather than an
   * obvious "blocked" error.
   *
   * Development only; it has no effect on a production build.
   */
  allowedDevOrigins: ["192.168.0.82", "192.168.0.*", "*.trycloudflare.com"],
  images: {
    // Photography is served from MinIO (S3-compatible) through next/image + sharp.
    formats: ["image/avif", "image/webp"],
    remotePatterns: process.env.S3_PUBLIC_URL
      ? [new URL(`${process.env.S3_PUBLIC_URL}/**`)]
      : [],
  },
  async headers() {
    /**
     * Content Security Policy.
     *
     * `'unsafe-inline'` on style-src is required by Next's inlined critical CSS
     * and by next/font; it is a real (if small) loosening and the reason
     * script-src is kept as tight as possible in exchange.
     *
     * script-src needs `'unsafe-inline'` for Next's bootstrap payload in
     * production. Moving to a nonce-based policy needs middleware-generated
     * nonces threaded through, and is the obvious next hardening step.
     */
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'", // clickjacking: nothing here belongs in a frame
      "form-action 'self'",
      // 'unsafe-eval' is DEV ONLY — React Fast Refresh evaluates strings.
      // It must never reach production, where eval is the single most useful
      // primitive an injected script can have.
      process.env.NODE_ENV === "development"
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
        : "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      // Photography comes from our own origin via next/image; data: covers the
      // hatched placeholders and blur payloads.
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      /*
       * Only when the canonical origin is actually HTTPS.
       *
       * This directive rewrites every subresource request to https://.
       * Served over plain HTTP that upgrades the CSS and JS to a port
       * nothing is listening on, and the page arrives as unstyled text.
       * Browsers exempt localhost, so it only bites when the site is
       * opened by LAN address — from a phone, exactly where it is
       * hardest to debug. Set SITE_URL to https:// and it returns.
       */
      ...(process.env.SITE_URL?.startsWith("https://")
        ? ["upgrade-insecure-requests"]
        : []),
    ].join("; ");

    return [
      {
        // Headers that apply everywhere, including the admin.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // No page here needs a camera, microphone or location.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
      {
        /**
         * Storefront CSP only — /admin is deliberately excluded because
         * middleware.ts serves it a stricter, nonce-based policy. Two CSP
         * headers on one response are intersected by the browser, which would
         * make the interaction between the two policies hard to reason about.
         */
        source: "/((?!admin).*)",
        headers: [{ key: "Content-Security-Policy", value: csp }],
      },
      {
        // Order pages carry a customer's name, address and purchase history
        // behind an unguessable token. Never cache them at a shared layer.
        source: "/order/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
