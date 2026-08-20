import type { Metadata } from "next";

/**
 * Everything under /admin, including sign-in.
 *
 * Deliberately holds no auth check: the guarded shell lives in
 * `(authed)/layout.tsx`, which sign-in sits outside of. Putting the redirect
 * here instead sends the sign-in page to itself, forever.
 */
export const metadata: Metadata = {
  title: "Studio Admin",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
