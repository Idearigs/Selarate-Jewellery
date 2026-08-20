"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Registers the service worker and turns push on for this device.
 *
 * Permission is requested from a click and never on load. Browsers hard-block
 * permission prompts that are not user-gestured, and a prompt on arrival is
 * the fastest way to get "Block" pressed permanently — after which there is no
 * way back except through browser settings.
 *
 * On iOS this only works once the page has been added to the Home Screen
 * (16.4+), so the component says exactly that rather than failing silently.
 */

type State =
  | "checking"
  | "unsupported"
  | "needs-install" // iOS Safari, not yet added to Home Screen
  | "not-configured" // no VAPID keys on the server
  | "off"
  | "on"
  | "denied";

const label = "font-mono text-[10px] uppercase tracking-[0.18em]";

/** VAPID keys travel as base64url; PushManager wants raw bytes. */
function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalised);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function PushToggle() {
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detect = useCallback(async () => {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // Safari's own flag; there is no standards-based equivalent on iOS.
      (window.navigator as { standalone?: boolean }).standalone === true;

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState(isIOS && !standalone ? "needs-install" : "unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    const res = await fetch("/api/admin/push/subscribe");
    const config = await res.json().catch(() => ({}));
    if (!config.configured) {
      setState("not-configured");
      return;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    const existing = await registration?.pushManager.getSubscription();
    setState(existing ? "on" : "off");
  }, []);

  useEffect(() => {
    void detect();
  }, [detect]);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/admin",
      });
      await navigator.serviceWorker.ready;

      const res = await fetch("/api/admin/push/subscribe");
      const { publicKey } = await res.json();
      if (!publicKey) throw new Error("Push is not configured on the server.");

      const subscription = await registration.pushManager.subscribe({
        // Required by every browser: silent push is not permitted.
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const saved = await fetch("/api/admin/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...subscription.toJSON(),
          label: navigator.userAgent.slice(0, 80),
        }),
      });
      if (!saved.ok) throw new Error("Could not register this device.");

      setState("on");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enable alerts.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/admin/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setState("off");
    } catch {
      setError("Could not turn alerts off.");
    } finally {
      setBusy(false);
    }
  }

  const note: Record<State, string> = {
    checking: "Checking…",
    unsupported: "This browser cannot receive push notifications.",
    "needs-install": "On iPhone, use Share → Add to Home Screen, then open it from there.",
    "not-configured": "Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to enable alerts.",
    off: "Get a notification when someone arrives or starts a chat.",
    on: "This device is receiving alerts.",
    denied: "Notifications are blocked for this site in your browser settings.",
  };

  return (
    <div className="flex flex-col gap-2.5 border border-ink/20 p-5">
      <p className={cn(label, "text-ink/64")}>Phone alerts</p>
      <p className="text-[13px] leading-[1.6] text-ink/72">{note[state]}</p>

      {error && (
        <p role="alert" className="text-[12px] text-error">
          {error}
        </p>
      )}

      {(state === "off" || state === "on") && (
        <button
          type="button"
          onClick={() => void (state === "on" ? disable() : enable())}
          disabled={busy}
          className={cn(
            "mt-1 self-start border px-4 py-2.5",
            label,
            state === "on"
              ? "border-ink/35 hover:border-ink"
              : "border-ink bg-ink text-paper hover:opacity-88",
            "disabled:opacity-40",
          )}
        >
          {busy ? "Working" : state === "on" ? "Turn off" : "Turn on"}
        </button>
      )}
    </div>
  );
}
