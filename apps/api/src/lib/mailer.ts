import nodemailer from "nodemailer";
import { Resend } from "resend";

import { env } from "../config/env";

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
    // Without these, a bad or blocked SMTP connection can hang until the HTTP client times out.
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

/** Sends via Resend when `RESEND_API_KEY` is set; otherwise SMTP. Set `SMTP_FROM` for the sender (required for Resend-only). */
async function deliverEmail(input: { to: string; subject: string; html: string }) {
  const from = env.smtpFrom || env.smtpUser;
  if (!from) {
    throw new Error(
      "Set SMTP_FROM (e.g. PH Performance <onboarding@resend.dev>) or SMTP_USER for the sender address.",
    );
  }
  const resend = getResend();
  if (resend) {
    const { error } = await withTimeout(
      resend.emails.send({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
      }),
      25_000,
      "Resend API",
    );
    if (error) throw new Error("message" in error ? error.message : String(error));
    return;
  }
  const transporter = getMailer();
  await transporter.sendMail({ from, to: input.to, subject: input.subject, html: input.html });
}

/** Safe for HTML text nodes and attributes (excluding URLs). */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

const E = {
  /** Let the mail app use its own canvas (light/dark) — no full-bleed tint. */
  outerBg: "transparent",
  card: "#ffffff",
  accent: "#16a34a",
  text: "#18181b",
  muted: "#52525b",
  soft: "#71717a",
  rule: "#e4e4e7",
  font: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
};

/**
 * Full-width, table-based layout for consistent rendering in Gmail, Apple Mail, Outlook (mostly).
 */
