import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  customer,
  enquiry,
  hold,
  material,
  order,
  orderItem,
  piece,
} from "@/lib/db/schema";
import type { Tone } from "@/components/admin/primitives";

/** Read side of the admin. Storefront queries stay in ./pieces.ts. */

/* -------------------------------------------------------------------------
   Status → tone mapping. Defined once so a piece marked "Reserved" is amber in
   every view it appears in.
   ------------------------------------------------------------------------- */

export type PieceStatus = "Live" | "Reserved" | "Sold" | "Draft" | "Archived";

export const PIECE_TONE: Record<PieceStatus, Tone> = {
  Live: "good",
  Reserved: "warn",
  Sold: "mute",
  Draft: "mute",
  Archived: "mute",
};

export const ORDER_TONE: Record<string, Tone> = {
  enquiry: "warn",
  paid: "good",
  in_studio: "warn",
  dispatched: "mute",
  delivered: "mute",
  refunded: "bad",
  cancelled: "mute",
};

export const ORDER_LABEL: Record<string, string> = {
  enquiry: "Enquiry",
  paid: "Paid",
  in_studio: "In studio",
  dispatched: "Dispatched",
  delivered: "Delivered",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

export const MATERIAL_TONE: Record<string, Tone> = {
  loose: "good",
  in_stock: "good",
  set: "mute",
  reserved: "warn",
  low: "bad",
  client_owned: "warn",
};

/* -------------------------------------------------------------------------
   Pieces
   ------------------------------------------------------------------------- */

export interface AdminPiece {
  id: string;
  slug: string;
  name: string;
  reference: string;
  materialLine: string;
  category: string;
  status: PieceStatus;
  /** "1", "0", or "—" for made-to-order. */
  stock: string;
  priceCents: number;
  views: number;
}

function statusOf(row: typeof piece.$inferSelect, held: boolean): PieceStatus {
  if (row.availability === "draft") return "Draft";
  if (row.availability === "archived") return "Archived";
  if (row.soldAt) return "Sold";
  if (held) return "Reserved";
  return "Live";
}

export async function listAdminPieces(filter = "All"): Promise<AdminPiece[]> {
  const db = await getDb();

  const rows = await db
    .select({ piece, heldId: hold.id })
    .from(piece)
    .leftJoin(
      hold,
      and(
        eq(hold.pieceId, piece.id),
        isNull(hold.releasedAt),
        sql`${hold.expiresAt} > now()`,
      ),
    )
    .orderBy(piece.sortIndex);

  return rows
    .map(({ piece: p, heldId }) => {
      const status = statusOf(p, heldId !== null);
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        reference: p.reference,
        materialLine: p.materialLine,
        category: p.category === "ooak" ? "One of a Kind" : "Fine Jewelry",
        status,
        // Made-to-order pieces have no stock number — an em dash, not "0",
        // which would read as sold out.
        stock: p.availability === "order" ? "—" : p.soldAt ? "0" : "1",
        priceCents: p.priceCents,
        views: p.views,
      };
    })
    .filter((p) => {
      if (filter === "All") return true;
      if (filter === "One of a Kind" || filter === "Fine Jewelry") {
        return p.category === filter;
      }
      return p.status === filter;
    });
}

export async function getAdminPiece(id: string) {
  const db = await getDb();
  return db.query.piece.findFirst({
    where: (t, { eq: e }) => e(t.id, id),
    with: {
      specs: { orderBy: (t, { asc }) => asc(t.position) },
      sizes: { orderBy: (t, { asc }) => asc(t.position) },
      images: { orderBy: (t, { asc }) => asc(t.position) },
    },
  });
}

/* -------------------------------------------------------------------------
   Orders
   ------------------------------------------------------------------------- */

export async function listAdminOrders(filter = "All") {
  const db = await getDb();

  const rows = await db
    .select({
      id: order.id,
      number: order.number,
      status: order.status,
      totalCents: order.totalCents,
      placedAt: order.placedAt,
      customerName: customer.name,
      customerEmail: customer.email,
      piece: sql<string>`(
        select string_agg(${orderItem.name}, ', ')
        from ${orderItem} where ${orderItem.orderId} = ${order.id}
      )`,
    })
    .from(order)
    .leftJoin(customer, eq(customer.id, order.customerId))
    .orderBy(desc(order.placedAt));

  return rows.filter(
    (r) => filter === "All" || ORDER_LABEL[r.status] === filter,
  );
}

