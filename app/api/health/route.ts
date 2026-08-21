import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Readiness probe. The deployment platform holds traffic — and rolls a bad
 * release back — on the strength of this response.
 *
 * It used to return `{ ok: true }` unconditionally, which made it a liveness
 * check wearing a readiness check's job title: a container with the wrong
 * DATABASE_URL booted, passed the probe, took the traffic, and 500'd on every
 * page. The one failure worth catching automatically was the one it could not
 * see. So it now actually talks to the database.
 *
 * Kept deliberately cheap: `select 1` proves the pool can hand out a live
 * connection, which is the thing that breaks. Counting rows or touching a real
 * table would add load on every probe and catch nothing extra.
 */

/** Under Docker's 5s healthcheck timeout, so a hung socket fails rather than hangs. */
const PROBE_TIMEOUT_MS = 2500;

export async function GET() {
  const at = new Date().toISOString();

  try {
    await withTimeout(probeDatabase(), PROBE_TIMEOUT_MS);
  } catch (error) {
    // 503, not 500: this is "not ready to serve", which is what a proxy and a
    // deploy gate need to hear. The message is logged rather than returned —
    // a connection string with credentials in it must not leave the server.
    console.error("[health] database probe failed:", error);
    return NextResponse.json(
      { ok: false, database: "unreachable", at },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, database: "ok", at });
}

async function probeDatabase() {
  const db = await getDb();
  await db.execute(sql`select 1`);
}

function withTimeout<T>(work: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`probe exceeded ${ms}ms`)),
      ms,
    );
    work.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}
