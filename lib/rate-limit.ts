import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { rateLimitBucket } from "@/lib/db/schema";

/**
 * Rate limiting, backed by Postgres.
 *
 * Deliberately NOT an in-process Map: that gives an N-times weaker limit across
 * N server processes, and resets to zero on every deploy — which is exactly
 * when someone brute-forcing an admin password would like it to reset.
 *
 * The whole check is a single atomic upsert. Reading, deciding and writing as
 * separate statements would let two concurrent requests both see "4 attempts"
 * and both proceed, which on a login endpoint is the entire bug.
 */

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

export async function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): Promise<RateLimitResult> {
  const db = await getDb();
  const seconds = Math.ceil(windowMs / 1000);

  try {
    // ON CONFLICT does the increment-or-reset in one statement, so concurrent
    // requests serialise on the row rather than racing each other.
    const rows = await db
      .insert(rateLimitBucket)
      .values({
        key,
        count: 1,
        resetAt: sql`now() + make_interval(secs => ${seconds})`,
      })
      .onConflictDoUpdate({
        target: rateLimitBucket.key,
        set: {
          count: sql`case
            when ${rateLimitBucket.resetAt} < now() then 1
            else ${rateLimitBucket.count} + 1
          end`,
          resetAt: sql`case
            when ${rateLimitBucket.resetAt} < now()
              then now() + make_interval(secs => ${seconds})
            else ${rateLimitBucket.resetAt}
          end`,
        },
      })
      .returning({
        count: rateLimitBucket.count,
        resetAt: rateLimitBucket.resetAt,
      });

    const row = rows[0];
    if (!row) return { ok: true, retryAfterSeconds: 0 };

    if (row.count > limit) {
      return {
        ok: false,
        retryAfterSeconds: Math.max(
          0,
          Math.ceil((row.resetAt.getTime() - Date.now()) / 1000),
        ),
      };
    }

    return { ok: true, retryAfterSeconds: 0 };
  } catch (error) {
    /**
     * Fail CLOSED. If the limiter cannot be consulted we do not know whether
     * this is the first attempt or the thousandth, and the endpoints behind it
     * are logins and a mail sender. Refusing service briefly is the cheaper
     * failure.
     */
    console.error("[rate-limit] check failed, refusing", error);
    return { ok: false, retryAfterSeconds: 30 };
  }
}

/** Housekeeping — safe to call from the worker on any schedule, or never. */
export async function pruneRateLimits() {
  const db = await getDb();
  await db.delete(rateLimitBucket).where(sql`${rateLimitBucket.resetAt} < now()`);
}
