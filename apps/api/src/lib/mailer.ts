import nodemailer from "nodemailer";

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
  });
}

export async function sendOtpEmail(input: { to: string; code: string }) {
  const transporter = getMailer();
  const from = env.smtpFrom || env.smtpUser;
  const subject = "PH Performance verification code";
  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; background:#ffffff; color:#111827; padding:24px;">
    <div style="max-width:520px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; padding:24px;">
      <h1 style="margin:0 0 8px; font-size:20px; color:#111827;">PH Performance</h1>
      <p style="margin:0 0 16px; color:#6b7280;">Your verification code</p>
      <div style="font-size:28px; letter-spacing:6px; font-weight:700; color:#16a34a; margin:12px 0;">
        ${input.code}
      </div>
      <p style="margin:0; color:#6b7280; font-size:12px;">
        This code expires in 10 minutes. If you didn’t request it, you can ignore this email.
      </p>
    </div>
  </div>`;

  await transporter.sendMail({
    from,
    to: input.to,
    subject,
    html,
  });
}

export async function sendBookingConfirmationEmail(input: {
  to: string;
  name: string;
  serviceName: string;
  startsAt: Date;
  location?: string;
  meetingLink?: string;
}) {
  const transporter = getMailer();
  const from = env.smtpFrom || env.smtpUser;
  const subject = `Booking requested: ${input.serviceName}`;
  const time = input.startsAt.toISOString();
  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; background:#ffffff; color:#111827; padding:24px;">
    <div style="max-width:520px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; padding:24px;">
      <h1 style="margin:0 0 8px; font-size:20px; color:#111827;">PH Performance</h1>
      <p style="margin:0 0 16px; color:#6b7280;">Booking requested</p>
      <div style="font-size:18px; font-weight:700; color:#16a34a; margin:12px 0;">
        ${input.serviceName}
      </div>
      <p style="margin:0; color:#6b7280;">Scheduled for: <strong style="color:#111827;">${time}</strong></p>
      ${input.location ? `<p style="margin:6px 0 0; color:#6b7280;">Location: ${input.location}</p>` : ""}
      ${input.meetingLink ? `<p style="margin:6px 0 0; color:#6b7280;">Link: ${input.meetingLink}</p>` : ""}
      <p style="margin:16px 0 0; color:#6b7280; font-size:12px;">
        Thanks ${input.name}. We'll confirm your session soon.
      </p>
    </div>
  </div>`;

  await transporter.sendMail({
    from,
    to: input.to,
    subject,
    html,
  });
}

