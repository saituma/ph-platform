import { createEmailIntent } from "../../services/outbox.service";
import { emailLayout, escapeHtml, textP, codeCard, primaryButton, E } from "./base.mailer";

export async function sendOtpEmail(input: { to: string; code: string }) {
  const subject = "Your PH Performance verification code";
  const code = escapeHtml(String(input.code));
  const bodyHtml = `
${textP("Use the code below to continue. For your security, never share it with anyone.")}
${codeCard("Verification code", String(input.code))}
${textP(`<span style="color:${E.muted};font-size:14px;line-height:1.6;">This code expires in <strong style="color:${E.text};">10 minutes</strong>. If you did not request a code, you can safely ignore this email — your password will stay the same.</span>`, "0")}`;
  const html = emailLayout({
    preheader: `Your verification code is ${code}. Expires in 10 minutes.`,
    eyebrow: "Security",
    headline: "Verify it's you",
    bodyHtml,
  });

  await createEmailIntent({ to: input.to, subject, html });
}

// ─── Render helpers (pure — no side effects, exported for test scripts) ──────

export function renderAdminWelcomeCredentialsEmail(input: {
  guardianName: string;
  temporaryPassword: string;
  childLoginEmail?: string;
  childName?: string;
  promoCode?: { code: string; discountPercent: number };
}): { subject: string; html: string } {
  const subject = "Your PH Performance account is ready";
  const name = escapeHtml(input.guardianName);

  const childSection = input.childLoginEmail
    ? `${textP(
        `${input.childName ? `<strong style="color:${E.accent};">${escapeHtml(input.childName)}</strong> has` : "Your athlete has"} their own login. Sign in on the app with the email below and the same password as this account.`,
      )}
${codeCard("Athlete login email", input.childLoginEmail)}`
    : "";

  const promoSection = input.promoCode
    ? `
${textP(`As a special thank-you, your coach has included a <strong style="color:${E.accent};">${input.promoCode.discountPercent}% launch discount</strong>. Enter the code below when you choose your plan at checkout — it can only be used once.`)}
${codeCard("Your discount code", input.promoCode.code)}
${textP(`<span style="color:${E.muted};font-size:14px;">Apply at checkout when you choose a plan — one-time use.</span>`, "8px")}`
    : "";

  const bodyHtml = `
${textP(`Hi ${name},`)}
${textP("Your coach has created your PH Performance account. Sign in on the mobile app with the email address this message was sent to and the temporary password below. You will be asked to choose a new password when you first sign in.")}
${codeCard("Temporary password", input.temporaryPassword, { mono: true })}
${childSection}
${promoSection}
${textP(`<span style="color:${E.muted};font-size:14px;line-height:1.6;">For your security, do not share this email. If you did not expect this message, contact PH Performance support.</span>`, "0")}`;

  const html = emailLayout({
    preheader: "Your PH Performance login details",
    eyebrow: "Welcome",
    headline: "Sign in to the app",
    bodyHtml,
  });

  return { subject, html };
}

export async function sendAdminWelcomeCredentialsEmail(input: {
  to: string;
  guardianName: string;
  temporaryPassword: string;
  childLoginEmail?: string;
  childName?: string;
  promoCode?: { code: string; discountPercent: number };
}) {
  const { subject, html } = renderAdminWelcomeCredentialsEmail(input);
  await createEmailIntent({ to: input.to, subject, html });
}

export async function sendDeletionRequestEmail(input: { to: string }) {
  const subject = "Account deletion request received — PH Performance";
  const portalUrl = "https://phperformance.uk/login";
  const bodyHtml = `
${textP("We received a request to delete the PH Performance account associated with this email address.")}
${textP(`To complete the deletion, sign in to your portal and go to <strong>Settings → Privacy &amp; Security → Delete Account</strong>. Your account and all associated data will be permanently removed.`)}
${primaryButton(portalUrl, "Sign in to delete account")}
${textP(`<span style="color:${E.muted};font-size:13px;line-height:1.6;">If you did not request this, you can safely ignore this email — no action will be taken and your account will remain active.</span>`, "0")}`;
  const html = emailLayout({
    preheader: "We received a request to delete your PH Performance account.",
    eyebrow: "Account",
    headline: "Deletion request",
    bodyHtml,
  });

  await createEmailIntent({ to: input.to, subject, html });
}

