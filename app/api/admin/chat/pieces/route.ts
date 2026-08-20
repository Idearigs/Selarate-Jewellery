import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { can, type Role } from "@/lib/permissions";
import { searchPiecesForChat } from "@/lib/chat/service";

export const dynamic = "force-dynamic";

/**
 * Backs the `/product` slash command's live picker.
 *
 * Kept as a route handler rather than a Server Action because it fires on
 * every keystroke: actions are sequenced against the router and would make the
 * picker feel laggy, where a plain fetch can be abandoned mid-flight when the
 * next character arrives.
 */
export async function GET(request: Request) {
  const current = await getSessionUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(current.role as Role, "orders")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const categoryParam = url.searchParams.get("category");
  const category =
    categoryParam === "ooak" || categoryParam === "fine" ? categoryParam : undefined;

  const pieces = await searchPiecesForChat({ query, category, limit: 8 });
  return NextResponse.json({ pieces });
}
