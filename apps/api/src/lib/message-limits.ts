/**
 * Message size limits, enforced at the request boundary (socket + REST) rather than
 * by the column type. `conversation_messages.content` is `text`, so Postgres will not
 * reject an oversized body — these constants are the only thing standing between a
 * client and an unbounded write.
 *
 * Keep the socket and REST schemas pointed at these. They used to disagree
 * (socket: 2000, REST: unlimited, column: varchar(500)), which made any DM over
 * 500 characters an unhandled 22001 → 500.
 */

/** Max characters in a message body, before the reply prefix is prepended. */
export const MAX_MESSAGE_LENGTH = 4096;

/** Max characters of the quoted message shown in a reply. */
export const MAX_REPLY_PREVIEW_LENGTH = 160;

/**
 * Worst-case URI-encoded expansion per UTF-16 code unit.
 *
 * `encodeURIComponent` emits `%XX` (3 chars) per UTF-8 byte. The worst ratio is a 3-byte
 * BMP character, which occupies ONE UTF-16 unit and encodes to NINE characters — e.g. the
 * Amharic "አ" → "%E1%8A%A0". (Emoji are 4 bytes / 12 chars but span TWO UTF-16 units, so
 * they are only 6 per unit — less bad.) This app is bilingual EN/አማርኛ, so the 3-byte case
 * is the realistic one, not a theoretical worst case.
 */
const MAX_URI_ENCODED_EXPANSION = 9;

/** `[reply:` + a 16-digit id + `:` + `] ` — rounded up. */
const REPLY_PREFIX_OVERHEAD = 32;

/**
 * The reply prefix (`[reply:<id>:<uri-encoded preview>] `) is prepended AFTER validation,
 * so a stored body can legitimately exceed MAX_MESSAGE_LENGTH. This is the true ceiling.
 *
 * ponytail: this whole prefix is a hack — replies belong in a replyToMessageId column.
 * Removed in the conversations unification; this bound exists so the interim can't run away.
 */
export const MAX_STORED_MESSAGE_LENGTH =
  MAX_MESSAGE_LENGTH + MAX_REPLY_PREVIEW_LENGTH * MAX_URI_ENCODED_EXPANSION + REPLY_PREFIX_OVERHEAD;

/**
 * Builds the stored message body, prepending the reply prefix when the message quotes another.
 *
 * ponytail: replies belong in a `replyToMessageId` column, not a string prefix parsed by regex
 * at five call sites. This lives here — a leaf module with no DB imports — so the bound above
 * stays testable without loading the schema graph. Deleted when the column lands.
 */
export function encodeReplyPrefix(input: {
  content: string;
  replyToMessageId?: number | null;
  replyPreview?: string | null;
}): string {
  const safeBaseContent = input.content.trim() || "Attachment";
  const safeReplyPreview = encodeURIComponent((input.replyPreview ?? "").trim().slice(0, MAX_REPLY_PREVIEW_LENGTH));
  const replyPrefix =
    input.replyToMessageId && Number.isFinite(input.replyToMessageId)
      ? `[reply:${input.replyToMessageId}:${safeReplyPreview}] `
      : "";
  return `${replyPrefix}${safeBaseContent}`;
}
