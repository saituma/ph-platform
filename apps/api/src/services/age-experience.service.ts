import { desc, eq } from "drizzle-orm";

import { db } from "../db";
import { ageExperienceTable, athleteTable, guardianTable } from "../db/schema";
import { calculateAge, clampYouthAge, normalizeDate } from "../lib/age";

type AgeExperienceRule = typeof ageExperienceTable.$inferSelect;

function resolveAgeFromAthlete(row: typeof athleteTable.$inferSelect | null | undefined) {
  if (!row) return null;
  const birthDate = normalizeDate(row.birthDate as any);
  if (birthDate) {
    return clampYouthAge(calculateAge(birthDate), row.athleteType);
  }
  return clampYouthAge(row.age ?? null, row.athleteType);
}

async function resolveAthleteAge(userId: number) {
  const athlete = await db.select().from(athleteTable).where(eq(athleteTable.userId, userId)).limit(1);
  if (athlete.length) {
    return resolveAgeFromAthlete(athlete[0]);
  }
  const guardian = await db.select().from(guardianTable).where(eq(guardianTable.userId, userId)).limit(1);
  const activeAthleteId = guardian[0]?.activeAthleteId ?? null;
  if (!activeAthleteId) return null;
  const activeAthlete = await db.select().from(athleteTable).where(eq(athleteTable.id, activeAthleteId)).limit(1);
  return resolveAgeFromAthlete(activeAthlete[0]);
}

function matchesAgeRange(rule: Pick<AgeExperienceRule, "minAge" | "maxAge">, age: number | null) {
  if (age === null) return true;
  if (rule.minAge !== null && rule.minAge !== undefined && age < rule.minAge) return false;
  if (rule.maxAge !== null && rule.maxAge !== undefined && age > rule.maxAge) return false;
  return true;
}

function ruleSpecificity(rule: AgeExperienceRule) {
  const min = rule.minAge ?? -1000;
  const max = rule.maxAge ?? 1000;
  return Math.abs(max - min);
}

export async function listAgeExperienceRules() {
  return db.select().from(ageExperienceTable).orderBy(desc(ageExperienceTable.updatedAt));
}

export async function createAgeExperienceRule(input: {
  title: string;
  minAge?: number | null;
  maxAge?: number | null;
  isDefault?: boolean | null;
  uiPreset?: string | null;
  fontSizeOption?: string | null;
  density?: string | null;
  hiddenSections?: string[] | null;
  createdBy: number;
}) {
  const result = await db
    .insert(ageExperienceTable)
    .values({
      title: input.title,
      minAge: input.minAge ?? null,
      maxAge: input.maxAge ?? null,
      isDefault: input.isDefault ?? false,
      uiPreset: input.uiPreset ?? "standard",
      fontSizeOption: input.fontSizeOption ?? "default",
      density: input.density ?? "default",
      hiddenSections: input.hiddenSections ?? null,
      createdBy: input.createdBy,
    })
    .returning();

  return result[0];
}

export async function updateAgeExperienceRule(input: {
  id: number;
  title?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  isDefault?: boolean | null;
  uiPreset?: string | null;
  fontSizeOption?: string | null;
  density?: string | null;
  hiddenSections?: string[] | null;
  updatedBy: number;
}) {
  const result = await db
    .update(ageExperienceTable)
    .set({
      title: input.title ?? undefined,
      minAge: input.minAge ?? undefined,
      maxAge: input.maxAge ?? undefined,
      isDefault: input.isDefault ?? undefined,
      uiPreset: input.uiPreset ?? undefined,
      fontSizeOption: input.fontSizeOption ?? undefined,
      density: input.density ?? undefined,
      hiddenSections: input.hiddenSections ?? undefined,
      updatedBy: input.updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(ageExperienceTable.id, input.id))
    .returning();

  return result[0] ?? null;
}

export async function deleteAgeExperienceRule(id: number) {
  const result = await db.delete(ageExperienceTable).where(eq(ageExperienceTable.id, id)).returning();
  return result[0] ?? null;
}

function pickDefaultRule(rules: AgeExperienceRule[]) {
  return (
    rules
      .filter((rule) => rule.isDefault)
      .sort((a, b) => {
        const aTime = a.updatedAt?.getTime?.() ?? 0;
        const bTime = b.updatedAt?.getTime?.() ?? 0;
        return bTime - aTime;
      })[0] ?? null
  );
}

export async function getAgeExperienceForUser(userId: number) {
  const age = await resolveAthleteAge(userId);
  const rules = await db.select().from(ageExperienceTable);
  if (!rules.length) return null;

  const matches = rules.filter((rule) => matchesAgeRange(rule, age));
  if (!matches.length) {
    return pickDefaultRule(rules);
  }
  return matches.sort((a, b) => {
    const specDiff = ruleSpecificity(a) - ruleSpecificity(b);
    if (specDiff !== 0) return specDiff;
    const aMin = a.minAge ?? -1000;
    const bMin = b.minAge ?? -1000;
    if (aMin !== bMin) return bMin - aMin;
    return (b.updatedAt?.getTime?.() ?? 0) - (a.updatedAt?.getTime?.() ?? 0);
  })[0];
}
