import type { Metadata } from "next";
import { RequestResetForm } from "@/components/storefront/reset-forms";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};

export default function RequestResetPage() {
  return (
    <div className="page-x flex flex-col gap-10 py-16 xl:py-26">
      <div className="flex flex-col gap-4.5">
        <p className="font-mono text-label uppercase tracking-[0.22em] text-ink/64">
          Account
        </p>
        <h1 className="text-title-m xl:text-[52px] xl:leading-[1.06]">
          Reset your password.
        </h1>
        <p className="max-w-[460px] text-body leading-[1.7] text-ink/70">
          Give the email you used, and we will send a link to set a new one.
        </p>
      </div>

      <RequestResetForm />
    </div>
  );
}
