import { getDb } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { getClientIp } from "@/lib/client-ip";
import type { SessionUser } from "@/lib/auth";

/**
 * Records admin access to customer-identifying records.
 *
 * `order_event` rows already say what staff *changed*. This says what they
 * *read*. For a business holding the home addresses of people who own
 * five-figure jewellery, "who opened this customer record, and when" is a
 * question that should have an answer.
 *
 * Deliberately fire-and-forget: an audit write must never be the reason a page
 * fails to render, and a page render must never wait on it.
 */
export function recordRead(
  user: SessionUser,
  resource: "customer" | "order" | "inventory" | "pieces",
  resourceId?: string,
) {
  void (async () => {
    try {
      const [db, ip] = await Promise.all([getDb(), getClientIp()]);
      await db.insert(auditLog).values({
        userId: user.id,
        actorEmail: user.email,
        action: "read",
        resource,
        resourceId: resourceId ?? null,
        ip,
      });
    } catch (error) {
      console.error("[audit] could not record read", error);
    }
  })();
}
