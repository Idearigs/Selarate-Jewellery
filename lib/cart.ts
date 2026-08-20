import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { useSecureCookies } from "@/lib/cookie-security";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { cart, cartItem, piece } from "@/lib/db/schema";
import { formatPrice } from "@/lib/format";

const COOKIE = "bag_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * The bag is keyed by an opaque cookie token, not by a signed-in user — most
 * buyers here check out exactly once and never return, so requiring an account
 * would cost sales. The token survives sign-in, so a guest bag is never lost.
 */

/** Read-only. Safe in Server Components, which cannot set cookies. */
export async function getCartToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? null;
}

/**
 * Get or create the cart row and set the cookie.
 * Only valid inside a Server Action or Route Handler.
 */
export async function getOrCreateCart(): Promise<{ id: string; token: string }> {
  const db = await getDb();
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;

  if (existing) {
    const row = await db.query.cart.findFirst({
      where: (t, { eq: e }) => e(t.token, existing),
      columns: { id: true, token: true },
    });
    if (row) return row;
  }

  const token = randomUUID();
  const [row] = await db.insert(cart).values({ token }).returning({
    id: cart.id,
    token: cart.token,
  });

  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: await useSecureCookies(),
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return row!;
}

export interface BagLine {
  itemId: string;
  pieceId: string;
  slug: string;
  name: string;
  reference: string;
  material: string;
  size: string | null;
  engraving: string | null;
  giftWrap: boolean;
  unitPriceCents: number;
  /** Present only for one-of-a-kind pieces; drives the "Held n min" note. */
  holdExpiresAt: string | null;
  /** The piece as photographed. Null until it has been shot. */
  imageUrl: string | null;
  imageAlt: string;
}

export interface BagSummary {
  lines: BagLine[];
  subtotalCents: number;
  /** Insured shipping is included in the price — shown as "Included". */
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  formatted: {
    subtotal: string;
    tax: string;
    total: string;
  };
}

/** Everything the bag page and the header count need, in one round trip. */
export async function getBag(): Promise<BagSummary> {
  const empty: BagSummary = {
    lines: [],
    subtotalCents: 0,
    shippingCents: 0,
    taxCents: 0,
    totalCents: 0,
    formatted: { subtotal: "$0", tax: "$0", total: "$0" },
  };

  const token = await getCartToken();
  if (!token) return empty;

  const db = await getDb();
  const cartRow = await db.query.cart.findFirst({
    where: (t, { eq: e }) => e(t.token, token),
    columns: { id: true },
  });
  if (!cartRow) return empty;

  const rows = await db
    .select({ item: cartItem, piece })
    .from(cartItem)
    .innerJoin(piece, eq(piece.id, cartItem.pieceId))
    .where(eq(cartItem.cartId, cartRow.id));

  if (rows.length === 0) return empty;

  // Hold expiry is read separately so the bag reflects live server state, not
  // whatever was true when the item was added.
  const holds = await db.query.hold.findMany({
    where: (t, { and: a, eq: e, isNull: n }) =>
      a(e(t.cartId, cartRow.id), n(t.releasedAt)),
    columns: { pieceId: true, expiresAt: true },
  });
  const holdBy = new Map(holds.map((h) => [h.pieceId, h.expiresAt]));

  /* The bag was rendering a hatched placeholder for every line regardless of
     whether the piece had been photographed — the image was simply never
     fetched. On a jewelry bag the photograph is the only colour on the page,
     and its absence made a five-figure order look like an invoice. */
  const shots = await db.query.pieceImage.findMany({
    where: (t, { and: an, eq: e, inArray: ia }) =>
      an(ia(t.pieceId, rows.map((r) => r.piece.id)), e(t.position, 0)),
    columns: { pieceId: true, url: true, alt: true },
  });
  const shotBy = new Map(shots.map((s) => [s.pieceId, s]));

  const lines: BagLine[] = rows.map(({ item, piece: p }) => {
    const expiry = holdBy.get(p.id);
    return {
      itemId: item.id,
      pieceId: p.id,
      slug: p.slug,
      name: p.name,
      reference: p.reference,
      material: p.materialLine,
      size: item.size,
      engraving: item.engraving,
      giftWrap: item.giftWrap,
      unitPriceCents: item.unitPriceCents,
      holdExpiresAt:
        expiry && expiry.getTime() > Date.now() ? expiry.toISOString() : null,
      imageUrl: shotBy.get(p.id)?.url ?? null,
      imageAlt: shotBy.get(p.id)?.alt ?? p.name,
    };
  });

  const config = await db.query.settings.findFirst({
    where: (t, { eq: e }) => e(t.id, 1),
    columns: { taxRateBps: true },
  });

  const subtotalCents = lines.reduce((sum, l) => sum + l.unitPriceCents, 0);
  const taxCents = Math.round((subtotalCents * (config?.taxRateBps ?? 750)) / 10_000);
  const shippingCents = 0; // insured shipping is included
  const totalCents = subtotalCents + shippingCents + taxCents;

  return {
    lines,
    subtotalCents,
    shippingCents,
    taxCents,
    totalCents,
    formatted: {
      subtotal: formatPrice(subtotalCents),
      tax: formatPrice(taxCents),
      total: formatPrice(totalCents),
    },
  };
}

/** Header badge. Cheap enough to call on every layout render. */
export async function getBagCount(): Promise<number> {
  const token = await getCartToken();
  if (!token) return 0;

  const db = await getDb();
  const row = await db.query.cart.findFirst({
    where: (t, { eq: e }) => e(t.token, token),
    columns: { id: true },
    with: { items: { columns: { id: true } } },
  });
  return row?.items.length ?? 0;
}
