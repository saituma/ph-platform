import { deliverEmail, emailLayout, escapeHtml, escapeAttr, textP, labelRow, E } from "./base.mailer";

const TBD = "TBD (coach will confirm)";

export async function sendBookingConfirmationEmail(input: {
  to: string;
  name: string;
  serviceName: string;
  startsAt: Date;
  location?: string;
  meetingLink?: string;
}) {
  const subject = `Booking request received · ${input.serviceName}`;
  const whenNice = input.startsAt.toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const whenIso = escapeHtml(input.startsAt.toISOString());
  const name = escapeHtml(input.name);
  const service = escapeHtml(input.serviceName);
  const loc = escapeHtml(input.location?.trim() ? input.location : TBD);
  const meet = input.meetingLink?.trim()
    ? `<a href="${escapeAttr(input.meetingLink)}" style="color:${E.accent};font-weight:600;text-decoration:underline;word-break:break-all;">Join link</a>`
    : escapeHtml(TBD);
  const rows = [
    labelRow("Service", service),
    labelRow("When", `${escapeHtml(whenNice)}<br/><span style="font-size:12px;color:${E.muted};font-weight:400;">${whenIso}</span>`),
    labelRow("Location", loc),
    labelRow("Meeting", meet),
  ].join("");
  const bodyHtml = `
${textP(`Hi ${name},`)}
${textP(`Thanks for your request — we’ve received it and it’s <strong>pending coach approval</strong>. Here’s a summary:`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">${rows}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;">
  <tr>
    <td style="padding:16px 20px;font-size:14px;color:#166534;line-height:1.55;font-family:${E.font};">
      <strong style="display:block;margin-bottom:4px;">What happens next</strong>
      You’ll receive another email once your coach has reviewed and confirmed this booking.
    </td>
  </tr>
</table>`;
  const html = emailLayout({
    preheader: `We received your booking request for ${input.serviceName}.`,
    eyebrow: "Bookings",
    headline: "Request received",
    bodyHtml,
  });

  await deliverEmail({ to: input.to, subject, html });
}

