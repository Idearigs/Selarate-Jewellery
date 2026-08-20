"use server";

import { z } from "zod";
import { getDb } from "@/lib/db";
import { enquiry } from "@/lib/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import { escapeHtml, sendMail } from "@/lib/email";
import { env } from "@/lib/env";

const schema = z.object({
  name: z.string().trim().min(2, "Please give a name"),
  email: z.string().trim().email("Please check this email address"),
  reason: z.enum(["visit", "piece", "commission", "repair"]),
  message: z.string().trim().min(10, "A sentence or two is plenty"),
  pieceSlug: z.string().trim().optional(),
  /** Honeypot. Real people never fill this in; bots fill everything. */
  website: z.string().max(0).optional(),
});

export type EnquiryState = {
  errors?: Partial<Record<"name" | "email" | "message" | "form", string>>;
  sent?: boolean;
};

export async function submitEnquiry(
  _prev: EnquiryState,
  formData: FormData,
): Promise<EnquiryState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    reason: formData.get("reason"),
    message: formData.get("message"),
    pieceSlug: formData.get("pieceSlug") || undefined,
    website: formData.get("website") || undefined,
  });

  if (!parsed.success) {
    // A filled honeypot gets the success state, not an error — telling a bot it
    // was detected only teaches it to try again differently.
    if (parsed.error.issues.some((i) => i.path[0] === "website")) {
      return { sent: true };
    }

    const errors: EnquiryState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<EnquiryState["errors"]>;
      errors[key] ??= issue.message;
    }
    return { errors };
  }

  // Keyed on IP: this form emails the studio owner directly, so it is worth
  // protecting from someone using it as a mail cannon.
  const ip = await getClientIp();
  const limit = await rateLimit(`enquiry:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 });

  if (!limit.ok) {
    return {
      errors: {
        form: "That is a lot of messages in a short time. Please write to the studio directly.",
      },
    };
  }

  const { name, email, reason, message, pieceSlug } = parsed.data;
  const db = await getDb();

  let pieceId: string | null = null;
  if (pieceSlug) {
    const row = await db.query.piece.findFirst({
      where: (t, { eq }) => eq(t.slug, pieceSlug),
      columns: { id: true },
    });
    pieceId = row?.id ?? null;
  }

  await db.insert(enquiry).values({ name, email, reason, message, pieceId });

  // The enquiry is already persisted, so it shows in the admin's "needs
  // attention" queue even if mail delivery fails.
  await sendMail({
    to: env.MAIL_FROM,
    subject: `Enquiry — ${reason} — ${name}`,
    text: `${name} <${email}>\nReason: ${reason}\n${pieceSlug ? `Piece: ${pieceSlug}\n` : ""}\n${message}`,
    // Every value here is unauthenticated visitor input landing in the studio
    // owner's inbox. Escape before it becomes markup — otherwise this form is a
    // way to put an arbitrary link into a message the owner trusts.
    html: `<p><strong>${escapeHtml(name)}</strong> &lt;${escapeHtml(email)}&gt;</p><p>Reason: ${escapeHtml(reason)}${pieceSlug ? ` · ${escapeHtml(pieceSlug)}` : ""}</p><p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`,
  });

  return { sent: true };
}
