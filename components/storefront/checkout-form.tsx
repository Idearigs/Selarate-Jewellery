"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field, TextArea } from "@/components/ui/field";
import { submitCheckout, type CheckoutState } from "@/app/actions/checkout";

/**
 * Checkout is the one screen with no prototype in the handoff — the design
 * stops at "Proceed to checkout". It is built from the Contact and Account form
 * patterns: bottom-rule inputs, mono labels, boxed chips for the one choice on
 * the page, and a single solid primary button.
 */
export function CheckoutForm({
  providers,
}: {
  providers: { id: string; label: string }[];
}) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(
    submitCheckout,
    {},
  );
  const [provider, setProvider] = useState(providers[0]?.id ?? "wire");

  // The provider decides where the buyer goes next — an external gateway for
  // card, an on-site page for wire — so the redirect happens here rather than
  // in the action.
  useEffect(() => {
    if (state.redirectUrl) window.location.href = state.redirectUrl;
  }, [state.redirectUrl]);

  return (
    <form action={action} className="flex max-w-[560px] flex-col gap-7">
      <input type="hidden" name="provider" value={provider} />

      <Field
        label="Full name"
        name="name"
        autoComplete="name"
        required
        error={state.errors?.name}
      />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={state.errors?.email}
        hint="Your order link is sent here. No account is needed."
      />
      <TextArea
        label="Shipping address"
        name="address"
        autoComplete="street-address"
        required
        placeholder={"Street\nCity, State, Postcode\nCountry"}
        error={state.errors?.address}
      />

      <fieldset className="flex flex-col gap-4 pt-2">
        <legend className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/64">
          Payment
        </legend>
        <div className="flex flex-wrap gap-2">
          {providers.map((p) => (
            <Chip
              key={p.id}
              variant="boxed"
              active={provider === p.id}
              onClick={() => setProvider(p.id)}
            >
              {p.label}
            </Chip>
          ))}
        </div>
        {provider === "wire" && (
          <p className="text-body-sm leading-[1.7] text-ink/72">
            Your piece stays reserved in your name. The studio will be in touch
            with transfer details and will confirm once funds arrive.
          </p>
        )}
        {state.errors?.provider && (
          <p className="text-[13px] text-error">{state.errors.provider}</p>
        )}
      </fieldset>

      {state.errors?.form && (
        <p role="alert" className="border-l border-error pl-4 text-[13px] leading-[1.7] text-error">
          {state.errors.form}
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending
          ? "Working…"
          : provider === "wire"
            ? "Reserve this piece"
            : "Continue to payment"}
      </Button>

      <p className="text-body-sm text-ink/55">
        Insured, signature-required shipping is included. Nothing is charged
        until you confirm on the next screen.
      </p>
    </form>
  );
}
