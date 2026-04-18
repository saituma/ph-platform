import { deliverEmail, emailLayout, escapeHtml, textP, E } from "./base.mailer";

function formatProgramTierLabel(tier: string) {
  return tier.replace(/_/g, " ");
}

/** Safe: logs and returns if SMTP is not configured or send fails. */
export async function sendSubscriptionPendingUserEmail(input: {
  to: string;
  name: string;
  planName: string;
  planTier: string;
  amount?: string | null;
  billingCycle?: "monthly" | "six_months" | "yearly" | null;
}) {
  try {
    const tierLabel = formatProgramTierLabel(input.planTier);
    const subject = `Payment received · ${input.planName}`;
    const name = escapeHtml(input.name);
    const plan = escapeHtml(input.planName);
    const tier = escapeHtml(tierLabel);
    const amount = input.amount ? escapeHtml(input.amount) : null;
    const cycle = String(input.billingCycle ?? "").trim().toLowerCase();
    const cycleLabel =
      cycle === "monthly"
        ? "Monthly"
        : cycle === "six_months"
        ? "6 months (upfront)"
        : cycle === "yearly"
        ? "Yearly (upfront)"
        : null;
    const bodyHtml = `
${textP(`Hi ${name},`)}
${textP(`We’ve successfully received your payment for <strong>${plan}</strong> <span style="color:${E.muted};">(${tier})</span>.`)}
${amount ? textP(`Amount paid: <strong>${amount}</strong>${cycleLabel ? ` <span style="color:${E.muted};">(${escapeHtml(cycleLabel)})</span>` : ""}.`) : ""}
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
