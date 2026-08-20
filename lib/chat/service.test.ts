import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { chatMessage, chatSession, piece, settings } from "../db/schema";

/**
 * Live chat. The tests are about the invariants that are expensive to get
 * wrong: one conversation per visitor, transcripts that survive, and a slash
 * command that can never send a visitor to a page that does not exist.
 */

// Push is a side effect of appending a message; the transport is not under test.
vi.mock("./push", () => ({
  pushToStudio: vi.fn(async () => ({ sent: 0 })),
  pushConfigured: () => false,
}));

let db: ReturnType<typeof drizzle<typeof schema>>;
let service: typeof import("./service");

const VISITOR = "visitor-key-1";

beforeAll(async () => {
  db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  (globalThis as Record<string, unknown>).__db = Promise.resolve(db);
  service = await import("./service");
});

beforeEach(async () => {
  await db.delete(chatMessage);
  await db.delete(chatSession);
  await db.delete(piece);
  await db.insert(settings).values({ id: 1 }).onConflictDoNothing();
});

async function seedPiece(over: Partial<typeof piece.$inferInsert> = {}) {
  const [row] = await db
    .insert(piece)
    .values({
      slug: "sweet-pea-ring",
      reference: "A—01",
      name: "Sweet Pea Ring",
      category: "ooak",
      availability: "unique",
      priceCents: 1_480_000,
      materialLine: "18k yellow gold, green tourmaline",
      ...over,
    })
    .returning();
  return row!;
}

describe("sessions", () => {
  it("opens a conversation and reports it as new", async () => {
    const { session, opened } = await service.getOrOpenSession({
      visitorKey: VISITOR,
    });
    expect(opened).toBe(true);
    expect(session.status).toBe("open");
  });

  it("returns the same conversation on a second call", async () => {
    const first = await service.getOrOpenSession({ visitorKey: VISITOR });
    const second = await service.getOrOpenSession({ visitorKey: VISITOR });

    expect(second.opened).toBe(false);
    expect(second.session.id).toBe(first.session.id);
  });

  it("never opens two live conversations for one visitor, even concurrently", async () => {
    // Two tabs bootstrapping at once is the ordinary case, not an exotic one.
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        service.getOrOpenSession({ visitorKey: VISITOR }),
      ),
    );

    const ids = new Set(results.map((r) => r.session.id));
    expect(ids.size).toBe(1);

    const rows = await db.query.chatSession.findMany();
    expect(rows).toHaveLength(1);
  });

  it("lets a visitor start again once the previous one is closed", async () => {
    const first = await service.getOrOpenSession({ visitorKey: VISITOR });
    await service.closeSession(first.session.id);

    const second = await service.getOrOpenSession({ visitorKey: VISITOR });
    expect(second.opened).toBe(true);
    expect(second.session.id).not.toBe(first.session.id);
  });
});

describe("messages", () => {
  it("stores a message and stamps the session", async () => {
    const { session } = await service.getOrOpenSession({ visitorKey: VISITOR });
    await service.appendMessage({
      sessionId: session.id,
      sender: "visitor",
      body: "Is this still available?",
    });

    const messages = await service.listMessages(session.id);
    expect(messages).toHaveLength(1);
    expect(messages[0]!.body).toBe("Is this still available?");

    const row = await db.query.chatSession.findFirst({
      where: (t, { eq: e }) => e(t.id, session.id),
    });
    expect(row?.lastMessageAt).not.toBeNull();
  });

  it("refuses an empty message", async () => {
    const { session } = await service.getOrOpenSession({ visitorKey: VISITOR });
    await expect(
      service.appendMessage({ sessionId: session.id, sender: "visitor", body: "   " }),
    ).rejects.toThrow();
  });

  it("truncates rather than rejecting an over-long one", async () => {
    const { session } = await service.getOrOpenSession({ visitorKey: VISITOR });
    await service.appendMessage({
      sessionId: session.id,
      sender: "visitor",
      body: "x".repeat(5000),
    });

    const [stored] = await service.listMessages(session.id);
    expect(stored!.body.length).toBe(service.MAX_MESSAGE_LENGTH);
  });

  it("renders a sent piece as a card carrying live data", async () => {
    const row = await seedPiece();
    const { session } = await service.getOrOpenSession({ visitorKey: VISITOR });

    await service.appendMessage({
      sessionId: session.id,
      sender: "studio",
      pieceId: row.id,
    });

    const [message] = await service.listMessages(session.id);
    expect(message!.kind).toBe("piece");
    expect(message!.piece?.slug).toBe("sweet-pea-ring");
    expect(message!.piece?.price).toBe("$14,800");
    expect(message!.piece?.sold).toBe(false);
  });

  it("reflects a later sale in an already-sent card", async () => {
    // The card holds no price snapshot on purpose: a conversation resumed next
    // week must not quote availability that has since changed.
    const row = await seedPiece();
    const { session } = await service.getOrOpenSession({ visitorKey: VISITOR });
    await service.appendMessage({
      sessionId: session.id,
      sender: "studio",
      pieceId: row.id,
    });

    await db.update(piece).set({ soldAt: new Date() }).where(eq(piece.id, row.id));

    const [message] = await service.listMessages(session.id);
    expect(message!.piece?.sold).toBe(true);
  });
});

