import { getDb } from "../lib/db/index.ts";
import { hold } from "../lib/db/schema.ts";
import { and, isNull } from "drizzle-orm";

/**
 * Releases every live hold that is not bound to an order.
 *
 * These strand a piece for the length of the hold window with nobody able to
 * buy it. They accumulate whenever carts are abandoned mid-flight — most
 * sharply when the browser refuses to store the cart cookie, so every
 * add-to-bag builds a fresh cart and leaves the previous one's hold behind.
 *
 * A hold carrying an orderId is never touched: that is a reservation someone
 * is in the middle of paying for, and wire orders hold for fourteen days by
 * design.
 *
 * Recovery, not routine. Lazy expiry clears these on its own once the window
 * passes; this is for when you need the catalogue buyable now.
 */
const db = await getDb();

const released = await db
  .update(hold)
  .set({ releasedAt: new Date() })
  .where(and(isNull(hold.releasedAt), isNull(hold.orderId)))
  .returning({ id: hold.id });

console.log(`Released ${released.length} unordered hold(s). Order-bound holds untouched.`);
process.exit(0);