function emailLayout(input: {
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

function textP(html: string, marginBottom = "20px"): string {
  return `<p style="margin:0 0 ${marginBottom};font-size:16px;line-height:1.65;color:${E.text};">${html}</p>`;
}

function labelRow(label: string, value: string): string {
  return `<tr>
  <td style="padding:10px 0;border-bottom:1px solid ${E.rule};font-size:13px;color:${E.muted};width:34%;vertical-align:top;font-family:${E.font};">${escapeHtml(label)}</td>
  <td style="padding:10px 0;border-bottom:1px solid ${E.rule};font-size:14px;color:${E.text};font-weight:500;vertical-align:top;font-family:${E.font};">${value}</td>
</tr>`;
}

export async function sendOtpEmail(input: { to: string; code: string }) {
  const subject = "Your PH Performance verification code";
  const code = escapeHtml(String(input.code));
  const bodyHtml = `
${textP(`Use the code below to continue. For your security, never share it with anyone.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr>
    <td align="center" style="background-color:#f4f4f5;border-radius:12px;border:1px solid ${E.rule};padding:28px 24px;">
      <p style="margin:0 0 10px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${E.muted};font-family:${E.font};">Verification code</p>
      <p style="margin:0;font-size:36px;font-weight:700;letter-spacing:0.35em;color:${E.accent};font-family:${E.font};line-height:1.2;">${code}</p>
    </td>
  </tr>
</table>
${textP(`<span style="color:${E.muted};font-size:14px;line-height:1.6;">This code expires in <strong style="color:${E.text};">10 minutes</strong>. If you did not request a code, you can safely ignore this email — your password will stay the same.</span>`, "0")}`;
  const html = emailLayout({
    preheader: `Your verification code is ${input.code}. Expires in 10 minutes.`,
    eyebrow: "Security",
    headline: "Verify it’s you",
    bodyHtml,
  });

  await deliverEmail({ to: input.to, subject, html });
}

/** Welcome email after admin provisions a guardian account (temporary password; user changes it in the app). */
export async function sendAdminWelcomeCredentialsEmail(input: {
  to: string;
  guardianName: string;
  temporaryPassword: string;
}) {
  const subject = "Your PH Performance account is ready";
  const name = escapeHtml(input.guardianName);
  const pwd = escapeHtml(input.temporaryPassword);
  const bodyHtml = `
${textP(`Hi ${name},`)}
${textP(`Your coach has created your PH Performance account. Sign in on the mobile app with the email address this message was sent to and the temporary password below. You will be asked to choose a new password when you first sign in.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr>
    <td align="center" style="background-color:#f4f4f5;border-radius:12px;border:1px solid ${E.rule};padding:28px 24px;">
      <p style="margin:0 0 10px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${E.muted};font-family:${E.font};">Temporary password</p>
      <p style="margin:0;font-size:18px;font-weight:600;word-break:break-all;color:${E.text};font-family:ui-monospace,Menlo,Consolas,monospace;line-height:1.4;">${pwd}</p>
    </td>
  </tr>
</table>
${textP(`<span style="color:${E.muted};font-size:14px;line-height:1.6;">For your security, do not share this email. If you did not expect this message, contact PH Performance support.</span>`, "0")}`;
  const html = emailLayout({
    preheader: "Your PH Performance login details",
    eyebrow: "Welcome",
    headline: "Sign in to the app",
    bodyHtml,
  });

  await deliverEmail({ to: input.to, subject, html });
}

export async function sendBookingConfirmationEmail(input: {
  to: string;
  name: string;
  serviceName: string;
  startsAt: Date;
  location?: string;
  meetingLink?: string;
}) {
  const subject = `Booking request received · ${input.serviceName}`;
  const whenNice = input.startsAt.toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const whenIso = escapeHtml(input.startsAt.toISOString());
  const name = escapeHtml(input.name);
  const service = escapeHtml(input.serviceName);
  const loc = input.location ? escapeHtml(input.location) : "";
  const meet = input.meetingLink
    ? `<a href="${escapeAttr(input.meetingLink)}" style="color:${E.accent};font-weight:600;text-decoration:underline;">Join link</a>`
    : "";
  const rows = [
    labelRow("Service", service),
    labelRow("When", `${escapeHtml(whenNice)}<br/><span style="font-size:12px;color:${E.muted};font-weight:400;">${whenIso}</span>`),
    ...(input.location ? [labelRow("Location", loc)] : []),
    ...(input.meetingLink ? [labelRow("Meeting", meet)] : []),
  ].join("");
  const bodyHtml = `
${textP(`Hi ${name},`)}
${textP(`Thanks for your request — we’ve received it and will confirm your session as soon as possible. Here’s a summary:`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">${rows}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;">
  <tr>
    <td style="padding:16px 20px;font-size:14px;color:#166534;line-height:1.55;font-family:${E.font};">
      <strong style="display:block;margin-bottom:4px;">What happens next</strong>
      You’ll receive another email once your coach has reviewed and confirmed this booking.
    </td>
  </tr>
</table>`;
  const html = emailLayout({
    preheader: `We received your booking request for ${input.serviceName}.`,
    eyebrow: "Bookings",
    headline: "Request received",
    bodyHtml,
  });

  await deliverEmail({ to: input.to, subject, html });
}

export async function sendBookingApprovedEmail(input: {
  to: string;
  name: string;
  serviceName: string;
  startsAt: Date;
  location?: string;
  meetingLink?: string;
}) {
  const subject = `Confirmed · ${input.serviceName}`;
  const whenNice = input.startsAt.toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const whenIso = escapeHtml(input.startsAt.toISOString());
  const name = escapeHtml(input.name);
  const service = escapeHtml(input.serviceName);
  const loc = input.location ? escapeHtml(input.location) : "";
  const meet = input.meetingLink
    ? `<a href="${escapeAttr(input.meetingLink)}" style="color:${E.accent};font-weight:600;text-decoration:underline;">Open meeting link</a>`
    : "";
  const rows = [
    labelRow("Service", service),
    labelRow("When", `${escapeHtml(whenNice)}<br/><span style="font-size:12px;color:${E.muted};font-weight:400;">${whenIso}</span>`),
    ...(input.location ? [labelRow("Location", loc)] : []),
    ...(input.meetingLink ? [labelRow("Meeting", meet)] : []),
  ].join("");
  const bodyHtml = `
${textP(`Hi ${name},`)}
${textP(`Great news — your session is <strong>confirmed</strong>. Add it to your calendar and we’ll see you then.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">${rows}</table>
${textP(`Thanks for training with PH Performance.`, "0")}`;
  const html = emailLayout({
    preheader: `Your ${input.serviceName} session is confirmed for ${whenNice}.`,
    eyebrow: "Bookings",
    headline: "You’re on the calendar",
    bodyHtml,
  });

  await deliverEmail({ to: input.to, subject, html });
}

export async function sendBookingDeclinedEmail(input: {
  to: string;
  name: string;
  serviceName: string;
  startsAt: Date;
  location?: string;
  meetingLink?: string;
}) {
  const subject = `Update on your booking · ${input.serviceName}`;
  const whenNice = input.startsAt.toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const whenIso = escapeHtml(input.startsAt.toISOString());
  const name = escapeHtml(input.name);
  const service = escapeHtml(input.serviceName);
  const loc = input.location ? escapeHtml(input.location) : "";
  const rows = [
    labelRow("Service", service),
    labelRow("Requested time", `${escapeHtml(whenNice)}<br/><span style="font-size:12px;color:${E.muted};font-weight:400;">${whenIso}</span>`),
    ...(input.location ? [labelRow("Location", loc)] : []),
  ].join("");
  const bodyHtml = `
${textP(`Hi ${name},`)}
${textP(`We weren’t able to confirm the session below. That can happen when a slot fills up or the schedule changes — nothing wrong on your side.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">${rows}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fffbeb;border-radius:12px;border:1px solid #fde68a;">
  <tr>
    <td style="padding:16px 20px;font-size:14px;color:#92400e;line-height:1.55;font-family:${E.font};">
      <strong style="display:block;margin-bottom:4px;">What you can do</strong>
      Pick another time in the app — we’ll do our best to get you scheduled.
    </td>
  </tr>
</table>`;
  const html = emailLayout({
    preheader: `Your booking request for ${input.serviceName} could not be confirmed.`,
    eyebrow: "Bookings",
    headline: "Session not confirmed",
    bodyHtml,
  });

  await deliverEmail({ to: input.to, subject, html });
}

export async function sendReferralAssignedEmail(input: {
  to: string;
  name: string;
  referralType: string;
  providerName?: string | null;
  organizationName?: string | null;
  targetLabel?: string | null;
  referralLink: string;
  discountPercent?: number | null;
  notes?: string | null;
}) {
  const subject = `${input.referralType} referral from PH Performance`;
  const name = escapeHtml(input.name);
  const referralType = escapeHtml(input.referralType);
  const providerName = input.providerName ? escapeHtml(input.providerName) : "";
  const organizationName = input.organizationName ? escapeHtml(input.organizationName) : "";
  const targetLabel = input.targetLabel ? escapeHtml(input.targetLabel) : "";
  const notes = input.notes ? escapeHtml(input.notes) : "";
  const referralLink = `<a href="${escapeAttr(input.referralLink)}" style="color:${E.accent};font-weight:600;text-decoration:underline;">Open referral link</a>`;
  const rows = [
    labelRow("Referral type", referralType),
    ...(providerName ? [labelRow("Provider", providerName)] : []),
    ...(organizationName ? [labelRow("Organisation", organizationName)] : []),
    ...(targetLabel ? [labelRow("Audience", targetLabel)] : []),
    ...(typeof input.discountPercent === "number" ? [labelRow("Discount", `${input.discountPercent}%`)] : []),
    labelRow("Link", referralLink),
  ].join("");
  const bodyHtml = `
${textP(`Hi ${name},`)}
${textP(`Your coach has shared a <strong>${referralType}</strong> referral with you.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">${rows}</table>
${notes ? textP(`Coach notes: <span style="color:${E.muted};">${notes}</span>`) : ""}
${textP(`Use the referral link above in the app or email whenever you’re ready.`, "0")}`;
  const html = emailLayout({
    preheader: `Your coach has shared a ${input.referralType} referral.`,
    eyebrow: "Referrals",
    headline: "A new referral is ready",
    bodyHtml,
  });

  await deliverEmail({ to: input.to, subject, html });
}

export async function sendBookingRequestAdminEmail(input: {
  to: string;
  bookingId: number;
  serviceName: string;
  startsAt: Date;
  guardianName?: string;
  guardianEmail?: string;
  athleteName?: string;
  location?: string;
  meetingLink?: string;
  approveUrl?: string;
  declineUrl?: string;
  adminUrl?: string;
}) {
  const subject = `Action required · Booking #${input.bookingId} · ${input.serviceName}`;
  const time = input.startsAt.toISOString();
  const humanTime = input.startsAt.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const service = escapeHtml(input.serviceName);
  const bid = escapeHtml(String(input.bookingId));
  const rows = [
    labelRow("Booking ID", `#${bid}`),
    labelRow("Service", service),
    labelRow(
      "Requested time",
      `${escapeHtml(humanTime)}<br/><span style="font-size:12px;color:${E.muted};font-weight:400;">${escapeHtml(time)}</span>`,
    ),
    ...(input.athleteName ? [labelRow("Athlete", escapeHtml(input.athleteName))] : []),
    ...(input.guardianName ? [labelRow("Guardian", escapeHtml(input.guardianName))] : []),
    ...(input.guardianEmail ? [labelRow("Email", escapeHtml(input.guardianEmail))] : []),
    ...(input.location ? [labelRow("Location", escapeHtml(input.location))] : []),
    ...(input.meetingLink
      ? [
          labelRow(
            "Meeting",
            `<a href="${escapeAttr(input.meetingLink)}" style="color:${E.accent};font-weight:600;text-decoration:underline;word-break:break-all;">Link</a>`,
          ),
        ]
      : []),
  ].join("");
  const btn = (href: string, label: string, bg: string) =>
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-block;margin:6px 8px 6px 0;vertical-align:middle;">
  <tr>
    <td style="border-radius:10px;background-color:${bg};">
      <a href="${escapeAttr(href)}" style="display:inline-block;padding:14px 22px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;font-family:${E.font};">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
  const secondary = "#27272a";
  const actions = [
    input.approveUrl ? btn(input.approveUrl, "Approve", E.accent) : "",
    input.declineUrl ? btn(input.declineUrl, "Decline", secondary) : "",
    input.adminUrl ? btn(input.adminUrl, "Open admin", secondary) : "",
  ].join("");
  const bodyHtml = `
${textP(`Someone requested a session — review the details below and choose an action.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">${rows}</table>
${actions ? `<div style="margin:18px 0 16px;text-align:left;">${actions}</div>` : ""}
${textP(`<span style="color:${E.muted};font-size:14px;">Buttons use secure links tied to this request. If you did not expect this email, please contact support.</span>`, "0")}`;
  const html = emailLayout({
    preheader: `New booking #${input.bookingId} · ${input.serviceName} · ${humanTime}`,
    eyebrow: "Admin",
    headline: "New booking request",
    bodyHtml,
  });

  await deliverEmail({ to: input.to, subject, html });
}

function formatProgramTierLabel(tier: string) {
  return tier.replace(/_/g, " ");
}

/** Safe: logs and returns if SMTP is not configured or send fails. */
export async function sendSubscriptionPendingUserEmail(input: {
  to: string;
  name: string;
  planName: string;
  planTier: string;
}) {
  try {
    const tierLabel = formatProgramTierLabel(input.planTier);
    const subject = `Payment received · ${input.planName}`;
    const name = escapeHtml(input.name);
    const plan = escapeHtml(input.planName);
    const tier = escapeHtml(tierLabel);
    const bodyHtml = `
${textP(`Hi ${name},`)}
${textP(`We’ve successfully received your payment for <strong>${plan}</strong> <span style="color:${E.muted};">(${tier})</span>.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;margin:0 0 24px;">
  <tr>
    <td style="padding:18px 22px;font-size:14px;color:#166534;line-height:1.6;font-family:${E.font};">
      <strong style="display:block;margin-bottom:6px;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;">What happens next</strong>
      A coach will review your request and activate your plan. You’ll receive another email as soon as your access is ready — usually quickly during business hours.
    </td>
  </tr>
</table>
${textP(`<span style="color:${E.muted};font-size:14px;">Didn’t make this purchase? Contact support immediately so we can secure your account.</span>`, "0")}`;
    const html = emailLayout({
      preheader: `Payment received for ${input.planName}. A coach will activate your plan soon.`,
      eyebrow: "Billing",
      headline: "Thank you — we’re on it",
      bodyHtml,
    });
    await deliverEmail({ to: input.to, subject, html });
  } catch (err) {
    console.warn("[Mailer] sendSubscriptionPendingUserEmail skipped:", err);
  }
}

export async function sendSubscriptionPendingStaffEmail(input: {
  to: string;
  payerName: string;
  payerEmail: string;
  athleteName?: string | null;
  planName: string;
  planTier: string;
  requestId: number;
  adminReviewUrl?: string;
}) {
  try {
    const tierLabel = formatProgramTierLabel(input.planTier);
    const subject = `Review · Plan request #${input.requestId} · ${input.planName}`;
    const rid = escapeHtml(String(input.requestId));
    const plan = escapeHtml(input.planName);
    const tier = escapeHtml(tierLabel);
    const payer = escapeHtml(input.payerName);
    const email = escapeHtml(input.payerEmail);
    const rows = [
      labelRow("Request", `#${rid}`),
      labelRow("Plan", `${plan} (${tier})`),
      labelRow("Account", `${payer} · ${email}`),
      ...(input.athleteName ? [labelRow("Athlete", escapeHtml(input.athleteName))] : []),
    ].join("");
    const reviewBtn = input.adminReviewUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0;">
  <tr>
    <td style="border-radius:10px;background-color:${E.accent};">
      <a href="${escapeAttr(input.adminReviewUrl)}" style="display:inline-block;padding:14px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;font-family:${E.font};">Review in admin</a>
    </td>
  </tr>
</table>`
      : "";
    const bodyHtml = `
${textP(`A member completed checkout and is waiting for approval before their plan goes live.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">${rows}</table>
${reviewBtn}`;
    const html = emailLayout({
      preheader: `Paid plan request #${input.requestId} — ${input.planName} — ${input.payerEmail}`,
      eyebrow: "Admin",
      headline: "Approve this subscription",
      bodyHtml,
    });
    await deliverEmail({ to: input.to, subject, html });
  } catch (err) {
    console.warn("[Mailer] sendSubscriptionPendingStaffEmail skipped:", err);
  }
}

export async function sendPlanExpiringSoonEmail(input: {
  to: string;
  name: string;
  athleteName: string;
  expiresAt: Date;
}) {
  try {
    const when = input.expiresAt.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const subject = `Your plan ends ${when}`;
    const name = escapeHtml(input.name);
    const athlete = escapeHtml(input.athleteName);
    const whenEsc = escapeHtml(when);
    const bodyHtml = `
${textP(`Hi ${name},`)}
${textP(`The paid access period for <strong>${athlete}</strong> ends on <strong>${whenEsc}</strong>.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fffbeb;border-radius:12px;border:1px solid #fde68a;margin:0 0 24px;">
  <tr>
    <td style="padding:18px 22px;font-size:14px;color:#92400e;line-height:1.6;font-family:${E.font};">
      <strong style="display:block;margin-bottom:6px;">Stay uninterrupted</strong>
      Renew before this date to keep messaging, bookings, and full program content without a break.
    </td>
  </tr>
</table>
${textP(`<span style="color:${E.muted};font-size:14px;">Open the PH Performance app → <strong style="color:${E.text};">Plans</strong> to renew in a few taps.</span>`, "0")}`;
    const html = emailLayout({
      preheader: `Your plan for ${input.athleteName} ends on ${when}. Renew to keep full access.`,
      eyebrow: "Subscription",
      headline: "Renew before you lose access",
      bodyHtml,
    });
    await deliverEmail({ to: input.to, subject, html });
  } catch (err) {
    console.warn("[Mailer] sendPlanExpiringSoonEmail skipped:", err);
  }
}

export async function sendPlanExpiredEmail(input: { to: string; name: string; athleteName: string }) {
  try {
    const subject = "Your paid plan has ended";
    const name = escapeHtml(input.name);
    const athlete = escapeHtml(input.athleteName);
    const bodyHtml = `
${textP(`Hi ${name},`)}
${textP(`The paid plan period for <strong>${athlete}</strong> has ended, and we haven’t received a renewal payment yet.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fafafa;border-radius:12px;border:1px solid ${E.rule};margin:0 0 24px;">
  <tr>
    <td style="padding:18px 22px;font-size:14px;color:${E.text};line-height:1.65;font-family:${E.font};">
      <strong style="display:block;margin-bottom:6px;color:${E.muted};font-size:12px;letter-spacing:0.06em;text-transform:uppercase;">Your access now</strong>
      You can still preview programs. Messaging and session booking stay locked until an approved paid plan is active again.
    </td>
  </tr>
</table>
${textP(`Questions? Reply to this email or reach support from the app — we’re happy to help you get back on track.`, "0")}`;
    const html = emailLayout({
      preheader: `Paid access for ${input.athleteName} has ended. Renew anytime in Plans.`,
      eyebrow: "Subscription",
      headline: "Plan period ended",
      bodyHtml,
    });
    await deliverEmail({ to: input.to, subject, html });
  } catch (err) {
    console.warn("[Mailer] sendPlanExpiredEmail skipped:", err);
  }
}

export async function sendSubscriptionApprovedUserEmail(input: { to: string; name: string; planTier: string }) {
  try {
    const tierLabel = formatProgramTierLabel(input.planTier);
    const subject = `You’re in · ${tierLabel} plan active`;
    const name = escapeHtml(input.name);
    const tier = escapeHtml(tierLabel);
    const bodyHtml = `
${textP(`Hi ${name},`)}
${textP(`Your coach has approved your <strong>${tier}</strong> plan. You now have <strong>full access</strong> to training content, messaging, and booking — everything in one place.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;margin:0 0 8px;">
  <tr>
    <td style="padding:18px 22px;font-size:14px;color:#166534;line-height:1.6;font-family:${E.font};">
      Open the <strong>PH Performance</strong> app to pick up training, message your coach, and manage sessions.
    </td>
  </tr>
</table>`;
    const html = emailLayout({
      preheader: `Your ${tierLabel} plan is active. Full access is unlocked in the app.`,
      eyebrow: "Subscription",
      headline: "You’re all set",
      bodyHtml,
    });
    await deliverEmail({ to: input.to, subject, html });
  } catch (err) {
    console.warn("[Mailer] sendSubscriptionApprovedUserEmail skipped:", err);
  }
}
