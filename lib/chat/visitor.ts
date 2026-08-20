import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { useSecureCookies } from "@/lib/cookie-security";
import { eq, gt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { visitorSession } from "@/lib/db/schema";
import { publish, STUDIO_CHANNEL } from "@/lib/chat/bus";

const COOKIE = "visitor_key";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

/** A visitor is "live" if their widget heartbeated inside this window. */
export const LIVE_WINDOW_SECONDS = 90;

/**
 * Visitor identity and arrival tracking.
 *
 * Deliberately separate from the bag token. Chat and presence must not be
 * keyed by the cart, because emptying a bag would orphan a live conversation
 * and because the cart token is a capability — anything that identifies a
 * chat session ends up in URLs, logs and the studio's screen.
 *
 * ── Privacy ───────────────────────────────────────────────────────────────
 * No IP address is stored. The user agent is kept because it is what
 * distinguishes a crawler from a buyer, and country only if the proxy supplies
 * it. There is no cross-site identifier here and nothing is shared onward.
 */

export async function getVisitorKey(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? null;
}

/** Only valid inside a Route Handler or Server Action — it sets a cookie. */
export async function getOrCreateVisitorKey(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing) return existing;

  const key = randomUUID();
  jar.set(COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: await useSecureCookies(),
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return key;
}

/**
 * Known crawlers. These still get a `visitor_session` row — they are real
 * traffic and the studio may want to see it — but they never raise a push.
 *
 * The studio asked to be alerted on *every* arrival, and this is the one
 * carve-out: a search engine indexing the catalogue is not someone walking
 * into the shop, and a crawl of twelve product pages would otherwise be twelve
 * notifications.
 */
const BOT_PATTERN =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora|pinterest|vkshare|whatsapp|telegram|discord|preview|scraper|curl|wget|python-requests|headless|lighthouse|pagespeed|gtmetrix|semrush|ahrefs|mj12|dotbot|petal|bytespider/i;

export function looksLikeBot(userAgent: string | null): boolean {
  if (!userAgent) return true; // No UA at all is not a browser.
  return BOT_PATTERN.test(userAgent);
}

export interface ArrivalResult {
  visitorKey: string;
  /** True only on the first sighting of this visitor — the alert trigger. */
  isNewArrival: boolean;
  isBot: boolean;
  path: string;
}

/**
 * Record an arrival or a heartbeat.
 *
 * One row per visitor, upserted. `isNewArrival` is true exactly once per
 * visitor row, and `alertedAt` is stamped separately by the caller once a push
 * has actually gone out — so a reconnect, a refresh, or a second tab can never
 * re-alert the studio for the same person.
 */
export async function recordArrival(opts: {
  path: string;
  referrer?: string | null;
}): Promise<ArrivalResult> {
  const db = await getDb();
  const visitorKey = await getOrCreateVisitorKey();
  const headerList = await headers();
  const userAgent = headerList.get("user-agent");
  const isBot = looksLikeBot(userAgent);

  const existing = await db.query.visitorSession.findFirst({
    where: (t, { eq: e }) => e(t.visitorKey, visitorKey),
    columns: { id: true },
  });

  if (existing) {
    await db
      .update(visitorSession)
      .set({
        currentPath: opts.path,
        lastSeenAt: new Date(),
        pageViews: sql`${visitorSession.pageViews} + 1`,
      })
      .where(eq(visitorSession.id, existing.id));

    publish(STUDIO_CHANNEL, { type: "visitor", visitorKey });
    return { visitorKey, isNewArrival: false, isBot, path: opts.path };
  }

  await db
    .insert(visitorSession)
    .values({
      visitorKey,
      entryPath: opts.path,
      currentPath: opts.path,
      referrer: opts.referrer ?? null,
      userAgent: userAgent ?? null,
      country: headerList.get("cf-ipcountry") ?? null,
      isBot,
    })
    // Two tabs opening at once would otherwise race the existence check above.
    .onConflictDoNothing({ target: visitorSession.visitorKey });

  publish(STUDIO_CHANNEL, { type: "visitor", visitorKey });
  return { visitorKey, isNewArrival: true, isBot, path: opts.path };
}

/** Stamped once a push has gone out, so the alert can never fire twice. */
export async function markVisitorAlerted(visitorKey: string) {
  const db = await getDb();
  await db
    .update(visitorSession)
    .set({ alertedAt: new Date() })
    .where(eq(visitorSession.visitorKey, visitorKey));
}

/** Who is on the site right now — the admin's presence list. */
export async function listLiveVisitors() {
  const db = await getDb();
  const since = new Date(Date.now() - LIVE_WINDOW_SECONDS * 1000);

  return db
    .select({
      visitorKey: visitorSession.visitorKey,
      currentPath: visitorSession.currentPath,
      entryPath: visitorSession.entryPath,
      referrer: visitorSession.referrer,
      pageViews: visitorSession.pageViews,
      country: visitorSession.country,
      lastSeenAt: visitorSession.lastSeenAt,
      createdAt: visitorSession.createdAt,
    })
    .from(visitorSession)
    .where(
      sql`${visitorSession.isBot} = false and ${gt(visitorSession.lastSeenAt, since)}`,
    )
    .orderBy(sql`${visitorSession.lastSeenAt} desc`)
    .limit(50);
}