export async function getAdminOrder(id: string) {
  const db = await getDb();
  return db.query.order.findFirst({
    where: (t, { eq: e }) => e(t.id, id),
    with: {
      items: true,
      events: { orderBy: (t, { asc }) => asc(t.createdAt) },
      notes: { orderBy: (t, { asc }) => asc(t.createdAt) },
      customer: true,
    },
  });
}

/* -------------------------------------------------------------------------
   Dashboard
   ------------------------------------------------------------------------- */

export async function getDashboard() {
  const db = await getDb();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);

  const [revenue] = await db
    .select({ total: sql<number>`coalesce(sum(${order.totalCents}), 0)::int` })
    .from(order)
    .where(
      and(
        gte(order.placedAt, thirtyDaysAgo),
        sql`${order.status} in ('paid','in_studio','dispatched','delivered')`,
      ),
    );

  const [live] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(piece)
    .where(and(eq(piece.availability, "unique"), isNull(piece.soldAt)));

  const [awaiting] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(order)
    .where(sql`${order.status} in ('paid','in_studio')`);

  const [openEnquiries] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(enquiry)
    .where(isNull(enquiry.answeredAt));

  const recentOrders = (await listAdminOrders()).slice(0, 6);

  /**
   * "Needs attention" — the queue the owner actually works from. Expiring
   * holds come first because they are the only item here with a deadline.
   */
  const expiringHolds = await db
    .select({
      slug: piece.slug,
      name: piece.name,
      expiresAt: hold.expiresAt,
    })
    .from(hold)
    .innerJoin(piece, eq(piece.id, hold.pieceId))
    .where(
      and(
        isNull(hold.releasedAt),
        sql`${hold.expiresAt} > now()`,
        sql`${hold.expiresAt} < now() + interval '30 minutes'`,
      ),
    );

  const unanswered = await db.query.enquiry.findMany({
    where: (t, { isNull: n }) => n(t.answeredAt),
    limit: 3,
    orderBy: (t, { desc: d }) => d(t.createdAt),
  });

  const lowStock = await db.query.material.findMany({
    where: (t, { eq: e }) => e(t.status, "low"),
    limit: 3,
  });

  const drafts = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(piece)
    .where(eq(piece.availability, "draft"));

  return {
    kpis: {
      revenueCents: revenue?.total ?? 0,
      piecesLive: live?.count ?? 0,
      awaitingDispatch: awaiting?.count ?? 0,
      openConversations: openEnquiries?.count ?? 0,
    },
    recentOrders,
    expiringHolds,
    unanswered,
    lowStock,
    draftCount: drafts[0]?.count ?? 0,
  };
}

/* -------------------------------------------------------------------------
   Inventory and customers
   ------------------------------------------------------------------------- */

export async function listMaterials() {
  const db = await getDb();
  return db.select().from(material).orderBy(material.ref);
}

export async function materialKpis() {
  const db = await getDb();
  const [stones] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(material)
    .where(eq(material.kind, "stone"));
  const [value] = await db
    .select({ total: sql<number>`coalesce(sum(${material.costCents}), 0)::int` })
    .from(material);
  const [low] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(material)
    .where(eq(material.status, "low"));
  const [clientOwned] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(material)
    .where(eq(material.status, "client_owned"));

  return {
    stones: stones?.count ?? 0,
    valueCents: value?.total ?? 0,
    low: low?.count ?? 0,
    clientOwned: clientOwned?.count ?? 0,
  };
}

export async function listCustomers() {
  const db = await getDb();
  return db
    .select({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      location: customer.location,
      note: customer.note,
      lastSeenAt: customer.lastSeenAt,
      orderCount: sql<number>`(
        select count(*)::int from ${order} where ${order.customerId} = ${customer.id}
      )`,
      lifetimeCents: sql<number>`(
        select coalesce(sum(${order.totalCents}), 0)::int from ${order}
        where ${order.customerId} = ${customer.id}
          and ${order.status} in ('paid','in_studio','dispatched','delivered')
      )`,
    })
    .from(customer)
    .orderBy(desc(customer.lastSeenAt));
}

/** Sidebar counts. */
export async function navCounts() {
  const db = await getDb();
  const [pieces] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(piece)
    .where(sql`${piece.availability} in ('unique','order')`);
  const [openOrders] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(order)
    .where(sql`${order.status} in ('enquiry','paid','in_studio')`);

  return {
    "/admin/pieces": pieces?.count ?? 0,
    "/admin/orders": openOrders?.count ?? 0,
  };
}
