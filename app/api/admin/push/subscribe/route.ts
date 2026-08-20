import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { pushSubscription } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** The public VAPID key the service worker needs to subscribe. */
export async function GET() {
  const current = await getSessionUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const devices = await db
    .select({ id: pushSubscription.id, label: pushSubscription.label })
    .from(pushSubscription)
    .where(eq(pushSubscription.userId, current.id));

  return NextResponse.json({
    configured: Boolean(env.VAPID_PUBLIC_KEY),
    publicKey: env.VAPID_PUBLIC_KEY ?? null,
    devices,
  });
}

/**
 * Register this device for push.
 *
 * Upserted on the endpoint, which is the browser's own identifier for the
 * subscription. Re-subscribing after a key rotation or a reinstall therefore
 * updates the row instead of adding a second one — otherwise the owner would
 * get the same notification once per stale registration.
 */
export async function POST(request: Request) {
  const current = await getSessionUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
    label?: string;
  } | null;

  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Incomplete subscription." }, { status: 400 });
  }

  const db = await getDb();
  await db
    .insert(pushSubscription)
    .values({
      userId: current.id,
      platform: "web",
      endpoint,
      p256dh,
      auth,
      label: body?.label?.slice(0, 80) ?? null,
    })
    .onConflictDoUpdate({
      target: pushSubscription.endpoint,
      set: {
        userId: current.id,
        p256dh,
        auth,
        failedAt: null,
        lastUsedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true });
}

/** Turning notifications off on this device. */
export async function DELETE(request: Request) {
  const current = await getSessionUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { endpoint } = (await request.json().catch(() => ({}))) as {
    endpoint?: string;
  };
  if (!endpoint) {
    return NextResponse.json({ error: "No endpoint." }, { status: 400 });
  }

  const db = await getDb();
  await db.delete(pushSubscription).where(eq(pushSubscription.endpoint, endpoint));
  return NextResponse.json({ ok: true });
}
