"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { piece, pieceSize, pieceSpec } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth";

/**
 * Piece editor writes.
 *
 * `availability` is the single control that drives inventory behaviour across
 * the whole system, so it is validated as an enum rather than trusted, and any
 * change to it revalidates the storefront immediately — a piece flipped to
 * draft must vanish from the catalogue now, not within the hour.
 */

const schema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "A piece needs a name"),
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only"),
  reference: z.string().trim().min(1, "A reference is required"),
  category: z.enum(["ooak", "fine"]),
  availability: z.enum(["unique", "order", "draft", "archived"]),
  // Entered in dollars, stored in cents. Never floats.
  price: z.coerce.number().min(0),
  materialLine: z.string().trim().min(1),
  filterTag: z.enum(["Rings", "Earrings", "Necklaces", "Cuffs"]),
  story: z.string().trim().optional().default(""),
  season: z.string().trim().optional(),
  defaultSize: z.string().trim().optional(),
  sizeNote: z.string().trim().optional(),
  sizes: z.array(z.string()).optional().default([]),
});

export type PieceFormState = {
  errors?: Record<string, string>;
  saved?: boolean;
};

export async function savePiece(
  _prev: PieceFormState,
  formData: FormData,
): Promise<PieceFormState> {
  await requirePermission("pieces");

  const parsed = schema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    slug: formData.get("slug"),
    reference: formData.get("reference"),
    category: formData.get("category"),
    availability: formData.get("availability"),
    price: formData.get("price"),
    materialLine: formData.get("materialLine"),
    filterTag: formData.get("filterTag"),
    story: formData.get("story") ?? "",
    season: formData.get("season") || undefined,
    defaultSize: formData.get("defaultSize") || undefined,
    sizeNote: formData.get("sizeNote") || undefined,
    sizes: formData.getAll("sizes").map(String),
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      errors[key] ??= issue.message;
    }
    return { errors };
  }

  const db = await getDb();
  const { id, price, sizes, ...values } = parsed.data;

  const row = {
    ...values,
    priceCents: Math.round(price * 100),
    season: values.season ?? null,
    defaultSize: values.defaultSize ?? null,
    sizeNote: values.sizeNote ?? null,
    updatedAt: new Date(),
  };

  let pieceId = id;
  let previousSlug: string | null = null;

  if (id) {
    const before = await db.query.piece.findFirst({
      where: (t, { eq: e }) => e(t.id, id),
      columns: { slug: true },
    });
    previousSlug = before?.slug ?? null;
    await db.update(piece).set(row).where(eq(piece.id, id));
  } else {
    const [created] = await db
      .insert(piece)
      .values({ ...row, publishedAt: new Date() })
      .returning({ id: piece.id });
    pieceId = created?.id;
  }

  if (!pieceId) return { errors: { form: "Could not save this piece." } };

  // Sizes are replaced wholesale — simpler and safer than diffing a handful
  // of rows, and the set is never large.
  await db.delete(pieceSize).where(eq(pieceSize.pieceId, pieceId));
  if (sizes.length > 0) {
    await db.insert(pieceSize).values(
      sizes.map((label, i) => ({ pieceId: pieceId!, label, position: i })),
    );
  }

  // The storefront caches these pages; a save must be visible immediately.
  revalidateTag(`piece:${values.slug}`);
  if (previousSlug && previousSlug !== values.slug) {
    revalidateTag(`piece:${previousSlug}`);
  }
  revalidatePath("/collection");
  revalidatePath("/");
  revalidatePath("/admin/pieces");

  if (!id) redirect(`/admin/pieces/${pieceId}`);
  return { saved: true };
}

export async function archivePiece(id: string) {
  await requirePermission("pieces");
  const db = await getDb();

  const row = await db.query.piece.findFirst({
    where: (t, { eq: e }) => e(t.id, id),
    columns: { slug: true },
  });

  // Archive, never delete: order history references this row, and a sold
  // piece's URL must keep resolving.
  await db
    .update(piece)
    .set({ availability: "archived", updatedAt: new Date() })
    .where(eq(piece.id, id));

  if (row) revalidateTag(`piece:${row.slug}`);
  revalidatePath("/collection");
  revalidatePath("/admin/pieces");
  redirect("/admin/pieces");
}

export async function saveSpecRow(
  pieceId: string,
  key: string,
  value: string,
  position: number,
) {
  await requirePermission("pieces");
  const db = await getDb();
  await db
    .insert(pieceSpec)
    .values({ pieceId, key, value, position })
    .onConflictDoNothing();
}
