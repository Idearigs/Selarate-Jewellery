import type { Metadata } from "next";
import { SetPasswordForm } from "@/components/storefront/reset-forms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Set a new password",
  // The URL is the credential. Never index it, never send it as a referrer.
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

/**
 * The token is only validated on submit, not on page load.
 *
 * Checking it here would let anyone with a guessed URL learn whether a token
 * is real, and would burn a legitimate token on a link-preview fetch — mail
 * clients and chat apps prefetch URLs routinely.
 */
export default async function SetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="page-x flex flex-col gap-10 py-16 xl:py-26">
      <div className="flex flex-col gap-4.5">
        <p className="font-mono text-label uppercase tracking-[0.22em] text-ink/64">
          Account
        </p>
        <h1 className="text-title-m xl:text-[52px] xl:leading-[1.06]">
          Choose a new password.
        </h1>
        <p className="max-w-[460px] text-body leading-[1.7] text-ink/70">
          This link works once. Setting a new password will sign you out
          everywhere else.
        </p>
      </div>

      <SetPasswordForm token={token} />
    </div>
  );
}
