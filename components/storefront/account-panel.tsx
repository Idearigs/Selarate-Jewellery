"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  lookupOrderAction,
  registerAction,
  signInAction,
  type AccountState,
} from "@/app/actions/account";
import { cn } from "@/lib/cn";

/**
 * Sign in / Create account, with guest order lookup below a rule.
 *
 * The tabs swap the heading, blurb, field set and submit label — they are not
 * two separate pages. Guest lookup is deliberately given equal visual weight:
 * most buyers here check out once and never return, and the handoff calls this
 * out specifically.
 */
export function AccountPanel() {
  const [mode, setMode] = useState<"signin" | "register">("signin");
  // Set by the password-reset flow on success.
  const justReset = useSearchParams().get("reset") === "done";

  const [signInState, signIn, signingIn] = useActionState<AccountState, FormData>(
    signInAction,
    {},
  );
  const [registerState, register, registering] = useActionState<
    AccountState,
    FormData
  >(registerAction, {});
  const [lookupState, lookup, lookingUp] = useActionState<AccountState, FormData>(
    lookupOrderAction,
    {},
  );

  const isSignIn = mode === "signin";
  const state = isSignIn ? signInState : registerState;
  const pending = isSignIn ? signingIn : registering;

  const tab = (active: boolean) =>
    cn(
      "-mb-px border-b px-8 pb-3.5 text-[13px] uppercase tracking-[0.18em]",
      active ? "border-ink text-ink" : "border-transparent text-ink/55 hover:text-ink",
    );

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4.5">
        <p className="font-mono text-label uppercase tracking-[0.22em] text-ink/64">
          Account
        </p>
        <h1 className="text-title-m xl:text-[52px] xl:leading-[1.06]">
          {isSignIn ? "Welcome back." : "Create an account."}
        </h1>
        <p className="max-w-[460px] text-body leading-[1.7] text-ink/70">
          {isSignIn
            ? "Sign in to see your reservations, sizes and the care record for every piece you own."
            : "An account keeps your sizes and care history in one place. It is never required to buy."}
        </p>
      </div>

      {justReset && (
        <p className="border border-ink/25 p-5 text-body-sm leading-[1.7] text-ink/72">
          Your password has been changed, and any other sessions were signed
          out. Sign in with the new one.
        </p>
      )}

      <div
        role="tablist"
        aria-label="Account"
        className="flex border-b border-ink/20"
      >
        <button
          type="button"
          role="tab"
          aria-selected={isSignIn}
          onClick={() => setMode("signin")}
          className={tab(isSignIn)}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={!isSignIn}
          onClick={() => setMode("register")}
          className={tab(!isSignIn)}
        >
          Create account
        </button>
      </div>

      <form
        action={isSignIn ? signIn : register}
        key={mode}
        className="flex max-w-[520px] flex-col gap-6.5"
      >
        {!isSignIn && (
          <Field label="Name" name="name" autoComplete="name" required />
        )}
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={isSignIn ? "current-password" : "new-password"}
          required
          hint={isSignIn ? undefined : "At least 10 characters."}
        />

        {state.error && (
          <p role="alert" className="text-[13px] text-error">
            {state.error}
          </p>
        )}

        <div className="flex items-center justify-between gap-6">
          <Button type="submit" disabled={pending} className="flex-1">
            {pending ? "Working…" : isSignIn ? "Sign in" : "Create account"}
          </Button>
          {isSignIn && (
            <Link
              href="/account/reset"
              className="shrink-0 border-b border-ink/30 pb-1 text-[11px] uppercase tracking-[0.14em] text-ink/64 transition-colors hover:border-ink hover:text-ink"
            >
              Forgotten?
            </Link>
          )}
        </div>
      </form>

      {/* Guest order lookup — below a rule, as designed. */}
      <form
        action={lookup}
        className="flex max-w-[520px] flex-col gap-3.5 border-t border-ink/12 pt-6"
      >
        <p className="font-mono text-label uppercase tracking-[0.18em] text-ink/64">
          No account needed
        </p>
        <p className="text-[13px] text-ink/70">
          Track an order with its number and the email you used.
        </p>

        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <label className="flex flex-1 flex-col gap-2">
            <span className="sr-only">Order number</span>
            <input
              name="number"
              placeholder="Order no."
              required
              className="border-0 border-b border-ink/30 bg-transparent pb-3 text-[16px] outline-none focus:border-ink"
            />
          </label>
          <label className="flex flex-1 flex-col gap-2">
            <span className="sr-only">Email</span>
            <input
              name="email"
              type="email"
              placeholder="Email used"
              required
              className="border-0 border-b border-ink/30 bg-transparent pb-3 text-[16px] outline-none focus:border-ink"
            />
          </label>
          <button
            type="submit"
            disabled={lookingUp}
            className="shrink-0 border border-ink/35 px-[22px] py-3.5 text-[11px] uppercase tracking-[0.18em] hover:border-ink disabled:opacity-40"
          >
            {lookingUp ? "Looking…" : "Look up"}
          </button>
        </div>

        {lookupState.error && (
          <p role="alert" className="text-[13px] text-error">
            {lookupState.error}
          </p>
        )}
      </form>
    </div>
  );
}
