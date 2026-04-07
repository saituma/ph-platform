import { deliverEmail, emailLayout, escapeHtml, textP, E } from "./base.mailer";

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
