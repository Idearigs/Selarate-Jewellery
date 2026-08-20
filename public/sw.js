/*
 * Service worker for the studio admin PWA.
 *
 * Deliberately not a caching layer. The admin shows live inventory, live
 * orders and live conversations — a stale cached response here is worse than
 * an error, because it looks correct. This worker exists for two jobs only:
 * receive push, and route the tap.
 */

self.addEventListener("install", () => {
  // Take over immediately rather than waiting for every tab to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/*
 * Network-only. This exists for two reasons and caches nothing.
 *
 * 1. Chrome will not fire `beforeinstallprompt` — and so will not offer to
 *    install the app at all — unless the service worker has a fetch handler.
 *    Without this listener the Install button simply never appears, with no
 *    error anywhere to explain why.
 *
 * 2. It turns a dropped connection into a readable page instead of the
 *    browser's dinosaur, which matters when the app has been opened from a
 *    notification about a waiting customer.
 *
 * Only navigations are intercepted. Letting API and asset requests fall
 * through untouched keeps live chat, SSE and order data strictly first-hand.
 */
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(
          `<!doctype html><meta charset="utf-8">
           <meta name="viewport" content="width=device-width,initial-scale=1">
           <title>Offline</title>
           <body style="margin:0;background:#F5F2EC;color:#17140F;
                        font-family:Georgia,serif;display:flex;height:100vh;
                        align-items:center;justify-content:center;text-align:center">
             <div style="max-width:22rem;padding:2rem">
               <p style="font-family:monospace;font-size:.7rem;letter-spacing:.18em;
                         text-transform:uppercase;opacity:.64">Studio</p>
               <h1 style="font-weight:400;font-size:1.6rem;margin:1rem 0">No connection.</h1>
               <p style="font-family:system-ui,sans-serif;font-size:.9rem;line-height:1.6;opacity:.72">
                 Messages sent to you are safe on the server. Reopen this once
                 you are back online.
               </p>
             </div>
           </body>`,
          { headers: { "Content-Type": "text/html; charset=utf-8" } },
        ),
    ),
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Studio", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Studio";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      // `tag` collapses: a second notification with the same tag replaces the
      // first instead of stacking, so a talkative visitor stays one entry.
      tag: payload.tag || "studio",
      renotify: Boolean(payload.tag) && !payload.silent,
      silent: Boolean(payload.silent),
      data: { url: payload.url || "/admin/chat" },
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/admin/chat";

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      /* Focus an admin window that is already open rather than piling up a new
         one per notification — the owner taps a lot of these. */
      for (const client of all) {
        if (client.url.includes("/admin")) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target);
          return;
        }
      }

      await self.clients.openWindow(target);
    })(),
  );
});