export async function sendBookingApprovedEmail(input: {
  to: string;
  name: string;
  serviceName: string;
  startsAt: Date;
  location?: string;
  meetingLink?: string;
}) {
  const transporter = getMailer();
  const from = env.smtpFrom || env.smtpUser;
  const subject = `Booking confirmed: ${input.serviceName}`;
  const time = input.startsAt.toISOString();
  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; background:#ffffff; color:#111827; padding:24px;">
    <div style="max-width:520px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; padding:24px;">
      <h1 style="margin:0 0 8px; font-size:20px; color:#111827;">PH Performance</h1>
      <p style="margin:0 0 16px; color:#6b7280;">Booking confirmed</p>
      <div style="font-size:18px; font-weight:700; color:#16a34a; margin:12px 0;">
        ${input.serviceName}
      </div>
      <p style="margin:0; color:#6b7280;">Scheduled for: <strong style="color:#111827;">${time}</strong></p>
      ${input.location ? `<p style="margin:6px 0 0; color:#6b7280;">Location: ${input.location}</p>` : ""}
      ${input.meetingLink ? `<p style="margin:6px 0 0; color:#6b7280;">Link: ${input.meetingLink}</p>` : ""}
      <p style="margin:16px 0 0; color:#6b7280; font-size:12px;">
        Thanks ${input.name}, see you then.
      </p>
    </div>
  </div>`;

  await transporter.sendMail({
    from,
    to: input.to,
    subject,
    html,
  });
}

export async function sendBookingDeclinedEmail(input: {
  to: string;
  name: string;
  serviceName: string;
  startsAt: Date;
  location?: string;
  meetingLink?: string;
}) {
  const transporter = getMailer();
  const from = env.smtpFrom || env.smtpUser;
  const subject = `Booking declined: ${input.serviceName}`;
  const time = input.startsAt.toISOString();
  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; background:#ffffff; color:#111827; padding:24px;">
    <div style="max-width:520px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; padding:24px;">
      <h1 style="margin:0 0 8px; font-size:20px; color:#111827;">PH Performance</h1>
      <p style="margin:0 0 16px; color:#6b7280;">Booking declined</p>
      <div style="font-size:18px; font-weight:700; color:#16a34a; margin:12px 0;">
        ${input.serviceName}
      </div>
      <p style="margin:0; color:#6b7280;">Scheduled for: <strong style="color:#111827;">${time}</strong></p>
      ${input.location ? `<p style="margin:6px 0 0; color:#6b7280;">Location: ${input.location}</p>` : ""}
      ${input.meetingLink ? `<p style="margin:6px 0 0; color:#6b7280;">Link: ${input.meetingLink}</p>` : ""}
      <p style="margin:16px 0 0; color:#6b7280; font-size:12px;">
        Thanks ${input.name}. Please request another time and we’ll get back to you.
      </p>
    </div>
  </div>`;

  await transporter.sendMail({
    from,
    to: input.to,
    subject,
    html,
  });
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
  const transporter = getMailer();
  const from = env.smtpFrom || env.smtpUser;
  const subject = `New booking request: ${input.serviceName}`;
  const time = input.startsAt.toISOString();
  const humanTime = input.startsAt.toLocaleString();
  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; background:#ffffff; color:#111827; padding:24px;">
    <div style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; padding:24px;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
        <div>
          <h1 style="margin:0 0 6px; font-size:20px; color:#111827;">PH Performance</h1>
          <p style="margin:0; color:#6b7280;">New booking request</p>
        </div>
        <div style="padding:6px 10px; border-radius:999px; background:#ffffff; color:#111827; font-size:12px; border:1px solid #e5e7eb;">
          #${input.bookingId}
        </div>
      </div>

      <div style="margin:18px 0 16px; padding:16px; border-radius:12px; background:#ffffff; border:1px solid #e5e7eb;">
        <div style="font-size:18px; font-weight:700; color:#16a34a; margin-bottom:6px;">
          ${input.serviceName}
        </div>
        <div style="color:#6b7280; font-size:14px;">
          Requested for: <strong style="color:#111827;">${humanTime}</strong>
        </div>
        <div style="color:#6b7280; font-size:12px; margin-top:4px;">${time}</div>
      </div>

      <table style="width:100%; border-collapse:separate; border-spacing:0 8px; font-size:14px; color:#6b7280;">
        ${input.athleteName ? `<tr><td style="width:120px; color:#6b7280;">Athlete</td><td style="color:#111827;">${input.athleteName}</td></tr>` : ""}
        ${input.guardianName ? `<tr><td style="width:120px; color:#6b7280;">Guardian</td><td style="color:#111827;">${input.guardianName}</td></tr>` : ""}
        ${input.guardianEmail ? `<tr><td style="width:120px; color:#6b7280;">Email</td><td style="color:#111827;">${input.guardianEmail}</td></tr>` : ""}
        ${input.location ? `<tr><td style="width:120px; color:#6b7280;">Location</td><td style="color:#111827;">${input.location}</td></tr>` : ""}
        ${input.meetingLink ? `<tr><td style="width:120px; color:#6b7280;">Meeting</td><td style="color:#111827;">${input.meetingLink}</td></tr>` : ""}
      </table>

      <div style="margin:20px 0 8px; display:flex; gap:12px; flex-wrap:wrap;">
        ${
          input.approveUrl
            ? `<a href="${input.approveUrl}" style="background:#16a34a; color:#ffffff; text-decoration:none; font-weight:700; padding:12px 18px; border-radius:8px; display:inline-block;">Approve</a>`
            : ""
        }
        ${
          input.declineUrl
            ? `<a href="${input.declineUrl}" style="background:#16a34a; color:#ffffff; text-decoration:none; font-weight:700; padding:12px 18px; border-radius:8px; display:inline-block;">Decline</a>`
            : ""
        }
        ${
          input.adminUrl
            ? `<a href="${input.adminUrl}" style="background:#16a34a; color:#ffffff; text-decoration:none; font-weight:600; padding:12px 16px; border-radius:8px; display:inline-block;">Open Admin</a>`
            : ""
        }
      </div>

      <p style="margin:10px 0 0; color:#6b7280; font-size:12px;">
        You can approve or decline directly using the buttons above.
      </p>
    </div>
  </div>`;

  await transporter.sendMail({
    from,
    to: input.to,
    subject,
    html,
  });
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
    const transporter = getMailer();
    const from = env.smtpFrom || env.smtpUser;
    const tierLabel = formatProgramTierLabel(input.planTier);
    const subject = `We received your payment — ${input.planName}`;
    const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; background:#ffffff; color:#111827; padding:24px;">
    <div style="max-width:520px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; padding:24px;">
      <h1 style="margin:0 0 8px; font-size:20px; color:#111827;">PH Performance</h1>
      <p style="margin:0 0 16px; color:#6b7280;">Hi ${input.name},</p>
      <p style="margin:0 0 12px; color:#374151; line-height:1.5;">
        Thanks — your payment for <strong>${input.planName}</strong> (${tierLabel}) went through.
      </p>
      <p style="margin:0 0 12px; color:#374151; line-height:1.5;">
        A coach will review and activate your plan shortly. You will get another email when everything is approved.
      </p>
      <p style="margin:16px 0 0; color:#6b7280; font-size:12px;">
        If you did not make this purchase, contact support right away.
      </p>
    </div>
  </div>`;
    await transporter.sendMail({ from, to: input.to, subject, html });
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
    const transporter = getMailer();
    const from = env.smtpFrom || env.smtpUser;
    const tierLabel = formatProgramTierLabel(input.planTier);
    const subject = `New paid plan request #${input.requestId} — ${input.planName}`;
    const adminLink = input.adminReviewUrl
      ? `<p style="margin:16px 0 0;"><a href="${input.adminReviewUrl}" style="background:#16a34a; color:#ffffff; text-decoration:none; font-weight:700; padding:12px 18px; border-radius:8px; display:inline-block;">Review subscription</a></p>`
      : "";
    const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; background:#ffffff; color:#111827; padding:24px;">
    <div style="max-width:560px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; padding:24px;">
      <h1 style="margin:0 0 8px; font-size:20px; color:#111827;">PH Performance</h1>
      <p style="margin:0 0 16px; color:#6b7280;">A member completed payment and needs approval.</p>
      <table style="width:100%; border-collapse:separate; border-spacing:0 8px; font-size:14px; color:#6b7280;">
        <tr><td style="width:140px;">Request</td><td style="color:#111827;">#${input.requestId}</td></tr>
        <tr><td>Plan</td><td style="color:#111827;">${input.planName} (${tierLabel})</td></tr>
        <tr><td>Account</td><td style="color:#111827;">${input.payerName} &lt;${input.payerEmail}&gt;</td></tr>
        ${input.athleteName ? `<tr><td>Athlete</td><td style="color:#111827;">${input.athleteName}</td></tr>` : ""}
      </table>
      ${adminLink}
    </div>
  </div>`;
    await transporter.sendMail({ from, to: input.to, subject, html });
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
    const transporter = getMailer();
    const from = env.smtpFrom || env.smtpUser;
    const when = input.expiresAt.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const subject = `Your plan ends soon (${when})`;
    const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; background:#ffffff; color:#111827; padding:24px;">
    <div style="max-width:520px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; padding:24px;">
      <h1 style="margin:0 0 8px; font-size:20px; color:#111827;">PH Performance</h1>
      <p style="margin:0 0 16px; color:#6b7280;">Hi ${input.name},</p>
      <p style="margin:0 0 12px; color:#374151; line-height:1.5;">
        The paid access period for <strong>${input.athleteName}</strong> ends on <strong>${when}</strong>.
      </p>
      <p style="margin:0 0 12px; color:#374151; line-height:1.5;">
        Renew before then to keep messaging, bookings, and full program content without interruption.
      </p>
      <p style="margin:16px 0 0; color:#6b7280; font-size:12px;">
        Open the app → Plans to renew.
      </p>
    </div>
  </div>`;
    await transporter.sendMail({ from, to: input.to, subject, html });
  } catch (err) {
    console.warn("[Mailer] sendPlanExpiringSoonEmail skipped:", err);
  }
}

