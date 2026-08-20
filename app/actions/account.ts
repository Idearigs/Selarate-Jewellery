"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  registerCustomer,
  requestPasswordReset,
  resetPassword,
  signInCustomer,
  signOutCustomer,
} from "@/lib/customer-auth";
import { sendPasswordReset } from "@/lib/email";
import { getDb } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

export type AccountState = { error?: string };

async function limitByIp(scope: string) {
  const ip = await getClientIp();
  return rateLimit(`${scope}:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 });
}

const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function signInAction(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  if (!(await limitByIp("signin")).ok) {
    return { error: "Too many attempts. Please wait a few minutes." };
  }

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  // One message for every failure — distinguishing "no such account" from
  // "wrong password" tells an attacker which addresses are worth pursuing.
  if (!parsed.success) return { error: "Check your email and password." };

  const result = await signInCustomer(parsed.data.email, parsed.data.password);
  if (!result.ok) return { error: "Check your email and password." };

  redirect("/account");
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Please give a name"),
  email: z.string().trim().email("Please check this email address"),
  password: z
    .string()
    .min(10, "Use at least 10 characters — this holds your order history"),
});

export async function registerAction(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  if (!(await limitByIp("register")).ok) {
    return { error: "Too many attempts. Please wait a few minutes." };
  }

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check these details." };
  }

  const result = await registerCustomer(
    parsed.data.email,
    parsed.data.name,
    parsed.data.password,
  );

  if (!result.ok) {
    return {
      error:
        result.reason === "exists"
          ? "There is already an account with this email. Try signing in."
          : "Could not create the account. Please try again.",
    };
  }

  redirect("/account");
}

export async function signOutAction() {
  await signOutCustomer();
  redirect("/account");
}

/* --------------------------------------------------------------------------
   Password reset
   -------------------------------------------------------------------------- */

export type ResetRequestState = { sent?: boolean; error?: string };

/**
 * Step one: ask for a link.
 *
 * Always reports success. Saying "no account with that email" would turn this
 * form into a way to check which addresses belong to customers of a business
 * whose customers own five-figure jewellery and have their home addresses on
 * file. The rate limit is per IP *and* per address so it cannot be used as a
 * mail cannon against one person either.
 */
export async function requestResetAction(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) {
    return { error: "Please check this email address." };
  }

  const ip = await getClientIp();
  for (const key of [`reset:ip:${ip}`, `reset:acct:${email}`]) {
    const limit = await rateLimit(key, { limit: 3, windowMs: 60 * 60 * 1000 });
    if (!limit.ok) {
      // Even the throttle message avoids confirming the address exists.
      return { sent: true };
    }
  }

  const issued = await requestPasswordReset(email);
  if (issued) await sendPasswordReset(issued.email, issued.token);

  return { sent: true };
}

export type ResetState = { error?: string };

const resetSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(10, "Use at least 10 characters — this holds your order history"),
});

/** Step two: consume the token and set the password. */
export async function resetPasswordAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const ip = await getClientIp();
  const limit = await rateLimit(`reset-submit:${ip}`, {
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.ok) return { error: "Too many attempts. Please wait a while." };

  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check this password." };
  }

  const result = await resetPassword(parsed.data.token, parsed.data.password);

  if (!result.ok) {
    // Expired and already-used are worth distinguishing: both are recoverable
    // by requesting a fresh link, and saying so saves a confused email.
    return {
      error:
        result.reason === "expired"
          ? "That link has expired. Please request a new one."
          : result.reason === "used"
            ? "That link has already been used. Please request a new one."
            : "That link is not valid. Please request a new one.",
    };
  }

  redirect("/account?reset=done");
}

/**
 * Guest order lookup. Deliberately prominent on the account page: most buyers
 * here check out once and never return, so requiring an account to see an
 * order's status would strand them.
 */
export async function lookupOrderAction(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  if (!(await limitByIp("lookup")).ok) {
    return { error: "Too many attempts. Please wait a few minutes." };
  }

  const number = String(formData.get("number") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!number || !email) {
    return { error: "Enter your order number and the email you used." };
  }

  /**
   * Order numbers are sequential (ORD-1001, ORD-1002…) and therefore trivially
   * enumerable, so the number ALONE must never unlock an order — it would hand
   * out customer names, addresses and purchase histories to anyone who can
   * count. The email is the second factor here.
   */
  const db = await getDb();
  const row = await db.query.order.findFirst({
    where: (t, { eq }) => eq(t.number, number.toUpperCase()),
    columns: { lookupToken: true },
    with: { customer: { columns: { email: true } } },
  });

  const matches = row?.customer?.email?.toLowerCase() === email;

  // One message whether the order is missing or the email is wrong — otherwise
  // this becomes an oracle for which order numbers exist.
  if (!row || !matches) {
    return {
      error:
        "We could not find that order. Check the details, or use the link in your confirmation email.",
    };
  }

  redirect(`/order/${row.lookupToken}`);
}
