"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/**
 * The storefront chat widget.
 *
 * Held to the same rules as the rest of the site: no icons, no rounded
 * corners, no shadows. The launcher is a word, the close control is a word, and
 * the panel is paper inside a 1px ink hairline. A floating blue bubble would be
 * the single most off-brand element on the site.
 *
 * It is a client island mounted in the storefront layout. It fetches its own
 * state rather than being handed props from a Server Component, because reading
 * a cookie upstream would turn every storefront page dynamic and cost the
 * static prerendering the whole SEO approach depends on.
 */

interface PieceCard {
  slug: string;
  name: string;
  reference: string;
  material: string;
  price: string;
  imageUrl: string | null;
  sold: boolean;
}

interface Message {
  id: string;
  sender: "visitor" | "studio" | "system";
  kind: "text" | "piece";
  body: string;
  createdAt: string;
  piece: PieceCard | null;
}

interface ChatState {
  enabled: boolean;
  live: boolean;
  hours?: { start: number; end: number; timezone: string };
  session: { id: string; visitorName: string | null; messages: Message[] } | null;
}

const label = "font-mono text-[10px] uppercase tracking-[0.18em] text-ink/64";

export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ChatState | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  /* ---------------------------------------------------------------- bootstrap */

  useEffect(() => {
    let cancelled = false;
    fetch("/api/chat/session")
      .then((r) => r.json())
      .then((data: ChatState) => {
        if (!cancelled) setState(data);
      })
      .catch(() => {
        // Chat failing must never surface as an error on a product page.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ------------------------------------------------------------------- stream */

  const sessionId = state?.session?.id ?? null;

  const refreshMessages = useCallback(async () => {
    const res = await fetch("/api/chat/session");
    if (!res.ok) return;
    const data: ChatState = await res.json();
    setState((prev) => {
      const before = prev?.session?.messages.length ?? 0;
      const after = data.session?.messages.length ?? 0;
      /* Only count studio replies the visitor has not looked at. Their own
         messages must never raise their own badge. */
      if (!openRef.current && after > before) {
        const fresh = data.session?.messages.slice(before) ?? [];
        const fromStudio = fresh.filter((m) => m.sender !== "visitor").length;
        if (fromStudio) setUnread((n) => n + fromStudio);
      }
      return data;
    });
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const source = new EventSource("/api/chat/stream");
    source.addEventListener("message", () => void refreshMessages());
    source.addEventListener("session-updated", () => void refreshMessages());
    /* EventSource reconnects on its own; closing here would fight it. Errors
       are expected on sleep/wake and are not worth surfacing. */
    return () => source.close();
  }, [sessionId, refreshMessages]);

  /* Pin to the newest message whenever the list grows or the panel opens. */
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, state?.session?.messages.length]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  /* --------------------------------------------------------------- sending */

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);

    try {
      /* First message opens the conversation. Deferring creation until someone
         actually types is what keeps the studio's inbox free of empty threads
         from people who only hovered the launcher. */
      let active = state?.session?.id;
      if (!active) {
        const res = await fetch("/api/chat/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: pathname }),
        });
        if (!res.ok) throw new Error("Could not start the conversation.");
        const data: ChatState = await res.json();
        setState(data);
        active = data.session?.id;
      }
      if (!active) throw new Error("Could not start the conversation.");

      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Message could not be sent.");
      }

      setDraft("");
      await refreshMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  if (!state?.enabled) return null;

  const messages = state.session?.messages ?? [];

  /* ---------------------------------------------------------------- launcher */

  /*
   * Launcher, backdrop and panel are all mounted at once and cross-faded.
   *
   * The panel used to be conditionally rendered, which is why it appeared
   * instantly: an element that does not exist has no state to transition from.
   * Keeping all three in the tree costs nothing — the markup is small and the
   * messages are already fetched — and buys a real open and close.
   *
   * `inert` on whichever is inactive keeps the hidden one out of the tab order
   * and away from screen readers, so mounting both is not an accessibility
   * regression.
   */
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        inert={open}
        className={cn(
          "fixed bottom-0 right-0 z-40 md:bottom-6 md:right-6",
          /* Ink, not paper. On paper it was a hairline outline on the same
             ground as the page — the one control meant to be findable from
             anywhere was the quietest thing on screen. Ink and bone is the
             pairing the footer already uses, so it reads as part of the site
             rather than as a bolted-on widget. */
          "flex items-center gap-3 border border-ink bg-ink px-5 py-4",
          "font-mono text-[11px] uppercase tracking-[0.18em] text-bone",
          "transition-opacity duration-200 hover:opacity-88",
          // Full-width bar on mobile, where a floating pill would cover content.
          "w-full justify-center md:w-auto",
          "transition-[opacity,transform] duration-300 ease-[var(--ease-reveal)]",
          open
            ? "pointer-events-none translate-y-2 opacity-0"
            : "translate-y-0 opacity-100",
        )}
      >
        Message the studio
        {unread > 0 && (
          <span className="border border-bone/50 px-1.5 py-0.5 text-[10px] text-bone">
            {unread}
          </span>
        )}
      </button>

      {/* Phone only. The panel covers 85% of the screen but the remaining strip
          of live page kept pulling the eye; dimming and blurring it settles the
          conversation as the only thing happening. Desktop needs none of this —
          the panel is a small card beside a page you are still reading.
          A button, not a div: tapping outside is how everyone closes a sheet. */}
      <button
        type="button"
        aria-label="Close chat"
        onClick={() => setOpen(false)}
        inert={!open}
        className={cn(
          "fixed inset-0 z-30 bg-ink/45 backdrop-blur-[3px] md:hidden",
          "transition-opacity duration-300 ease-[var(--ease-reveal)]",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

    <section
      aria-label="Live chat with the studio"
      inert={!open}
      className={cn(
        "fixed z-40 flex flex-col border border-ink bg-paper",
        "inset-x-0 bottom-0 top-auto h-[85svh]",
        "md:inset-auto md:bottom-6 md:right-6 md:h-[540px] md:w-[380px]",
        "transition-[opacity,transform] duration-300 ease-[var(--ease-reveal)]",
        /* Rises from the bottom edge on a phone, which is where a sheet comes
           from and where the launcher sat. On desktop it is a card by the
           corner, so a short lift reads better than a full slide. */
        open
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-full opacity-0 md:translate-y-3",
      )}
    >
      {/* Ink band, matching the footer and the launcher that opened this. It
          also separates the studio’s frame from the conversation itself,
          which is the part that must stay quiet paper. */}
      <header className="flex items-center justify-between bg-ink px-5 py-4 text-bone">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-bone/55">
            The studio
          </span>
          <span className="flex items-center gap-2 text-[13px] text-bone/85">
            {/* The one dot in a build with no icons. A status light is the
                exception the rule exists for — "Replying now" in text alone
                reads as a claim rather than a state. */}
            <span
              aria-hidden="true"
              className={cn(
                "inline-block size-[6px] rounded-full",
                state.live ? "bg-good-ink" : "bg-bone/40",
              )}
            />
            {state.live ? "Replying now" : "Away — leave a message"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="border-b border-bone/40 pb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-bone/70 transition-colors hover:border-bone hover:text-bone"
        >
          Close
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-body-sm leading-[1.7] text-ink/72">
              {state.live
                ? "Ask anything — sizing, stones, commissions, or to see a piece in person."
                : "The bench is closed just now. Leave a message and the studio will reply by email."}
            </p>
            {!state.live && state.hours && (
              <p className={label}>
                Studio hours {state.hours.start}:00 — {state.hours.end}:00
              </p>
            )}
          </div>
        ) : (
          <ol className="flex flex-col gap-5">
            {messages.map((m) => (
              <li key={m.id}>
                <MessageBubble message={m} />
              </li>
            ))}
          </ol>
        )}
      </div>

      {error && (
        <p role="alert" className="border-t border-ink/12 px-5 py-3 text-[12px] text-error">
          {error}
        </p>
      )}

      <div className="flex items-end gap-3 border-t border-ink/20 px-5 py-4">
        <label className="flex-1">
          <span className="sr-only">Your message</span>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends; Shift+Enter is a newline, as in every chat.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={2}
            maxLength={2000}
            placeholder="Write a message"
            className="w-full resize-none border-0 border-b border-ink/30 bg-transparent pb-2 text-[15px] outline-none placeholder:text-ink/40 focus:border-ink"
          />
        </label>
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || !draft.trim()}
          className="shrink-0 border border-ink/35 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors hover:border-ink disabled:opacity-40"
        >
          {sending ? "Sending" : "Send"}
        </button>
      </div>
    </section>
    </>
  );
}

