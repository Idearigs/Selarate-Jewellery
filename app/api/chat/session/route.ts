import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getOrCreateVisitorKey } from "@/lib/chat/visitor";
import {
  findOpenSession,
  getChatAvailability,
  getOrOpenSession,
  listMessages,
  markRead,
} from "@/lib/chat/service";

export const dynamic = "force-dynamic";

/**
 * The widget's bootstrap call.
 *
 * GET reads state without creating anything — the widget asks on every page
 * load, and opening a conversation for someone who merely rendered a page
 * would fill the studio's inbox with empty threads.
 *
 * POST is the deliberate act of opening one, sent when the visitor actually
 * starts typing.
 */

export async function GET() {
  const availability = await getChatAvailability();
  if (!availability.enabled) {
    return NextResponse.json({ enabled: false, live: false, session: null });
  }

  const visitorKey = await getOrCreateVisitorKey();
  const session = await findOpenSession(visitorKey);

  return NextResponse.json({
    enabled: true,
    live: availability.live,
    hours: availability.hours,
    session: session
      ? {
          id: session.id,
          visitorName: session.visitorName,
          messages: await listMessages(session.id),
        }
      : null,
  });
}

export async function POST(request: Request) {
  const availability = await getChatAvailability();
  if (!availability.enabled) {
    return NextResponse.json({ error: "Chat is unavailable." }, { status: 403 });
  }

  const { name, email, path } = (await request.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    path?: string;
  };

  const visitorKey = await getOrCreateVisitorKey();
  const customer = await getCurrentCustomer();

  const { session } = await getOrOpenSession({
    visitorKey,
    entryPath: typeof path === "string" ? path.slice(0, 512) : null,
    customerId: customer?.id ?? null,
    // A signed-in buyer's own details beat anything typed into the widget.
    visitorName: customer?.name ?? name?.slice(0, 120) ?? null,
    visitorEmail: customer?.email ?? email?.slice(0, 200) ?? null,
  });

  await markRead(session.id, "visitor");

  return NextResponse.json({
    enabled: true,
    live: availability.live,
    hours: availability.hours,
    session: {
      id: session.id,
      visitorName: session.visitorName,
      messages: await listMessages(session.id),
    },
  });
}
