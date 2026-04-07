import { deliverEmail, emailLayout, escapeHtml, escapeAttr, textP, labelRow, E } from "./base.mailer";

function formatProgramTierLabel(tier: string) {
  return tier.replace(/_/g, " ");
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
