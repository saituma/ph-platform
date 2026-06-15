import { Request, Response } from "express";
import { z } from "zod";
import { asc, ilike } from "drizzle-orm";
import { db } from "../db";
import { athleteTable } from "../db/schema";
import {
  listProgrammes,
  getProgrammeFull,
  createProgramme,
  updateProgramme,
  deleteProgramme,
  publishProgramme,
  createWeek,
  updateWeek,
  deleteWeek,
  createWeekType,
  updateWeekType,
  deleteWeekType,
  createDaySession,
  updateDaySession,
  deleteDaySession,
  addExercise,
  updateExercise,
  deleteExercise,
  reorderExercises,
  listProgrammeAssignments,
  assignAthletes,
  unassignAthlete,
} from "../services/preseason-programme/authoring.service";
import {
  getProgrammeOverview,
  getWeekTypes,
  getWeekSessions,
  getDaySessionDetail,
} from "../services/preseason-programme/delivery.service";
import { selectWeekType } from "../services/preseason-programme/selection.service";
import { completeDaySession } from "../services/preseason-programme/completion.service";
import { getAthleteForUser } from "../services/user.service";
import { getSocketServer } from "../socket-hub";
import { ProgramType, AthleteType, preseasonSessionCategory, preseasonExerciseMetric } from "../db/schema";

const idParam = z.coerce.number().int().min(1);

function emitChanged() {
  const io = getSocketServer();
  if (!io) return;
  io.emit("program:changed", { action: "preseason" });
}

async function resolveAthlete(req: Request, res: Response) {
  const athlete = await getAthleteForUser(req.user!.id);
  if (!athlete) {
    res.status(403).json({ error: "Athlete profile not found" });
    return null;
  }
  if (athlete.athleteType !== "adult") {
    res.status(403).json({ error: "Adult programme only" });
    return null;
  }
  return athlete;
}

// ─── Admin handlers ───────────────────────────────────────────────────────────

export async function listProgrammesHandler(_req: Request, res: Response) {
  const items = await listProgrammes();
  return res.status(200).json({ items });
}

export async function getProgrammeFullHandler(req: Request, res: Response) {
  const id = idParam.parse(req.params.id);
  const programme = await getProgrammeFull(id);
  if (!programme) return res.status(404).json({ error: "Programme not found" });
  return res.status(200).json({ programme });
}

const createProgrammeSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  weekCount: z.number().int().min(1).optional().nullable(),
  requiredTier: z.enum(ProgramType.enumValues).optional().nullable(),
  athleteType: z.enum(AthleteType.enumValues).optional(),
});

export async function createProgrammeHandler(req: Request, res: Response) {
  const input = createProgrammeSchema.parse(req.body);
  const item = await createProgramme({ ...input, createdBy: req.user!.id });
  emitChanged();
  return res.status(201).json({ item });
}

const updateProgrammeSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  weekCount: z.number().int().min(1).optional().nullable(),
  requiredTier: z.enum(ProgramType.enumValues).optional().nullable(),
  athleteType: z.enum(AthleteType.enumValues).optional(),
});

export async function updateProgrammeHandler(req: Request, res: Response) {
  const id = idParam.parse(req.params.id);
  const input = updateProgrammeSchema.parse(req.body);
  const item = await updateProgramme(id, input);
  if (!item) return res.status(404).json({ error: "Programme not found" });
  emitChanged();
  return res.status(200).json({ item });
}

export async function deleteProgrammeHandler(req: Request, res: Response) {
  const id = idParam.parse(req.params.id);
  const item = await deleteProgramme(id);
  if (!item) return res.status(404).json({ error: "Programme not found" });
  emitChanged();
  return res.status(200).json({ item });
}

const publishProgrammeSchema = z.object({
  isPublished: z.boolean(),
});

export async function publishProgrammeHandler(req: Request, res: Response) {
  const id = idParam.parse(req.params.id);
  const { isPublished } = publishProgrammeSchema.parse(req.body);
  const item = await publishProgramme(id, isPublished);
  if (!item) return res.status(404).json({ error: "Programme not found" });
  emitChanged();
  return res.status(200).json({ item });
}

const createWeekSchema = z.object({
  programmeId: z.number().int().min(1),
  weekNumber: z.number().int().min(1),
  title: z.string().max(255).optional().nullable(),
});

export async function createWeekHandler(req: Request, res: Response) {
  const input = createWeekSchema.parse(req.body);
  const item = await createWeek(input);
  emitChanged();
  return res.status(201).json({ item });
}

const updateWeekSchema = z.object({
  weekNumber: z.number().int().min(1).optional(),
  title: z.string().max(255).optional().nullable(),
});

