"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * The phone-side half of installing the studio app.
 *
 * Three platforms, three different truths, and pretending otherwise is why
 * most "Add to home screen" prompts are useless:
 *
 *   Android / Chrome  fires `beforeinstallprompt`, so a real install button
 *                     can be shown and the browser's own sheet opened.
 *   iOS / Safari      has no programmatic install at all. The only honest
 *                     thing is to name the exact menu path.
 *   Already installed the page is running standalone; say so and stop.
 */

/** Chrome-only event; not in the DOM lib because it is not standardised. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "checking" | "installable" | "ios" | "installed" | "unsupported";

const label = "font-mono text-[10px] uppercase tracking-[0.18em]";

export function InstallPanel() {
  const [platform, setPlatform] = useState<Platform>("checking");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);

  useEffect(() => {
    /**
     * Register the worker on load, not on the push opt-in.
     *
     * `beforeinstallprompt` only fires once a service worker is already
     * registered, so deferring registration until someone enables
     * notifications means the Install button never appears — and the one
     * thing this page exists to offer is missing, silently.
     *
     * Registration needs no permission; only notifications do.
     */
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/admin" }).catch(() => {
        // Insecure origin, most likely. The panel reports that below.
      });
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;

    if (standalone) {
      setPlatform("installed");
      return;
    }

    const isIOS =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      // iPadOS 13+ reports as a Mac; the touch points give it away.
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (isIOS) {
      setPlatform("ios");
      return;
    }

    /* Chrome fires this only when the page actually qualifies — served over
       HTTPS, with a manifest and a service worker. So its arrival is the most
       reliable installability signal there is, and its absence usually means
       the origin is not secure. */
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setPlatform("installable");
    };

    window.addEventListener("beforeinstallprompt", onPrompt);

    const onInstalled = () => setPlatform("installed");
    window.addEventListener("appinstalled", onInstalled);

    /* If it has not fired shortly after load it is not going to. Falling back
       to "unsupported" is better than a spinner that never resolves. */
    const timer = setTimeout(() => {
      setPlatform((p) => (p === "checking" ? "unsupported" : p));
    }, 2500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(timer);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome: choice } = await deferred.userChoice;
    setOutcome(choice);
    // The event is single-use; a second prompt() throws.
    setDeferred(null);
    if (choice === "accepted") setPlatform("installed");
  }

  if (platform === "checking") {
    return <p className={cn(label, "text-ink/64")}>Checking this device…</p>;
  }

  if (platform === "installed") {
    return (
      <div className="flex flex-col gap-2">
        <p className={cn(label, "text-ink/64")}>Installed</p>
        <p className="text-[13px] leading-[1.6] text-ink/72">
          You are running the installed app. Turn on alerts below and you can
          close this.
        </p>
      </div>
    );
  }

  if (platform === "ios") {
    return (
      <div className="flex flex-col gap-3">
        <p className={cn(label, "text-ink/64")}>Add to your iPhone</p>
        <ol className="flex flex-col gap-2 text-[13px] leading-[1.6] text-ink/72">
          <li>1. Tap the Share button at the bottom of Safari.</li>
          <li>2. Scroll down and choose “Add to Home Screen”.</li>
          <li>3. Open the studio icon from your home screen.</li>
        </ol>
        <p className="border-l border-ink/25 pl-3.5 text-[12px] leading-[1.6] text-ink/72">
          Step 3 is not optional on iPhone. Notifications only work from the
          home-screen copy — they will never arrive in Safari itself.
        </p>
      </div>
    );
  }

  if (platform === "unsupported") {
    return (
      <div className="flex flex-col gap-2">
        <p className={cn(label, "text-ink/64")}>Not installable here</p>
        <p className="text-[13px] leading-[1.6] text-ink/72">
          This browser has not offered to install the app. That is almost always
          because the site is being served over plain HTTP — installing needs
          HTTPS, or localhost.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <p className={cn(label, "text-ink/64")}>Ready to install</p>
      <p className="text-[13px] leading-[1.6] text-ink/72">
        Adds the studio to your home screen and opens straight into live chat.
      </p>
      <button
        type="button"
        onClick={() => void install()}
        className={cn(
          "border border-ink bg-ink px-5 py-3 text-paper hover:opacity-88",
          label,
        )}
      >
        Install this app
      </button>
      {outcome === "dismissed" && (
        <p className="text-[12px] text-ink/64">
          Dismissed. Reload the page to be asked again.
        </p>
      )}
    </div>
  );
}