export async function sendPlanExpiredEmail(input: { to: string; name: string; athleteName: string }) {
  try {
    const transporter = getMailer();
    const from = env.smtpFrom || env.smtpUser;
    const subject = "Your plan period has ended";
    const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; background:#ffffff; color:#111827; padding:24px;">
    <div style="max-width:520px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; padding:24px;">
      <h1 style="margin:0 0 8px; font-size:20px; color:#111827;">PH Performance</h1>
      <p style="margin:0 0 16px; color:#6b7280;">Hi ${input.name},</p>
      <p style="margin:0 0 12px; color:#374151; line-height:1.5;">
        The paid plan period for <strong>${input.athleteName}</strong> has ended and we have not received a renewal payment.
      </p>
      <p style="margin:0 0 12px; color:#374151; line-height:1.5;">
        Your account is now on free access: program previews still work; messaging and session booking stay locked until you renew an approved paid plan.
      </p>
      <p style="margin:16px 0 0; color:#6b7280; font-size:12px;">
        Questions? Reply to this email or contact support from the app.
      </p>
    </div>
  </div>`;
    await transporter.sendMail({ from, to: input.to, subject, html });
  } catch (err) {
    console.warn("[Mailer] sendPlanExpiredEmail skipped:", err);
  }
}

export async function sendSubscriptionApprovedUserEmail(input: { to: string; name: string; planTier: string }) {
  try {
    const transporter = getMailer();
    const from = env.smtpFrom || env.smtpUser;
    const tierLabel = formatProgramTierLabel(input.planTier);
    const subject = `Your ${tierLabel} plan is active`;
    const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; background:#ffffff; color:#111827; padding:24px;">
    <div style="max-width:520px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; padding:24px;">
      <h1 style="margin:0 0 8px; font-size:20px; color:#111827;">PH Performance</h1>
      <p style="margin:0 0 16px; color:#6b7280;">Hi ${input.name},</p>
      <p style="margin:0 0 12px; color:#374151; line-height:1.5;">
        Great news — your coach approved your <strong>${tierLabel}</strong> plan. You now have full access in the app.
      </p>
      <p style="margin:16px 0 0; color:#6b7280; font-size:12px;">
        Open the PHP app to continue training, messaging, and scheduling.
      </p>
    </div>
  </div>`;
    await transporter.sendMail({ from, to: input.to, subject, html });
  } catch (err) {
    console.warn("[Mailer] sendSubscriptionApprovedUserEmail skipped:", err);
  }
}
