import { Request, Response } from "express";
import { inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db";
import { ProgramType, programSectionContentTable, sessionType } from "../db/schema";
import {
  createProgramSectionContent,
  getProgramSectionContentById,
  deleteProgramSectionContent,
  listProgramSectionContent,
  updateProgramSectionContent,
} from "../services/program-section.service";
import { getTrainingProgressPayload, syncAchievementsForAthlete } from "../services/achievement.service";
import { completeTrainingSession } from "../services/training-session-log.service";
import { getAthleteForUser } from "../services/user.service";
import { calculateAge, clampYouthAge, normalizeDate } from "../lib/age";
import {
  createProgramSectionCompletion,
  getCompletedProgramSectionContentIdsForAthlete,
  isProgramSectionContentCompletedForAthlete,
} from "../services/program-section-completion.service";

function resolveAgeFromAthlete(row: any) {
  if (!row) return null;
  const birthDate = normalizeDate(row.birthDate);
  if (birthDate) {
    return clampYouthAge(calculateAge(birthDate), row.athleteType);
  }
  return clampYouthAge(row.age ?? null, row.athleteType);
}

const tierOrder: Record<(typeof ProgramType.enumValues)[number], number> = {
  PHP: 1,
  PHP_Premium: 2,
  PHP_Premium_Plus: 3,
  PHP_Pro: 4,
};

function normalizeTier(value: unknown): (typeof ProgramType.enumValues)[number] | null {
  if (typeof value !== "string") return null;
  return (ProgramType.enumValues as readonly string[]).includes(value)
    ? (value as (typeof ProgramType.enumValues)[number])
    : null;
}

function isTierAllowed(input: {
  requestedTier: (typeof ProgramType.enumValues)[number] | null;
  allowedTier: (typeof ProgramType.enumValues)[number] | null;
}) {
  const requested = input.requestedTier ?? "PHP";
  const allowed = input.allowedTier ?? "PHP";
  return tierOrder[requested] <= tierOrder[allowed];
}

function normalizeAgeList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

function matchesAgeList(
  item: { ageList?: unknown | null },
  age: number | null,
) {
  const list = normalizeAgeList(item.ageList);
  if (list.length === 0) return true;
  if (age === null || age === undefined) return false;
  return list.includes(age);
}

const listSchema = z.object({
  sectionType: z.enum(sessionType.enumValues).optional(),
  programTier: z.enum(ProgramType.enumValues).optional(),
  age: z.coerce.number().int().optional(),
});

const exerciseMetadataSchema = z.object({
  sets: z.number().int().min(0).optional().nullable(),
  reps: z.number().int().min(0).optional().nullable(),
  duration: z.number().int().min(0).optional().nullable(),
  restSeconds: z.number().int().min(0).optional().nullable(),
  steps: z.string().optional().nullable(),
  cues: z.string().optional().nullable(),
  progression: z.string().optional().nullable(),
  regression: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  equipment: z.string().optional().nullable(),
}).optional().nullable();

const createSchema = z.object({
  sectionType: z.enum(sessionType.enumValues),
  programTier: z.enum(ProgramType.enumValues).optional().nullable(),
  ageList: z.array(z.number().int().min(0)).optional().nullable(),
  title: z.string().min(1),
  body: z.string().min(1),
  videoUrl: z.string().optional().nullable(),
  allowVideoUpload: z.boolean().optional().nullable(),
  order: z.number().int().min(1).optional().nullable(),
  metadata: exerciseMetadataSchema,
});

const updateSchema = z.object({
  sectionType: z.enum(sessionType.enumValues),
  programTier: z.enum(ProgramType.enumValues).optional().nullable(),
  ageList: z.array(z.number().int().min(0)).optional().nullable(),
  title: z.string().min(1),
  body: z.string().min(1),
  videoUrl: z.string().optional().nullable(),
  allowVideoUpload: z.boolean().optional().nullable(),
  order: z.number().int().min(1).optional().nullable(),
  metadata: exerciseMetadataSchema,
});

const completionSchema = z.object({
  rpe: z.number().int().min(1).max(10).optional().nullable(),
  soreness: z.number().int().min(0).max(10).optional().nullable(),
  fatigue: z.number().int().min(0).max(10).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

const completeSessionSchema = z.object({
  contentIds: z.array(z.coerce.number().int().min(1)).min(1).max(80),
  weekNumber: z.coerce.number().int().min(1).max(52).optional().nullable(),
  sessionLabel: z.string().max(500).optional().nullable(),
  programKey: z.string().max(32).optional().nullable(),
});

export async function listProgramSectionContentHandler(req: Request, res: Response) {
  const input = listSchema.parse(req.query);
  
  let age = Number.isFinite(input.age) ? input.age! : null;

  // If age not provided in query, try to resolve it from the user (athlete or guardian's active athlete)
  // HOWEVER: If user is admin/coach/superAdmin, we WANT them to see everything in the admin lib by default.
  // The mobile app (athlete/guardian) will either pass age or it will be resolved here.
  const isAdmin = req.user && ["admin", "superAdmin", "coach"].includes(req.user.role);

  const athlete = !isAdmin && req.user ? await getAthleteForUser(req.user.id) : null;
  const allowedTier = normalizeTier(athlete?.currentProgramTier) ?? "PHP";
  const requestedTier =
    isAdmin ? (input.programTier ?? null) : (input.programTier ?? allowedTier);

  if (!isAdmin && requestedTier && !isTierAllowed({ requestedTier, allowedTier })) {
    return res.status(403).json({ error: "Plan locked" });
  }

  if (!isAdmin && age === null) {
    age = resolveAgeFromAthlete(athlete);
  }

  const items = await listProgramSectionContent({
    sectionType: input.sectionType,
    programTier: requestedTier ?? null,
    age: age,
    bypassAgeFilter: isAdmin,
  });
  if (!req.user || isAdmin) {
    return res.status(200).json({ items });
  }
  if (!athlete) {
    return res.status(200).json({ items });
  }
  const completedIds = await getCompletedProgramSectionContentIdsForAthlete(athlete.id);
  return res.status(200).json({
    items: items.map((item) => ({
      ...item,
      completed: completedIds.has(item.id),
    })),
  });
}

export async function getProgramSectionContentHandler(req: Request, res: Response) {
  const id = z.coerce.number().int().min(1).parse(req.params.contentId);
  const item = await getProgramSectionContentById(id);
  if (!item) {
    return res.status(404).json({ error: "Content not found" });
  }
  if (!req.user) {
    return res.status(200).json({ item });
  }
  const isAdmin = ["admin", "superAdmin", "coach"].includes(req.user.role);
  if (isAdmin) {
    return res.status(200).json({ item });
  }
  const athlete = await getAthleteForUser(req.user.id);
  const allowedTier = normalizeTier(athlete?.currentProgramTier) ?? "PHP";
  const itemTier = normalizeTier(item.programTier) ?? null;
  if (itemTier && !isTierAllowed({ requestedTier: itemTier, allowedTier })) {
    return res.status(403).json({ error: "Plan locked" });
  }
  const athleteAge = resolveAgeFromAthlete(athlete);
  if (!matchesAgeList(item, athleteAge)) {
    return res.status(403).json({ error: "Content locked" });
  }
  if (!athlete) {
    return res.status(200).json({ item });
  }
  const completed = await isProgramSectionContentCompletedForAthlete({
    athleteId: athlete.id,
    contentId: id,
  });
  return res.status(200).json({ item: { ...item, completed } });
}

export async function createProgramSectionContentHandler(req: Request, res: Response) {
  const input = createSchema.parse(req.body);
  const item = await createProgramSectionContent({
    sectionType: input.sectionType,
    programTier: input.programTier ?? null,
    ageList: input.ageList ?? null,
    title: input.title,
    body: input.body,
    videoUrl: input.videoUrl ?? null,
    allowVideoUpload: input.allowVideoUpload ?? null,
    metadata: input.metadata ?? null,
    order: input.order ?? null,
    createdBy: req.user!.id,
  });
  return res.status(201).json({ item });
}

export async function updateProgramSectionContentHandler(req: Request, res: Response) {
  const id = z.coerce.number().int().min(1).parse(req.params.contentId);
  const input = updateSchema.parse(req.body);
  const item = await updateProgramSectionContent({
    id,
    sectionType: input.sectionType,
    programTier: input.programTier ?? null,
    ageList: input.ageList ?? null,
    title: input.title,
    body: input.body,
    videoUrl: input.videoUrl ?? null,
    allowVideoUpload: input.allowVideoUpload ?? null,
    metadata: input.metadata ?? null,
    order: input.order ?? null,
  });
  if (!item) {
    return res.status(404).json({ error: "Content not found" });
  }
  return res.status(200).json({ item });
}

export async function deleteProgramSectionContentHandler(req: Request, res: Response) {
  const id = z.coerce.number().int().min(1).parse(req.params.contentId);
  const item = await deleteProgramSectionContent(id);
  if (!item) {
    return res.status(404).json({ error: "Content not found" });
  }
  return res.status(200).json({ item });
}

export async function completeProgramSectionContentHandler(req: Request, res: Response) {
  const contentId = z.coerce.number().int().min(1).parse(req.params.contentId);
  const input = completionSchema.parse(req.body ?? {});
  const athlete = await getAthleteForUser(req.user!.id);
  if (!athlete) {
    return res.status(400).json({ error: "Onboarding incomplete" });
  }

  const item = await getProgramSectionContentById(contentId);
  if (!item) {
    return res.status(404).json({ error: "Content not found" });
  }
  const allowedTier = normalizeTier(athlete.currentProgramTier) ?? "PHP";
  const itemTier = normalizeTier(item.programTier) ?? null;
  if (itemTier && !isTierAllowed({ requestedTier: itemTier, allowedTier })) {
    return res.status(403).json({ error: "Plan locked" });
  }
  const athleteAge = resolveAgeFromAthlete(athlete);
  if (!matchesAgeList(item, athleteAge)) {
    return res.status(403).json({ error: "Content locked" });
  }

  const row = await createProgramSectionCompletion({
    athleteId: athlete.id,
    programSectionContentId: contentId,
    rpe: input.rpe ?? null,
    soreness: input.soreness ?? null,
    fatigue: input.fatigue ?? null,
    notes: input.notes ?? null,
  });
  const newAchievements = await syncAchievementsForAthlete(athlete.id);
  return res.status(201).json({ item: row, newAchievements });
}

export async function completeTrainingSessionHandler(req: Request, res: Response) {
  const input = completeSessionSchema.parse(req.body ?? {});
  const athlete = await getAthleteForUser(req.user!.id);
  if (!athlete) {
    return res.status(400).json({ error: "Onboarding incomplete" });
  }

  const allowedTier = normalizeTier(athlete.currentProgramTier) ?? "PHP";
  const athleteAge = resolveAgeFromAthlete(athlete);
  const ids = [...new Set(input.contentIds)];
  const rows = await db
    .select()
    .from(programSectionContentTable)
    .where(inArray(programSectionContentTable.id, ids));

  if (rows.length !== ids.length) {
    return res.status(400).json({ error: "One or more exercises are invalid or were removed." });
  }

  for (const row of rows) {
    const itemTier = normalizeTier(row.programTier) ?? null;
    if (itemTier && !isTierAllowed({ requestedTier: itemTier, allowedTier })) {
      return res.status(403).json({ error: "Plan locked" });
    }
    if (!matchesAgeList(row, athleteAge)) {
      return res.status(403).json({ error: "Content locked" });
    }
  }

  try {
    const result = await completeTrainingSession({
      athleteId: athlete.id,
      contentIds: input.contentIds,
      weekNumber: input.weekNumber ?? null,
      sessionLabel: input.sessionLabel ?? null,
      programKey: input.programKey ?? null,
    });

    console.info("[training] session_completed", {
      athleteId: athlete.id,
      exerciseCount: result.completionsLogged,
      programKey: input.programKey ?? null,
      weekNumber: input.weekNumber ?? null,
    });

    return res.status(201).json(result);
  } catch (err: unknown) {
    const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
    if (code === "23503") {
      return res.status(400).json({ error: "One or more exercises are invalid or were removed." });
    }
    throw err;
  }
}

export async function getTrainingProgressHandler(req: Request, res: Response) {
  const athlete = await getAthleteForUser(req.user!.id);
  if (!athlete) {
    return res.status(400).json({ error: "Onboarding incomplete" });
  }
  const payload = await getTrainingProgressPayload(athlete.id);
  return res.status(200).json(payload);
}
