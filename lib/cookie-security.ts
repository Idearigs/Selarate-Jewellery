import { headers } from "next/headers";
import { env } from "@/lib/env";

/**
 * Whether cookies on this request should carry the `Secure` attribute.
 *
 * Not `NODE_ENV === "production"`, which is what this used to be. A browser
 * silently DISCARDS a `Secure` cookie delivered over plain HTTP, so a
 * production build served over http — a LAN address during review, a staging
 * box without TLS — stored no session at all. Every request then looked like a
 * new visitor: a fresh cart each time, and the second add-to-bag colliding
 * with the hold the first one had just taken ("currently reserved").
 *
 * Chrome exempts localhost, so the failure only appeared on other devices,
 * which is the worst place to debug it.
 *
 * The judgement runs on the real protocol instead:
 *   • behind a proxy, `x-forwarded-proto` is authoritative (Caddy sets it)
 *   • without that header, fall back to the canonical origin
 *
 * The fallback matters: it must never DROP `Secure` on a genuinely public
 * HTTPS site because a header went missing, so an https SITE_URL keeps the
 * flag on regardless.
 */
export async function useSecureCookies(): Promise<boolean> {
  if (env.SITE_URL.startsWith("https://")) return true;

  const proto = (await headers()).get("x-forwarded-proto");
  if (proto) return proto.split(",")[0]!.trim() === "https";

  return false;
}
