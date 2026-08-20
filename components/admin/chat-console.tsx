"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import { ChatComposer } from "@/components/admin/chat-composer";
import { closeChat, markChatRead } from "@/app/actions/admin-chat";

/**
 * The studio's chat console: conversation list, transcript, composer, and the
 * live visitor list.
 *
 * All of it hangs off one SSE connection. Events carry ids, not payloads —
 * the client re-fetches on notification rather than trusting the stream to
 * deliver state. That means a dropped or duplicated event costs one redundant
 * fetch instead of a wrong transcript, and reconnecting needs no catch-up
 * protocol.
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

interface InboxRow {
  id: string;
  visitorName: string | null;
  visitorEmail: string | null;
  status: "open" | "closed";
  entryPath: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  unread: boolean;
  preview: string;
}

interface LiveVisitor {
  visitorKey: string;
  currentPath: string | null;
  entryPath: string | null;
  referrer: string | null;
  pageViews: number;
  lastSeenAt: string;
}

const label = "font-mono text-[10px] uppercase tracking-[0.18em] text-ink/64";

function time(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ChatConsole({
  initialSessions,
  initialVisitors,
}: {
  initialSessions: InboxRow[];
  initialVisitors: LiveVisitor[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get("session");

  const [sessions, setSessions] = useState(initialSessions);
  const [visitors, setVisitors] = useState(initialVisitors);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshInbox = useCallback(async () => {
    const res = await fetch("/api/admin/chat/inbox");
    if (!res.ok) return;
    const data = await res.json();
    setSessions(data.sessions ?? []);
    setVisitors(data.visitors ?? []);
  }, []);

  const refreshTranscript = useCallback(async () => {
    if (!selected) {
      setMessages([]);
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/admin/chat/inbox?session=${selected}`);
    setLoading(false);
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data.messages ?? []);
  }, [selected]);

  useEffect(() => {
    void refreshTranscript();
    if (selected) void markChatRead(selected).then(refreshInbox);
  }, [selected, refreshTranscript, refreshInbox]);

  /*
   * The stream's handlers are read through a ref rather than captured.
   *
   * `refreshTranscript` is rebuilt whenever `selected` changes, so listing it as
   * a dependency of the effect below tore the EventSource down and opened a new
   * one every time the studio clicked a conversation. Events published during
   * that gap reached nobody: the old subscription was gone and the new one had
   * not yet been registered on the bus. Clicking through a busy inbox is exactly
   * when messages are arriving, so the reconnect churn was losing precisely the
   * events it could least afford to.
   *
   * The ref keeps the callbacks current while the effect's dependency list stays
   * empty — one connection for the life of the console.
   */
  const handlers = useRef({ refreshInbox, refreshTranscript });
  useEffect(() => {
    handlers.current = { refreshInbox, refreshTranscript };
  }, [refreshInbox, refreshTranscript]);

  useEffect(() => {
    const source = new EventSource("/api/admin/chat/stream");

    const onChat = () => {
      void handlers.current.refreshInbox();
      void handlers.current.refreshTranscript();
    };
    source.addEventListener("message", onChat);
    source.addEventListener("session-opened", onChat);
    source.addEventListener("session-updated", onChat);
    source.addEventListener("visitor", () => void handlers.current.refreshInbox());

    return () => source.close();
  }, []);

  const current = sessions.find((s) => s.id === selected) ?? null;

  function select(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("session", id);
    router.replace(`/admin/chat?${next}`, { scroll: false });
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[300px_1fr_260px]">
      {/* ------------------------------------------------------ conversations */}
      <aside
        className={cn(
          "flex min-h-0 flex-col border-ink/12 lg:border-r",
          // On a phone the list is the whole screen until one is picked.
          selected ? "hidden lg:flex" : "flex",
        )}
      >
        <p className={cn(label, "border-b border-ink/12 px-5 py-3")}>
          Conversations
        </p>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {sessions.length === 0 && (
            <li className="px-5 py-6 text-[13px] text-ink/55">
              No conversations yet.
            </li>
          )}
          {sessions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => select(s.id)}
                className={cn(
                  "flex w-full flex-col gap-1.5 border-b border-ink/12 px-5 py-4 text-left",
                  s.id === selected ? "bg-ink/6" : "hover:bg-ink/4",
                )}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[14px]">
                    {s.visitorName || "Visitor"}
                  </span>
                  <span className={cn(label, "shrink-0")}>
                    {time(s.lastMessageAt ?? s.createdAt)}
                  </span>
                </span>
                <span className="truncate text-[12px] text-ink/60">
                  {s.preview || "No messages yet"}
                </span>
                <span className="flex items-center gap-2">
                  {s.unread && (
                    <span className="border border-ink px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em]">
                      Unread
                    </span>
                  )}
                  {s.status === "closed" && (
                    <span className={cn(label, "opacity-70")}>Closed</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* ---------------------------------------------------------- transcript */}
      <section
        className={cn(
          "flex min-h-0 flex-col",
          selected ? "flex" : "hidden lg:flex",
        )}
      >
        {!current ? (
          <div className="flex flex-1 items-center justify-center p-10">
            <p className="text-[13px] text-ink/55">
              Select a conversation to reply.
            </p>
          </div>
        ) : (
          <>
            <header className="flex items-center justify-between gap-4 border-b border-ink/12 px-5 py-3.5">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-[15px]">
                  {current.visitorName || "Visitor"}
                </span>
                <span className={cn(label, "truncate")}>
                  {current.visitorEmail || current.entryPath || "Anonymous"}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    const next = new URLSearchParams(params.toString());
                    next.delete("session");
                    router.replace(`/admin/chat?${next}`, { scroll: false });
                  }}
                  className={cn(label, "lg:hidden hover:text-ink")}
                >
                  Back
                </button>
                {current.status === "open" && (
                  <button
                    type="button"
                    onClick={() => void closeChat(current.id).then(refreshInbox)}
                    className="border border-ink/35 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] hover:border-ink"
                  >
                    Close
                  </button>
                )}
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {loading && messages.length === 0 ? (
                <p className={label}>Loading…</p>
              ) : (
                <ol className="flex flex-col gap-5">
                  {messages.map((m) => (
                    <li key={m.id}>
                      <StudioMessage message={m} />
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {current.status === "open" ? (
              <ChatComposer
                sessionId={current.id}
                onSent={() => {
                  void refreshTranscript();
                  void refreshInbox();
                }}
              />
            ) : (
              <p className={cn(label, "border-t border-ink/20 px-5 py-4")}>
                This conversation is closed.
              </p>
            )}
          </>
        )}
      </section>

      {/* ------------------------------------------------------- who is here */}
      <aside className="hidden min-h-0 flex-col border-l border-ink/12 lg:flex">
        <p className={cn(label, "border-b border-ink/12 px-5 py-3")}>
          On the site now — {visitors.length}
        </p>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {visitors.length === 0 && (
            <li className="px-5 py-6 text-[13px] text-ink/55">Nobody browsing.</li>
          )}
          {visitors.map((v) => (
            <li
              key={v.visitorKey}
              className="flex flex-col gap-1 border-b border-ink/12 px-5 py-3.5"
            >
              <span className="truncate text-[13px]">{v.currentPath || "/"}</span>
              <span className={label}>
                {v.pageViews} {v.pageViews === 1 ? "page" : "pages"} ·{" "}
                {time(v.lastSeenAt)}
              </span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function StudioMessage({ message }: { message: Message }) {
  if (message.sender === "system") {
    return <p className={cn(label, "text-center")}>{message.body}</p>;
  }

  const fromStudio = message.sender === "studio";

  return (
    <div className={cn("flex flex-col gap-2", fromStudio ? "items-end" : "items-start")}>
      <span className={label}>
        {fromStudio ? "You" : "Visitor"} · {time(message.createdAt)}
      </span>

      {message.kind === "piece" && message.piece ? (
        <div className="flex w-[300px] gap-4 border border-ink/25 p-3">
          <div className="relative aspect-[4/5] w-[68px] shrink-0 bg-paper-alt">
            {message.piece.imageUrl && (
              <Image
                src={message.piece.imageUrl}
                alt=""
                fill
                sizes="68px"
                className="object-cover"
              />
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <span className={label}>{message.piece.reference}</span>
            <span className="font-display text-[15px]">{message.piece.name}</span>
            <span className="truncate text-[12px] text-ink/55">
              {message.piece.material}
            </span>
            <span className="pt-0.5 text-[13px]">
              {message.piece.sold ? "Sold" : message.piece.price}
            </span>
          </div>
        </div>
      ) : (
        <p
          className={cn(
            "max-w-[420px] whitespace-pre-wrap text-body-sm leading-[1.65] text-ink/85",
            fromStudio
              ? "border-r border-ink/25 pr-3.5 text-right"
              : "border-l border-ink/25 pl-3.5",
          )}
        >
          {message.body}
        </p>
      )}
    </div>
  );
}
