import type { MetadataRoute } from "next";
import { listAllSlugs } from "@/lib/db/queries/pieces";
import { CARE } from "@/lib/content";
import { env } from "@/lib/env";

/**
 * Sitemap, generated from the database.
 *
 * Only public, indexable pages appear. Bag, checkout, account and order pages
 * are visitor-specific or contain personal data and are excluded here as well
 * as in robots.ts.
 *
 * Sold one-of-a-kind pieces stay listed on purpose: their URLs keep returning
 * 200 with a SoldOut offer, and they hold the inbound links this catalogue
 * accrues over time.
 */
/** Same reason as robots.ts: PREVIEW_MODE is runtime, this file is not. */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.SITE_URL.replace(/\/$/, "");
  const now = new Date();

  // Pre-launch the sitemap is the one page that still describes the real site:
  // it is excluded from the holding-page rewrite so robots.txt stays coherent,
  // which would otherwise leave the whole unreleased catalogue listed at a
  // predictable URL. Nothing to advertise until there is something to visit.
  if (env.PREVIEW_MODE === "1") return [];

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: `${base}/collection?category=ooak`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${base}/collection?category=fine`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    { url: `${base}/about`, lastModified: now, changeFrequency: "yearly", priority: 0.7 },
    { url: `${base}/atelier`, lastModified: now, changeFrequency: "yearly", priority: 0.7 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/gift-cards`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    ...Object.keys(CARE).map((topic) => ({
      url: `${base}/care/${topic}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.4,
    })),
  ];

  let pieces: MetadataRoute.Sitemap = [];
  try {
    const slugs = await listAllSlugs();
    pieces = slugs.map((slug) => ({
      url: `${base}/piece/${slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    }));
  } catch (error) {
    // A database hiccup must not serve an empty sitemap — that reads to a
    // crawler as "every product page was removed".
    console.error("[sitemap] could not list pieces", error);
    throw error;
  }

  return [...staticPages, ...pieces];
}
