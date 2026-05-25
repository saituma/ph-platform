import { createEmailIntent } from "../../services/outbox.service";
import { emailLayout, escapeHtml, textP, E } from "./base.mailer";

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

  await createEmailIntent({ to: input.to, subject, html });
}

/** Welcome email after admin provisions a guardian account (temporary password; user changes it in the app). */
export async function sendAdminWelcomeCredentialsEmail(input: {
  to: string;
  guardianName: string;
  temporaryPassword: string;
  promoCode?: { code: string; discountPercent: number };
}) {
  const subject = "Your PH Performance account is ready";
  const name = escapeHtml(input.guardianName);
  const pwd = escapeHtml(input.temporaryPassword);

  const promoSection = input.promoCode
    ? `
${textP(`As a special thank-you, your coach has included a <strong>${input.promoCode.discountPercent}% launch discount</strong>. Enter the code below when you choose your plan at checkout — it can only be used once.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr>
    <td align="center" style="background-color:#f4f4f5;border-radius:12px;border:1px solid ${E.rule};padding:20px 24px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${E.muted};font-family:${E.font};">Your discount code</p>
      <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:0.12em;color:${E.accent};font-family:ui-monospace,Menlo,Consolas,monospace;line-height:1.3;">${escapeHtml(input.promoCode.code)}</p>
    </td>
  </tr>
</table>`
    : "";

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
${promoSection}
${textP(`<span style="color:${E.muted};font-size:14px;line-height:1.6;">For your security, do not share this email. If you did not expect this message, contact PH Performance support.</span>`, "0")}`;
  const html = emailLayout({
    preheader: "Your PH Performance login details",
    eyebrow: "Welcome",
    headline: "Sign in to the app",
    bodyHtml,
  });

  await createEmailIntent({ to: input.to, subject, html });
}

export async function sendDeletionRequestEmail(input: { to: string }) {
  const subject = "Account deletion request received — PH Performance";
  const portalUrl = "https://phperformance.uk/login";
  const bodyHtml = `
${textP("We received a request to delete the PH Performance account associated with this email address.")}
${textP(`To complete the deletion, sign in to your portal and go to <strong>Settings → Privacy &amp; Security → Delete Account</strong>. Your account and all associated data will be permanently removed.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr>
    <td align="center" style="padding:8px 0;">
      <a href="${portalUrl}" style="display:inline-block;background-color:${E.accent};color:#ffffff;font-family:${E.font};font-size:14px;font-weight:700;letter-spacing:0.04em;text-decoration:none;padding:14px 32px;border-radius:8px;">Sign in to delete account</a>
    </td>
  </tr>
</table>
${textP(`<span style="color:${E.muted};font-size:13px;line-height:1.6;">If you did not request this, you can safely ignore this email — no action will be taken and your account will remain active.</span>`, "0")}`;
  const html = emailLayout({
    preheader: "We received a request to delete your PH Performance account.",
    eyebrow: "Account",
    headline: "Deletion request",
    bodyHtml,
  });

  await createEmailIntent({ to: input.to, subject, html });
}

export async function sendPromoCodeEmail(input: { to: string; code: string; discountPercent: number; expiresAt: Date }) {
  const subject = `Your ${input.discountPercent}% PH Performance discount code`;
  const code = escapeHtml(input.code);
  const expiry = input.expiresAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const bodyHtml = `
${textP("As a valued PH Performance member, we have a special launch discount just for you.")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr>
    <td align="center" style="background-color:#f4f4f5;border-radius:12px;border:1px solid ${E.rule};padding:28px 24px;">
      <p style="margin:0 0 10px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${E.muted};font-family:${E.font};">Your ${input.discountPercent}% discount code</p>
      <p style="margin:0;font-size:28px;font-weight:700;letter-spacing:0.15em;color:${E.accent};font-family:ui-monospace,Menlo,Consolas,monospace;line-height:1.3;">${code}</p>
    </td>
  </tr>
</table>
${textP(`Enter this code at checkout when you select your plan. This is a one-time code — it can only be used once and <strong>expires on ${expiry}</strong>.`)}
${textP(`<span style="color:${E.muted};font-size:14px;line-height:1.6;">If you have any questions, reply to this email or contact PH Performance support.</span>`, "0")}`;
  const html = emailLayout({
    preheader: `Your exclusive ${input.discountPercent}% discount code — expires ${expiry}`,
    eyebrow: "Exclusive Offer",
    headline: `${input.discountPercent}% off your plan`,
    bodyHtml,
  });
  await createEmailIntent({ to: input.to, subject, html });
}

/** Password reset email triggered by an admin (temporary password; user changes it in the app). */
export async function sendAdminPasswordResetEmail(input: {
  to: string;
  displayName: string;
  temporaryPassword: string;
}) {
  const subject = "Your PH Performance password was reset";
  const name = escapeHtml(input.displayName);
  const pwd = escapeHtml(input.temporaryPassword);
  const bodyHtml = `
${textP(`Hi ${name},`)}
${textP(`Your coach has reset your PH Performance password. Sign in on the mobile app with the email address this message was sent to and the temporary password below. You will be asked to choose a new password after you sign in.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr>
    <td align="center" style="background-color:#f4f4f5;border-radius:12px;border:1px solid ${E.rule};padding:28px 24px;">
      <p style="margin:0 0 10px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${E.muted};font-family:${E.font};">Temporary password</p>
      <p style="margin:0;font-size:18px;font-weight:600;word-break:break-all;color:${E.text};font-family:ui-monospace,Menlo,Consolas,monospace;line-height:1.4;">${pwd}</p>
    </td>
  </tr>
</table>
${textP(`<span style="color:${E.muted};font-size:14px;line-height:1.6;">If you did not expect this change, contact PH Performance support.</span>`, "0")}`;

  const html = emailLayout({
    preheader: "Your temporary password is inside.",
    eyebrow: "Security",
    headline: "Password reset",
    bodyHtml,
  });

  await createEmailIntent({ to: input.to, subject, html });
}
