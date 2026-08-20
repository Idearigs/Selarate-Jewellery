import { subscribe, type ChatEvent } from "@/lib/chat/bus";

/**
 * Server-Sent Events plumbing, shared by the visitor and studio streams.
 *
 * Two things here are not optional in a real deployment:
 *
 * 1. `X-Accel-Buffering: no`. A buffering reverse proxy will happily hold an
 *    SSE response until the buffer fills, which for chat means messages
 *    arriving in silent batches minutes apart. This header disables it.
 *
 * 2. The heartbeat. Idle connections are reaped by proxies and mobile networks
 *    somewhere around 60 seconds, and a phone that has silently lost its
 *    stream looks exactly like a quiet afternoon. A comment line every 25s
 *    keeps it alive and costs nothing.
 */

const HEARTBEAT_MS = 25_000;

export function eventStream(channels: string[]) {
  const encoder = new TextEncoder();
  let unsubscribes: (() => void)[] = [];
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // The client vanished between our check and the write.
          closed = true;
        }
      };

      /* Tell the browser to wait 3s before reconnecting, and open with a
         comment so the connection is established even if nothing is happening
         — EventSource does not fire `onopen` until bytes arrive. */
      send(`retry: 3000\n\n`);
      send(`: connected\n\n`);

      const onEvent = (event: ChatEvent) => {
        send(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      };

      unsubscribes = channels.map((c) => subscribe(c, onEvent));

      heartbeat = setInterval(() => send(`: ping\n\n`), HEARTBEAT_MS);
    },

    cancel() {
      /* Both must happen. A leaked interval keeps a dead stream alive forever,
         and a leaked subscription grows the emitter's listener list until the
         process is restarted. */
      if (heartbeat) clearInterval(heartbeat);
      unsubscribes.forEach((off) => off());
      unsubscribes = [];
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
