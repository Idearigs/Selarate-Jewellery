import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/admin/sidebar";
import { getSessionUser } from "@/lib/auth";
import { navCounts } from "@/lib/db/queries/admin";

/**
 * Admin shell: fixed 236px sidebar + fluid main. Main scrolls; the sidebar and
 * the 60px topbar do not.
 *
 * The handoff specified a desktop-only admin, and that was right while this was
 * a workbench tool. Live chat changed the requirement: the owner answers
 * visitors from their phone, so the rail collapses to a drawer below `lg` and
 * the shell reserves 52px for the phone header.
 */
export const metadata: Metadata = {
  title: "Studio Admin",
  robots: { index: false, follow: false, nocache: true },
  // Installable to a phone home screen; scoped to /admin so the storefront is
  // never offered as an app.
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Studio", statusBarStyle: "black" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#17140F",
  // The admin is a tool, not a document; pinch-zooming the chat list is not
  // useful and interacts badly with the fixed drawer.
  width: "device-width",
  initialScale: 1,
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  // Middleware already blocks anonymous access; this is the second lock, so a
  // middleware misconfiguration cannot expose customer records.
  if (!user) redirect("/admin/sign-in");

  const counts = await navCounts();

  return (
    <div className="flex h-screen overflow-hidden bg-paper text-ink">
      <Sidebar
        role={user.role}
        name={user.name ?? user.email}
        counts={counts}
      />
      {/* pt-[52px] clears the phone header the sidebar renders; from lg the
          rail is inline and the offset goes away. */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden pt-[52px] lg:pt-0">
        {children}
      </main>
    </div>
  );
}
