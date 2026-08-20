import { NextResponse } from "next/server";
import { getVisitorKey } from "@/lib/chat/visitor";
import {
  appendMessage,
  findOpenSession,
  getChatAvailability,
  MAX_MESSAGE_LENGTH,
  toMessageView,
} from "@/lib/chat/service";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * A visitor sends a message.
 *
 * The session is resolved from the visitor's own cookie and never from the
 * request body — otherwise anyone could post into someone else's conversation
 * by guessing a session id, and the studio would have no way to tell.
 */
export async function POST(request: Request) {
  const visitorKey = await getVisitorKey();
  if (!visitorKey) {
    return NextResponse.json({ error: "No conversation open." }, { status: 400 });
  }

  /* Keyed by visitor rather than IP: several buyers can share an office NAT,
     and one of them flooding must not silence the others. */
  const limit = await rateLimit(`chat:${visitorKey}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many messages. Give it a moment." },
      { status: 429 },
    );
  }

  const availability = await getChatAvailability();
  if (!availability.enabled) {
    return NextResponse.json({ error: "Chat is unavailable." }, { status: 403 });
  }

  const { body } = (await request.json().catch(() => ({}))) as { body?: string };
  const text = (body ?? "").trim();

  if (!text) {
    return NextResponse.json({ error: "Message is empty." }, { status: 400 });
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "Message is too long." }, { status: 400 });
  }

  const session = await findOpenSession(visitorKey);
  if (!session) {
    return NextResponse.json({ error: "No conversation open." }, { status: 400 });
  }

  const row = await appendMessage({
    sessionId: session.id,
    sender: "visitor",
    body: text,
  });

  return NextResponse.json({ message: await toMessageView(row) });
}
