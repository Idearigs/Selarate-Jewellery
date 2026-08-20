import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Container healthcheck. Caddy holds traffic until this reports ready. */
export function GET() {
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
