import { Image } from "expo-image";

const MAX_PER_BATCH = 20;

type MediaLike = {
  mediaUrl?: string | null;
  contentType?: string | null;
};

/**
 * Preloads image bytes into the expo-image disk cache so list scroll feels snappy.
 */
export function schedulePrefetchChatMessageMedia(messages: MediaLike[]): void {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const m of messages) {
    const ct = String(m.contentType ?? "text").toLowerCase();
    if (ct !== "image" && !ct.startsWith("image/")) continue;
    const u = String(m.mediaUrl ?? "").trim();
    if (!u || !u.startsWith("http") || seen.has(u)) continue;
    seen.add(u);
    urls.push(u);
    if (urls.length >= MAX_PER_BATCH) break;
  }
  if (urls.length === 0) return;

  void (async () => {
    for (const u of urls) {
      try {
        await Image.prefetch(u);
      } catch {
        /* non-fatal */
      }
    }
  })();
}
