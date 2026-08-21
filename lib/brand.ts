/**
 * The studio's name, in one place.
 *
 * It appears in the wordmark, the page-title template, OG images, JSON-LD and
 * every transactional email — nine surfaces that must never disagree, because a
 * mismatched sender name is what phishing looks like.
 *
 * Plain ASCII, matching the registered domain selaratejewellery.com. An
 * earlier draft carried accents ("Sélarté"); they are gone because the name is
 * spelled Selarate, and a wordmark that disagrees with the domain reads as the
 * wrong site.
 *
 * The wordmark renders this uppercased in CSS — "SELARATE".
 *
 * `settings.studioName` in the database overrides this for the JewelryStore
 * JSON-LD, so the owner can correct it without a deploy. This is the fallback.
 */
export const BRAND_NAME = "Selarate";

/**
 * The goldsmith. Named here beside the studio because the two appear together
 * on the homepage maker band, the About page and the Atelier, and a studio
 * that cannot keep its own maker's name consistent across three pages is not
 * a studio anyone trusts with five figures.
 */
export const MAKER_NAME = "Mr. Chamal Jayasingha";

/** Used where the name is combined with a description, e.g. the OG alt text. */
export const BRAND_TAGLINE = "One-of-a-kind fine jewelry";
