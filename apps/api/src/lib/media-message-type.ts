export type MessageMediaType = "text" | "image" | "video";

function inferFromUrl(url: string): MessageMediaType {
  const lower = url.toLowerCase();
  if (lower.includes("/messages/images/")) return "image";
  if (lower.includes("/messages/videos/")) return "video";
  const cleaned = lower.split("?")[0].split("#")[0];
  if (/\.(jpg|jpeg|png|gif|webp|bmp|heic|heif|avif)$/.test(cleaned)) return "image";
  if (/\.(mp4|mov|webm|m4v|avi|mkv)$/.test(cleaned)) return "video";
  return "text";
}

export function resolveMessageMediaType(input: {
  contentType?: string | null;
  mediaUrl?: string | null;
}): MessageMediaType {
  const rawType = String(input.contentType ?? "").toLowerCase().trim();
  if (rawType === "image" || rawType.startsWith("image/")) return "image";
  if (rawType === "video" || rawType.startsWith("video/")) return "video";
  const url = String(input.mediaUrl ?? "").trim();
  if (url) return inferFromUrl(url);
  return "text";
}
