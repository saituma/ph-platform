export type ParsedReplyPrefix = {
  replyToMessageId: number | null;
  replyPreview: string;
  text: string;
};

const REPLY_PREFIX_RE = /^\[reply:(\d+):([^\]]*)\]\s*/;

export function parseReplyPrefix(raw: string): ParsedReplyPrefix {
  const input = String(raw ?? "");
  const match = input.match(REPLY_PREFIX_RE);
  if (!match) {
    return { replyToMessageId: null, replyPreview: "", text: input };
  }

  const replyToMessageId = Number(match[1]);
  const encodedPreview = match[2] ?? "";
  let replyPreview = "";
  try {
    replyPreview = decodeURIComponent(encodedPreview);
  } catch {
    replyPreview = encodedPreview;
  }

  const text = input.slice(match[0].length);
  return {
    replyToMessageId: Number.isFinite(replyToMessageId) ? replyToMessageId : null,
    replyPreview,
    text,
  };
}

