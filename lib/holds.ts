import { and, eq, isNull, lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { cart, hold, piece } from "@/lib/db/schema";
import type { LiveAvailability } from "@/lib/types";

/**
 * Server-authoritative reservations on one-of-a-kind pieces.
 *
 * NOTHING ELSE IN THE CODEBASE MAY WRITE TO THE `hold` TABLE. Every path in and
 * out of a reservation goes through this module, because the invariant it
 * protects — a piece with inventory of one can be sold exactly once — is the
 * single most expensive thing to get wrong in this business.
 *
 * Three layers of defence, deliberately redundant:
 *
 *  1. `SELECT … FOR UPDATE` on the piece row serialises concurrent buyers. Two
 *     visitors clicking "Add to bag" at the same instant queue up rather than
 *     both succeeding.
 *  2. A partial unique index (`hold_one_live_per_piece_idx`) makes a second
 *     live hold physically impossible, so even a bug in this file cannot
 *     double-book a piece — Postgres refuses the insert.
 *  3. Expiry is evaluated LAZILY on read: an unreleased hold whose expires_at
 *     has passed is treated as gone everywhere. Correctness therefore never
 *     depends on the sweeper worker running, which is what makes the system
 *     safe to operate on a single VPS.
 *
 * The client-side countdown is display only. The server decides.
 */

export type HoldResult =
  | { ok: true; expiresAt: Date }
  | { ok: false; reason: "sold" | "held-by-other" | "not-holdable" };

/** A hold counts only if it was never released AND has not yet expired. */
const isLive = and(isNull(hold.releasedAt), sql`${hold.expiresAt} > now()`);

export async function getHoldWindowMinutes(): Promise<number> {
  const db = await getDb();
  const row = await db.query.settings.findFirst({
    where: (t, { eq: e }) => e(t.id, 1),
    columns: { holdWindowMinutes: true },
  });
  // Same row the admin Settings view edits. One value, two surfaces.
  return row?.holdWindowMinutes ?? 60;
}

/**
 * Place (or extend) this cart's hold on a piece.
 *
 * Made-to-order pieces are never held — there is no scarcity to protect, and
 * holding them would block other buyers for no reason.
 */
export async function acquireHold(
  pieceId: string,
  cartId: string,
): Promise<HoldResult> {
  const db = await getDb();
  const windowMinutes = await getHoldWindowMinutes();

  return db.transaction(async (tx) => {
    // Lock the piece row first. Everything below is now serialised per piece.
    const [target] = await tx
      .select({
        id: piece.id,
        availability: piece.availability,
        soldAt: piece.soldAt,
      })
      .from(piece)
      .where(eq(piece.id, pieceId))
      .for("update");

    if (!target) return { ok: false, reason: "sold" } as const;
    if (target.soldAt) return { ok: false, reason: "sold" } as const;
    if (target.availability !== "unique") {
      return { ok: false, reason: "not-holdable" } as const;
    }

    const [existing] = await tx
      .select({ id: hold.id, cartId: hold.cartId, expiresAt: hold.expiresAt })
      .from(hold)
      .where(and(eq(hold.pieceId, pieceId), isNull(hold.releasedAt)));

    const expiresAt = new Date(Date.now() + windowMinutes * 60_000);

    if (existing) {
      const stillLive = existing.expiresAt.getTime() > Date.now();

      if (stillLive && existing.cartId !== cartId) {
        return { ok: false, reason: "held-by-other" } as const;
      }

      if (stillLive) {
        // Same cart re-adding: refresh the window rather than stacking holds.
        await tx.update(hold).set({ expiresAt }).where(eq(hold.id, existing.id));
        return { ok: true, expiresAt } as const;
      }

      // Expired but never swept. Release it so the unique index frees up.
      await tx
        .update(hold)
        .set({ releasedAt: new Date() })
        .where(eq(hold.id, existing.id));
    }

    await tx.insert(hold).values({ pieceId, cartId, expiresAt });
    return { ok: true, expiresAt } as const;
  });
}

/** Remove from bag, or abandon checkout. Idempotent. */
export async function releaseHold(pieceId: string, cartId: string) {
  const db = await getDb();
  await db
    .update(hold)
    .set({ releasedAt: new Date() })
    .where(
      and(
        eq(hold.pieceId, pieceId),
        eq(hold.cartId, cartId),
        isNull(hold.releasedAt),
      ),
    );
}

/**
 * Convert a hold into a sale. Called inside the payment webhook once funds are
 * confirmed — never on the browser's return URL.
 */
export async function convertHoldToSale(
  pieceId: string,
  cartId: string,
  orderId: string,
) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx
      .update(hold)
      .set({ releasedAt: new Date(), orderId })
      .where(
        and(
          eq(hold.pieceId, pieceId),
          eq(hold.cartId, cartId),
          isNull(hold.releasedAt),
        ),
      );
    // Marking soldAt is what removes it from the catalogue. The row stays, and
    // its URL keeps returning 200 with a "found its owner" state.
    await tx
      .update(piece)
      .set({ soldAt: new Date() })
      .where(and(eq(piece.id, pieceId), eq(piece.availability, "unique")));
  });
}

/**
 * Live availability for one piece. Never cached — this is the dynamic island
 * layered over the statically rendered product page.
 */
export async function getLiveAvailability(
  slug: string,
  cartToken: string | null,
): Promise<LiveAvailability | null> {
  const db = await getDb();

  const [row] = await db
    .select({
      pieceId: piece.id,
      availability: piece.availability,
      soldAt: piece.soldAt,
      holdCartId: hold.cartId,
      holdExpiresAt: hold.expiresAt,
      holderToken: cart.token,
    })
    .from(piece)
    .leftJoin(hold, and(eq(hold.pieceId, piece.id), isLive))
    .leftJoin(cart, eq(cart.id, hold.cartId))
    .where(eq(piece.slug, slug));

  if (!row) return null;

  if (row.availability === "order") {
    // Made to order: always purchasable, never held.
    return { slug, purchasable: true, state: "available", holdExpiresAt: null };
  }

  if (row.soldAt) {
    return { slug, purchasable: false, state: "sold", holdExpiresAt: null };
  }

  if (row.holdCartId) {
    const mine = cartToken !== null && row.holderToken === cartToken;
    return {
      slug,
      purchasable: mine,
      state: mine ? "held-by-you" : "held-by-other",
      holdExpiresAt: mine ? (row.holdExpiresAt?.toISOString() ?? null) : null,
    };
  }

  return { slug, purchasable: true, state: "available", holdExpiresAt: null };
}

/**
 * Sweeper. Releases holds that have already lapsed.
 *
 * This is a tidiness job, not a correctness one — `isLive` already ignores
 * expired holds everywhere. Its real purpose is to free the unique index and
 * give the caller a list of slugs to revalidate so sold-out pieces return to
 * the static catalogue promptly.
 */
export async function sweepExpiredHolds(): Promise<string[]> {
  const db = await getDb();

  const expired = await db
    .select({ id: hold.id, slug: piece.slug })
    .from(hold)
    .innerJoin(piece, eq(piece.id, hold.pieceId))
    .where(and(isNull(hold.releasedAt), lt(hold.expiresAt, new Date())));

  if (expired.length === 0) return [];

  await db
    .update(hold)
    .set({ releasedAt: new Date() })
    .where(and(isNull(hold.releasedAt), lt(hold.expiresAt, new Date())));

  return [...new Set(expired.map((e) => e.slug))];
}
