import { NextResponse } from "next/server";
import { getBagCount } from "@/lib/cart";

/**
 * Visitor-specific bag count, kept off the server-rendered page so that the
 * storefront layout stays free of dynamic APIs and every page can prerender.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const count = await getBagCount();
  return NextResponse.json(
    { count },
    { headers: { "Cache-Control": "no-store" } },
  );
}
