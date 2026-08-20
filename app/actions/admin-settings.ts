"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth";

const schema = z.object({
  studioName: z.string().trim().min(1),
  studioEmail: z.string().trim().email(),
  studioPhone: z.string().trim().optional(),
  studioAddress: z.string().trim().optional(),
  /**
   * The reservation window governs storefront hold behaviour. Bounded on
   * purpose: zero would make every add-to-bag lapse instantly, and a very long
   * window lets one browser lock the catalogue.
   */
  holdWindowMinutes: z.coerce.number().int().min(5).max(1440),
  taxRateBps: z.coerce.number().int().min(0).max(3000),
  insuredShipping: z.coerce.boolean(),
  acceptWireTransfer: z.coerce.boolean(),
  showPricesPublicly: z.coerce.boolean(),
  acceptCommissions: z.coerce.boolean(),

  /** Live chat. Hours are hours-of-day in the studio's own timezone. */
  chatEnabled: z.coerce.boolean(),
  chatHoursStart: z.coerce.number().int().min(0).max(23),
  chatHoursEnd: z.coerce.number().int().min(0).max(23),
  chatTimezone: z.string().trim().min(1),
  notifyOnVisitor: z.coerce.boolean(),
});

export type SettingsState = { saved?: boolean; error?: string };

export async function saveSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  await requirePermission("settings");

  const parsed = schema.safeParse({
    studioName: formData.get("studioName"),
    studioEmail: formData.get("studioEmail"),
    studioPhone: formData.get("studioPhone") || undefined,
    studioAddress: formData.get("studioAddress") || undefined,
    holdWindowMinutes: formData.get("holdWindowMinutes"),
    taxRateBps: formData.get("taxRateBps"),
    insuredShipping: formData.get("insuredShipping") === "on",
    acceptWireTransfer: formData.get("acceptWireTransfer") === "on",
    showPricesPublicly: formData.get("showPricesPublicly") === "on",
    acceptCommissions: formData.get("acceptCommissions") === "on",
    chatEnabled: formData.get("chatEnabled") === "on",
    chatHoursStart: formData.get("chatHoursStart"),
    chatHoursEnd: formData.get("chatHoursEnd"),
    chatTimezone: formData.get("chatTimezone"),
    notifyOnVisitor: formData.get("notifyOnVisitor") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check these values." };
  }

  const db = await getDb();
  await db
    .update(settings)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(settings.id, 1));

  // The studio identity feeds the storefront's JSON-LD, so a change here is an
  // SEO change and must reach the cached pages.
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");

  return { saved: true };
}