export async function updateWeekHandler(req: Request, res: Response) {
  const id = idParam.parse(req.params.id);
  const input = updateWeekSchema.parse(req.body);
  const item = await updateWeek(id, input);
  if (!item) return res.status(404).json({ error: "Week not found" });
  emitChanged();
  return res.status(200).json({ item });
}

export async function deleteWeekHandler(req: Request, res: Response) {
  const id = idParam.parse(req.params.id);
  const item = await deleteWeek(id);
  if (!item) return res.status(404).json({ error: "Week not found" });
  emitChanged();
  return res.status(200).json({ item });
}

const createWeekTypeSchema = z.object({
  weekId: z.number().int().min(1),
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  order: z.number().int().min(1).optional().nullable(),
});

export async function createWeekTypeHandler(req: Request, res: Response) {
  const input = createWeekTypeSchema.parse(req.body);
  const item = await createWeekType(input);
  emitChanged();
  return res.status(201).json({ item });
}

const updateWeekTypeSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  order: z.number().int().min(1).optional(),
});

export async function updateWeekTypeHandler(req: Request, res: Response) {
  const id = idParam.parse(req.params.id);
  const input = updateWeekTypeSchema.parse(req.body);
  const item = await updateWeekType(id, input);
  if (!item) return res.status(404).json({ error: "Week type not found" });
  emitChanged();
  return res.status(200).json({ item });
}

export async function deleteWeekTypeHandler(req: Request, res: Response) {
  const id = idParam.parse(req.params.id);
  const item = await deleteWeekType(id);
  if (!item) return res.status(404).json({ error: "Week type not found" });
  emitChanged();
  return res.status(200).json({ item });
}

const createDaySessionSchema = z.object({
  weekTypeId: z.number().int().min(1),
  dayOfWeek: z.number().int().min(1).max(7),
  category: z.enum(preseasonSessionCategory.enumValues),
  title: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  durationLabel: z.string().max(64).optional().nullable(),
  intensityLabel: z.string().max(64).optional().nullable(),
  focusLabel: z.string().max(64).optional().nullable(),
});

export async function createDaySessionHandler(req: Request, res: Response) {
  const input = createDaySessionSchema.parse(req.body);
  const item = await createDaySession(input);
  emitChanged();
  return res.status(201).json({ item });
}

const updateDaySessionSchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7).optional(),
  category: z.enum(preseasonSessionCategory.enumValues).optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  durationLabel: z.string().max(64).optional().nullable(),
  intensityLabel: z.string().max(64).optional().nullable(),
  focusLabel: z.string().max(64).optional().nullable(),
});

export async function updateDaySessionHandler(req: Request, res: Response) {
  const id = idParam.parse(req.params.id);
  const input = updateDaySessionSchema.parse(req.body);
  const item = await updateDaySession(id, input);
  if (!item) return res.status(404).json({ error: "Day session not found" });
  emitChanged();
  return res.status(200).json({ item });
}

export async function deleteDaySessionHandler(req: Request, res: Response) {
  const id = idParam.parse(req.params.id);
  const item = await deleteDaySession(id);
  if (!item) return res.status(404).json({ error: "Day session not found" });
  emitChanged();
  return res.status(200).json({ item });
}

