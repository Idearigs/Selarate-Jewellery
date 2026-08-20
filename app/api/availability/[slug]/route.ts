import { NextResponse } from "next/server";
import { getCartToken } from "@/lib/cart";
import { getLiveAvailability } from "@/lib/holds";

/**
 * The seam between static SEO and live inventory.
 *
 * The product page itself is statically generated so that copy, price and
 * JSON-LD are in the initial HTML for crawlers. Availability cannot be cached
 * for even a second — with an inventory of one, a stale "Add to bag" sells a
 * piece twice. So it lives here, behind a no-store endpoint that a single
 * client island calls on mount and again before checkout.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const token = await getCartToken();
  const availability = await getLiveAvailability(slug, token);

  if (!availability) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(availability, {
    headers: { "Cache-Control": "no-store, must-revalidate" },
  });
}
