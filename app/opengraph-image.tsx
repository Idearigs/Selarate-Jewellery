import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/seo/og";

export const alt = `${BRAND_NAME} — ${BRAND_TAGLINE.toLowerCase()}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** Sitewide fallback card, used by any page without its own. */
export default function Image() {
  return renderOgImage({
    eyebrow: "No. 01 — Spring Editions",
    title: "Each piece made once, then never again.",
  });
}
