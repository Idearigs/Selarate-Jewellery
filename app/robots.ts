import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/**
 * The disallow list is not a security control — anything genuinely private is
 * also behind auth and carries `noindex`. It exists so crawl budget goes to the
 * ten product pages that actually matter, and so customer order URLs never
 * surface in search results.
 */
/**
 * Rendered per request, not at build.
 *
 * PREVIEW_MODE is a runtime variable, and this file is otherwise prerendered —
 * which meant the launched build's "Allow: /" was baked in and served while
 * the site was still behind the holding page, inviting exactly the crawl the
 * flag exists to prevent. One tiny text response per crawler visit is a fair
 * price for the flag being honest.
 */
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const base = env.SITE_URL.replace(/\/$/, "");

  /**
   * Pre-launch, refuse everything. Crawl the site now and the only page a
   * crawler can reach is the holding page — served at every URL — so it would
   * bank "opening soon" as the description for the homepage and every product,
   * and that impression outlives the launch by weeks.
   */
  if (env.PREVIEW_MODE === "1") {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      host: base,
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin", // staff only; also noindex via middleware and headers
          "/api/",
          "/bag",
          "/checkout",
          "/account",
          "/order/", // contains a customer's name, address and purchase
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
