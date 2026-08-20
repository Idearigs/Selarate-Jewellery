import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { can, type Role } from "@/lib/permissions";
import { listMessages, listSessions } from "@/lib/chat/service";
import { listLiveVisitors } from "@/lib/chat/visitor";

export const dynamic = "force-dynamic";

/**
 * Everything the console re-reads when the stream says something changed.
 *
 * One endpoint with an optional `session` rather than three, because the
 * console almost always needs the inbox and the transcript together, and a
 * single round trip cannot show them disagreeing.
 */
export async function GET(request: Request) {
  const current = await getSessionUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(current.role as Role, "orders")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sessionId = new URL(request.url).searchParams.get("session");

  const [sessions, visitors, messages] = await Promise.all([
    listSessions({ includeClosed: true }),
    listLiveVisitors(),
    sessionId ? listMessages(sessionId) : Promise.resolve([]),
  ]);

  return NextResponse.json({
    sessions,
    visitors: visitors.map((v) => ({
      ...v,
      lastSeenAt: v.lastSeenAt.toISOString(),
      createdAt: v.createdAt.toISOString(),
    })),
    messages,
  });
}
