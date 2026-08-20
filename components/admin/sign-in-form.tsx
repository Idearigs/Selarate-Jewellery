"use client";

import { useActionState } from "react";
import { signInAction, type SignInState } from "@/app/actions/admin-auth";

export function SignInForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(
    signInAction,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-6">
      <label className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/60">
          Email
        </span>
        <input
          type="email"
          name="email"
          autoComplete="username"
          required
          autoFocus
          className="border border-ink/20 bg-transparent px-3 py-2.5 text-[14px] outline-none focus:border-ink"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/60">
          Password
        </span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className="border border-ink/20 bg-transparent px-3 py-2.5 text-[14px] outline-none focus:border-ink"
        />
      </label>

      {state.error && (
        <p role="alert" className="text-[13px] text-error">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="border border-ink bg-ink px-[18px] py-3.5 text-[11px] uppercase tracking-[0.16em] text-paper hover:opacity-88 disabled:opacity-40"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
