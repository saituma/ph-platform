import type { Request, Response } from "express";
import { z } from "zod";
import {
  listRunTrackingForAdmin,
  listTrainingSnapshotForAdmin,
  listTrainingQuestionnaireAnswersForAdmin,
  listProgramSectionCompletionsForAthlete,
} from "../../services/admin/athlete-plan.service";
import {
  addExerciseToPlanSession,
  clonePremiumPlanFromAssignedTemplate,
  createPlanSession,
  deletePlanExercise,
  deletePlanSession,
  getAthletePremiumPlan,
  listPlanSessionCompletions,
  updatePlanExercise,
  updatePlanSession,
} from "../../services/athlete-plan.service";
import { getUserOnboarding } from "../../services/admin/user.service";
import { sendPushNotification } from "../../services/push.service";

const planSessionSchema = z.object({
  weekNumber: z.number().int().min(1),
  sessionNumber: z.number().int().min(1),
  title: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const planSessionUpdateSchema = planSessionSchema.partial().extend({
  weekNumber: z.number().int().min(1).optional(),
  sessionNumber: z.number().int().min(1).optional(),
});

const planExerciseSchema = z.object({
  exerciseId: z.number().int().min(1),
  order: z.number().int().min(1),
  sets: z.number().int().min(0).optional().nullable(),
  reps: z.number().int().min(0).optional().nullable(),
  duration: z.number().int().min(0).optional().nullable(),
  restSeconds: z.number().int().min(0).optional().nullable(),
  coachingNotes: z.string().optional().nullable(),
  progressionNotes: z.string().optional().nullable(),
  regressionNotes: z.string().optional().nullable(),
});

const planExerciseUpdateSchema = planExerciseSchema.partial().extend({
  order: z.number().int().min(1).optional(),
});

export async function listTrainingSnapshotAdmin(_req: Request, res: Response) {
  const items = await listTrainingSnapshotForAdmin();
  return res.status(200).json({ items });
}

const adminTrainingInsightQuery = z.object({
  userId: z.coerce.number().int().min(1).optional(),
  teamId: z.coerce.number().int().min(1).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export async function listRunTrackingAdmin(req: Request, res: Response) {
  const query = adminTrainingInsightQuery.parse(req.query);
  const result = await listRunTrackingForAdmin({
    userId: query.userId ?? null,
    teamId: query.teamId ?? null,
    from: query.from ? new Date(query.from) : null,
    to: query.to ? new Date(query.to) : null,
    limit: query.limit ?? 100,
  });
  return res.status(200).json(result);
}

export async function listTrainingQuestionnaireAnswersAdmin(req: Request, res: Response) {
  const query = adminTrainingInsightQuery.parse(req.query);
  const result = await listTrainingQuestionnaireAnswersForAdmin({
    userId: query.userId ?? null,
    teamId: query.teamId ?? null,
    from: query.from ? new Date(query.from) : null,
    to: query.to ? new Date(query.to) : null,
    limit: query.limit ?? 100,
  });
  return res.status(200).json(result);
}

export async function listProgramSectionCompletionsAdmin(req: Request, res: Response) {
  const userId = z.coerce.number().int().min(1).parse(req.params.userId);
  const query = z
    .object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
      limit: z.coerce.number().int().min(1).max(500).optional(),
    })
    .parse(req.query);

  const onboarding = await getUserOnboarding(userId);
  const athleteId = onboarding?.athlete?.id ?? null;
  if (!athleteId) {
    return res.status(200).json({ items: [] });
  }

  const items = await listProgramSectionCompletionsForAthlete({
    athleteId,
    from: query.from ? new Date(query.from) : null,
    to: query.to ? new Date(query.to) : null,
    limit: query.limit ?? 200,
  });
  return res.status(200).json({ items });
}

export async function getPremiumPlanAdmin(req: Request, res: Response) {
  const userId = z.coerce.number().int().min(1).parse(req.params.userId);
  const query = z.object({ weekNumber: z.coerce.number().int().min(1).optional() }).parse(req.query);
  const onboarding = await getUserOnboarding(userId);
  const athleteId = onboarding?.athlete?.id ?? null;
  if (!athleteId) {
    return res.status(200).json({ items: [] });
  }
  const items = await getAthletePremiumPlan({ athleteId, weekNumber: query.weekNumber ?? null });
  return res.status(200).json({ items });
}

export async function listPremiumSessionCheckinsAdmin(req: Request, res: Response) {
  const userId = z.coerce.number().int().min(1).parse(req.params.userId);
  const query = z.object({ limit: z.coerce.number().int().min(1).max(200).optional() }).parse(req.query);
  const onboarding = await getUserOnboarding(userId);
  const athleteId = onboarding?.athlete?.id ?? null;
  if (!athleteId) {
    return res.status(200).json({ items: [] });
  }
  const items = await listPlanSessionCompletions({ athleteId, limit: query.limit ?? 50 });
  return res.status(200).json({ items });
}

export async function clonePremiumPlanAdmin(req: Request, res: Response) {
  const userId = z.coerce.number().int().min(1).parse(req.params.userId);
  const body = z.object({ replaceExisting: z.boolean().optional() }).parse(req.body ?? {});
  const onboarding = await getUserOnboarding(userId);
  const athleteId = onboarding?.athlete?.id ?? null;
  if (!athleteId) {
    return res.status(400).json({ error: "Athlete not found." });
  }
  const result = await clonePremiumPlanFromAssignedTemplate({
    athleteId,
    coachId: req.user!.id,
    replaceExisting: body.replaceExisting ?? true,
  });

  sendPushNotification(
    userId,
    "Your training plan is ready",
    "Your coach has built a personalized plan for you. Open Programs to get started.",
    { type: "premium-plan", screen: "programs" },
  ).catch(() => {});

  return res.status(201).json({ result });
}

export async function createPremiumPlanSessionAdmin(req: Request, res: Response) {
  const userId = z.coerce.number().int().min(1).parse(req.params.userId);
  const input = planSessionSchema.parse(req.body);
  const onboarding = await getUserOnboarding(userId);
  const athleteId = onboarding?.athlete?.id ?? null;
  if (!athleteId) {
    return res.status(400).json({ error: "Athlete not found." });
  }
  const item = await createPlanSession({
    athleteId,
    coachId: req.user!.id,
    weekNumber: input.weekNumber,
    sessionNumber: input.sessionNumber,
    title: input.title ?? null,
    notes: input.notes ?? null,
  });
  return res.status(201).json({ item });
}

export async function updatePremiumPlanSessionAdmin(req: Request, res: Response) {
  const sessionId = z.coerce.number().int().min(1).parse(req.params.sessionId);
  const input = planSessionUpdateSchema.parse(req.body);
  const item = await updatePlanSession({
    id: sessionId,
    weekNumber: input.weekNumber ?? null,
    sessionNumber: input.sessionNumber ?? null,
    title: input.title ?? null,
    notes: input.notes ?? null,
  });
  if (!item) return res.status(404).json({ error: "Session not found." });
  return res.status(200).json({ item });
}

export async function deletePremiumPlanSessionAdmin(req: Request, res: Response) {
  const sessionId = z.coerce.number().int().min(1).parse(req.params.sessionId);
  const item = await deletePlanSession(sessionId);
  if (!item) return res.status(404).json({ error: "Session not found." });
  return res.status(200).json({ item });
}

export async function addPremiumPlanExerciseAdmin(req: Request, res: Response) {
  const sessionId = z.coerce.number().int().min(1).parse(req.params.sessionId);
  const input = planExerciseSchema.parse(req.body);
  const item = await addExerciseToPlanSession({
    planSessionId: sessionId,
    exerciseId: input.exerciseId,
    order: input.order,
    sets: input.sets ?? null,
    reps: input.reps ?? null,
    duration: input.duration ?? null,
    restSeconds: input.restSeconds ?? null,
    coachingNotes: input.coachingNotes ?? null,
    progressionNotes: input.progressionNotes ?? null,
    regressionNotes: input.regressionNotes ?? null,
  });
  return res.status(201).json({ item });
}

export async function updatePremiumPlanExerciseAdmin(req: Request, res: Response) {
  const planExerciseId = z.coerce.number().int().min(1).parse(req.params.planExerciseId);
  const input = planExerciseUpdateSchema.parse(req.body);
  const item = await updatePlanExercise({
    id: planExerciseId,
    order: input.order ?? null,
    sets: input.sets ?? null,
    reps: input.reps ?? null,
    duration: input.duration ?? null,
    restSeconds: input.restSeconds ?? null,
    coachingNotes: input.coachingNotes ?? null,
    progressionNotes: input.progressionNotes ?? null,
    regressionNotes: input.regressionNotes ?? null,
  });
  if (!item) return res.status(404).json({ error: "Exercise not found." });
  return res.status(200).json({ item });
}

export async function deletePremiumPlanExerciseAdmin(req: Request, res: Response) {
  const planExerciseId = z.coerce.number().int().min(1).parse(req.params.planExerciseId);
  const item = await deletePlanExercise(planExerciseId);
  if (!item) return res.status(404).json({ error: "Exercise not found." });
  return res.status(200).json({ item });
}
