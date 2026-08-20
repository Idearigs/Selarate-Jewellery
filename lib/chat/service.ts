import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { chatMessage, chatSession, piece, settings } from "@/lib/db/schema";
import { publish, STUDIO_CHANNEL, visitorChannel } from "@/lib/chat/bus";
import { pushToStudio } from "@/lib/chat/push";
import { formatPrice } from "@/lib/format";

/**
 * Live chat: sessions, messages and the availability rule.
 *
 * Everything that writes to a conversation goes through here so that the three
 * things which must always happen together — persist, fan out, notify — cannot
 * drift apart. A message written anywhere else would reach nobody's screen.
 */

export interface ChatPieceCard {
  slug: string;
  name: string;
  reference: string;
  material: string;
  price: string;
  imageUrl: string | null;
  sold: boolean;
}

export interface ChatMessageView {
  id: string;
  sender: "visitor" | "studio" | "system";
  kind: "text" | "piece";
  body: string;
  createdAt: string;
  piece: ChatPieceCard | null;
}

/* ---------------------------------------------------------------- availability */

export interface ChatAvailability {
  enabled: boolean;
  /** True when a reply is realistically coming soon. */
  live: boolean;
  hours: { start: number; end: number; timezone: string };
}

/**
 * Is the studio answering right now?
 *
 * "Live" means inside studio hours — the owner gets a push, so promising a
 * reply is honest. Outside them the widget still opens, but it takes a message
 * and says so rather than leaving someone typing into silence.
 */
export async function getChatAvailability(): Promise<ChatAvailability> {
  const db = await getDb();
  const row = await db.query.settings.findFirst({
    where: (t, { eq: e }) => e(t.id, 1),
    columns: {
      chatEnabled: true,
      chatHoursStart: true,
      chatHoursEnd: true,
      chatTimezone: true,
    },
  });

  const start = row?.chatHoursStart ?? 10;
  const end = row?.chatHoursEnd ?? 18;
  const timezone = row?.chatTimezone ?? "America/Los_Angeles";

  /* The studio's local hour, not the server's and not the visitor's. A buyer in
     Tokyo must be told whether the bench in California is staffed. */
  let hour: number;
  try {
    hour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "numeric",
        hour12: false,
      }).format(new Date()),
    );
  } catch {
    // A bad timezone string in settings must not take the widget down.
    hour = new Date().getUTCHours();
  }

  /* Ranges that wrap midnight (22 → 04) are a legitimate setting. */
  const withinHours = start <= end ? hour >= start && hour < end : hour >= start || hour < end;

  return {
    enabled: row?.chatEnabled ?? true,
    live: (row?.chatEnabled ?? true) && withinHours,
    hours: { start, end, timezone },
  };
}

/* -------------------------------------------------------------------- sessions */

/** The visitor's open conversation, if they have one. Never creates. */
export async function findOpenSession(visitorKey: string) {
  const db = await getDb();
  return db.query.chatSession.findFirst({
    where: (t, { and: a, eq: e, isNull: n }) =>
      a(e(t.visitorKey, visitorKey), n(t.closedAt)),
  });
}

/**
 * Get the visitor's open conversation, opening one if needed.
 *
 * The partial unique index on `visitorKey where closed_at is null` is what
 * actually guarantees one live conversation per visitor — two tabs racing this
 * function will have one insert lose, and the loser re-reads rather than
 * creating a duplicate the studio would see as two people.
 */
export async function getOrOpenSession(opts: {
  visitorKey: string;
  entryPath?: string | null;
  customerId?: string | null;
  visitorName?: string | null;
  visitorEmail?: string | null;
}) {
  const db = await getDb();

  const existing = await findOpenSession(opts.visitorKey);
  if (existing) return { session: existing, opened: false };

  const [created] = await db
    .insert(chatSession)
    .values({
      visitorKey: opts.visitorKey,
      entryPath: opts.entryPath ?? null,
      customerId: opts.customerId ?? null,
      visitorName: opts.visitorName ?? null,
      visitorEmail: opts.visitorEmail ?? null,
    })
    .onConflictDoNothing()
    .returning();

  if (!created) {
    const raced = await findOpenSession(opts.visitorKey);
    if (raced) return { session: raced, opened: false };
    throw new Error("Could not open a chat session");
  }

  publish(STUDIO_CHANNEL, { type: "session-opened", sessionId: created.id });
  return { session: created, opened: true };
}

