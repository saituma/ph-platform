import { parseReplyPrefix } from "@/lib/messages/reply";

describe("parseReplyPrefix", () => {
  it("returns original text when no prefix", () => {
    expect(parseReplyPrefix("hello")).toEqual({
      replyToMessageId: null,
      replyPreview: "",
      text: "hello",
    });
  });

  it("parses reply prefix and strips it", () => {
    const msg = "[reply:123:hello%20there] hi";
    expect(parseReplyPrefix(msg)).toEqual({
      replyToMessageId: 123,
      replyPreview: "hello there",
      text: "hi",
    });
  });

  it("handles decode failures", () => {
    const msg = "[reply:7:%E0%A4%A] hey";
    expect(parseReplyPrefix(msg)).toMatchObject({
      replyToMessageId: 7,
      text: "hey",
    });
  });
});

