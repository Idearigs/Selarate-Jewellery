import { ChatWidget } from "@/components/storefront/chat-widget";
import { Footer } from "@/components/storefront/footer";
import { Header } from "@/components/storefront/header";
import { VisitorBeacon } from "@/components/storefront/visitor-beacon";
import { JsonLd, organizationJsonLd } from "@/lib/seo/jsonld";
import { getDb } from "@/lib/db";

/**
 * Deliberately free of `cookies()`, `headers()` and `searchParams`.
 *
 * Reading any of those here would opt EVERY page under this layout into dynamic
 * rendering — which would quietly undo the entire static-SEO strategy. The bag
 * count is visitor-specific, so <Header> fetches it client-side instead.
 *
 * A database read is fine: it resolves at build/revalidate time and leaves
 * pages prerendered.
 */
async function studioIdentity() {
  try {
    const db = await getDb();
    const row = await db.query.settings.findFirst({
      where: (t, { eq }) => eq(t.id, 1),
      columns: {
        studioName: true,
        studioEmail: true,
        studioPhone: true,
        studioAddress: true,
      },
    });
    return {
      name: row?.studioName,
      email: row?.studioEmail,
      phone: row?.studioPhone,
      address: row?.studioAddress,
    };
  } catch {
    // Structured data is worth having, but never worth a 500 on every page.
    return undefined;
  }
}

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const studio = await studioIdentity();

  return (
    <>
      <JsonLd data={organizationJsonLd(studio)} />

      {/* Keyboard users land here first; the nav is long and repeated on
          every page. Visually hidden until focused. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-5 focus:top-5 focus:z-50 focus:border focus:border-ink focus:bg-paper focus:px-5 focus:py-3 focus:text-nav focus:uppercase"
      >
        Skip to content
      </a>

      <Header />
      <main id="main">{children}</main>
      <Footer />

      {/* Client islands. Both fetch their own state, so neither costs this
          layout its static rendering. */}
      <VisitorBeacon />
      <ChatWidget />
    </>
  );
}
