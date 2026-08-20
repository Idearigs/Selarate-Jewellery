import { headers } from "next/headers";
import QRCode from "qrcode";
import { Topbar } from "@/components/admin/topbar";
import { InstallPanel } from "@/components/admin/install-panel";
import { PushToggle } from "@/components/admin/push-toggle";
import { requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * "Install on phone" — scan, install, enable alerts.
 *
 * Requires `orders`, not `settings`. Push registration is per-device and every
 * role that can answer chat needs it; gating this behind owner-only settings
 * would mean a bench member could never be notified of a message they are
 * expected to answer.
 */

interface Target {
  url: string;
  /** Why this URL will not work on a phone, if it will not. */
  problem: "localhost" | "insecure" | null;
}

/**
 * Build the URL the phone should open.
 *
 * Taken from the request's own Host header rather than SITE_URL, so whatever
 * address the owner is currently using — LAN address, tunnel, real domain — is
 * what the QR encodes. Pointing it at a configured SITE_URL would produce a
 * code that silently fails whenever the two differ, which in development is
 * always.
 */
async function resolveTarget(): Promise<Target> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const url = `${proto}://${host}/admin/chat`;

  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/i.test(host);
  if (isLocal) return { url, problem: "localhost" };

  // Service workers — and therefore install and push — need a secure context.
  if (proto !== "https") return { url, problem: "insecure" };

  return { url, problem: null };
}

const label = "font-mono text-[10px] uppercase tracking-[0.18em] text-ink/64";

export default async function InstallPage() {
  await requirePermission("orders");
  const target = await resolveTarget();

  /* Rendered as SVG rather than a raster data URI: it stays crisp at any size,
     and the palette is applied directly so the code is ink on paper like
     everything else. */
  const qr = await QRCode.toString(target.url, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#17140F", light: "#F5F2EC" },
  });

  return (
    <>
      <Topbar title="Install on phone" meta="Answer chat away from the bench" />

      <div className="flex-1 overflow-y-auto">
        <div className="grid max-w-[1000px] gap-10 p-7 lg:grid-cols-[280px_1fr]">
          {/* ------------------------------------------------------------ QR */}
          <div className="flex flex-col gap-4">
            <p className={label}>Scan with your phone</p>

            <div
              className="w-full max-w-[240px] border border-ink/20 p-3 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: qr }}
            />

            <p className="break-all font-mono text-[11px] leading-[1.5] text-ink/64">
              {target.url}
            </p>
          </div>

          {/* -------------------------------------------------------- guidance */}
          <div className="flex flex-col gap-7">
            {target.problem === "localhost" && (
              <div className="flex flex-col gap-2 border border-error/40 p-5">
                <p className={label}>This code will not work yet</p>
                <p className="text-[13px] leading-[1.6] text-ink/72">
                  You are viewing the admin on <strong>localhost</strong>, which
                  only means “this machine”. A phone scanning this code would
                  try to reach itself.
                </p>
                <p className="text-[13px] leading-[1.6] text-ink/72">
                  Open the admin at your computer’s network address instead —
                  the dev server prints it as <em>Network:</em> on startup — and
                  this code will update to match. For installing and for
                  notifications you need HTTPS as well; a tunnel is the quickest
                  way to get one in development.
                </p>
              </div>
            )}

            {target.problem === "insecure" && (
              <div className="flex flex-col gap-2 border border-ink/25 p-5">
                <p className={label}>Chat will work — install will not</p>
                <p className="text-[13px] leading-[1.6] text-ink/72">
                  This address is plain HTTP. Your phone can open it and answer
                  chat perfectly well, but browsers only allow an app to be
                  installed, and notifications to be delivered, over HTTPS.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 border border-ink/20 p-5">
              <InstallPanel />
            </div>

            <PushToggle />

            <div className="flex flex-col gap-2">
              <p className={label}>What you get</p>
              <ul className="flex flex-col gap-1.5 text-[13px] leading-[1.6] text-ink/72">
                <li>— Opens straight into live chat.</li>
                <li>— A notification when a visitor arrives or writes.</li>
                <li>— The rest of the admin, one tap away.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