describe("inbox", () => {
  it("marks a session unread until the studio reads it", async () => {
    const { session } = await service.getOrOpenSession({ visitorKey: VISITOR });
    await service.appendMessage({
      sessionId: session.id,
      sender: "visitor",
      body: "Hello",
    });

    let [row] = await service.listSessions();
    expect(row!.unread).toBe(true);

    await service.markRead(session.id, "studio");
    [row] = await service.listSessions();
    expect(row!.unread).toBe(false);
  });

  it("does not mark the studio's own reply as unread", async () => {
    const { session } = await service.getOrOpenSession({ visitorKey: VISITOR });
    await service.appendMessage({
      sessionId: session.id,
      sender: "studio",
      body: "We are here",
    });

    const [row] = await service.listSessions();
    expect(row!.unread).toBe(false);
  });

  it("hides closed conversations unless asked for them", async () => {
    const { session } = await service.getOrOpenSession({ visitorKey: VISITOR });
    await service.closeSession(session.id);

    expect(await service.listSessions()).toHaveLength(0);
    expect(await service.listSessions({ includeClosed: true })).toHaveLength(1);
  });
});

describe("/product search", () => {
  it("finds a piece by name, case-insensitively", async () => {
    await seedPiece();
    const results = await service.searchPiecesForChat({ query: "sweet" });
    expect(results.map((r) => r.slug)).toContain("sweet-pea-ring");
  });

  it("finds a piece by reference regardless of punctuation", async () => {
    await seedPiece();
    // The studio types "a01"; the reference is stored as "A—01" with an em dash.
    for (const query of ["a01", "A-01", "A—01", "a 01"]) {
      const results = await service.searchPiecesForChat({ query });
      expect(results.map((r) => r.slug), `query ${query}`).toContain(
        "sweet-pea-ring",
      );
    }
  });

  it("filters by category", async () => {
    await seedPiece();
    await seedPiece({
      slug: "spectra-band",
      reference: "B—01",
      name: "Spectra Band",
      category: "fine",
      availability: "order",
    });

    const fine = await service.searchPiecesForChat({ query: "", category: "fine" });
    expect(fine.map((r) => r.slug)).toEqual(["spectra-band"]);
  });

  it("never returns a draft or archived piece", async () => {
    // Sending one would link the visitor to a page that 404s.
    await seedPiece({ availability: "draft" });
    await seedPiece({
      slug: "old-cuff",
      reference: "Z—99",
      name: "Old Cuff",
      availability: "archived",
    });

    expect(await service.searchPiecesForChat({ query: "" })).toHaveLength(0);
  });

  it("still offers a sold piece, flagged as sold", async () => {
    // Sold one-of-a-kind pieces keep their URL, and the studio often wants to
    // show what a commission could look like.
    await seedPiece({ soldAt: new Date() });
    const [result] = await service.searchPiecesForChat({ query: "sweet" });
    expect(result?.sold).toBe(true);
  });
});

describe("availability", () => {
  it("is live inside studio hours", async () => {
    const hour = new Date().getUTCHours();
    await db
      .update(settings)
      .set({
        chatEnabled: true,
        chatTimezone: "UTC",
        chatHoursStart: hour,
        chatHoursEnd: (hour + 1) % 24 || 24,
      })
      .where(eq(settings.id, 1));

    expect((await service.getChatAvailability()).live).toBe(true);
  });

  it("is not live outside them", async () => {
    const hour = new Date().getUTCHours();
    await db
      .update(settings)
      .set({
        chatEnabled: true,
        chatTimezone: "UTC",
        chatHoursStart: (hour + 2) % 24,
        chatHoursEnd: (hour + 3) % 24,
      })
      .where(eq(settings.id, 1));

    expect((await service.getChatAvailability()).live).toBe(false);
  });

  it("handles hours that wrap past midnight", async () => {
    const hour = new Date().getUTCHours();
    // A window ending before it starts means it crosses midnight, e.g. 22 → 04.
    await db
      .update(settings)
      .set({
        chatEnabled: true,
        chatTimezone: "UTC",
        chatHoursStart: (hour + 23) % 24, // one hour ago
        chatHoursEnd: (hour + 1) % 24, // one hour ahead
      })
      .where(eq(settings.id, 1));

    expect((await service.getChatAvailability()).live).toBe(true);
  });

  it("is never live when chat is switched off", async () => {
    await db.update(settings).set({ chatEnabled: false }).where(eq(settings.id, 1));

    const availability = await service.getChatAvailability();
    expect(availability.enabled).toBe(false);
    expect(availability.live).toBe(false);
  });

  it("survives a nonsense timezone rather than taking the widget down", async () => {
    await db
      .update(settings)
      .set({ chatTimezone: "Not/AZone" })
      .where(eq(settings.id, 1));

    await expect(service.getChatAvailability()).resolves.toBeTruthy();
  });
});
