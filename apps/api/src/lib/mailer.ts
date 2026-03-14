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
