import { eq, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  trainingAudienceTable,
  trainingModuleTable,
  trainingOtherContentTable,
} from "../../db/schema";

export function normalizeAudienceLabel(input: string) {
  const cleaned = input.trim().replace(/\s+/g, " ");
  if (!cleaned) return "All";
  if (/^all$/i.test(cleaned)) return "All";
  const rangeMatch = cleaned.match(/^(\d{1,2})\s*-\s*(\d{1,2})$/);
  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    return `${min}-${max}`;
  }
  const exactMatch = cleaned.match(/^(\d{1,2})$/);
  if (exactMatch) {
    return String(Number(exactMatch[1]));
  }
  return cleaned;
}

export function audienceMatchesAge(label: string, age: number) {
  const normalized = normalizeAudienceLabel(label);
  if (normalized === "All") return true;
  const exact = normalized.match(/^(\d{1,2})$/);
  if (exact) return Number(exact[1]) === age;
  const range = normalized.match(/^(\d{1,2})-(\d{1,2})$/);
  if (range) {
    const min = Number(range[1]);
    const max = Number(range[2]);
    return age >= min && age <= max;
  }
  return false;
}

export function otherItemMatchesAgeLabel(label: string, age: number) {
  const normalized = normalizeAudienceLabel(label);
  if (normalized === label && !/^(\d{1,2})(-(\d{1,2}))?$/.test(normalized)) {
    return false;
  }
  return audienceMatchesAge(normalized, age);
}

export function audienceScore(label: string, age: number) {
  const normalized = normalizeAudienceLabel(label);
  if (!audienceMatchesAge(normalized, age)) return -1;
  if (normalized === "All") return 1;
  const exact = normalized.match(/^(\d{1,2})$/);
  if (exact) return 1000;
  const range = normalized.match(/^(\d{1,2})-(\d{1,2})$/);
  if (range) {
    const span = Number(range[2]) - Number(range[1]);
    return 500 - span;
  }
  return 10;
}

export async function ensureTrainingAudienceExists(audienceLabel: string, createdBy: number) {
  const normalizedAudienceLabel = normalizeAudienceLabel(audienceLabel);
  const existing = await db
    .select({ id: trainingAudienceTable.id, label: trainingAudienceTable.label })
    .from(trainingAudienceTable)
    .where(eq(trainingAudienceTable.label, normalizedAudienceLabel));
  if (existing[0]) return existing[0];

  const [created] = await db
    .insert(trainingAudienceTable)
    .values({
      label: normalizedAudienceLabel,
      createdBy,
    })
    .onConflictDoNothing({ target: trainingAudienceTable.label })
    .returning({ id: trainingAudienceTable.id, label: trainingAudienceTable.label });
  if (created) return created;

  const fallback = await db
    .select({ id: trainingAudienceTable.id, label: trainingAudienceTable.label })
    .from(trainingAudienceTable)
    .where(eq(trainingAudienceTable.label, normalizedAudienceLabel));
  return fallback[0] ?? null;
}

export async function createTrainingAudience(input: { label: string; createdBy: number }) {
  return ensureTrainingAudienceExists(input.label, input.createdBy);
}

export async function listTrainingAudiences() {
  const [registeredAudiences, modules, others] = await Promise.all([
    db.select({ label: trainingAudienceTable.label }).from(trainingAudienceTable),
    db
      .select({ audienceLabel: trainingModuleTable.audienceLabel, id: trainingModuleTable.id })
      .from(trainingModuleTable),
    db
      .select({ audienceLabel: trainingOtherContentTable.audienceLabel, id: trainingOtherContentTable.id })
      .from(trainingOtherContentTable),
  ]);

  const byAudience = new Map<string, { label: string; moduleCount: number; otherCount: number }>();
  for (const row of registeredAudiences) {
    const label = normalizeAudienceLabel(row.label);
    byAudience.set(label, byAudience.get(label) ?? { label, moduleCount: 0, otherCount: 0 });
  }
  for (const row of modules) {
    const label = normalizeAudienceLabel(row.audienceLabel);
    const current = byAudience.get(label) ?? { label, moduleCount: 0, otherCount: 0 };
    current.moduleCount += 1;
    byAudience.set(label, current);
  }
  for (const row of others) {
    const label = normalizeAudienceLabel(row.audienceLabel);
    const current = byAudience.get(label) ?? { label, moduleCount: 0, otherCount: 0 };
    current.otherCount += 1;
    byAudience.set(label, current);
  }

  return [...byAudience.values()].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}
