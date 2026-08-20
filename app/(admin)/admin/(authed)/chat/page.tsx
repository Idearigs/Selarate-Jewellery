import { Suspense } from "react";
import { Topbar } from "@/components/admin/topbar";
import { ChatConsole } from "@/components/admin/chat-console";
import { requirePermission } from "@/lib/auth";
import { listSessions } from "@/lib/chat/service";
import { listLiveVisitors } from "@/lib/chat/visitor";

export const dynamic = "force-dynamic";

/**
 * View 9 — live chat.
 *
 * Rendered on the server for the first paint so the owner opening this from a
 * push notification sees the conversation immediately, then handed to a client
 * console that keeps it live over SSE.
 */
export default async function ChatPage() {
  await requirePermission("orders");

  const [sessions, visitors] = await Promise.all([
    listSessions({ includeClosed: true }),
    listLiveVisitors(),
  ]);

  const open = sessions.filter((s) => s.status === "open").length;
  const unread = sessions.filter((s) => s.unread).length;

  return (
    <div className="flex h-[calc(100svh-60px)] flex-col">
      <Topbar
        title="Live chat"
        meta={`${open} open · ${unread} unread · ${visitors.length} browsing`}
      />

      <Suspense fallback={null}>
        <ChatConsole
          initialSessions={sessions}
          initialVisitors={visitors.map((v) => ({
            ...v,
            lastSeenAt: v.lastSeenAt.toISOString(),
            createdAt: v.createdAt.toISOString(),
          }))}
        />
      </Suspense>
    </div>
  );
}
