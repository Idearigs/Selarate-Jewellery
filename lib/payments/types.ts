/**
 * Payment provider contract.
 *
 * Nothing outside `lib/payments/` may import a gateway SDK. The rest of the
 * app talks to this interface only, so swapping or adding a gateway is a change
 * in one directory — which matters because the gateway decision was explicitly
 * deferred, and because "Reserve and pay by wire" is a first-class path here,
 * not a fallback.
 */

export type ProviderId = "stripe" | "wire";

export interface CheckoutOrder {
  id: string;
  number: string;
  email: string;
  currency: string;
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
  lookupToken: string;
  lines: {
    name: string;
    reference: string;
    unitPriceCents: number;
    size: string | null;
  }[];
}

export interface CheckoutHandoff {
  /** Where to send the buyer next. For wire, an on-site instructions page. */
  redirectUrl: string;
  /** Provider-side identifier, stored on the order as `payment_ref`. */
  ref: string;
}

/**
 * What a verified webhook tells us. Deliberately small: the only transitions
 * the storefront cares about are "money confirmed" and "money reversed".
 */
export type PaymentEvent =
  | { type: "paid"; orderId: string; ref: string }
  | { type: "refunded"; orderId: string; ref: string; amountCents: number }
  | { type: "ignored" };

export interface PaymentProvider {
  readonly id: ProviderId;
  /** Shown on the checkout page. */
  readonly label: string;
  /** False when the provider is not configured, so the UI can hide it. */
  isConfigured(): boolean;
  createCheckout(order: CheckoutOrder): Promise<CheckoutHandoff>;
  /**
   * Verifies the signature and returns a normalised event. MUST throw on an
   * invalid signature — this is the only thing standing between a stranger and
   * a free five-figure ring.
   */
  verifyWebhook(request: Request): Promise<PaymentEvent>;
  refund(ref: string, amountCents: number): Promise<void>;
}
