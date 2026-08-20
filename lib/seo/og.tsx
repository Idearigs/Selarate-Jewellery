import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BRAND_NAME } from "@/lib/brand";

/**
 * Shared Open Graph image renderer.
 *
 * The wordmark has to be Marcellus — this is the brand's most-shared surface,
 * and a fallback serif reads as a different company. The font is committed to
 * `assets/fonts/` and embedded here rather than fetched at runtime, so
 * rendering never depends on a third party being up.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const PAPER = "#F5F2EC";
const INK = "#17140F";

let fontCache: Buffer | null = null;

async function marcellus() {
  fontCache ??= await readFile(
    join(process.cwd(), "assets/fonts/Marcellus-Regular.ttf"),
  );
  return fontCache;
}

export async function renderOgImage({
  eyebrow,
  title,
  meta,
}: {
  eyebrow?: string;
  title: string;
  meta?: string;
}) {
  const font = await marcellus();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPER,
          color: INK,
          padding: "72px 80px",
          // Radius 0 and no shadows here too — the OG card is brand surface.
          fontFamily: "Marcellus",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: "0.34em",
            textTransform: "uppercase",
            paddingLeft: "0.34em",
          }}
        >
          {BRAND_NAME}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {eyebrow && (
            <div
              style={{
                display: "flex",
                fontSize: 20,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "rgba(23,20,15,0.64)",
              }}
            >
              {eyebrow}
            </div>
          )}
          <div
            style={{
              display: "flex",
              fontSize: title.length > 40 ? 64 : 84,
              lineHeight: 1.05,
              letterSpacing: "-0.01em",
              maxWidth: 900,
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderTop: "1px solid rgba(23,20,15,0.12)",
            paddingTop: 28,
            fontSize: 22,
            color: "rgba(23,20,15,0.64)",
          }}
        >
          <span>{meta ?? "One-of-a-kind fine jewelry"}</span>
          <span style={{ letterSpacing: "0.16em", textTransform: "uppercase" }}>
            Made once
          </span>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [{ name: "Marcellus", data: font, style: "normal", weight: 400 }],
    },
  );
}
