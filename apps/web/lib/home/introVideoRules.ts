export type IntroAudience = "team" | "youth" | "adult";
export type IntroVideoRule = { url: string; roles: IntroAudience[]; title?: string; description?: string; posterUrl?: string };
export function normalizeIntroRules(rules: IntroVideoRule[]): IntroVideoRule[] {
  const normalized = rules.map((rule) => ({ url: String(rule?.url ?? "").trim(), roles: Array.isArray(rule?.roles) ? rule.roles : [], title: String(rule?.title ?? "").trim() || undefined, description: String(rule?.description ?? "").trim() || undefined, posterUrl: String(rule?.posterUrl ?? "").trim() || undefined }))
    .map((rule) => ({ ...rule, roles: Array.from(new Set(rule.roles.map((role) => String(role).trim().toLowerCase() as IntroAudience))).filter((role) => role === "team" || role === "youth" || role === "adult") })).filter((rule) => rule.url && rule.roles.length);
  const last = new Map<IntroAudience, number>(); normalized.forEach((rule, index) => rule.roles.forEach((role) => last.set(role, index)));
  return normalized.map((rule, index) => ({ ...rule, roles: rule.roles.filter((role) => last.get(role) === index) })).filter((rule) => rule.roles.length);
}
export function deriveIntroVideos(home: { introVideoUrl?: string; introVideos?: IntroVideoRule[] } | null): IntroVideoRule[] {
  if (!home) return []; const rules = normalizeIntroRules(Array.isArray(home.introVideos) ? home.introVideos : []); if (rules.length) return rules;
  const legacyUrl = String(home.introVideoUrl ?? "").trim(); return legacyUrl ? [{ url: legacyUrl, roles: ["adult", "team", "youth"] }] : [];
}

const DIRECT_VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v", ".mkv", ".ogg", ".ogv", ".m3u8"];
const YOUTUBE_ID = /^[a-zA-Z0-9_-]{11}$/;

function hasValidYoutubeId(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  const path = url.pathname.replace(/^\/+/, "").split("/");
  const id = host === "youtu.be"
    ? path[0]
    : path[0] === "watch"
      ? url.searchParams.get("v")
      : path[0] === "embed" || path[0] === "shorts"
        ? path[1]
        : null;
  return YOUTUBE_ID.test(id ?? "");
}

export function isSupportedIntroVideoUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtube-nocookie.com" || host.endsWith(".youtube-nocookie.com")) return hasValidYoutubeId(url);
    if (host === "loom.com" || host.endsWith(".loom.com")) return /^\/(share|embed)\/[^/]+/.test(url.pathname);
    return DIRECT_VIDEO_EXTENSIONS.some((extension) => url.pathname.toLowerCase().endsWith(extension));
  } catch {
    return false;
  }
}

export function isValidIntroPosterUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
