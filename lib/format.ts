/** Money is stored and passed around as integer cents. Never floats. */
export function formatPrice(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    // The design shows "$14,800", not "$14,800.00" — whole dollars unless the
    // amount actually has cents.
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** "Four pieces — each unique" style counts. */
export function pieceCount(n: number) {
  return `${n} ${n === 1 ? "piece" : "pieces"} available`;
}

/**
 * Minutes remaining on a hold, floored, never negative. Display only — the
 * server is authoritative on whether the hold is actually still alive.
 */
export function minutesRemaining(expiresAt: Date | string, now = new Date()) {
  const end = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return Math.max(0, Math.floor((end.getTime() - now.getTime()) / 60_000));
}
