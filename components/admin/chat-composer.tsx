"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { sendPieceCard, sendStudioMessage } from "@/app/actions/admin-chat";

/**
 * The studio's message box, with the `/product` slash command.
 *
 * Two stages, driven entirely by what has been typed:
 *
 *   "/"                    → the command list
 *   "/product"             → the two categories
 *   "/fine" or "/one"      → matches a category by prefix, no full word needed
 *   "/fine-jewellery ruby" → live piece search inside that category
 *   "/product A—01"        → search across both categories
 *
 * Selecting a piece sends it as a card. Arrow keys and Enter drive the whole
 * thing so a reply never needs the mouse — the owner is at a bench.
 */

interface PieceResult {
  id: string;
  slug: string;
  name: string;
  reference: string;
  material: string;
  price: string;
  imageUrl: string | null;
  sold: boolean;
}

type Category = "ooak" | "fine";

/** Both spellings accepted — the studio is American, the owner may not be. */
const CATEGORIES: { id: Category; label: string; aliases: string[] }[] = [
  {
    id: "fine",
    label: "Fine Jewelry",
    aliases: ["fine-jewellery", "fine-jewelry", "fine", "jewellery", "jewelry"],
  },
  {
    id: "ooak",
    label: "One of a Kind",
    aliases: ["one-of-a-kind", "one-of-one", "ooak", "unique", "one"],
  },
];

const label = "font-mono text-[10px] uppercase tracking-[0.18em] text-ink/64";

interface Parsed {
  active: boolean;
  category: Category | null;
  /** Category candidates while the word is still being typed. */
  suggestions: typeof CATEGORIES;
  query: string;
}

/** Pure — parsing the draft is the whole state machine. */
function parse(draft: string): Parsed {
  const idle: Parsed = { active: false, category: null, suggestions: [], query: "" };
  if (!draft.startsWith("/")) return idle;

  const [rawCommand = "", ...rest] = draft.slice(1).split(/\s+/);
  const command = rawCommand.toLowerCase();
  const query = rest.join(" ");

  // "/product" — no category chosen yet, offer both.
  if ("product".startsWith(command) || command === "product") {
    const exact = command === "product";
    return {
      active: true,
      category: null,
      suggestions: exact && query ? [] : CATEGORIES,
      query: exact ? query : "",
    };
  }

  // A category typed directly, complete or partial.
  const exact = CATEGORIES.find((c) => c.aliases.includes(command));
  if (exact) {
    return { active: true, category: exact.id, suggestions: [], query };
  }

  const partial = CATEGORIES.filter((c) =>
    c.aliases.some((a) => a.startsWith(command)),
  );
  if (command && partial.length) {
    return { active: true, category: null, suggestions: partial, query: "" };
  }

  // A lone "/" shows everything available.
  if (!command) {
    return { active: true, category: null, suggestions: CATEGORIES, query: "" };
  }

  return idle;
}

export function ChatComposer({
  sessionId,
  disabled,
  onSent,
}: {
  sessionId: string;
  disabled?: boolean;
  onSent: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [results, setResults] = useState<PieceResult[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const parsed = parse(draft);
  const showingCategories = parsed.active && parsed.suggestions.length > 0;
  const searching = parsed.active && parsed.suggestions.length === 0;

  /* Live piece search. Aborted on every keystroke so a slow response can never
     overwrite the results for a newer query. */
  useEffect(() => {
    if (!searching) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({ q: parsed.query });
    if (parsed.category) params.set("category", parsed.category);

    const timer = setTimeout(() => {
      fetch(`/api/admin/chat/pieces?${params}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data: { pieces: PieceResult[] }) => {
          setResults(data.pieces ?? []);
          setHighlight(0);
        })
        .catch(() => {});
    }, 120);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searching, parsed.query, parsed.category]);

  useEffect(() => setHighlight(0), [showingCategories]);

  const chooseCategory = useCallback((category: (typeof CATEGORIES)[number]) => {
    setDraft(`/${category.aliases[0]} `);
    inputRef.current?.focus();
  }, []);

  const choosePiece = useCallback(
    async (piece: PieceResult) => {
      setBusy(true);
      setError(null);
      const result = await sendPieceCard(sessionId, piece.id);
      setBusy(false);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setDraft("");
      setResults([]);
      onSent();
    },
    [sessionId, onSent],
  );

  async function sendText() {
    const text = draft.trim();
    if (!text || busy) return;

    setBusy(true);
    setError(null);
    const result = await sendStudioMessage(sessionId, text);
    setBusy(false);

    if (result?.error) {
      setError(result.error);
      return;
    }
    setDraft("");
    onSent();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const options = showingCategories ? parsed.suggestions : results;

    if (parsed.active && options.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => (h + 1) % options.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => (h - 1 + options.length) % options.length);
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (showingCategories) chooseCategory(parsed.suggestions[highlight]!);
        else void choosePiece(results[highlight]!);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setDraft("");
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendText();
    }
  }

  return (
    <div className="relative border-t border-ink/20">
      {/* The picker floats above the composer so the conversation stays put. */}
      {parsed.active && (showingCategories || results.length > 0 || searching) && (
        <div className="absolute bottom-full left-0 right-0 max-h-[340px] overflow-y-auto border-t border-ink/20 bg-paper">
          {showingCategories ? (
            <ul>
              <li className={cn(label, "border-b border-ink/12 px-5 py-2.5")}>
                Send a piece — choose a category
              </li>
              {parsed.suggestions.map((c, i) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => chooseCategory(c)}
                    className={cn(
                      "flex w-full items-baseline justify-between px-5 py-3 text-left text-[14px]",
                      i === highlight ? "bg-ink text-paper" : "hover:bg-ink/6",
                    )}
                  >
                    <span>{c.label}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] opacity-64">
                      /{c.aliases[0]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <ul>
              <li className={cn(label, "border-b border-ink/12 px-5 py-2.5")}>
                {results.length
                  ? "Select a piece to send"
                  : "No piece matches that"}
              </li>
              {results.map((p, i) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => void choosePiece(p)}
                    className={cn(
                      "flex w-full items-center gap-4 px-5 py-3 text-left",
                      i === highlight ? "bg-ink text-paper" : "hover:bg-ink/6",
                    )}
                  >
                    <span className="relative aspect-[4/5] w-11 shrink-0 bg-paper-alt">
                      {p.imageUrl && (
                        <Image
                          src={p.imageUrl}
                          alt=""
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      )}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] opacity-64">
                        {p.reference}
                      </span>
                      <span className="truncate text-[14px]">{p.name}</span>
                      <span className="truncate text-[12px] opacity-64">
                        {p.material}
                      </span>
                    </span>
                    <span className="shrink-0 text-[13px]">
                      {p.sold ? "Sold" : p.price}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="px-5 pt-3 text-[12px] text-error">
          {error}
        </p>
      )}

      <div className="flex items-end gap-3 px-5 py-4">
        <label className="flex-1">
          <span className="sr-only">Reply</span>
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            rows={2}
            maxLength={2000}
            placeholder="Reply, or type / to send a piece"
            className="w-full resize-none border-0 border-b border-ink/30 bg-transparent pb-2 text-[15px] outline-none placeholder:text-ink/40 focus:border-ink disabled:opacity-40"
          />
        </label>
        <button
          type="button"
          onClick={() => void sendText()}
          disabled={disabled || busy || !draft.trim() || parsed.active}
          className="shrink-0 border border-ink/35 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors hover:border-ink disabled:opacity-40"
        >
          {busy ? "Sending" : "Send"}
        </button>
      </div>
    </div>
  );
}
