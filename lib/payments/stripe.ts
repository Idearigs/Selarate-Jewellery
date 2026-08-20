import Stripe from "stripe";
import { env } from "@/lib/env";
import type {
  CheckoutHandoff,
  CheckoutOrder,
  PaymentEvent,
  PaymentProvider,
} from "./types";

/**
 * Stripe — the card path (US / USD).
 *
 * The order is created in our database BEFORE the redirect and only moves to
 * `paid` on a signature-verified webhook. It is never marked paid from the
 * browser's return URL: that URL is attacker-controllable, and these are
 * five-figure pieces.
 */

let client: Stripe | null = null;

function stripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  client ??= new Stripe(env.STRIPE_SECRET_KEY);
  return client;
}

export const stripeProvider: PaymentProvider = {
  id: "stripe",
  label: "Pay by card",

  isConfigured() {
    return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
  },

  async createCheckout(order: CheckoutOrder): Promise<CheckoutHandoff> {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer_email: order.email,
      client_reference_id: order.id,
      // Echoed back on the webhook — this is how we find our own order without
      // trusting anything the browser sends us.
      metadata: { orderId: order.id, orderNumber: order.number },
      line_items: [
        ...order.lines.map((line) => ({
          quantity: 1,
          price_data: {
            currency: order.currency.toLowerCase(),
            unit_amount: line.unitPriceCents,
            product_data: {
              name: line.name,
              description: [line.reference, line.size && `US ${line.size}`]
                .filter(Boolean)
                .join(" · "),
            },
          },
        })),
        // Tax is computed by us and already shown in the bag, so it crosses as
        // its own line. Letting Stripe recompute it would risk charging a
        // different total than the buyer agreed to.
        ...(order.taxCents > 0
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: order.currency.toLowerCase(),
                  unit_amount: order.taxCents,
                  product_data: { name: "Estimated tax" },
                },
              },
            ]
          : []),
      ],
      success_url: `${env.SITE_URL}/order/${order.lookupToken}?checkout=complete`,
      cancel_url: `${env.SITE_URL}/bag`,
      // Insured, signature-required shipping is included in the price.
      shipping_address_collection: { allowed_countries: ["US", "GB", "CA", "AU"] },
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { redirectUrl: session.url, ref: session.id };
  },

  async verifyWebhook(request: Request): Promise<PaymentEvent> {
    const secret = env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");

    const signature = request.headers.get("stripe-signature");
    if (!signature) throw new Error("Missing stripe-signature header");

    // Signature is computed over the raw body — never the parsed JSON.
    const raw = await request.text();
    const event = await stripe().webhooks.constructEventAsync(
      raw,
      signature,
      secret,
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        // `payment_status` guards against completed-but-unpaid sessions.
        if (session.payment_status !== "paid") return { type: "ignored" };
        const orderId = session.metadata?.orderId;
        if (!orderId) return { type: "ignored" };
        return { type: "paid", orderId, ref: session.id };
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const orderId = charge.metadata?.orderId;
        if (!orderId) return { type: "ignored" };
        return {
          type: "refunded",
          orderId,
          ref: charge.id,
          amountCents: charge.amount_refunded,
        };
      }

      default:
        return { type: "ignored" };
    }
  },

  async refund(ref: string, amountCents: number) {
    // `ref` is a Checkout Session id; resolve it to the payment intent.
    const session = await stripe().checkout.sessions.retrieve(ref);
    const intent = session.payment_intent;
    if (!intent) throw new Error(`No payment intent on session ${ref}`);

    await stripe().refunds.create({
      payment_intent: typeof intent === "string" ? intent : intent.id,
      amount: amountCents,
    });
  },
};
