import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { markVisitorAlerted, recordArrival } from "@/lib/chat/visitor";
import { pushToStudio } from "@/lib/chat/push";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Arrival and presence beacon, called by the storefront on load and then on a
 * heartbeat.
 *
 * This is a POST from a client component, which is what keeps the storefront
 * statically prerenderable: reading a cookie in a layout to do this on the
 * server would turn every page dynamic and cost the SEO the whole build is
 * arranged around.
 *
 * The studio asked to be alerted on every arrival, and that is what this does.
 * Two guards keep it from becoming unusable rather than merely busy:
 *
 *   • crawlers never alert (they still get a row — real traffic, useful to see)
 *   • `alertedAt` is stamped once per visitor, so refreshes, extra tabs and
 *     reconnects cannot re-fire for the same person
 */
export async function POST(request: Request) {
  const { path, referrer } = (await request.json().catch(() => ({}))) as {
    path?: string;
    referrer?: string;
  };

  const arrival = await recordArrival({
    path: typeof path === "string" ? path.slice(0, 512) : "/",
    referrer: typeof referrer === "string" ? referrer.slice(0, 512) : null,
  });

  if (!arrival.isNewArrival || arrival.isBot) {
    return NextResponse.json({ ok: true });
  }

  const db = await getDb();
  const config = await db.query.settings.findFirst({
    where: (t, { eq }) => eq(t.id, 1),
    columns: { notifyOnVisitor: true },
  });

  if (!config?.notifyOnVisitor) return NextResponse.json({ ok: true });

  /* A last-resort cap on the whole site, not per visitor: if the storefront
     ends up on the front page of somewhere, this is what stops the owner's
     phone receiving four hundred notifications in an hour. Arrivals beyond the
     cap are still recorded and still visible in the admin — only the push is
     dropped. */
  const burst = await rateLimit("push:arrivals", { limit: 30, windowMs: 3_600_000 });
  if (!burst.ok) return NextResponse.json({ ok: true, alerted: false });

  await markVisitorAlerted(arrival.visitorKey);

  await pushToStudio({
    title: "Someone is on the site",
    body: `Landed on ${arrival.path}`,
    url: "/admin/chat",
    /* One arrival notification at a time on the device — a steady trickle of
       visitors replaces rather than stacks. */
    tag: "visitor-arrival",
    // Arrivals are ambient information; a message is what deserves a sound.
    silent: true,
  });

  return NextResponse.json({ ok: true, alerted: true });
}