export async function sendBookingApprovedEmail(input: {
  to: string;
  name: string;
  serviceName: string;
  startsAt: Date;
  location?: string;
  meetingLink?: string;
}) {
  const subject = `Confirmed · ${input.serviceName}`;
  const whenNice = input.startsAt.toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const whenIso = escapeHtml(input.startsAt.toISOString());
  const name = escapeHtml(input.name);
  const service = escapeHtml(input.serviceName);
  const loc = escapeHtml(input.location?.trim() ? input.location : TBD);
  const meet = input.meetingLink?.trim()
    ? `<a href="${escapeAttr(input.meetingLink)}" style="color:${E.accent};font-weight:600;text-decoration:underline;word-break:break-all;">Open meeting link</a>`
    : escapeHtml(TBD);
  const rows = [
    labelRow("Service", service),
    labelRow("When", `${escapeHtml(whenNice)}<br/><span style="font-size:12px;color:${E.muted};font-weight:400;">${whenIso}</span>`),
    labelRow("Location", loc),
    labelRow("Meeting", meet),
  ].join("");
  const bodyHtml = `
${textP(`Hi ${name},`)}
${textP(`Great news — your session is <strong>confirmed</strong>. Add it to your calendar and we’ll see you then.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">${rows}</table>
${textP(`Thanks for training with PH Performance.`, "0")}`;
  const html = emailLayout({
    preheader: `Your ${input.serviceName} session is confirmed for ${whenNice}.`,
    eyebrow: "Bookings",
    headline: "You’re on the calendar",
    bodyHtml,
  });

  await deliverEmail({ to: input.to, subject, html });
}

export async function sendBookingDeclinedEmail(input: {
  to: string;
  name: string;
  serviceName: string;
  startsAt: Date;
  location?: string;
  meetingLink?: string;
}) {
  const subject = `Update on your booking · ${input.serviceName}`;
  const whenNice = input.startsAt.toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const whenIso = escapeHtml(input.startsAt.toISOString());
  const name = escapeHtml(input.name);
  const service = escapeHtml(input.serviceName);
  const loc = escapeHtml(input.location?.trim() ? input.location : TBD);
  const meet = input.meetingLink?.trim()
    ? `<a href="${escapeAttr(input.meetingLink)}" style="color:${E.accent};font-weight:600;text-decoration:underline;word-break:break-all;">Meeting link</a>`
    : escapeHtml(TBD);
  const rows = [
    labelRow("Service", service),
    labelRow("Requested time", `${escapeHtml(whenNice)}<br/><span style="font-size:12px;color:${E.muted};font-weight:400;">${whenIso}</span>`),
    labelRow("Location", loc),
    labelRow("Meeting", meet),
  ].join("");
  const bodyHtml = `
${textP(`Hi ${name},`)}
${textP(`We weren’t able to confirm the session below. That can happen when a slot fills up or the schedule changes — nothing wrong on your side.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">${rows}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fffbeb;border-radius:12px;border:1px solid #fde68a;">
  <tr>
    <td style="padding:16px 20px;font-size:14px;color:#92400e;line-height:1.55;font-family:${E.font};">
      <strong style="display:block;margin-bottom:4px;">What you can do</strong>
      Pick another time in the app — we’ll do our best to get you scheduled.
    </td>
  </tr>
</table>`;
  const html = emailLayout({
    preheader: `Your booking request for ${input.serviceName} could not be confirmed.`,
    eyebrow: "Bookings",
    headline: "Session not confirmed",
    bodyHtml,
  });

  await deliverEmail({ to: input.to, subject, html });
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
  reviewUrl?: string;
  approveUrl?: string;
  declineUrl?: string;
  adminUrl?: string;
}) {
  const subject = `Action required · Booking #${input.bookingId} · ${input.serviceName}`;
  const time = input.startsAt.toISOString();
  const humanTime = input.startsAt.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const service = escapeHtml(input.serviceName);
  const bid = escapeHtml(String(input.bookingId));
  const loc = escapeHtml(input.location?.trim() ? input.location : TBD);
  const meet = input.meetingLink?.trim()
    ? `<a href="${escapeAttr(input.meetingLink)}" style="color:${E.accent};font-weight:600;text-decoration:underline;word-break:break-all;">Link</a>`
    : escapeHtml(TBD);
  const rows = [
    labelRow("Booking ID", `#${bid}`),
    labelRow("Service", service),
    labelRow(
      "Requested time",
      `${escapeHtml(humanTime)}<br/><span style="font-size:12px;color:${E.muted};font-weight:400;">${escapeHtml(time)}</span>`,
    ),
    ...(input.athleteName ? [labelRow("Athlete", escapeHtml(input.athleteName))] : []),
    ...(input.guardianName ? [labelRow("Guardian", escapeHtml(input.guardianName))] : []),
    ...(input.guardianEmail ? [labelRow("Email", escapeHtml(input.guardianEmail))] : []),
    labelRow("Location", loc),
    labelRow("Meeting", meet),
  ].join("");
  const btn = (href: string, label: string, bg: string) =>
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-block;margin:6px 8px 6px 0;vertical-align:middle;">
  <tr>
    <td style="border-radius:10px;background-color:${bg};">
      <a href="${escapeAttr(href)}" style="display:inline-block;padding:14px 22px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;font-family:${E.font};">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
  const secondary = "#27272a";
  const actions = [
    input.reviewUrl ? btn(input.reviewUrl, "Review & respond", E.accent) : "",
    !input.reviewUrl && input.approveUrl ? btn(input.approveUrl, "Approve", E.accent) : "",
    !input.reviewUrl && input.declineUrl ? btn(input.declineUrl, "Decline", secondary) : "",
    input.adminUrl ? btn(input.adminUrl, "Open admin", secondary) : "",
  ].join("");
  const bodyHtml = `
${textP(`Someone requested a session — you can edit the time, location, and meeting link before approving or declining.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">${rows}</table>
${actions ? `<div style="margin:18px 0 16px;text-align:left;">${actions}</div>` : ""}
${textP(`<span style="color:${E.muted};font-size:14px;">Buttons use secure links tied to this request. If you did not expect this email, please contact support.</span>`, "0")}`;
  const html = emailLayout({
    preheader: `New booking #${input.bookingId} · ${input.serviceName} · ${humanTime}`,
    eyebrow: "Admin",
    headline: "New booking request",
    bodyHtml,
  });

  await deliverEmail({ to: input.to, subject, html });
}
