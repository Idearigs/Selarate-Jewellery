"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { cartItem } from "@/lib/db/schema";
import { getOrCreateCart } from "@/lib/cart";
import { acquireHold, releaseHold } from "@/lib/holds";

/**
 * Bag mutations. Each one is the only supported way to change bag state — the
 * client never posts a price, a hold expiry, or an availability decision.
 */

export type AddToBagResult =
  | { ok: true; expiresAt: string | null }
  | { ok: false; reason: "sold" | "held-by-other" | "unavailable" };

export async function addToBag(
  slug: string,
  size?: string | null,
): Promise<AddToBagResult> {
  const db = await getDb();

  const target = await db.query.piece.findFirst({
    where: (t, { eq: e }) => e(t.slug, slug),
    columns: {
      id: true,
      priceCents: true,
      availability: true,
      soldAt: true,
    },
  });

  if (
    !target ||
    target.soldAt ||
    (target.availability !== "unique" && target.availability !== "order")
  ) {
    return { ok: false, reason: "sold" };
  }

  const { id: cartId } = await getOrCreateCart();

  // One-of-a-kind pieces must win a hold before they can enter any bag.
  let expiresAt: string | null = null;
  if (target.availability === "unique") {
    const held = await acquireHold(target.id, cartId);
    if (!held.ok) {
      return {
        ok: false,
        reason: held.reason === "held-by-other" ? "held-by-other" : "sold",
      };
    }
    expiresAt = held.expiresAt.toISOString();
  }

  await db
    .insert(cartItem)
    .values({
      cartId,
      pieceId: target.id,
      size: size ?? null,
      // Price is read from the DB, never accepted from the client.
      unitPriceCents: target.priceCents,
    })
    .onConflictDoUpdate({
      target: [cartItem.cartId, cartItem.pieceId],
      set: { size: size ?? null },
    });

  revalidateTag(`piece:${slug}`);
  revalidatePath("/bag");
  return { ok: true, expiresAt };
}

export async function removeFromBag(slug: string) {
  const db = await getDb();
  const { id: cartId } = await getOrCreateCart();

  const target = await db.query.piece.findFirst({
    where: (t, { eq: e }) => e(t.slug, slug),
    columns: { id: true },
  });
  if (!target) return;

  await db
    .delete(cartItem)
    .where(and(eq(cartItem.cartId, cartId), eq(cartItem.pieceId, target.id)));

  // Releasing the hold is what returns the piece to the catalogue.
  await releaseHold(target.id, cartId);

  revalidateTag(`piece:${slug}`);
  revalidatePath("/bag");
  revalidatePath("/collection");
}

export async function setLineOptions(
  slug: string,
  opts: { engraving?: string | null; giftWrap?: boolean },
) {
  const db = await getDb();
  const { id: cartId } = await getOrCreateCart();

  const target = await db.query.piece.findFirst({
    where: (t, { eq: e }) => e(t.slug, slug),
    columns: { id: true },
  });
  if (!target) return;

  await db
    .update(cartItem)
    .set({
      ...(opts.engraving !== undefined ? { engraving: opts.engraving } : {}),
      ...(opts.giftWrap !== undefined ? { giftWrap: opts.giftWrap } : {}),
    })
    .where(and(eq(cartItem.cartId, cartId), eq(cartItem.pieceId, target.id)));

  revalidatePath("/bag");
}
