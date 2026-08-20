import nodemailer from "nodemailer";
import { BRAND_NAME } from "@/lib/brand";
import { env } from "@/lib/env";
import { formatPrice } from "@/lib/format";

/**
 * Transactional email over SMTP.
 *
 * Deliberately plain: this studio's design language has no icons, no rounded
 * corners and no colour beyond ink on paper, and a garish HTML template would
 * read as a different company. Text-first, one hairline rule, nothing else.
 *
 * When SMTP is not configured (local development) mail is logged rather than
 * sent, so nothing silently disappears and nobody gets a real email by accident.
 */

/**
 * Escape anything that reaches an HTML email body.
 *
 * Customer-supplied values — name, email, enquiry message — are interpolated
 * into mail that lands in the studio owner's inbox. Without this, a buyer can
 * inject markup into that email: at best a broken layout, at worst a
 * convincing phishing link inside a message the owner trusts.
 */
export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

let transport: nodemailer.Transporter | null = null;

function getTransport() {
  if (!env.SMTP_URL) return null;
  transport ??= nodemailer.createTransport(env.SMTP_URL);
  return transport;
}

interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendMail(mail: Mail) {
  const t = getTransport();

  if (!t) {
    console.log(
      `[email] SMTP not configured — would send to ${mail.to}: ${mail.subject}`,
    );
    /**
     * Print the body in development so links that only exist in email — reset
     * tokens, order lookup URLs — are actually reachable without a mail server.
     *
     * Gated on NODE_ENV rather than on SMTP being absent: production may run
     * without SMTP configured, and reset links must never reach a server log
     * there. Anyone who can read the log could take over an account.
     */
    if (process.env.NODE_ENV !== "production") {
      console.log(`[email:dev-body]\n${mail.text}\n`);
    }
    return { sent: false as const };
  }

  await t.sendMail({ from: env.MAIL_FROM, ...mail });
  return { sent: true as const };
}

/** `title` is escaped; `body` is trusted markup built by the callers below. */
const shell = (title: string, body: string) => `
<div style="background:#F5F2EC;padding:40px 24px;font-family:Georgia,serif;color:#17140F">
  <div style="max-width:520px;margin:0 auto">
    <div style="font-size:15px;letter-spacing:0.28em;text-transform:uppercase;padding-left:0.28em">${escapeHtml(BRAND_NAME)}</div>
    <h1 style="font-size:28px;font-weight:400;line-height:1.2;margin:32px 0 0">${escapeHtml(title)}</h1>
    <div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:rgba(23,20,15,0.75)">${body}</div>
  </div>
</div>`;

const row = (k: string, v: string) => `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid rgba(23,20,15,0.12);font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(23,20,15,0.64)">${escapeHtml(k)}</td>
    <td style="padding:10px 0;border-bottom:1px solid rgba(23,20,15,0.12);text-align:right;font-size:14px">${escapeHtml(v)}</td>
  </tr>`;

export interface OrderMailData {
  number: string;
  name: string;
  email: string;
  lookupToken: string;
  totalCents: number;
  lines: { name: string; reference: string; size: string | null }[];
}

/** Sent once payment is confirmed — never on redirect back from the gateway. */
export async function sendOrderConfirmation(order: OrderMailData) {
  const url = `${env.SITE_URL}/order/${order.lookupToken}`;
  const pieces = order.lines
    .map((l) => row(l.reference, `${l.name}${l.size ? ` · US ${l.size}` : ""}`))
    .join("");

  return sendMail({
    to: order.email,
    subject: `Your order ${order.number}`,
    text: `Thank you — order ${order.number} is confirmed. Total ${formatPrice(order.totalCents)}. Track it at ${url}`,
    html: shell(
      "Thank you.",
      `<p>Your order is confirmed. Each piece is prepared and packed by hand in the studio, and ships fully insured and signature-required.</p>
       <table style="width:100%;border-collapse:collapse;margin:24px 0">
         ${pieces}
         ${row("Total", formatPrice(order.totalCents))}
       </table>
       <p><a href="${url}" style="color:#17140F">Track this order</a> — no account needed. Keep this link.</p>`,
    ),
  });
}

/**
 * Wire instructions. The order stays in `enquiry` until the studio confirms
 * funds by hand, and the piece stays reserved in the meantime.
 */
export async function sendWireInstructions(order: OrderMailData) {
  const url = `${env.SITE_URL}/order/${order.lookupToken}`;

  return sendMail({
    to: order.email,
    subject: `Reserved — order ${order.number}`,
    text: `Order ${order.number} is reserved for you. Total ${formatPrice(order.totalCents)}. The studio will be in touch with transfer details. ${url}`,
    html: shell(
      "Reserved for you.",
      `<p>Order <strong>${order.number}</strong> is held in your name. The studio will be in touch shortly with transfer details, and will confirm as soon as the funds arrive.</p>
       <table style="width:100%;border-collapse:collapse;margin:24px 0">
         ${row("Total", formatPrice(order.totalCents))}
       </table>
       <p><a href="${url}" style="color:#17140F">View this order</a></p>`,
    ),
  });
}

/**
 * Password reset link.
 *
 * Sent only when the address really has an account — but the form that triggers
 * it says the same thing either way, so silence here is not a signal.
 */
export async function sendPasswordReset(to: string, token: string) {
  const url = `${env.SITE_URL}/account/reset/${token}`;

  return sendMail({
    to,
    subject: "Reset your password",
    text: `Set a new password: ${url}\n\nThis link works once and expires in an hour. If you did not ask for it, ignore this message — nothing has changed.`,
    html: shell(
      "Set a new password.",
      `<p>Use the link below to choose a new password. It works once and expires in an hour.</p>
       <p style="margin:28px 0"><a href="${url}" style="color:#17140F">Set a new password</a></p>
       <p>If you did not ask for this, ignore this message — nothing has changed, and your current password still works.</p>`,
    ),
  });
}

/** Studio-side notification, so a sale is never missed. */
export async function sendStudioNotification(order: OrderMailData, kind: string) {
  return sendMail({
    to: env.MAIL_FROM,
    subject: `${kind} — ${order.number} — ${formatPrice(order.totalCents)}`,
    text: `${kind}: ${order.number} from ${order.name} <${order.email}>. ${order.lines.map((l) => l.name).join(", ")}`,
    html: shell(
      `${kind}: ${order.number}`,
      `<p>${escapeHtml(order.name)} &lt;${escapeHtml(order.email)}&gt;</p>
       <p>${order.lines.map((l) => escapeHtml(`${l.name} (${l.reference})`)).join("<br>")}</p>
       <p><strong>${formatPrice(order.totalCents)}</strong></p>`,
    ),
  });
}