export async function closeSession(sessionId: string) {
  const db = await getDb();
  await db
    .update(chatSession)
    .set({ status: "closed", closedAt: new Date() })
    .where(eq(chatSession.id, sessionId));
  publish(STUDIO_CHANNEL, { type: "session-updated", sessionId });
  publish(visitorChannel(sessionId), { type: "session-updated", sessionId });
}

export async function claimSession(sessionId: string, userId: string) {
  const db = await getDb();
  await db
    .update(chatSession)
    .set({ assignedUserId: userId })
    .where(eq(chatSession.id, sessionId));
  publish(STUDIO_CHANNEL, { type: "session-updated", sessionId });
}

export async function markRead(sessionId: string, side: "studio" | "visitor") {
  const db = await getDb();
  await db
    .update(chatSession)
    .set(
      side === "studio"
        ? { studioReadAt: new Date() }
        : { visitorReadAt: new Date() },
    )
    .where(eq(chatSession.id, sessionId));
  if (side === "studio") {
    publish(STUDIO_CHANNEL, { type: "session-updated", sessionId });
  }
}

/* -------------------------------------------------------------------- messages */

async function pieceCardFor(pieceId: string): Promise<ChatPieceCard | null> {
  const db = await getDb();
  const row = await db.query.piece.findFirst({
    where: (t, { eq: e }) => e(t.id, pieceId),
    with: { images: { orderBy: (t, { asc: a }) => a(t.position), limit: 1 } },
  });
  if (!row) return null;

  return {
    slug: row.slug,
    name: row.name,
    reference: row.reference,
    material: row.materialLine,
    price: formatPrice(row.priceCents),
    imageUrl: row.images[0]?.url ?? null,
    sold: row.soldAt !== null,
  };
}

export async function toMessageView(
  row: typeof chatMessage.$inferSelect,
): Promise<ChatMessageView> {
  return {
    id: row.id,
    sender: row.sender as ChatMessageView["sender"],
    kind: row.kind as ChatMessageView["kind"],
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    piece: row.pieceId ? await pieceCardFor(row.pieceId) : null,
  };
}

export async function listMessages(sessionId: string): Promise<ChatMessageView[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(chatMessage)
    .where(eq(chatMessage.sessionId, sessionId))
    .orderBy(asc(chatMessage.createdAt))
    .limit(500);

  return Promise.all(rows.map(toMessageView));
}

export async function getMessage(messageId: string) {
  const db = await getDb();
  const row = await db.query.chatMessage.findFirst({
    where: (t, { eq: e }) => e(t.id, messageId),
  });
  return row ? toMessageView(row) : null;
}

/** Hard cap. Long enough for a real question, short enough to bound a row. */
export const MAX_MESSAGE_LENGTH = 2000;

/**
 * Append a message, fan it out, and notify the other side.
 *
 * Ordering matters: the row is committed before anything is published, so a
 * client that reacts to the event by re-fetching can never read a conversation
 * that does not yet contain the message it was told about.
 */
export async function appendMessage(opts: {
  sessionId: string;
  sender: "visitor" | "studio" | "system";
  body?: string;
  pieceId?: string | null;
  userId?: string | null;
}) {
  const db = await getDb();
  const body = (opts.body ?? "").slice(0, MAX_MESSAGE_LENGTH).trim();
  const kind = opts.pieceId ? "piece" : "text";

  if (kind === "text" && !body) throw new Error("Message is empty");

  const [row] = await db
    .insert(chatMessage)
    .values({
      sessionId: opts.sessionId,
      sender: opts.sender,
      kind,
      body,
      pieceId: opts.pieceId ?? null,
      userId: opts.userId ?? null,
    })
    .returning();

  if (!row) throw new Error("Message was not stored");

  await db
    .update(chatSession)
    .set({
      lastMessageAt: row.createdAt,
      // A reply from either side implicitly marks the sender caught up.
      ...(opts.sender === "studio"
        ? { studioReadAt: row.createdAt }
        : opts.sender === "visitor"
          ? { visitorReadAt: row.createdAt }
          : {}),
    })
    .where(eq(chatSession.id, opts.sessionId));

  publish(visitorChannel(opts.sessionId), {
    type: "message",
    sessionId: opts.sessionId,
    messageId: row.id,
  });
  publish(STUDIO_CHANNEL, {
    type: "message",
    sessionId: opts.sessionId,
    messageId: row.id,
  });

  /* Only a visitor's words wake a phone. Studio and system messages must never
     notify the studio about itself. */
  if (opts.sender === "visitor") {
    const session = await db.query.chatSession.findFirst({
      where: (t, { eq: e }) => e(t.id, opts.sessionId),
      columns: { visitorName: true },
    });
    const who = session?.visitorName?.trim() || "A visitor";

    await pushToStudio({
      title: `${who} — live chat`,
      body: body.slice(0, 160),
      url: `/admin/chat?session=${opts.sessionId}`,
      // One notification per conversation, replaced as they keep typing.
      tag: `chat:${opts.sessionId}`,
    });
  }

  return row;
}

