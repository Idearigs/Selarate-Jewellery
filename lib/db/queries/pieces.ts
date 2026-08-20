import { and, asc, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { getDb, type Db } from "@/lib/db";
import { hold, piece, pieceImage } from "@/lib/db/schema";
import type {
  Category,
  Filter,
  PieceCard,
  PieceDetail,
  PieceImage,
  PieceTag,
} from "@/lib/types";

/**
 * Read side of the catalogue. Everything the storefront renders comes through
 * here, mapped into the view models in lib/types.ts so pages never touch
 * Drizzle rows directly.
 */

type PieceRow = typeof piece.$inferSelect;

/** A hold still counts if it was never released AND has not yet expired. */
const liveHold = and(isNull(hold.releasedAt), sql`${hold.expiresAt} > now()`);

function tagFor(row: PieceRow, held: boolean): PieceTag {
  if (row.availability === "order") return "Made to order";
  return held ? "Reserved" : "One of one";
}

function toCard(row: PieceRow, held = false, images: PieceImage[] = []): PieceCard {
  return {
    slug: row.slug,
    name: row.name,
    material: row.materialLine,
    priceCents: row.priceCents,
    category: row.category as Category,
    filter: row.filterTag as Filter,
    tag: tagFor(row, held),
    // Still empty for any piece not yet photographed — PlaceholderImage then
    // renders the shot list, so a half-shot catalogue degrades per card.
    images,
  };
}

/**
 * The two photographs a card can show: the primary, and the one it crossfades
 * to on hover. Fetched in a second round trip keyed by piece id rather than
 * joined, because a join against a to-many multiplies the piece rows and would
 * corrupt the LIMIT on the homepage grid.
 */
async function cardImagesFor(
  db: Db,
  pieceIds: string[],
): Promise<Map<string, PieceImage[]>> {
  const byPiece = new Map<string, PieceImage[]>();
  if (pieceIds.length === 0) return byPiece;

  const rows = await db
    .select({
      pieceId: pieceImage.pieceId,
      url: pieceImage.url,
      alt: pieceImage.alt,
      role: pieceImage.role,
    })
    .from(pieceImage)
    .where(and(inArray(pieceImage.pieceId, pieceIds), lt(pieceImage.position, 2)))
    .orderBy(asc(pieceImage.position));

  for (const r of rows) {
    const list = byPiece.get(r.pieceId) ?? [];
    list.push({ url: r.url, alt: r.alt, role: r.role as PieceImage["role"] });
    byPiece.set(r.pieceId, list);
  }
  return byPiece;
}

/**
 * Visible in the catalogue: published, not draft/archived, and — for unique
 * pieces — not yet sold. Sold one-of-a-kind pieces leave the listing but keep
 * their URL working (see getPieceBySlug).
 */
const isListable = and(
  or(eq(piece.availability, "unique"), eq(piece.availability, "order")),
  isNull(piece.soldAt),
);

export async function listPieces(opts: {
  category: Category;
  filter?: Filter;
  /** Price sort. The design's default is descending. */
  ascending?: boolean;
}): Promise<PieceCard[]> {
  const db = await getDb();

  const rows = await db
    .select({
      piece,
      // A single left join answers "is this piece currently held?" without an
      // N+1, and the `liveHold` predicate makes expiry lazy — an expired hold
      // simply fails to match, no sweeper required.
      heldId: hold.id,
    })
    .from(piece)
    .leftJoin(hold, and(eq(hold.pieceId, piece.id), liveHold))
    .where(
      and(
        isListable,
        eq(piece.category, opts.category),
        opts.filter && opts.filter !== "All"
          ? eq(piece.filterTag, opts.filter)
          : undefined,
      ),
    )
    .orderBy(opts.ascending ? asc(piece.priceCents) : desc(piece.priceCents));

  const images = await cardImagesFor(db, rows.map((r) => r.piece.id));
  return rows.map((r) =>
    toCard(r.piece, r.heldId !== null, images.get(r.piece.id)),
  );
}

/** The homepage "Available Now" grid — four unique pieces, studio order. */
export async function listFeaturedPieces(limit = 4): Promise<PieceCard[]> {
  const db = await getDb();

  const rows = await db
    .select({ piece, heldId: hold.id })
    .from(piece)
    .leftJoin(hold, and(eq(hold.pieceId, piece.id), liveHold))
    .where(and(isListable, eq(piece.availability, "unique")))
    .orderBy(asc(piece.sortIndex))
    .limit(limit);

  const images = await cardImagesFor(db, rows.map((r) => r.piece.id));
  return rows.map((r) =>
    toCard(r.piece, r.heldId !== null, images.get(r.piece.id)),
  );
}

/**
 * Full detail for the product page. Returns sold pieces too — the page renders
 * a "found its owner" state at 200 rather than 404ing, so the URL keeps its
 * links and search ranking.
 */
export async function getPieceBySlug(slug: string): Promise<PieceDetail | null> {
  const db = await getDb();

  const row = await db.query.piece.findFirst({
    where: (t, { eq: e }) => e(t.slug, slug),
    with: {
      specs: { orderBy: (t, { asc: a }) => a(t.position) },
      sizes: { orderBy: (t, { asc: a }) => a(t.position) },
      images: { orderBy: (t, { asc: a }) => a(t.position) },
    },
  });

  if (!row || row.availability === "draft" || row.availability === "archived") {
    return null;
  }

  // Related: same category, cheapest-first neighbours, excluding itself.
  const relatedRows = await db
    .select({ piece })
    .from(piece)
    .where(and(isListable, eq(piece.category, row.category), sql`${piece.id} <> ${row.id}`))
    .orderBy(asc(piece.sortIndex))
    .limit(3);

  const relatedImages = await cardImagesFor(
    db,
    relatedRows.map((r) => r.piece.id),
  );

  return {
    ...toCard(row),
    reference: row.reference,
    season: row.season ?? "",
    story: row.story,
    specs: row.specs.map((s) => ({ key: s.key, value: s.value })),
    sizes: row.sizes.map((s) => s.label),
    defaultSize: row.defaultSize,
    sizeNote: row.sizeNote,
    availability: row.availability as PieceDetail["availability"],
    sold: row.soldAt !== null,
    images: row.images.map((i) => ({
      url: i.url,
      alt: i.alt,
      role: i.role as PieceDetail["images"][number]["role"],
    })),
    related: relatedRows.map((r) =>
      toCard(r.piece, false, relatedImages.get(r.piece.id)),
    ),
  };
}

/** Slugs for generateStaticParams — every page that should be prerendered. */
export async function listAllSlugs(): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .select({ slug: piece.slug })
    .from(piece)
    .where(or(eq(piece.availability, "unique"), eq(piece.availability, "order")));
  return rows.map((r) => r.slug);
}
