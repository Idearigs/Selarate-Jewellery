import { NextResponse } from "next/server";
import { BRAND_NAME } from "@/lib/brand";

/**
 * PWA manifest for the studio admin.
 *
 * `start_url` is /admin/chat: the reason to install this is to answer visitors
 * away from the bench, so it opens on the conversation rather than making
 * someone navigate there while a buyer waits. `scope` stays /admin so the rest
 * of the admin is still one tap away inside the app.
 *
 * The storefront is deliberately not a PWA — buyers arrive from search and
 * should never be asked to install anything.
 *
 * Served from a route rather than a static file so the studio name comes from
 * one place and cannot drift from the wordmark.
 */
export function GET() {
  return NextResponse.json(
    {
      name: `${BRAND_NAME} — Studio Chat`,
      short_name: "Studio",
      description:
        "Answer visitors live, and run the studio. Sign-in required.",
      start_url: "/admin/chat",
      scope: "/admin",
      display: "standalone",
      orientation: "portrait",
      background_color: "#F5F2EC",
      theme_color: "#17140F",
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        {
          src: "/icons/icon-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
      shortcuts: [
        { name: "Live chat", url: "/admin/chat" },
        { name: "Orders", url: "/admin/orders" },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
