import type { Metadata } from "next";
import { IBM_Plex_Mono, Karla, Marcellus } from "next/font/google";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import { env } from "@/lib/env";
import "./globals.css";

/**
 * next/font downloads these at build time and serves them from our own origin,
 * which satisfies the handoff's "self-host for production" requirement: no
 * third-party request on the critical path and no font-swap layout shift.
 */
const marcellus = Marcellus({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-marcellus",
});

const karla = Karla({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
  variable: "--font-karla",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.SITE_URL),
  title: {
    default: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    template: `%s — ${BRAND_NAME}`,
  },
  description:
    "Hand-made fine jewelry from an independent studio. Each piece is made once, by hand, and sold directly.",
  openGraph: {
    type: "website",
    siteName: BRAND_NAME,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${marcellus.variable} ${karla.variable} ${plexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
