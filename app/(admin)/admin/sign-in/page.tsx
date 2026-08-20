import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/admin/sign-in-form";
import { getSessionUser } from "@/lib/auth";
import { BRAND_NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio Admin",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Sign-in sits inside /admin but outside the admin shell — there is no sidebar
 * to show someone who is not signed in.
 */
export default async function SignInPage() {
  if (await getSessionUser()) redirect("/admin");

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-5">
      <div className="flex w-full max-w-[380px] flex-col gap-8">
        <div className="flex flex-col gap-2">
          <div className="font-display text-[15px] uppercase tracking-[0.26em] pl-[0.26em]">
            {BRAND_NAME}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/60">
            Studio Admin
          </div>
        </div>
        <SignInForm />
      </div>
    </div>
  );
}
