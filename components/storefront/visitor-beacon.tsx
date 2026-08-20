"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** Heartbeat cadence. Must stay under the server's LIVE_WINDOW_SECONDS (90). */
const HEARTBEAT_MS = 45_000;

/**
 * Tells the studio someone is here.
 *
 * Renders nothing. It exists as a client component so the storefront pages
 * stay statically prerendered — doing this on the server would mean reading a
 * cookie during render, which turns the whole route dynamic.
 *
 * Two signals: a ping on every navigation (so the admin's presence list shows
 * what page they are on), and a heartbeat while the tab is visible. The
 * heartbeat stops when the tab is hidden, so a forgotten background tab does
 * not show as someone standing in the shop all afternoon.
 */
export function VisitorBeacon() {
  const pathname = usePathname();
  const referrer = useRef<string | null>(null);

  // Captured once: after the first client-side navigation document.referrer
  // still reports the original external source, which is the useful one.
  if (referrer.current === null && typeof document !== "undefined") {
    referrer.current = document.referrer || "";
  }

  useEffect(() => {
    let stopped = false;

    const ping = () => {
      if (stopped || document.visibilityState !== "visible") return;
      void fetch("/api/visitor/beacon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname, referrer: referrer.current }),
        // Presence is disposable; never let it hold up a navigation.
        keepalive: true,
      }).catch(() => {});
    };

    ping();
    const timer = setInterval(ping, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", ping);

    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", ping);
    };
  }, [pathname]);

  return null;
}