export function renderPromoCodeEmail(input: { code: string; discountPercent: number; expiresAt: Date }): {
  subject: string;
  html: string;
} {
  const subject = `Your ${input.discountPercent}% PH Performance discount code`;
  const expiry = input.expiresAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const signUpUrl = "https://phperformance.uk/register";

  const bodyHtml = `
${textP("As a valued PH Performance member, we have a special launch discount just for you.")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 8px;">
  <tr>
    <td align="center" style="padding:16px 0 8px;">
      <p style="margin:0;font-size:80px;font-weight:800;line-height:1;letter-spacing:-0.02em;color:${E.accent};font-family:${E.font};">${input.discountPercent}%</p>
      <p style="margin:8px 0 0;font-size:17px;font-weight:500;color:${E.muted};font-family:${E.font};letter-spacing:0.01em;">off your plan</p>
    </td>
  </tr>
</table>
${codeCard(`Your ${input.discountPercent}% discount code`, input.code)}
${textP(`Enter this code at checkout when you select your plan. This is a one-time code — it can only be used once and <strong>expires on ${escapeHtml(expiry)}</strong>.`)}
${primaryButton(signUpUrl, "Redeem your code →")}
${textP(`<span style="color:${E.muted};font-size:14px;line-height:1.6;">If you have any questions, reply to this email or contact PH Performance support.</span>`, "0")}`;

  const html = emailLayout({
    preheader: `Your exclusive ${input.discountPercent}% discount code — expires ${expiry}`,
    eyebrow: "Exclusive offer",
    headline: `${input.discountPercent}% off — locked in`,
    bodyHtml,
  });

  return { subject, html };
}

export async function sendPromoCodeEmail(input: {
  to: string;
  code: string;
  discountPercent: number;
  expiresAt: Date;
}) {
  const { subject, html } = renderPromoCodeEmail(input);
  await createEmailIntent({ to: input.to, subject, html });
}

// ─── Child credentials email (sent to the guardian after Add Child checkout) ──

export function renderChildCredentialsEmail(input: {
  guardianName: string;
  childName: string;
  childEmail: string;
  tempPassword?: string;
}): { subject: string; html: string } {
  const subject = `${input.childName}'s PH Performance login is ready`;
  const guardian = escapeHtml(input.guardianName);
  const child = escapeHtml(input.childName);

  const passwordSection = input.tempPassword
    ? `${codeCard("Temporary password", input.tempPassword, { mono: true })}
${textP("We recommend changing the password after the first sign-in.")}`
    : textP(
        `The password for this login is <strong style="color:${E.text};">the same as your own account password</strong>. Sign in with the email above and the password you already use.`,
      );

  const bodyHtml = `
${textP(`Hi ${guardian},`)}
${textP(`<strong style="color:${E.accent};">${child}</strong> has been registered as an athlete on PH Performance. Use the credentials below to sign in on the mobile app.`)}
${codeCard("Login email", input.childEmail)}
${passwordSection}
${primaryButton("https://phperformance.uk/download", "Download the app")}
${textP(`<span style="color:${E.muted};font-size:14px;line-height:1.6;">For security, do not share this email. If you did not request this, contact PH Performance support.</span>`, "0")}`;

  const html = emailLayout({
    preheader: `${child}'s PH Performance login details`,
    eyebrow: "New athlete",
    headline: `${child} is all set`,
    bodyHtml,
  });

  return { subject, html };
}

export async function sendChildCredentialsEmail(input: {
  to: string;
  guardianName: string;
  childName: string;
  childEmail: string;
  tempPassword?: string;
}) {
  const { subject, html } = renderChildCredentialsEmail(input);
  await createEmailIntent({ to: input.to, subject, html });
}

export async function sendAdminPasswordResetEmail(input: {
  to: string;
  displayName: string;
  temporaryPassword: string;
}) {
  const subject = "Your PH Performance password was reset";
  const name = escapeHtml(input.displayName);
  const bodyHtml = `
${textP(`Hi ${name},`)}
${textP("Your coach has reset your PH Performance password. Sign in on the mobile app with the email address this message was sent to and the temporary password below. You will be asked to choose a new password after you sign in.")}
${codeCard("Temporary password", input.temporaryPassword, { mono: true })}
${textP(`<span style="color:${E.muted};font-size:14px;line-height:1.6;">If you did not expect this change, contact PH Performance support.</span>`, "0")}`;

  const html = emailLayout({
    preheader: "Your temporary password is inside.",
    eyebrow: "Security",
    headline: "Password reset",
    bodyHtml,
  });

  await createEmailIntent({ to: input.to, subject, html });
}
