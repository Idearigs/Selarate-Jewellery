"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  requestResetAction,
  resetPasswordAction,
  type ResetRequestState,
  type ResetState,
} from "@/app/actions/account";

/** Step one — ask for a link. */
export function RequestResetForm() {
  const [state, action, pending] = useActionState<ResetRequestState, FormData>(
    requestResetAction,
    {},
  );

  if (state.sent) {
    return (
      <div className="flex max-w-[520px] flex-col gap-4 border border-ink/25 p-8">
        <h2 className="font-display text-[26px]">Check your email.</h2>
        <p className="text-body-sm leading-[1.7] text-ink/72">
          If that address has an account, a link is on its way. It works once
          and expires in an hour.
        </p>
        <Link
          href="/account"
          className="w-fit border-b border-ink/30 pb-1 text-[11px] uppercase tracking-[0.16em] text-ink/64 hover:border-ink hover:text-ink"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex max-w-[520px] flex-col gap-6.5">
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        autoFocus
        error={state.error}
        hint="We will send a link that works once."
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
      <Link
        href="/account"
        className="w-fit border-b border-ink/30 pb-1 text-[11px] uppercase tracking-[0.16em] text-ink/64 hover:border-ink hover:text-ink"
      >
        Back to sign in
      </Link>
    </form>
  );
}

/** Step two — set the new password. */
export function SetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(
    resetPasswordAction,
    {},
  );

  return (
    <form action={action} className="flex max-w-[520px] flex-col gap-6.5">
      <input type="hidden" name="token" value={token} />
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        autoFocus
        error={state.error}
        hint="At least 10 characters. Signing in elsewhere will be ended."
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Set new password"}
      </Button>
      <Link
        href="/account/reset"
        className="w-fit border-b border-ink/30 pb-1 text-[11px] uppercase tracking-[0.16em] text-ink/64 hover:border-ink hover:text-ink"
      >
        Request a new link
      </Link>
    </form>
  );
}
