import { EventEmitter } from "node:events";

/**
 * The realtime fan-out behind live chat.
 *
 * Transport is Server-Sent Events, not WebSockets. Chat here is asymmetric —
 * the client only ever needs to *receive* pushes, because sending a message is
 * an ordinary POST — and SSE gets that over plain HTTP/1.1 with automatic
 * browser reconnection, no upgrade handshake, and no special Caddy config.
 * A WebSocket would buy duplex we do not use and cost a second protocol to
 * operate.
 *
 * ── Scope limit, stated plainly ───────────────────────────────────────────
 * This bus is in-process. It fans out to every SSE connection held by THIS
 * Node process, which is correct for the single `web` container in
 * docker/docker-compose.yml. Run two web replicas and a visitor connected to
 * replica A will not see a reply sent from replica B.
 *
 * The fix, when that day comes, is entirely inside this file: publish through
 * Postgres LISTEN/NOTIFY instead of the emitter. Nothing outside imports the
 * emitter, only `publish` and `subscribe`.
 */

export type ChatEvent =
  /** A message was appended to a session. Sent to the visitor and the studio. */
  | { type: "message"; sessionId: string; messageId: string }
  /** A visitor opened a brand-new conversation. Studio only. */
  | { type: "session-opened"; sessionId: string }
  /** Status, assignment or read-state changed. Studio only. */
  | { type: "session-updated"; sessionId: string }
  /** A visitor landed on the site or moved page. Studio only. */
  | { type: "visitor"; visitorKey: string }
  /** Keeps proxies from closing an idle connection. Carries no data. */
  | { type: "ping" };

/**
 * Channels. Visitors are scoped to their own session id so one visitor can
 * never subscribe to another's conversation — the isolation is in the channel
 * name, not in a filter the caller has to remember to apply.
 */
export const STUDIO_CHANNEL = "studio";
export const visitorChannel = (sessionId: string) => `visitor:${sessionId}`;

/**
 * Next's dev server re-evaluates modules on edit, and each evaluation would
 * otherwise get a fresh emitter — silently orphaning every open connection.
 * Pinning it to globalThis keeps one bus across hot reloads.
 */
const globalForBus = globalThis as unknown as { __chatBus?: EventEmitter };

function bus() {
  if (!globalForBus.__chatBus) {
    const e = new EventEmitter();
    // One listener per open connection: a busy studio plus a dozen visitors is
    // well past the default of 10, and the warning is noise rather than signal.
    e.setMaxListeners(0);
    globalForBus.__chatBus = e;
  }
  return globalForBus.__chatBus;
}

export function publish(channel: string, event: ChatEvent) {
  bus().emit(channel, event);
}

/** Returns an unsubscribe function. Callers must call it on stream close. */
export function subscribe(channel: string, onEvent: (e: ChatEvent) => void) {
  bus().on(channel, onEvent);
  return () => {
    bus().off(channel, onEvent);
  };
}
