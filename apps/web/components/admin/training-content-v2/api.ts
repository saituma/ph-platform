"use client";

export const TRAINING_CONTENT_V2_API_BASE = "/api/backend/training-content-v2";

export type Metadata = {
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  restSeconds?: number | null;
  steps?: string | null;
  cues?: string | null;
  progression?: string | null;
  regression?: string | null;
  category?: string | null;
  equipment?: string | null;
};

export type SessionItem = {
  id: number;
  sessionId: number;
  blockType: string;
  title: string;
  body: string;
  videoUrl?: string | null;
  allowVideoUpload?: boolean;
  metadata?: Metadata | null;
  order: number;
};

export type ModuleSession = {
  id: number;
  moduleId: number;
  title: string;
  dayLength: number;
  order: number;
  lockedForTiers: Array<"PHP" | "PHP_Premium" | "PHP_Premium_Plus" | "PHP_Pro">;
  items: SessionItem[];
};

export type Module = {
  id: number;
  audienceLabel: string;
  title: string;
  order: number;
  totalDayLength: number;
  lockedForTiers: Array<"PHP" | "PHP_Premium" | "PHP_Premium_Plus" | "PHP_Pro">;
  sessions: ModuleSession[];
};

export type ModuleLock = {
  id: number;
  audienceLabel: string;
  programTier: "PHP" | "PHP_Premium" | "PHP_Premium_Plus" | "PHP_Pro";
  label: string;
  startModuleId: number;
};

export type OtherItem = {
  id: number;
  audienceLabel: string;
  type: string;
  title: string;
  body: string;
  scheduleNote?: string | null;
  videoUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  order: number;
};

export type OtherGroup = {
  type: string;
  label: string;
  enabled: boolean;
  items: OtherItem[];
};

export type AudienceWorkspace = {
  audienceLabel: string;
  modules: Module[];
  moduleLocks: ModuleLock[];
  others: OtherGroup[];
};

export type AudienceSummary = {
  label: string;
  moduleCount: number;
  otherCount: number;
};

export const OTHER_TYPES = [
  { value: "warmup", label: "Warm-Up" },
  { value: "cooldown", label: "Cool-Down" },
  { value: "mobility", label: "Mobility" },
  { value: "recovery", label: "Recovery" },
  { value: "inseason", label: "In-Season Program" },
  { value: "offseason", label: "Off-Season Program" },
  { value: "education", label: "Education" },
] as const;

export const BLOCK_TYPES = [
  { value: "warmup", label: "Warmup" },
  { value: "main", label: "Main session" },
  { value: "cooldown", label: "Cool down" },
] as const;

export const PROGRAM_TIERS = [
  { value: "PHP", label: "PHP Program" },
  { value: "PHP_Premium", label: "PHP Premium" },
  { value: "PHP_Premium_Plus", label: "PHP Premium Plus" },
  { value: "PHP_Pro", label: "PHP Pro" },
] as const;

export const ADULT_AUDIENCE_PREFIX = "adult::";

function getCsrfToken() {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("csrfToken="))
      ?.split("=")[1] ?? ""
  );
}

export async function trainingContentRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${TRAINING_CONTENT_V2_API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(getCsrfToken() ? { "x-csrf-token": getCsrfToken() } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error ?? "Request failed");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

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

export function isProgramTierAudienceLabel(label: string) {
  const normalized = normalizeAudienceLabelInput(label);
  return PROGRAM_TIERS.some((tier) => tier.label === normalized);
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

export function buildMetadata(input: {
  sets: string;
  reps: string;
  duration: string;
  restSeconds: string;
  steps: string;
  cues: string;
  progression: string;
  regression: string;
  category: string;
  equipment: string;
}) {
  const metadata: Metadata = {};
  if (input.sets.trim()) metadata.sets = Number(input.sets);
  if (input.reps.trim()) metadata.reps = Number(input.reps);
  if (input.duration.trim()) metadata.duration = Number(input.duration);
  if (input.restSeconds.trim()) metadata.restSeconds = Number(input.restSeconds);
  if (input.steps.trim()) metadata.steps = input.steps.trim();
  if (input.cues.trim()) metadata.cues = input.cues.trim();
  if (input.progression.trim()) metadata.progression = input.progression.trim();
  if (input.regression.trim()) metadata.regression = input.regression.trim();
  if (input.category.trim()) metadata.category = input.category.trim();
  if (input.equipment.trim()) metadata.equipment = input.equipment.trim();
  return Object.keys(metadata).length ? metadata : null;
}
