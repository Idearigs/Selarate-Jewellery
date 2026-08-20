"use server";

import { z } from "zod";
import { getCartToken } from "@/lib/cart";
import { getProvider, isProviderId } from "@/lib/payments";
import { clearCart, createOrderFromCart, getOrderByToken } from "@/lib/orders";
import { sendStudioNotification, sendWireInstructions } from "@/lib/email";

/**
 * Checkout. Validates, writes the order, then hands off to the provider.
 *
 * Nothing about price, tax or availability is accepted from the client — the
 * form supplies contact and shipping details and a provider id, and that is all.
 */

const schema = z.object({
  name: z.string().trim().min(2, "Please give a name"),
  email: z.string().trim().email("Please check this email address"),
  address: z.string().trim().min(10, "Please give a full shipping address"),
  provider: z.string().refine(isProviderId, "Choose a payment method"),
});

export type CheckoutState = {
  errors?: Partial<Record<"name" | "email" | "address" | "provider" | "form", string>>;
  redirectUrl?: string;
};

export async function submitCheckout(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    address: formData.get("address"),
    provider: formData.get("provider"),
  });

  if (!parsed.success) {
    const errors: CheckoutState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<CheckoutState["errors"]>;
      errors[key] ??= issue.message;
    }
    return { errors };
  }

  const cartToken = await getCartToken();
  if (!cartToken) return { errors: { form: "Your bag is empty." } };

  const { name, email, address, provider: providerId } = parsed.data;

  const result = await createOrderFromCart(cartToken, {
    name,
    email,
    shippingAddress: address,
    provider: providerId,
  });

  if (!result.ok) {
    return {
      errors: {
        form:
          result.reason === "hold-lost"
            ? // The specific, honest message — not a generic failure. A lapsed
              // hold on a one-of-a-kind piece is a real and explicable event.
              "Your reservation lapsed while you were checking out, and the piece has been released. Please check your bag."
            : "Your bag is empty.",
      },
    };
  }

  const provider = getProvider(providerId);
  const order = await getOrderByToken(result.lookupToken);
  if (!order) return { errors: { form: "Something went wrong. Please try again." } };

  let handoff;
  try {
    handoff = await provider.createCheckout({
      id: order.id,
      number: order.number,
      email,
      currency: order.currency,
      subtotalCents: order.subtotalCents,
      taxCents: order.taxCents,
      shippingCents: order.shippingCents,
      totalCents: order.totalCents,
      lookupToken: order.lookupToken,
      lines: order.items.map((i) => ({
        name: i.name,
        reference: i.reference,
        unitPriceCents: i.unitPriceCents,
        size: i.size,
      })),
    });
  } catch (error) {
    console.error("[checkout] provider handoff failed", error);
    return {
      errors: {
        form: "We could not reach the payment provider. Your reservation is still held — please try again.",
      },
    };
  }

  const mailData = {
    number: order.number,
    name,
    email,
    lookupToken: order.lookupToken,
    totalCents: order.totalCents,
    lines: order.items.map((i) => ({
      name: i.name,
      reference: i.reference,
      size: i.size,
    })),
  };

  if (providerId === "wire") {
    // A wire order is complete from the buyer's side right now: the piece stays
    // reserved and the studio takes over. Card orders wait for the webhook.
    await clearCart(cartToken);
    await sendWireInstructions(mailData);
    await sendStudioNotification(mailData, "Wire reservation");
  }

  return { redirectUrl: handoff.redirectUrl };
}
