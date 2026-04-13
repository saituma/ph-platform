export const ADULT_AUDIENCE_PREFIX = "adult::";
export const TEAM_AUDIENCE_PREFIX = "team::";

export const PROGRAM_TIERS = [
  { value: "PHP", label: "PHP Program" },
  { value: "PHP_Premium", label: "PHP Premium" },
  { value: "PHP_Premium_Plus", label: "PHP Premium Plus" },
  { value: "PHP_Pro", label: "PHP Pro" },
] as const;

export function normalizeAudienceLabelInput(input: string) {
  const cleaned = input.trim().replace(/\s+/g, " ");
  if (!cleaned) return "All";
  if (/^all$/i.test(cleaned)) return "All";
  const range = cleaned.match(/^(\d{1,2})\s*-\s*(\d{1,2})$/);
  if (range) {
    const start = Number(range[1]);
    const end = Number(range[2]);
    return `${Math.min(start, end)}-${Math.max(start, end)}`;
  }
  const exact = cleaned.match(/^(\d{1,2})$/);
  if (exact) return String(Number(exact[1]));
  return cleaned;
}

export function isYouthAgeAudienceLabel(label: string, maxYouthAge = 18) {
  const normalized = normalizeAudienceLabelInput(label);
  if (normalized === "All") return true;

  const exact = normalized.match(/^(\d{1,2})$/);
  if (exact) return Number(exact[1]) <= maxYouthAge;

  const range = normalized.match(/^(\d{1,2})-(\d{1,2})$/);
  if (range) {
    const max = Number(range[2]);
    return max <= maxYouthAge;
  }

  return false;
}

export function isAdultStorageAudienceLabel(label: string) {
  return normalizeAudienceLabelInput(label).startsWith(ADULT_AUDIENCE_PREFIX);
}

export function toStorageAudienceLabel(input: { audienceLabel: string; adultMode?: boolean }) {
  const normalized = normalizeAudienceLabelInput(input.audienceLabel);
  if (!input.adultMode) return normalized;
  return `${ADULT_AUDIENCE_PREFIX}${normalized}`;
}

export function fromStorageAudienceLabel(label: string) {
  const normalized = normalizeAudienceLabelInput(label);
  if (!normalized.startsWith(ADULT_AUDIENCE_PREFIX)) return normalized;
  return normalizeAudienceLabelInput(normalized.slice(ADULT_AUDIENCE_PREFIX.length));
}

export function isTeamStorageAudienceLabel(label: string) {
  return normalizeAudienceLabelInput(label).startsWith(TEAM_AUDIENCE_PREFIX);
}

export function toTeamStorageAudienceLabel(teamName: string) {
  const normalized = teamName.trim().replace(/\s+/g, " ").replace(/::+/g, ":");
  return `${TEAM_AUDIENCE_PREFIX}${normalized || "All"}`;
}

export function fromTeamStorageAudienceLabel(label: string) {
  const normalized = normalizeAudienceLabelInput(label);
  if (!normalized.startsWith(TEAM_AUDIENCE_PREFIX)) return normalized;
  return normalized.slice(TEAM_AUDIENCE_PREFIX.length);
}
