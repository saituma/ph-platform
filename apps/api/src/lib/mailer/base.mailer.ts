import nodemailer from "nodemailer";
import { Resend } from "resend";
import { env } from "../../config/env";

export function getMailer() {
  if (!env.smtpUser || !env.smtpPass) {
    throw new Error("SMTP credentials not configured");
  }
  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });
}

let resendSingleton: Resend | null = null;

function getResend(): Resend | null {
  if (!env.resendApiKey) return null;
  if (!resendSingleton) resendSingleton = new Resend(env.resendApiKey);
  return resendSingleton;
}

/** True when `deliverEmail` can run: Resend API key, or SMTP auth, plus a usable From (SMTP_FROM or SMTP_USER). */
export function isMailDeliveryConfigured(): boolean {
  const from = String(env.smtpFrom || env.smtpUser || "").trim();
  if (!from) return false;
  if (String(env.resendApiKey || "").trim()) return true;
  if (String(env.smtpUser || "").trim() && String(env.smtpPass || "").trim()) return true;
  return false;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

export type EmailAttachment = {
  filename: string;
  content: string | Buffer;
  contentType?: string;
};

/** Sends via Resend when `RESEND_API_KEY` is set; otherwise SMTP. */
export async function deliverEmail(input: {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}) {
  const from = env.smtpFrom || env.smtpUser;
  if (!from) {
    throw new Error("Set SMTP_FROM (e.g. PH Performance <onboarding@resend.dev>) or SMTP_USER for the sender address.");
  }
  const resend = getResend();
  const attachments = input.attachments?.map((a) => ({
    filename: a.filename,
    content: a.content,
    contentType: a.contentType,
  }));
  if (resend) {
    const { error } = await withTimeout(
      resend.emails.send({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        ...(attachments?.length ? { attachments } : {}),
      }),
      25_000,
      "Resend API",
    );
    if (error) throw new Error("message" in error ? error.message : String(error));
    return;
  }
  const transporter = getMailer();
  await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    ...(attachments?.length
      ? {
          attachments: attachments.map((a) => ({
            filename: a.filename,
            content: a.content,
            contentType: a.contentType ?? "application/octet-stream",
          })),
        }
      : {}),
  });
}

/** Safe for HTML text nodes and attributes (excluding URLs). */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

export const E = {
  outerBg: "transparent",
  card: "#ffffff",
  accent: "#16a34a",
  text: "#18181b",
  muted: "#52525b",
  soft: "#71717a",
  rule: "#e4e4e7",
  font: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
};

export function emailLayout(input: {
  preheader?: string;
  eyebrow: string;
  headline: string;
  bodyHtml: string;
}): string {
  const pre = input.preheader ? escapeHtml(input.preheader) : "";
  const eyebrow = escapeHtml(input.eyebrow);
  const headline = escapeHtml(input.headline);
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${headline}</title>
</head>
<body style="margin:0;padding:0;background-color:${E.outerBg};">
  ${
    pre
      ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:transparent;opacity:0;">${pre}</div>`
      : ""
  }
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${E.outerBg};">
    <tr>
      <td align="center" style="padding:32px 16px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;border-collapse:separate;background-color:${E.card};border:1px solid ${E.rule};border-radius:16px;border-spacing:0;">
          <tr>
            <td style="background-color:${E.card};border-radius:16px 16px 0 0;padding:28px 36px 20px;border-bottom:1px solid ${E.rule};">
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${E.accent};font-family:${E.font};">${eyebrow}</p>
              <h1 style="margin:0;font-size:22px;font-weight:700;line-height:1.3;color:${E.text};font-family:${E.font};">${headline}</h1>
            </td>
          </tr>
          <tr>
            <td style="background-color:${E.card};padding:36px 36px 40px;border-radius:0 0 16px 16px;font-family:${E.font};">
              ${input.bodyHtml}
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
          <tr>
            <td style="padding:24px 8px 0;text-align:center;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:${E.soft};font-family:${E.font};">PH Performance</p>
              <p style="margin:0;font-size:11px;color:${E.muted};line-height:1.65;font-family:${E.font};">© ${year} · Professional coaching &amp; training</p>
              <p style="margin:14px 0 0;font-size:11px;color:${E.muted};line-height:1.65;font-family:${E.font};">This email was sent regarding your PH Performance account.<br/>If you did not expect it, you can ignore this message or contact your coach.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function textP(html: string, marginBottom = "20px"): string {
  return `<p style="margin:0 0 ${marginBottom};font-size:16px;line-height:1.65;color:${E.text};">${html}</p>`;
}

export function labelRow(label: string, value: string): string {
  return `<tr>
  <td style="padding:10px 0;border-bottom:1px solid ${E.rule};font-size:13px;color:${E.muted};width:34%;vertical-align:top;font-family:${E.font};">${escapeHtml(label)}</td>
  <td style="padding:10px 0;border-bottom:1px solid ${E.rule};font-size:14px;color:${E.text};font-weight:500;vertical-align:top;font-family:${E.font};">${value}</td>
</tr>`;
}
