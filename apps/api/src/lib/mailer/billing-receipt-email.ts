import type Stripe from "stripe";

import { summarizeStripeCheckoutSession, type StripeLineSummary } from "../stripe-checkout-receipt";
import { escapeHtml, labelRow, textP, E } from "./base.mailer";
import { displayGreetingName } from "./greeting";

export type BillingReceiptEmailBlockInput = {
  receiptPublicId: string;
  internalRequestId: number;
  accountRole: string;
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
  paidAtLabel: string;
  totalFormatted: string | null;
  subtotalFormatted: string | null;
  billingCycleLabel: string | null;
  customerEmail: string | null;
  lineItems: StripeLineSummary[];
  teamBlock: string | null;
  athleteBlock: string | null;
};

/** Human-readable account role for email tables (e.g. team_admin → Team admin). */
export function formatBillingRoleLabel(role: string): string {
  const r = role.replace(/_/g, " ").trim();
  if (!r) return "Member";
  return r.charAt(0).toUpperCase() + r.slice(1).toLowerCase();
}

function lineItemsRows(items: StripeLineSummary[]): string {
  if (!items.length) {
    return labelRow("Line items", "— (see Stripe checkout for full breakdown)");
  }
  return items
    .map((li, i) => {
      const qty = li.quantity != null ? ` × ${li.quantity}` : "";
      const desc = escapeHtml(li.description || `Item ${i + 1}`);
      const unit =
        li.unitAmount != null && li.currency
          ? `${(li.unitAmount / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${li.currency.toUpperCase()}`
          : "—";
      return labelRow(`Line ${i + 1}`, `${desc}${qty} · ${unit}`);
    })
    .join("");
}

export function billingReceiptEmailBlock(input: BillingReceiptEmailBlockInput): string {
  const rows = [
    labelRow("PH Performance receipt ID", escapeHtml(input.receiptPublicId)),
    labelRow("Internal reference", `#${escapeHtml(String(input.internalRequestId))}`),
    labelRow("Account role", escapeHtml(formatBillingRoleLabel(input.accountRole))),
    labelRow("Paid at", escapeHtml(input.paidAtLabel)),
    labelRow("Stripe Checkout session", escapeHtml(input.stripeSessionId)),
    ...(input.stripePaymentIntentId ? [labelRow("Stripe PaymentIntent", escapeHtml(input.stripePaymentIntentId))] : []),
    ...(input.customerEmail ? [labelRow("Customer email", escapeHtml(input.customerEmail))] : []),
    ...(input.subtotalFormatted && input.subtotalFormatted !== input.totalFormatted
      ? [labelRow("Subtotal", escapeHtml(input.subtotalFormatted))]
      : []),
    ...(input.totalFormatted ? [labelRow("Total charged", escapeHtml(input.totalFormatted))] : []),
    ...(input.billingCycleLabel ? [labelRow("Billing", escapeHtml(input.billingCycleLabel))] : []),
    ...(input.teamBlock ? [labelRow("Team", escapeHtml(input.teamBlock))] : []),
    ...(input.athleteBlock ? [labelRow("Athlete", escapeHtml(input.athleteBlock))] : []),
  ].join("");

  const lineRows = lineItemsRows(input.lineItems);

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fafafa;border-radius:12px;border:1px solid ${E.rule};margin:0 0 22px;">
  <tr>
    <td style="padding:18px 22px;font-size:13px;color:${E.text};line-height:1.55;font-family:${E.font};">
      <strong style="display:block;margin-bottom:10px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${E.muted};">Official receipt · PH Performance</strong>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
      <p style="margin:14px 0 6px;font-size:12px;font-weight:600;color:${E.muted};font-family:${E.font};">Line items</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${lineRows}</table>
      <p style="margin:14px 0 0;font-size:12px;color:${E.muted};line-height:1.55;font-family:${E.font};">Keep this email and your receipt ID for your records. You can look up this receipt while signed in to the PH app or admin (same receipt ID).</p>
    </td>
  </tr>
</table>`;
}

/** Standalone HTML file (e.g. email attachment) — open in a browser; print to PDF if needed. */
export function standaloneReceiptHtmlDocument(input: BillingReceiptEmailBlockInput): string {
  const block = billingReceiptEmailBlock(input);
  const title = escapeHtml(`PH Performance · Receipt ${input.receiptPublicId}`);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
</head>
<body style="margin:0;padding:24px;background-color:#f4f4f5;font-family:${E.font};">
${block}
<p style="margin:18px 0 0;font-size:12px;color:${E.muted};line-height:1.55;">Tip: use your browser’s <strong>Print</strong> dialog and choose <strong>Save as PDF</strong> if you need a PDF copy.</p>
</body>
</html>`;
}

export function greetingLine(name: string | null | undefined, email: string): string {
  const who = escapeHtml(displayGreetingName(name, email));
  return textP(`Hi ${who},`);
}

export function buildBillingReceiptEmailFromStripeSession(
  session: Stripe.Checkout.Session,
  ctx: {
    receiptPublicId: string;
    internalRequestId: number;
    accountRole: string;
    paidAt: Date;
    billingCycleLabel: string | null;
    teamBlock: string | null;
    athleteBlock: string | null;
  },
): BillingReceiptEmailBlockInput {
  const sum = summarizeStripeCheckoutSession(session);
  const cents = sum.amountTotalCents;
  const cur = sum.currency;
  const totalFormatted =
    cents != null && cur
      ? new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: cur.toUpperCase(),
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(cents / 100)
      : null;
  const sub =
    sum.amountSubtotalCents != null &&
    cur &&
    sum.amountSubtotalCents !== cents &&
    typeof sum.amountSubtotalCents === "number"
      ? new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: cur.toUpperCase(),
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(sum.amountSubtotalCents / 100)
      : null;
  return {
    receiptPublicId: ctx.receiptPublicId,
    internalRequestId: ctx.internalRequestId,
    accountRole: ctx.accountRole,
    stripeSessionId: String(session.id ?? ""),
    stripePaymentIntentId: sum.paymentIntentId,
    paidAtLabel: ctx.paidAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }),
    totalFormatted,
    subtotalFormatted: sub,
    billingCycleLabel: ctx.billingCycleLabel,
    customerEmail: sum.customerEmail,
    lineItems: sum.lineItems,
    teamBlock: ctx.teamBlock,
    athleteBlock: ctx.athleteBlock,
  };
}
