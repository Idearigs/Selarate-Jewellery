import { getSessionUser } from "@/lib/auth";
import { can, type Role } from "@/lib/permissions";
import { eventStream } from "@/lib/chat/sse";
import { STUDIO_CHANNEL } from "@/lib/chat/bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The studio's live stream: every conversation, plus visitor arrivals.
 *
 * Authenticated here rather than relying on the /admin middleware, because
 * this route lives under /api and would otherwise be reachable by anyone who
 * guessed the path — the stream carries who is browsing the site and what they
 * are saying.
 */
export async function GET() {
  const current = await getSessionUser();
  if (!current) return new Response("Unauthorized", { status: 401 });
  if (!can(current.role as Role, "orders")) {
    return new Response("Forbidden", { status: 403 });
  }

  return eventStream([STUDIO_CHANNEL]);
}