const addExerciseSchema = z.object({
  daySessionId: z.number().int().min(1),
  exerciseId: z.number().int().min(1),
  order: z.number().int().min(1),
  metric: z.enum(preseasonExerciseMetric.enumValues).optional().nullable(),
  setsOverride: z.number().int().min(0).optional().nullable(),
  repsOverride: z.number().int().min(0).optional().nullable(),
  durationOverride: z.number().int().min(0).optional().nullable(),
  restSecondsOverride: z.number().int().min(0).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export async function addExerciseHandler(req: Request, res: Response) {
  const input = addExerciseSchema.parse(req.body);
  const item = await addExercise(input);
  emitChanged();
  return res.status(201).json({ item });
}

const updateExerciseSchema = z.object({
  exerciseId: z.number().int().min(1).optional(),
  order: z.number().int().min(1).optional(),
  metric: z.enum(preseasonExerciseMetric.enumValues).optional(),
  setsOverride: z.number().int().min(0).optional().nullable(),
  repsOverride: z.number().int().min(0).optional().nullable(),
  durationOverride: z.number().int().min(0).optional().nullable(),
  restSecondsOverride: z.number().int().min(0).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export async function updateExerciseHandler(req: Request, res: Response) {
  const id = idParam.parse(req.params.id);
  const input = updateExerciseSchema.parse(req.body);
  const item = await updateExercise(id, input);
  if (!item) return res.status(404).json({ error: "Exercise not found" });
  emitChanged();
  return res.status(200).json({ item });
}

export async function deleteExerciseHandler(req: Request, res: Response) {
  const id = idParam.parse(req.params.id);
  const item = await deleteExercise(id);
  if (!item) return res.status(404).json({ error: "Exercise not found" });
  emitChanged();
  return res.status(200).json({ item });
}

const reorderExercisesSchema = z.object({
  orderedIds: z.array(z.number().int().min(1)).min(1),
});

export async function reorderExercisesHandler(req: Request, res: Response) {
  const id = idParam.parse(req.params.id);
  const { orderedIds } = reorderExercisesSchema.parse(req.body);
  const items = await reorderExercises(id, orderedIds);
  emitChanged();
  return res.status(200).json({ items });
}

export async function listAssignmentsHandler(req: Request, res: Response) {
  const programmeId = z.coerce.number().int().min(1).parse(req.params.programmeId);
  const assignments = await listProgrammeAssignments(programmeId);
  return res.status(200).json({ assignments });
}

export async function assignAthletesHandler(req: Request, res: Response) {
  const programmeId = z.coerce.number().int().min(1).parse(req.params.programmeId);
  const { athleteIds } = z.object({ athleteIds: z.array(z.coerce.number().int().min(1)).min(1) }).parse(req.body);
  const result = await assignAthletes(programmeId, athleteIds, req.user!.id);
  return res.status(200).json({ assigned: result.length });
}

export async function unassignAthleteHandler(req: Request, res: Response) {
  const programmeId = z.coerce.number().int().min(1).parse(req.params.programmeId);
  const athleteId = z.coerce.number().int().min(1).parse(req.params.athleteId);
  const result = await unassignAthlete(programmeId, athleteId);
  if (!result) return res.status(404).json({ error: "Assignment not found" });
  return res.status(200).json({ unassigned: athleteId });
}

export async function listAllAthletesHandler(req: Request, res: Response) {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const athletes = await db
    .select({ id: athleteTable.id, name: athleteTable.name, athleteType: athleteTable.athleteType })
    .from(athleteTable)
    .where(q ? ilike(athleteTable.name, `%${q}%`) : undefined)
    .orderBy(asc(athleteTable.name))
    .limit(50);
  return res.status(200).json({ athletes });
}

// ─── Athlete handlers ─────────────────────────────────────────────────────────

export async function getOverviewHandler(req: Request, res: Response) {
  const athlete = await resolveAthlete(req, res);
  if (!athlete) return;

  const result = await getProgrammeOverview({
    athleteId: athlete.id,
    athleteType: athlete.athleteType ?? "adult",
    currentProgramTier: athlete.currentProgramTier ?? null,
  });

  if (!result) {
    return res.status(404).json({ error: "No published programme found", lockedReason: "not_published" });
  }

  if ("accessDenied" in result) {
    return res.status(403).json({ error: "Tier required", lockedReason: result.lockedReason });
  }

  return res.status(200).json(result);
}

export async function getWeekTypesHandler(req: Request, res: Response) {
  const weekId = idParam.parse(req.params.weekId);
  const items = await getWeekTypes(weekId);
  return res.status(200).json({ items });
}

const selectWeekTypeSchema = z.object({
  weekTypeId: z.number().int().min(1),
});

export async function selectWeekTypeHandler(req: Request, res: Response) {
  const athlete = await resolveAthlete(req, res);
  if (!athlete) return;

  const weekId = idParam.parse(req.params.weekId);
  const { weekTypeId } = selectWeekTypeSchema.parse(req.body);

  try {
    const item = await selectWeekType({ athleteId: athlete.id, weekId, weekTypeId });
    return res.status(200).json({ item });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Selection failed";
    if (message === "Week is locked") {
      return res.status(403).json({ error: "Week is locked" });
    }
    if (message === "Week type does not belong to this week") {
      return res.status(400).json({ error: message });
    }
    return res.status(400).json({ error: message });
  }
}

export async function getWeekSessionsHandler(req: Request, res: Response) {
  const athlete = await resolveAthlete(req, res);
  if (!athlete) return;

  const weekId = idParam.parse(req.params.weekId);
  const result = await getWeekSessions({ athleteId: athlete.id, weekId });

  if (!result) return res.status(404).json({ error: "Week not found" });
  return res.status(200).json(result);
}

export async function getDaySessionDetailHandler(req: Request, res: Response) {
  const athlete = await resolveAthlete(req, res);
  if (!athlete) return;

  const daySessionId = idParam.parse(req.params.daySessionId);
  const result = await getDaySessionDetail({ athleteId: athlete.id, daySessionId });

  if (!result) return res.status(404).json({ error: "Day session not found" });
  if ("locked" in result) return res.status(403).json({ error: "Week is locked" });
  return res.status(200).json(result);
}

export async function completeSessionHandler(req: Request, res: Response) {
  const athlete = await resolveAthlete(req, res);
  if (!athlete) return;

  const daySessionId = idParam.parse(req.params.daySessionId);
  const result = await completeDaySession({ athleteId: athlete.id, daySessionId });
  return res.status(200).json(result);
}
