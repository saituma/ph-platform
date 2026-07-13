import {
  encodeReplyPrefix,
  MAX_MESSAGE_LENGTH,
  MAX_REPLY_PREVIEW_LENGTH,
  MAX_STORED_MESSAGE_LENGTH,
} from "../../src/lib/message-limits";

/**
 * Regression guard for the varchar(500) incident.
 *
 * conversation_messages.content used to be varchar(500) while the socket schema allowed
 * 2000 and the REST schema had no max at all. Any DM over 500 characters raised Postgres
 * 22001 and surfaced as an unhandled 500. Replies were worse: the [reply:<id>:<preview>]
 * prefix is prepended AFTER validation, and URI-encoding a 160-char preview of multi-byte
 * text can triple its length — enough to blow the budget on its own.
 *
 * The column is now `text`, so the only thing bounding a write is the request boundary.
 * These tests assert that bound actually holds under worst-case input.
 */
describe("lib/message-limits", () => {
  test("a 600-character message — the old break point — is within the accepted limit", () => {
    expect(600).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
  });

  // The preview is sliced by UTF-16 code unit, then URI-encoded. The worst expansion is a
  // 3-byte BMP character: one code unit in, nine characters out. Amharic hits this, and this
  // app is bilingual EN/አማርኛ — so it is the realistic worst case, not a contrived one.
  // (Emoji are 4 bytes / 12 chars but span two code units, so they expand less per unit.)
  test.each([
    ["Amharic (3-byte, 1 code unit — worst)", "አ"],
    ["emoji (4-byte, 2 code units)", "🏃"],
    ["ASCII", "a"],
  ])("worst-case reply prefix + max content fits MAX_STORED_MESSAGE_LENGTH: %s", (_label, char) => {
    const stored = encodeReplyPrefix({
      content: "a".repeat(MAX_MESSAGE_LENGTH),
      replyToMessageId: Number.MAX_SAFE_INTEGER,
      replyPreview: char.repeat(MAX_REPLY_PREVIEW_LENGTH),
    });

    expect(stored.length).toBeLessThanOrEqual(MAX_STORED_MESSAGE_LENGTH);
  });

  test("encodeReplyPrefix truncates an oversized preview rather than trusting the caller", () => {
    const stored = encodeReplyPrefix({
      content: "hi",
      replyToMessageId: 1,
      replyPreview: "x".repeat(MAX_REPLY_PREVIEW_LENGTH * 10),
    });

    // Prefix is `[reply:1:` + preview + `] `; ASCII preview encodes 1:1.
    expect(stored).toBe(`[reply:1:${"x".repeat(MAX_REPLY_PREVIEW_LENGTH)}] hi`);
  });

  test("no reply means no prefix", () => {
    expect(encodeReplyPrefix({ content: "hello" })).toBe("hello");
  });

  test("an empty body with an attachment does not persist an empty string", () => {
    expect(encodeReplyPrefix({ content: "   " })).toBe("Attachment");
  });
});
