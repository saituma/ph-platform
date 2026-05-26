import { createEmailIntent } from "../../services/outbox.service";
import { emailLayout, escapeHtml, textP, E } from "./base.mailer";
import type { BillingReceiptEmailBlockInput } from "./billing-receipt-email";
import { billingReceiptEmailBlock, greetingLine } from "./billing-receipt-email";
import { logger } from "../logger";

function formatProgramTierLabel(tier: string | null | undefined) {
  return (tier ?? "").replace(/_/g, " ");
}

/** Safe: logs and returns if SMTP is not configured or send fails. */
export async function sendSubscriptionPendingUserEmail(input: {
  to: string;
  name: string;
  planName: string;
  planTier: string;
  amount?: string | null;
  billingCycle?: "weekly" | "monthly" | "six_months" | "yearly" | null;
  receipt?: BillingReceiptEmailBlockInput | null;
  invoiceUrl?: string | null;
}) {
  try {
    const tierLabel = formatProgramTierLabel(input.planTier);
    const subject = input.receipt
      ? `Payment received · ${input.planName} · Receipt ${input.receipt.receiptPublicId}`
      : `Payment received · ${input.planName}`;
    const plan = escapeHtml(input.planName);
    const tier = escapeHtml(tierLabel);
    const amount = input.amount ? escapeHtml(input.amount) : null;
    const cycle = String(input.billingCycle ?? "")
      .trim()
      .toLowerCase();
    const cycleLabel =
      cycle === "weekly"
        ? "Weekly"
        : cycle === "monthly"
          ? "Monthly"
          : cycle === "six_months"
            ? "6 months (upfront)"
            : cycle === "yearly"
              ? "Yearly (upfront)"
              : null;
    const receiptHtml = input.receipt ? billingReceiptEmailBlock(input.receipt) : "";
    const invoiceBtnHtml = input.invoiceUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
  <tr>
    <td style="border-radius:10px;background:#16a34a;">
      <a href="${escapeHtml(input.invoiceUrl)}" style="display:inline-block;padding:13px 26px;font-family:${E.font};font-weight:700;font-size:14px;color:#ffffff;text-decoration:none;border-radius:10px;">
        View Invoice
      </a>
    </td>
  </tr>
</table>`
      : "";
    const bodyHtml = `
${greetingLine(input.name, input.to)}
${textP(`We’ve successfully received your payment for <strong>${plan}</strong> <span style="color:${E.muted};">(${tier})</span>.`)}
${amount ? textP(`Amount paid: <strong>${amount}</strong>${cycleLabel ? ` <span style="color:${E.muted};">(${escapeHtml(cycleLabel)})</span>` : ""}.`) : ""}
${invoiceBtnHtml}
${receiptHtml}
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
    await createEmailIntent({ to: input.to, subject, html });
  } catch (err) {
    logger.warn({ err }, "sendSubscriptionPendingUserEmail skipped");
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
    await createEmailIntent({ to: input.to, subject, html });
  } catch (err) {
    logger.warn({ err }, "sendPlanExpiringSoonEmail skipped");
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
    await createEmailIntent({ to: input.to, subject, html });
  } catch (err) {
    logger.warn({ err }, "sendPlanExpiredEmail skipped");
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
    await createEmailIntent({ to: input.to, subject, html });
  } catch (err) {
    logger.warn({ err }, "sendSubscriptionApprovedUserEmail skipped");
  }
}

export async function sendPlanInviteEmail(input: {
  to: string;
  name: string;
  planName: string;
  planTier: string;
  amountLabel?: string | null;
  checkoutUrl: string;
  invitedByName?: string | null;
  /** Provided when this invite created a brand-new account; included in the email so they can log into mobile after paying. */
  loginCredentials?: { email: string; temporaryPassword: string } | null;
}) {
  try {
    const tierLabel = formatProgramTierLabel(input.planTier);
    const subject = `You're invited to join ${input.planName}`;
    const plan = escapeHtml(input.planName);
    const tier = escapeHtml(tierLabel);
    const amount = input.amountLabel ? escapeHtml(input.amountLabel) : null;
    const inviter = input.invitedByName ? escapeHtml(input.invitedByName) : "Your coach";
    const safeUrl = escapeHtml(input.checkoutUrl);

    const bodyHtml = `
${greetingLine(input.name, input.to)}
${textP(`${inviter} has invited you to join the <strong>${plan}</strong> plan <span style="color:${E.muted};">(${tier})</span>.`)}
${amount ? textP(`Plan: <strong>${amount}</strong>.`) : ""}
${textP(`Click below to complete a quick onboarding form and pay — it takes about a minute.`)}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr>
    <td style="border-radius:10px;background:#16a34a;">
      <a href="${safeUrl}" style="display:inline-block;padding:14px 28px;font-family:${E.font};font-weight:700;font-size:15px;color:#ffffff;text-decoration:none;border-radius:10px;">
        Complete onboarding & pay
      </a>
    </td>
  </tr>
</table>
${textP(`<span style="color:${E.muted};font-size:13px;">Or paste this link into your browser:<br/><span style="word-break:break-all;">${safeUrl}</span></span>`, "0")}
${
  input.loginCredentials
    ? `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;margin:16px 0 0;">
  <tr>
    <td style="padding:18px 22px;font-size:14px;color:#166534;line-height:1.6;font-family:${E.font};">
      <strong style="display:block;margin-bottom:8px;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;">Your mobile app login</strong>
      <div style="margin-bottom:4px;">Email: <strong>${escapeHtml(input.loginCredentials.email)}</strong></div>
      <div>Temporary password: <strong style="font-family:monospace;background:#fff;padding:2px 6px;border-radius:4px;border:1px solid #bbf7d0;">${escapeHtml(input.loginCredentials.temporaryPassword)}</strong></div>
      <div style="margin-top:10px;font-size:12px;color:#166534;">Sign in to the PH Performance app after completing payment. Please change this password from your profile settings.</div>
    </td>
  </tr>
</table>`
    : ""
}
${textP(`<span style="color:${E.muted};font-size:13px;">Didn't expect this email? You can safely ignore it.</span>`, "16px")}`;

    const html = emailLayout({
      preheader: `${inviter} invited you to join ${input.planName}.`,
      eyebrow: "Plan invitation",
      headline: `Join ${input.planName}`,
      bodyHtml,
    });
    await createEmailIntent({ to: input.to, subject, html });
  } catch (err) {
    logger.warn({ err }, "sendPlanInviteEmail skipped");
  }
}

