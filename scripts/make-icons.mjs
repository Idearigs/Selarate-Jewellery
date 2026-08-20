import sharp from "sharp";
import fs from "node:fs";

/**
 * Generates the PWA icons.
 *
 * No logotype exists yet, so the mark is drawn from the palette only: a
 * hairline ring on ink. It uses shapes rather than text because sharp renders
 * SVG through librsvg, which resolves fonts from the system — Marcellus is
 * loaded by the browser, not installed on the box, so an <text> element would
 * silently come out in whatever serif the machine happened to have.
 *
 * Re-run with `npm run icons` if the palette changes.
 */

const INK = "#17140F";
const PAPER = "#F5F2EC";

const OUT = "public/icons";
fs.mkdirSync(OUT, { recursive: true });

/** `padded` leaves the 20% safe margin Android maskable icons crop into. */
function mark({ size, bg, fg, padded = false }) {
  const c = size / 2;
  const r = size * (padded ? 0.26 : 0.32);
  const stroke = Math.max(2, size * 0.035);

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
       <rect width="${size}" height="${size}" fill="${bg}"/>
       <circle cx="${c}" cy="${c}" r="${r}" fill="none"
               stroke="${fg}" stroke-width="${stroke}"/>
       <circle cx="${c}" cy="${c - r}" r="${stroke * 1.5}" fill="${fg}"/>
     </svg>`,
  );
}

const targets = [
  { file: "icon-192.png", size: 192, bg: INK, fg: PAPER },
  { file: "icon-512.png", size: 512, bg: INK, fg: PAPER },
  { file: "icon-maskable-512.png", size: 512, bg: INK, fg: PAPER, padded: true },
  { file: "apple-touch-icon.png", size: 180, bg: INK, fg: PAPER },
  // Android status-bar badge: rendered as a silhouette, so it must be
  // monochrome on transparent or it turns into a grey blob.
  { file: "badge-72.png", size: 72, bg: "#00000000", fg: "#FFFFFF" },
];

for (const t of targets) {
  await sharp(mark(t)).png().toFile(`${OUT}/${t.file}`);
  console.log(`${t.file.padEnd(26)} ${t.size}x${t.size}`);
}
