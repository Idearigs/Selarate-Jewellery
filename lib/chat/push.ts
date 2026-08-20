import webpush from "web-push";
import { inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { pushSubscription, user } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { can, type Permission, type Role } from "@/lib/permissions";

/**
 * Web Push to the studio's installed PWA.
 *
 * Push is best-effort by design: a notification that fails to send must never
 * fail the message that triggered it. The visitor's message is already durable
 * in Postgres, and the studio will see it the moment they open the app. So
 * every send here swallows its errors and returns a count.
 */

let configured: boolean | null = null;

function ready() {
  if (configured !== null) return configured;

  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    configured = false;
    return false;
  }

  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  );
  configured = true;
  return true;
}

export function pushConfigured() {
  return ready();
}

export interface PushPayload {
  title: string;
  body: string;
  /** Path the notification opens, e.g. "/admin/chat?session=…". */
  url: string;
  /**
   * Collapse key. A second notification with the same tag REPLACES the first
   * on the device rather than stacking — which is what keeps a chatty visitor
   * from burying the phone in one notification per sentence.
   */
  tag?: string;
  /** Suppresses sound/vibration. Used for visitor arrivals. */
  silent?: boolean;
}

/**
 * Send to every device belonging to studio members who hold `permission`.
 *
 * Scoped by permission rather than blasting all users: a `limited` bench role
 * has no business receiving a notification about a customer record, and the
 * role matrix is already the authority on that.
 */
export async function pushToStudio(
  payload: PushPayload,
  permission: Permission = "orders",
) {
  if (!ready()) return { sent: 0, skipped: "not-configured" as const };

  const db = await getDb();

  const staff = await db.select({ id: user.id, role: user.role }).from(user);

  const recipients = staff
    .filter((u) => can(u.role as Role, permission))
    .map((u) => u.id);

  if (recipients.length === 0) return { sent: 0, skipped: "no-recipients" as const };

  const devices = await db
    .select()
    .from(pushSubscription)
    .where(inArray(pushSubscription.userId, recipients));

  if (devices.length === 0) return { sent: 0, skipped: "no-devices" as const };

  const body = JSON.stringify(payload);
  const dead: string[] = [];
  let sent = 0;

  await Promise.all(
    devices.map(async (d) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: d.endpoint,
            keys: { p256dh: d.p256dh, auth: d.auth },
          },
          body,
          { TTL: 60 * 60 * 12 },
        );
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        /* 404/410 mean the browser has permanently revoked this endpoint —
           the app was uninstalled or notifications were turned off. Retrying
           forever would be pointless, so collect it for deletion. */
        if (status === 404 || status === 410) {
          dead.push(d.id);
        } else {
          console.error(`[push] send failed (${status ?? "unknown"})`, err);
        }
      }
    }),
  );

  if (dead.length) {
    await db.delete(pushSubscription).where(inArray(pushSubscription.id, dead));
  }

  return { sent, pruned: dead.length };
}
