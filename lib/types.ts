/**
 * Storefront view models — the contract between the data layer and the UI.
 * Components import from here, never from the Drizzle schema directly, so the
 * DB can change shape without touching pages.
 */

/**
 * The master switch, set on the piece editor's three availability cards. This
 * single value drives inventory behaviour across the entire system.
 *
 * unique — inventory of exactly 1. Holdable. Disappears from the catalogue when
 *          sold, but its URL keeps working (SEO: sold pieces return 200, not 404).
 * order  — made to order. No inventory limit, carries metal/size options and a
 *          6–8 week lead time. Never holdable.
 * draft  — invisible to the storefront entirely.
 */
export type Availability = "unique" | "order" | "draft";

/** Which of the two catalogue tabs a piece belongs to. */
export type Category = "ooak" | "fine";

/** Filter chips on the collection page. */
export const FILTERS = ["All", "Rings", "Earrings", "Necklaces", "Cuffs"] as const;
export type Filter = (typeof FILTERS)[number];

/** Corner tag shown at the top-left of a card image. */
export type PieceTag = "One of one" | "Made to order" | "Reserved";

export interface PieceImage {
  url: string;
  alt: string;
  role: "primary" | "detail" | "onbody" | "scale";
}

/** What a product card needs — nothing more, so listings stay cheap. */
export interface PieceCard {
  slug: string;
  name: string;
  material: string;
  priceCents: number;
  category: Category;
  filter: Filter;
  tag: PieceTag;
  /** Empty until the client's photography lands. */
  images: PieceImage[];
}

export interface PieceDetail extends PieceCard {
  reference: string;
  season: string;
  story: string;
  specs: { key: string; value: string }[];
  sizes: string[];
  /** Preselected chip; a finished unique piece already has a size. */
  defaultSize: string | null;
  sizeNote: string | null;
  availability: Availability;
  /**
   * True once a unique piece has been bought. The page still renders at 200 —
   * see the SEO note on getPieceBySlug — but shows the "found its owner" state
   * and marks the offer SoldOut in JSON-LD.
   */
  sold: boolean;
  related: PieceCard[];
}

/**
 * Live availability, fetched fresh (never cached) from /api/availability/[slug].
 * Deliberately separate from PieceDetail: the detail is statically rendered for
 * SEO, this is the dynamic island layered on top.
 */
export interface LiveAvailability {
  slug: string;
  /** Can it be added to the bag right now? */
  purchasable: boolean;
  state: "available" | "held-by-you" | "held-by-other" | "sold";
  /** ISO timestamp; present only when this visitor holds the piece. */
  holdExpiresAt: string | null;
}
