import { getVisitorKey } from "@/lib/chat/visitor";
import { findOpenSession } from "@/lib/chat/service";
import { eventStream } from "@/lib/chat/sse";
import { visitorChannel } from "@/lib/chat/bus";

export const dynamic = "force-dynamic";
/* Node runtime, not Edge: the bus and the database driver are both Node-only. */
export const runtime = "nodejs";

/**
 * The visitor's live stream.
 *
 * Subscribed to their own session channel only, resolved from their cookie —
 * a visitor cannot ask to listen to a conversation that is not theirs, because
 * they never get to name the channel.
 */
export async function GET() {
  const visitorKey = await getVisitorKey();
  if (!visitorKey) return new Response("No session", { status: 400 });

  const session = await findOpenSession(visitorKey);
  if (!session) return new Response("No session", { status: 400 });

  return eventStream([visitorChannel(session.id)]);
}
