import type { Request, Response } from "express";
import { z } from "zod";
import {
  listRunTrackingForAdmin,
  listTrainingSnapshotForAdmin,
  listTrainingQuestionnaireAnswersForAdmin,
  listProgramSectionCompletionsForAthlete,
} from "../../services/admin/athlete-plan.service";
import { getUserOnboarding } from "../../services/admin/user.service";

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
