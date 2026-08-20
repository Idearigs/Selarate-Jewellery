import { Topbar } from "@/components/admin/topbar";
import { SettingsForm } from "@/components/admin/settings-form";
import { BRAND_NAME } from "@/lib/brand";
import { getDb } from "@/lib/db";
import { requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  // Owner only — `can()` excludes settings for admin and limited roles.
  await requirePermission("settings");

  const db = await getDb();
  const row = await db.query.settings.findFirst({
    where: (t, { eq }) => eq(t.id, 1),
  });

  return (
    <>
      <Topbar title="Settings" meta="Studio, commerce and team" />
      <div className="flex-1 overflow-y-auto">
        <SettingsForm
          values={{
            studioName: row?.studioName ?? BRAND_NAME,
            studioEmail: row?.studioEmail ?? "",
            studioPhone: row?.studioPhone ?? "",
            studioAddress: row?.studioAddress ?? "",
            holdWindowMinutes: row?.holdWindowMinutes ?? 60,
            taxRateBps: row?.taxRateBps ?? 750,
            insuredShipping: row?.insuredShipping ?? true,
            acceptWireTransfer: row?.acceptWireTransfer ?? true,
            showPricesPublicly: row?.showPricesPublicly ?? true,
            acceptCommissions: row?.acceptCommissions ?? true,
            chatEnabled: row?.chatEnabled ?? true,
            chatHoursStart: row?.chatHoursStart ?? 10,
            chatHoursEnd: row?.chatHoursEnd ?? 18,
            chatTimezone: row?.chatTimezone ?? "America/Los_Angeles",
            notifyOnVisitor: row?.notifyOnVisitor ?? true,
          }}
        />
      </div>
    </>
  );
}
