import { emailLayout, escapeAttr, escapeHtml, labelRow, primaryButton, textP } from "./base.mailer";
import { displayGreetingName } from "./greeting";
import { createEmailIntent } from "../../services/outbox.service";
import { logger } from "../logger";

export async function sendAdminNewMessageEmail(input: {
  to: string;
  adminName: string | null;
  senderName: string | null;
  senderEmail: string | null;
  messagePreview: string;
  contentType: "text" | "image" | "video";
  sentAt: string;
  threadUrl: string;
  isGroup?: boolean;
  groupName?: string | null;
}): Promise<void> {
  try {
    const senderDisplay = input.senderName?.trim() || "Someone";
    const subject = `New message from ${senderDisplay} — PH Performance`;

    const greetingName = displayGreetingName(input.adminName, input.to);

    const channelLabel = input.isGroup && input.groupName ? escapeHtml(input.groupName) : "Direct message";

    const fromValue = input.senderName
      ? input.senderEmail
        ? `${escapeHtml(input.senderName)} &lt;${escapeHtml(input.senderEmail)}&gt;`
        : escapeHtml(input.senderName)
      : input.senderEmail
        ? escapeHtml(input.senderEmail)
        : "Unknown";

    const previewValue =
      input.contentType === "image"
        ? "Sent a photo"
        : input.contentType === "video"
          ? "Sent a video"
          : input.messagePreview.trim()
            ? escapeHtml(input.messagePreview.slice(0, 200))
            : "—";

    let sentAtDisplay = "—";
    try {
      sentAtDisplay = escapeHtml(
        new Date(input.sentAt).toLocaleString("en-GB", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      );
    } catch {
      // ignore formatting errors
    }

    const detailRows = [
      labelRow("From", fromValue),
      labelRow("Channel", channelLabel),
      labelRow("Message", `<span style="font-style:italic;">${previewValue}</span>`),
      labelRow("Sent at", sentAtDisplay),
    ].join("");

    const bodyHtml = `
${textP(`Hi ${escapeHtml(greetingName)},`)}
${textP("You have received a new message via PH Performance:")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">${detailRows}</table>
${primaryButton(escapeAttr(input.threadUrl), "View message")}`;

    const html = emailLayout({
      preheader: `New message from ${senderDisplay}${input.isGroup && input.groupName ? ` in ${input.groupName}` : ""}`,
      eyebrow: "Messaging",
      headline: "You have a new message",
      bodyHtml,
    });

    // Was emailQueue.enqueue(). The BullMQ `emails` queue is consumed only by worker.ts, and
    // Heroku starts new process types at 0 dynos — so on a single-dyno deploy this had no
    // consumer and every new-message email vanished with no error and no alert.
    //
    // Every other mailer already goes through the outbox (Postgres-backed, retried with
    // backoff, drained by a worker server.ts has always started). This was the sole outlier.
    await createEmailIntent({ to: input.to, subject, html });
  } catch (err) {
    logger.error({ err, to: input.to }, "sendAdminNewMessageEmail failed");
  }
}
