/**
 * The studio's name, in one place.
 *
 * It appears in the wordmark, the page-title template, OG images, JSON-LD and
 * every transactional email — nine surfaces that must never disagree, because a
 * mismatched sender name is what phishing looks like.
 *
 * Both é are U+00E9 (a precomposed character, not "e" + a combining accent), so
 * each compares and sorts as a single character and survives copy-paste intact.
 * Both fonts carry the glyph: the site uses Google's `latin` subset of
 * Marcellus, which spans U+00C9/U+00E9, and the OG renderer uses the full
 * `assets/fonts/Marcellus-Regular.ttf`.
 *
 * The wordmark renders this uppercased in CSS — "SÉLARTÉ". Both accents are
 * deliberately kept on the capitals; dropping them is a French typographic
 * convention that would read here as a spelling error.
 *
 * `settings.studioName` in the database overrides this for the JewelryStore
 * JSON-LD, so the owner can correct it without a deploy. This is the fallback.
 */
export const BRAND_NAME = "Sélarté";

/**
 * The goldsmith. Named here beside the studio because the two appear together
 * on the homepage maker band, the About page and the Atelier, and a studio
 * that cannot keep its own maker's name consistent across three pages is not
 * a studio anyone trusts with five figures.
 */
export const MAKER_NAME = "Mr. Chamal Jayasingha";

/** Used where the name is combined with a description, e.g. the OG alt text. */
export const BRAND_TAGLINE = "One-of-a-kind fine jewelry";
