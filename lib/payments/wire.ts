import { env } from "@/lib/env";
import type {
  CheckoutHandoff,
  CheckoutOrder,
  PaymentEvent,
  PaymentProvider,
} from "./types";

/**
 * Bank wire.
 *
 * Not a stub and not a "coming soon" — the handoff calls this out as real
 * behaviour, because five-figure pieces are routinely negotiated and settled by
 * transfer rather than card. It is why `enquiry` is a first-class order state in
 * the admin.
 *
 * There is no gateway to redirect to. The order is created in the `enquiry`
 * state, the hold is kept alive, wire instructions are emailed, and the studio
 * marks the order paid by hand in the admin once funds land. That manual step
 * IS the verification — which is why `verifyWebhook` refuses to be called.
 */
export const wireProvider: PaymentProvider = {
  id: "wire",
  label: "Reserve and pay by wire",

  isConfigured() {
    // Requires no third-party credentials; a studio can always accept a wire.
    return true;
  },

  async createCheckout(order: CheckoutOrder): Promise<CheckoutHandoff> {
    return {
      redirectUrl: `${env.SITE_URL}/order/${order.lookupToken}?method=wire`,
      ref: `wire:${order.number}`,
    };
  },

  async verifyWebhook(): Promise<PaymentEvent> {
    // A wire has no callback. If something reaches this, treat it as hostile
    // rather than as an opportunity to mark an order paid.
    throw new Error("The wire provider does not accept webhooks");
  },

  async refund() {
    throw new Error(
      "Wire payments are refunded by bank transfer from the studio, not through the app",
    );
  },
};
