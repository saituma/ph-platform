/**
 * Best-effort intrinsic aspect ratio (width / height) from provider oEmbed APIs.
 * Used to size embed containers before / instead of assuming 16:9.
 */
export async function fetchOembedAspectRatio(
  pageUrl: string,
  provider: "youtube" | "loom",
): Promise<number | null> {
  const trimmed = String(pageUrl ?? "").trim();
  if (!trimmed) return null;

  // YouTube Shorts: oEmbed often returns a generic landscape iframe size (e.g. 200×113),
  // not the real 9:16 video — trust the URL path instead.
  if (provider === "youtube" && isYoutubeShortsPath(trimmed)) {
    return 9 / 16;
  }

  const oembedUrl =
    provider === "youtube"
      ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(trimmed)}`
      : `https://www.loom.com/v1/oembed?url=${encodeURIComponent(trimmed)}`;

  try {
    const res = await fetch(oembedUrl);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      width?: number;
      height?: number;
      thumbnail_width?: number;
      thumbnail_height?: number;
    };
    const w = Number(data.width);
    const h = Number(data.height);
    const tw = Number(data.thumbnail_width);
    const th = Number(data.thumbnail_height);
    if (w > 0 && h > 0) {
      const r = w / h;
      // Watch-page oEmbed often reports a 16:9 iframe even for vertical uploads; thumbnails match the real video.
      if (provider === "youtube" && tw > 0 && th > 0) {
        const tr = tw / th;
        if (r > 1.05 && tr < 0.95) return tr;
      }
      return r;
    }
    if (tw > 0 && th > 0) return tw / th;
  } catch {
    return null;
  }
  return null;
}

function isYoutubeShortsPath(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const isYt =
      host === "youtube.com" ||
      host === "www.youtube.com" ||
      host === "m.youtube.com" ||
      host.endsWith(".youtube.com");
    if (!isYt) return false;
    return u.pathname.toLowerCase().startsWith("/shorts/");
  } catch {
    return /(^|\/)shorts\/[A-Za-z0-9_-]{6,}/i.test(url);
  }
}

