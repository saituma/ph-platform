import type { BillingReceiptEmailBlockInput } from "./billing-receipt-email";
import {
  billingReceiptEmailBlock,
  formatBillingRoleLabel,
  standaloneReceiptHtmlDocument,
} from "./billing-receipt-email";
import { deliverEmail, emailLayout, escapeHtml, escapeAttr, textP, labelRow, E } from "./base.mailer";
import { displayGreetingName } from "./greeting";
import { logger } from "../logger";

function formatProgramTierLabel(tier: string) {
  return tier.replace(/_/g, " ");
}

export async function sendSubscriptionPendingStaffEmail(input: {
  to: string;
  recipientName: string | null;
  payerName: string;
  payerEmail: string;
  payerRole?: string | null;
  subscriptionContext: "team" | "athlete";
  team?: { id: number; name: string; maxAthletes: number | null } | null;
  athlete?: { id: number; name: string | null } | null;
  planName: string;
  planTier: string;
  amount?: string | null;
  billingCycle?: "monthly" | "six_months" | "yearly" | null;
  paymentMode?: "subscription" | "payment" | null;
  requestId: number;
  adminReviewUrl?: string;
  receipt?: BillingReceiptEmailBlockInput | null;
}) {
  try {
    const tierLabel = formatProgramTierLabel(input.planTier);
    const subject = input.receipt
      ? `Review · Receipt ${input.receipt.receiptPublicId} · ${input.planName}`
      : `Review · Plan request #${input.requestId} · ${input.planName}`;
    const rid = escapeHtml(String(input.requestId));
    const plan = escapeHtml(input.planName);
    const tier = escapeHtml(tierLabel);
    const staffHi = escapeHtml(displayGreetingName(input.recipientName, input.to));
    const payerDisplay = escapeHtml(displayGreetingName(input.payerName, input.payerEmail));
    const payerEmail = escapeHtml(input.payerEmail);
    const roleLabel = escapeHtml(formatBillingRoleLabel(String(input.payerRole ?? "")));
    const amount = input.amount ? escapeHtml(input.amount) : null;
    const cycle = String(input.billingCycle ?? "")
      .trim()
      .toLowerCase();
    const cycleHuman =
      cycle === "monthly"
        ? "Monthly"
        : cycle === "six_months"
          ? "Every 6 months"
          : cycle === "yearly"
            ? "Yearly"
            : null;
    const modeLabel = input.paymentMode ? escapeHtml(input.paymentMode) : null;

    const detailRows: string[] = [
      labelRow("Request", `#${rid}`),
      labelRow("Plan", `${plan} (${tier})`),
      ...(amount
        ? [
            labelRow(
              "Amount",
              `${amount}${cycleHuman ? ` · ${escapeHtml(cycleHuman)}` : ""}${modeLabel ? ` · ${modeLabel}` : ""}`,
            ),
          ]
        : []),
      labelRow("Payer name", payerDisplay),
      labelRow("Payer email", payerEmail),
      labelRow("Account role", roleLabel),
    ];

    if (input.subscriptionContext === "team" && input.team) {
      detailRows.push(
        labelRow("Team name", escapeHtml(input.team.name)),
        labelRow("Team ID", escapeHtml(String(input.team.id))),
        labelRow("Athlete capacity", input.team.maxAthletes != null ? escapeHtml(String(input.team.maxAthletes)) : "—"),
      );
    } else if (input.subscriptionContext === "athlete" && input.athlete) {
      const athleteLabel = escapeHtml((input.athlete.name ?? "").trim() || `Athlete profile #${input.athlete.id}`);
      detailRows.push(
        labelRow("Athlete", athleteLabel),
        labelRow("Athlete profile ID", escapeHtml(String(input.athlete.id))),
      );
    }

    const rows = detailRows.join("");
    const receiptHtml = input.receipt ? billingReceiptEmailBlock(input.receipt) : "";

    const receiptFile = input.receipt ? `PH-Performance-Receipt-${input.receipt.receiptPublicId}.html` : null;
    const downloadSection = receiptFile
      ? textP(
          `<strong>Download receipt</strong> — We attached <strong>${escapeHtml(receiptFile)}</strong>. Open it in your browser; use <strong>Print</strong> → <strong>Save as PDF</strong> if you need a PDF copy.`,
        )
      : "";

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
${textP(`Hi ${staffHi} 👋`)}
${textP(`A member completed checkout and is waiting for approval before their plan goes live.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">${rows}</table>
${receiptHtml}
${downloadSection}
${reviewBtn}`;

    const html = emailLayout({
      preheader: `Paid plan request #${input.requestId} — ${input.planName} — ${input.payerEmail}`,
      eyebrow: "Admin",
      headline: "Approve this subscription",
      bodyHtml,
    });

    const attachments =
      input.receipt && receiptFile
        ? [
            {
              filename: receiptFile,
              content: standaloneReceiptHtmlDocument(input.receipt),
              contentType: "text/html; charset=UTF-8",
            },
          ]
        : undefined;

    await deliverEmail({ to: input.to, subject, html, attachments });
  } catch (err) {
    logger.error({ err }, "sendSubscriptionPendingStaffEmail failed");
    throw err;
  }
}