/**
 * Sender is carried by alignment and a mono label, not by colour-filled
 * bubbles — the palette has one ink and one paper, and inventing a second
 * accent for chat would break the whole surface.
 */
function MessageBubble({ message }: { message: Message }) {
  if (message.sender === "system") {
    return (
      <p className={cn(label, "text-center")}>{message.body}</p>
    );
  }

  const fromStudio = message.sender === "studio";

  return (
    <div className={cn("flex flex-col gap-2", fromStudio ? "items-start" : "items-end")}>
      <span className={label}>{fromStudio ? "Studio" : "You"}</span>

      {message.kind === "piece" && message.piece ? (
        <PieceMessage piece={message.piece} />
      ) : (
        /* Filled, not hairline-ruled. Two columns of text distinguished only
           by which side a 1px rule sat on took reading to follow; a filled
           ground is legible at a glance. The fills are the palette’s own two
           grounds — the visitor gets ink, the studio paper-alt — so the
           conversation still reads as this site and not as a chat plugin. */
        <p
          className={cn(
            "max-w-[280px] whitespace-pre-wrap px-3.5 py-2.5 text-body-sm leading-[1.65]",
            fromStudio ? "bg-paper-alt text-ink/85" : "bg-ink text-bone",
          )}
        >
          {message.body}
        </p>
      )}
    </div>
  );
}

/**
 * A piece the studio sent. The whole card is the link — tapping anywhere lands
 * on the product page, which is the entire point of sending it.
 */
function PieceMessage({ piece }: { piece: PieceCard }) {
  return (
    <Link
      href={`/piece/${piece.slug}`}
      className="group flex w-[280px] gap-4 border border-ink/25 p-3 transition-colors hover:border-ink"
    >
      <div className="relative aspect-[4/5] w-[72px] shrink-0 bg-paper-alt">
        {piece.imageUrl && (
          <Image
            src={piece.imageUrl}
            alt=""
            fill
            sizes="72px"
            className="object-cover"
          />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className={label}>{piece.reference}</span>
        <span className="font-display text-[16px] leading-tight">{piece.name}</span>
        <span className="truncate text-[12px] text-ink/55">{piece.material}</span>
        <span className="pt-0.5 text-[13px] tracking-[0.04em]">
          {piece.sold ? "Found its owner" : piece.price}
        </span>
        <span className="pt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/64 group-hover:text-ink">
          View piece →
        </span>
      </div>
    </Link>
  );
}
