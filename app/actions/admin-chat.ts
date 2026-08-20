"use server";

import { requirePermission } from "@/lib/auth";
import {
  appendMessage,
  claimSession,
  closeSession,
  getSession,
  markRead,
} from "@/lib/chat/service";

/**
 * Studio-side chat actions.
 *
 * Server Actions rather than route handlers: these are mutations tied to the
 * admin UI, and actions come with Next's Origin check, which is the CSRF
 * defence the rest of the admin already relies on.
 *
 * Every one re-checks `orders` permission. The sidebar hides chat from roles
 * that cannot use it, but hiding is cosmetic — an action is a public endpoint.
 */

export async function sendStudioMessage(sessionId: string, body: string) {
  const current = await requirePermission("orders");

  const text = body.trim();
  if (!text) return { error: "Message is empty." };

  const session = await getSession(sessionId);
  if (!session) return { error: "That conversation no longer exists." };
  if (session.closedAt) return { error: "That conversation is closed." };

  await appendMessage({
    sessionId,
    sender: "studio",
    body: text,
    userId: current.id,
  });

  return { ok: true as const };
}

/**
 * Send a piece as a card — the payload of the `/product` command.
 *
 * The card carries no price snapshot: it renders from the live piece record so
 * a conversation that resumes next week cannot quote a price or an
 * availability that has since changed.
 */
export async function sendPieceCard(sessionId: string, pieceId: string) {
  const current = await requirePermission("orders");

  const session = await getSession(sessionId);
  if (!session) return { error: "That conversation no longer exists." };
  if (session.closedAt) return { error: "That conversation is closed." };

  await appendMessage({
    sessionId,
    sender: "studio",
    pieceId,
    userId: current.id,
  });

  return { ok: true as const };
}

export async function claimChat(sessionId: string) {
  const current = await requirePermission("orders");
  await claimSession(sessionId, current.id);
  return { ok: true as const };
}

export async function closeChat(sessionId: string) {
  await requirePermission("orders");
  await appendMessage({
    sessionId,
    sender: "system",
    body: "The studio closed this conversation.",
  });
  await closeSession(sessionId);
  return { ok: true as const };
}

export async function markChatRead(sessionId: string) {
  await requirePermission("orders");
  await markRead(sessionId, "studio");
  return { ok: true as const };
}