export async function sendPaymentFailedEmail(input: {
  to: string;
  name: string;
  athleteName: string;
  planName?: string | null;
}) {
  try {
    const subject = "Action required: payment failed";
    const name = escapeHtml(input.name);
    const athlete = escapeHtml(input.athleteName);
    const plan = input.planName ? escapeHtml(input.planName) : null;
    const bodyHtml = `
${textP(`Hi ${name},`)}
${textP(`We were unable to process your payment${plan ? ` for the <strong>${plan}</strong> plan` : ""} for <strong>${athlete}</strong>.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fef2f2;border-radius:12px;border:1px solid #fecaca;margin:0 0 24px;">
  <tr>
    <td style="padding:18px 22px;font-size:14px;color:#991b1b;line-height:1.6;font-family:${E.font};">
      <strong style="display:block;margin-bottom:6px;">Access suspended</strong>
      ${athlete}'s access to training content and features has been paused. Update your payment method to restore access immediately.
    </td>
  </tr>
</table>
${textP(`Open the <strong>PH Performance</strong> app → <strong>Plans</strong> → <strong>Manage Billing</strong> to update your payment method.`)}
${textP(`<span style="color:${E.muted};font-size:13px;">If you believe this is an error, reply to this email and we'll sort it out right away.</span>`, "0")}`;
    const html = emailLayout({
      preheader: `Payment failed for ${input.athleteName}. Update your payment method to restore access.`,
      eyebrow: "Billing",
      headline: "Payment unsuccessful",
      bodyHtml,
    });
    await createEmailIntent({ to: input.to, subject, html });
  } catch (err) {
    logger.warn({ err }, "sendPaymentFailedEmail skipped");
  }
}

export async function sendTeamPlayerPaymentInviteEmail(input: {
  to: string;
  payerName?: string | null;
  teamName: string;
  planName: string;
  checkoutUrl: string;
  loginCredentials?: { email: string; temporaryPassword: string } | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const subject = `Payment link for ${input.teamName}`;
    const safeUrl = escapeHtml(input.checkoutUrl);
    const safeTeam = escapeHtml(input.teamName);
    const safePlan = escapeHtml(input.planName);
    const who = input.payerName ? escapeHtml(input.payerName) : "there";

    const credentialsSection = input.loginCredentials
      ? `
${textP(`Your athlete account has also been created. Use the details below to sign in to the PH Performance app after completing payment.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr>
    <td style="background:#f4f4f5;border-radius:12px;border:1px solid #e4e4e7;padding:20px 24px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#71717a;font-family:${E.font};">App login</p>
      <div style="margin-bottom:4px;font-family:${E.font};font-size:14px;">Email: <strong>${escapeHtml(input.loginCredentials.email)}</strong></div>
      <div style="font-family:${E.font};font-size:14px;">Temporary password: <strong style="font-family:ui-monospace,Menlo,Consolas,monospace;background:#fff;padding:2px 6px;border-radius:4px;border:1px solid #d4d4d8;">${escapeHtml(input.loginCredentials.temporaryPassword)}</strong></div>
    </td>
  </tr>
</table>`
      : "";

    const bodyHtml = `
${textP(`Hi ${who},`)}
${textP(`You’ve been selected to complete your payment for <strong>${safeTeam}</strong> on the <strong>${safePlan}</strong> plan.`)}
${textP(`Use the secure Stripe checkout link below to complete payment.`)}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr>
    <td style="border-radius:10px;background:#16a34a;">
      <a href="${safeUrl}" style="display:inline-block;padding:14px 28px;font-family:${E.font};font-weight:700;font-size:15px;color:#ffffff;text-decoration:none;border-radius:10px;">
        Open Stripe payment link
      </a>
    </td>
  </tr>
</table>
${textP(`<span style="color:${E.muted};font-size:13px;">If the button does not open, paste this link into your browser:<br/><span style="word-break:break-all;">${safeUrl}</span></span>`, "0")}
${credentialsSection}`;

    const html = emailLayout({
      preheader: `Complete your payment for ${input.teamName}.`,
      eyebrow: "Team payment",
      headline: "Your payment link is ready",
      bodyHtml,
    });
    await createEmailIntent({ to: input.to, subject, html });
    return { ok: true };
  } catch (err) {
    logger.warn({ err, to: input.to }, "sendTeamPlayerPaymentInviteEmail skipped");
    return { ok: false, error: err instanceof Error ? err.message : "Failed to send invite email" };
  }
}
