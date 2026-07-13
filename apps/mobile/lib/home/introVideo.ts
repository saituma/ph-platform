export type IntroAudience = "team" | "youth" | "adult";
export type IntroVideoRule = { url: string; roles: IntroAudience[]; title?: string; description?: string; posterUrl?: string };
const AUDIENCES: IntroAudience[] = ["adult", "team", "youth"];
const optionalText = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : undefined;

export function normalizeIntroVideoRules(value: unknown): IntroVideoRule[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate): IntroVideoRule[] => {
    const rule = candidate as Record<string, unknown> | null;
    const url = optionalText(rule?.url);
    const rawRoles = Array.isArray(rule?.roles) ? rule.roles : typeof rule?.roles === "string" ? rule.roles.split(/[,|\s]+/) : [];
    const roles = Array.from(new Set(rawRoles.map(String).map((role) => role.trim().toLowerCase())
      .filter((role): role is IntroAudience => AUDIENCES.includes(role as IntroAudience)))).sort() as IntroAudience[];
    if (!url || !roles.length) return [];
    const title = optionalText(rule?.title);
    const description = optionalText(rule?.description);
    const posterUrl = optionalText(rule?.posterUrl);
    return [{ url, roles, ...(title ? { title } : {}), ...(description ? { description } : {}), ...(posterUrl ? { posterUrl } : {}) }];
  });
}

export function pickIntroVideoForAudience(rules: IntroVideoRule[] | null | undefined, audience: IntroAudience | null, legacyUrl: string | null | undefined): IntroVideoRule | null {
  if (rules?.length) return audience ? rules.find((rule) => rule.roles.includes(audience)) ?? null : null;
  const url = optionalText(legacyUrl);
  return url ? { url, roles: [...AUDIENCES] } : null;
}

export function resolveIntroPoster(rule: Pick<IntroVideoRule, "posterUrl">, providerPoster?: string | null, heroPoster?: string | null): string | null {
  return optionalText(rule.posterUrl) ?? optionalText(providerPoster) ?? optionalText(heroPoster) ?? null;
}

export function getIntroStageSize(width: number, windowHeight: number, aspectRatio?: number | null) {
  const ratio = aspectRatio && Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 16 / 9;
  return { width, height: Math.round(Math.min(width / ratio, windowHeight * 0.62)) };
}

export type IntroVideoSource = "direct" | "youtube" | "loom";
export function classifyIntroVideoSource(url: string): IntroVideoSource {
  const value = url.toLowerCase();
  if (value.includes("youtube.com") || value.includes("youtube-nocookie.com") || value.includes("youtu.be")) return "youtube";
  if (value.includes("loom.com") || value.includes("useloom.com")) return "loom";
  return "direct";
}

export function youtubePosterUrl(url: string): string | null {
  const id = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)?.[1];
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}
