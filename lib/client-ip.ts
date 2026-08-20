import { headers } from "next/headers";

/**
 * The client IP, for rate limiting.
 *
 * `X-Forwarded-For` is a comma-separated chain that each proxy APPENDS to, so
 * the left-most entry is whatever the original client sent — which an attacker
 * controls completely. Taking `[0]` therefore lets anyone bypass a rate limit by
 * sending a different fake IP on every request.
 *
 * The right-most entry is the one added by our own reverse proxy (Caddy), so
 * that is the only value we can trust. If the deployment ever gains a second
 * proxy in front of Caddy, this needs to skip that many entries from the right.
 */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();

  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const chain = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const trusted = chain.at(-1);
    if (trusted) return trusted;
  }

  return headerList.get("x-real-ip")?.trim() || "unknown";
}
