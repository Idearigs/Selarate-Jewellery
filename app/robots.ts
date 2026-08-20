import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/**
 * The disallow list is not a security control — anything genuinely private is
 * also behind auth and carries `noindex`. It exists so crawl budget goes to the
 * ten product pages that actually matter, and so customer order URLs never
 * surface in search results.
 */
export default function robots(): MetadataRoute.Robots {
  const base = env.SITE_URL.replace(/\/$/, "");

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
