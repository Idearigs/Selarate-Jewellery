"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { destroySession, signIn } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export type SignInState = { error?: string };

export async function signInAction(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  /**
   * Tighter than the customer limit, and deliberately so: these accounts read
   * every order, address and payment record in the business. Keyed on IP and
   * on the account being targeted, so spraying one password across many
   * addresses is throttled as well as brute-forcing one address.
   */
  const ip = await getClientIp();
  const target = String(formData.get("email") ?? "").trim().toLowerCase();

  for (const key of [`admin-signin:ip:${ip}`, `admin-signin:acct:${target}`]) {
    const limit = await rateLimit(key, { limit: 5, windowMs: 15 * 60 * 1000 });
    if (!limit.ok) {
      return { error: "Too many attempts. Please wait a few minutes." };
    }
  }

  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  // One message for every failure mode. Distinguishing "no such user" from
  // "wrong password" tells an attacker which addresses are worth attacking.
  if (!parsed.success) return { error: "Check your email and password." };

  const result = await signIn(parsed.data.email, parsed.data.password);
  if (!result.ok) return { error: "Check your email and password." };

  redirect("/admin");
}

export async function signOutAction() {
  await destroySession();
  redirect("/admin/sign-in");
}
