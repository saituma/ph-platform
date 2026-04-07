import { deliverEmail, emailLayout, escapeHtml, escapeAttr, textP, labelRow, E } from "./base.mailer";

export async function sendReferralAssignedEmail(input: {
  to: string;
  name: string;
  referralType: string;
  providerName?: string | null;
  organizationName?: string | null;
  imageUrl?: string | null;
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
  const imageUrl = input.imageUrl ? escapeAttr(input.imageUrl) : "";
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
${imageUrl ? `<div style="margin:0 0 24px;"><img src="${imageUrl}" alt="${referralType}" style="display:block;max-width:100%;border-radius:12px;border:1px solid ${E.rule};" /></div>` : ""}
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