/* ----------------------------------------------------------------- studio inbox */

export interface InboxRow {
  id: string;
  visitorName: string | null;
  visitorEmail: string | null;
  status: "open" | "closed";
  entryPath: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  unread: boolean;
  preview: string;
}

/** The conversation list. Unread is derived, never stored as a counter. */
export async function listSessions(opts: { includeClosed?: boolean } = {}) {
  const db = await getDb();

  const rows = await db
    .select({
      session: chatSession,
      preview: sql<string>`(
        select case when m.kind = 'piece' then '[piece]' else m.body end
        from chat_message m
        where m.session_id = ${chatSession.id}
        order by m.created_at desc
        limit 1
      )`,
    })
    .from(chatSession)
    .where(opts.includeClosed ? undefined : isNull(chatSession.closedAt))
    .orderBy(desc(sql`coalesce(${chatSession.lastMessageAt}, ${chatSession.createdAt})`))
    .limit(100);

  return rows.map(({ session: s, preview }): InboxRow => {
    const last = s.lastMessageAt;
    return {
      id: s.id,
      visitorName: s.visitorName,
      visitorEmail: s.visitorEmail,
      status: s.status as "open" | "closed",
      entryPath: s.entryPath,
      lastMessageAt: last ? last.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
      unread: last !== null && (s.studioReadAt === null || s.studioReadAt < last),
      preview: preview ?? "",
    };
  });
}

export async function getSession(sessionId: string) {
  const db = await getDb();
  return db.query.chatSession.findFirst({
    where: (t, { eq: e }) => e(t.id, sessionId),
  });
}

/* --------------------------------------------------------- slash-command search */

/**
 * Piece lookup for the studio's `/product` command.
 *
 * Matches reference OR name, case-insensitively, so "A—01", "a01" and "sweet"
 * all find the Sweet Pea Ring. Drafts and archived pieces are excluded — the
 * studio must not be able to send a visitor a link to a page that 404s.
 */
export interface ChatPieceResult extends ChatPieceCard {
  /** Needed to send the card; never leaves the admin side. */
  id: string;
}

export async function searchPiecesForChat(opts: {
  query: string;
  category?: "ooak" | "fine";
  limit?: number;
}): Promise<ChatPieceResult[]> {
  const db = await getDb();
  const q = opts.query.trim();

  /* Strip punctuation so an em-dash reference typed as "a-01" or "a01" still
     matches "A—01". */
  const loose = q.replace(/[^a-z0-9]/gi, "");

  const rows = await db.query.piece.findMany({
    where: (t, { and: a, eq: e, or: o, sql: s }) =>
      a(
        o(e(t.availability, "unique"), e(t.availability, "order")),
        opts.category ? e(t.category, opts.category) : undefined,
        q
          ? o(
              s`${t.name} ilike ${"%" + q + "%"}`,
              s`regexp_replace(${t.reference}, '[^a-zA-Z0-9]', '', 'g') ilike ${"%" + loose + "%"}`,
            )
          : undefined,
      ),
    with: { images: { orderBy: (t, { asc: a }) => a(t.position), limit: 1 } },
    orderBy: (t, { asc: a }) => a(t.sortIndex),
    limit: opts.limit ?? 8,
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    reference: row.reference,
    material: row.materialLine,
    price: formatPrice(row.priceCents),
    imageUrl: row.images[0]?.url ?? null,
    sold: row.soldAt !== null,
  }));
}
