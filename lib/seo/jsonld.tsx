import { BRAND_NAME } from "@/lib/brand";
import { env } from "@/lib/env";
import type { PieceDetail } from "@/lib/types";

/**
 * Structured data. With a ten-piece catalogue, rich results are a
 * disproportionate share of the storefront's discoverability, so this is
 * treated as product surface, not decoration.
 */

const SITE = env.SITE_URL.replace(/\/$/, "");

/**
 * A sold one-of-a-kind piece is marked SoldOut rather than removed. The URL
 * keeps returning 200 and keeps its accumulated links — deleting it would throw
 * that away for no benefit.
 */
export function productJsonLd(piece: PieceDetail, sold: boolean) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: piece.name,
    sku: piece.reference,
    description: piece.story || piece.material,
    material: piece.material,
    category: piece.category === "ooak" ? "One of a Kind" : "Fine Jewelry",
    url: `${SITE}/piece/${piece.slug}`,
    image: piece.images.map((i) => i.url),
    brand: { "@type": "Brand", name: BRAND_NAME },
    offers: {
      "@type": "Offer",
      price: (piece.priceCents / 100).toFixed(2),
      priceCurrency: "USD",
      itemCondition: "https://schema.org/NewCondition",
      availability: sold
        ? "https://schema.org/SoldOut"
        : piece.availability === "order"
          ? "https://schema.org/PreOrder"
          : "https://schema.org/InStock",
      url: `${SITE}/piece/${piece.slug}`,
      seller: { "@type": "Organization", name: BRAND_NAME },
    },
  };
}

export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE}${item.path}`,
    })),
  };
}

/**
 * Sitewide. Drives the local-search knowledge panel.
 *
 * Fed from the admin's Settings view rather than hardcoded, so the studio can
 * correct its own address and phone without a deploy — and so those values
 * cannot silently drift out of step with what the Contact page shows.
 */
export function organizationJsonLd(studio?: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "JewelryStore",
    name: studio?.name || BRAND_NAME,
    url: SITE,
    description:
      "Independent studio making one-of-a-kind fine jewelry by hand, sold directly.",
    ...(studio?.email ? { email: studio.email } : {}),
    ...(studio?.phone ? { telephone: studio.phone } : {}),
    ...(studio?.address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: studio.address,
          },
        }
      : {}),
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "11:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Saturday"],
        opens: "11:00",
        closes: "16:00",
      },
    ],
    priceRange: "$$$$",
  };
}

/** Renders a JSON-LD block. Kept in one place so escaping is consistent. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe here; the `<` guard prevents any chance
      // of breaking out of the script element.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
