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
