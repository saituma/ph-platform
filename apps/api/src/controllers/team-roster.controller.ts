import type { Request, Response } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";

import {
  STRONG_TEAM_PASSWORD_MAX,
  STRONG_TEAM_PASSWORD_MIN,
  isStrongTeamAthletePassword,
} from "../lib/strong-team-password";
import {
  createTeamRosterAthlete,
  getTeamRosterAthleteDetail,
  listTeamRosterForCoach,
  resetTeamAthletePassword,
  updateTeamEmailSlug,
  updateTeamRosterAthlete,
} from "../services/team-roster.service";
import {
  getManagedAthleteAchievements,
  getManagedAthleteAttendance,
  getManagedAthleteBookings,
  getManagedAthleteEngagement,
  getManagedAthleteInjuries,
  getManagedAthleteNutrition,
  getManagedAthleteProgress,
  getManagedAthleteRuns,
  getManagedAthleteTraining,
  getManagedAthleteWellbeing,
} from "../services/team-roster-athlete-data.service";

const teamIdQuery = z.coerce.number().int().positive().optional();

/** History windows shared by every manager-scoped athlete data read. */
const RANGE_CONFIG = {
  "7d": { days: 7, limit: 200 },
  "30d": { days: 30, limit: 500 },
  all: { days: null, limit: 1000 },
} as const;

const rangeQuery = z.enum(["7d", "30d", "all"]).default("30d");

function resolveWindow(req: Request) {
  const athleteId = z.coerce.number().int().positive().parse(req.params.athleteId);
  const q = teamIdQuery.safeParse(req.query.teamId);
  const teamId = q.success ? q.data : undefined;
  const range = rangeQuery.parse(req.query.range ?? "30d");
  const cfg = RANGE_CONFIG[range];
  const from = cfg.days == null ? null : new Date(Date.now() - cfg.days * 24 * 60 * 60 * 1000);
  return {
    athleteId,
    teamId: teamId ?? null,
    range,
    rangeDays: cfg.days,
    win: { teamId: teamId ?? null, from, to: null, limit: cfg.limit },
  };
}

function handleAthleteDataError(error: unknown, res: Response, label: string) {
  const e = error as { status?: number; message?: string };
  const status = typeof e?.status === "number" ? e.status : 500;
  const message = typeof e?.message === "string" ? e.message : "Failed to load athlete data.";
  if (status >= 500) logger.error({ err: error }, `[team-roster] ${label}`);
  return res.status(status).json({ error: message });
}

export async function getTeamRosterAthleteRuns(req: Request, res: Response) {
  try {
    const { athleteId, win } = resolveWindow(req);
    const data = await getManagedAthleteRuns(req.user!, athleteId, win);
    if (!data) return res.status(404).json({ error: "Athlete not found." });
    return res.status(200).json({ runs: data });
  } catch (error) {
    return handleAthleteDataError(error, res, "getTeamRosterAthleteRuns");
  }
}

export async function getTeamRosterAthleteProgress(req: Request, res: Response) {
  try {
    const { athleteId, win } = resolveWindow(req);
    const data = await getManagedAthleteProgress(req.user!, athleteId, win);
    if (!data) return res.status(404).json({ error: "Athlete not found." });
    return res.status(200).json({ entries: data });
  } catch (error) {
    return handleAthleteDataError(error, res, "getTeamRosterAthleteProgress");
  }
}

export async function getTeamRosterAthleteAttendance(req: Request, res: Response) {
  try {
    const { athleteId, win } = resolveWindow(req);
    const data = await getManagedAthleteAttendance(req.user!, athleteId, win);
    if (!data) return res.status(404).json({ error: "Athlete not found." });
    return res.status(200).json({ attendance: data });
  } catch (error) {
    return handleAthleteDataError(error, res, "getTeamRosterAthleteAttendance");
  }
}

export async function getTeamRosterAthleteTraining(req: Request, res: Response) {
  try {
    const { athleteId, win } = resolveWindow(req);
    const data = await getManagedAthleteTraining(req.user!, athleteId, win);
    if (!data) return res.status(404).json({ error: "Athlete not found." });
    return res.status(200).json(data);
  } catch (error) {
    return handleAthleteDataError(error, res, "getTeamRosterAthleteTraining");
  }
}

export async function getTeamRosterAthleteAchievements(req: Request, res: Response) {
  try {
    const athleteId = z.coerce.number().int().positive().parse(req.params.athleteId);
    const q = teamIdQuery.safeParse(req.query.teamId);
    const teamId = q.success ? q.data : undefined;
    const data = await getManagedAthleteAchievements(req.user!, athleteId, teamId ?? null);
    if (!data) return res.status(404).json({ error: "Athlete not found." });
    return res.status(200).json(data);
  } catch (error) {
    return handleAthleteDataError(error, res, "getTeamRosterAthleteAchievements");
  }
}

export async function getTeamRosterAthleteInjuries(req: Request, res: Response) {
  try {
    const { athleteId, win } = resolveWindow(req);
    const data = await getManagedAthleteInjuries(req.user!, athleteId, win);
    if (!data) return res.status(404).json({ error: "Athlete not found." });
    return res.status(200).json({ injuries: data });
  } catch (error) {
    return handleAthleteDataError(error, res, "getTeamRosterAthleteInjuries");
  }
}

export async function getTeamRosterAthleteWellbeing(req: Request, res: Response) {
  try {
    const { athleteId, win } = resolveWindow(req);
    const data = await getManagedAthleteWellbeing(req.user!, athleteId, win);
    if (!data) return res.status(404).json({ error: "Athlete not found." });
    return res.status(200).json({ logs: data });
  } catch (error) {
    return handleAthleteDataError(error, res, "getTeamRosterAthleteWellbeing");
  }
}

export async function getTeamRosterAthleteBookings(req: Request, res: Response) {
  try {
    const { athleteId, win } = resolveWindow(req);
    const data = await getManagedAthleteBookings(req.user!, athleteId, win);
    if (!data) return res.status(404).json({ error: "Athlete not found." });
    return res.status(200).json({ bookings: data });
  } catch (error) {
    return handleAthleteDataError(error, res, "getTeamRosterAthleteBookings");
  }
}

export async function getTeamRosterAthleteNutrition(req: Request, res: Response) {
  try {
    const { athleteId, rangeDays, win } = resolveWindow(req);
    const data = await getManagedAthleteNutrition(req.user!, athleteId, { ...win, rangeDays });
    if (!data) return res.status(404).json({ error: "Athlete not found." });
    return res.status(200).json(data);
  } catch (error) {
    return handleAthleteDataError(error, res, "getTeamRosterAthleteNutrition");
  }
}

export async function getTeamRosterAthleteEngagement(req: Request, res: Response) {
  try {
    const { athleteId, rangeDays, win } = resolveWindow(req);
    const data = await getManagedAthleteEngagement(req.user!, athleteId, { ...win, rangeDays });
    if (!data) return res.status(404).json({ error: "Athlete not found." });
    return res.status(200).json(data);
  } catch (error) {
    return handleAthleteDataError(error, res, "getTeamRosterAthleteEngagement");
  }
}

const coachSetPasswordMessage = `Password must be ${STRONG_TEAM_PASSWORD_MIN}–${STRONG_TEAM_PASSWORD_MAX} characters and include uppercase, lowercase, a number, and a symbol.`;

const optionalCoachSetPassword = z
  .preprocess((val) => {
    if (val === undefined || val === null) return undefined;
    if (typeof val !== "string") return val;
    const t = val.trim();
    return t === "" ? undefined : t;
  }, z.string().max(STRONG_TEAM_PASSWORD_MAX).optional())
  .refine((val) => val === undefined || isStrongTeamAthletePassword(val), {
    message: coachSetPasswordMessage,
  });

export async function getTeamRosterAthlete(req: Request, res: Response) {
  const athleteId = z.coerce.number().int().positive().parse(req.params.athleteId);
  const q = teamIdQuery.safeParse(req.query.teamId);
  const teamId = q.success ? q.data : undefined;
  try {
    const detail = await getTeamRosterAthleteDetail(req.user!, athleteId, teamId ?? null);
    if (!detail) {
      return res.status(404).json({ error: "Athlete not found." });
    }
    return res.status(200).json(detail);
  } catch (error: unknown) {
    const e = error as { status?: number; message?: string };
    const status = typeof e?.status === "number" ? e.status : 500;
    const message = typeof e?.message === "string" ? e.message : "Failed to load athlete.";
    if (status >= 500) logger.error({ err: error }, "[team-roster] getTeamRosterAthlete");
    return res.status(status).json({ error: message });
  }
}

const resetPasswordBodySchema = z.object({
  customPassword: optionalCoachSetPassword,
});

export async function postTeamRosterAthleteResetPassword(req: Request, res: Response) {
  const athleteId = z.coerce.number().int().positive().parse(req.params.athleteId);
  const q = teamIdQuery.safeParse(req.query.teamId);
  const teamId = q.success ? q.data : undefined;
  const parsed = resetPasswordBodySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }
  try {
    const result = await resetTeamAthletePassword(req.user!, athleteId, teamId ?? null, parsed.data.customPassword);
    return res.status(200).json(result);
  } catch (error: unknown) {
    const e = error as { status?: number; message?: string };
    const status = typeof e?.status === "number" ? e.status : 500;
    const message = typeof e?.message === "string" ? e.message : "Failed to reset password.";
    if (status >= 500) logger.error({ err: error }, "[team-roster] postTeamRosterAthleteResetPassword");
    return res.status(status).json({ error: message });
  }
}

export async function getTeamRoster(req: Request, res: Response) {
  const user = req.user!;
  const q = teamIdQuery.safeParse(req.query.teamId);
  const teamId = q.success ? q.data : undefined;
  const roster = await listTeamRosterForCoach(user, teamId ?? null);
  if (!roster) {
    return res.status(404).json({ error: "Team not found." });
  }
  return res.status(200).json(roster);
}

const createBody = z.object({
  teamId: z.coerce.number().int().positive().optional(),
  username: z.string().min(1).max(64),
  name: z.string().min(1).max(255),
  age: z.coerce.number().int().min(5).max(99),
  birthDate: z.string().optional().nullable(),
  profilePicture: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.union([z.string().url(), z.null()]).optional(),
  ),
  customPassword: optionalCoachSetPassword,
  isSponsored: z.coerce.boolean().optional().default(false),
  guardianEmail: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().email().optional(),
  ),
});

export async function postTeamRosterAthlete(req: Request, res: Response) {
  const parsed = createBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }
  try {
    const result = await createTeamRosterAthlete(req.user!, parsed.data);
    return res.status(201).json(result);
  } catch (error: unknown) {
    const e = error as { status?: number; message?: string };
    const status = typeof e?.status === "number" ? e.status : 500;
    const message = typeof e?.message === "string" ? e.message : "Failed to create athlete.";
    if (status >= 500) logger.error({ err: error }, "[team-roster] postTeamRosterAthlete");
    return res.status(status).json({ error: message });
  }
}

const patchSlugBody = z.object({
  teamId: z.coerce.number().int().positive().optional(),
  emailSlug: z.string().min(2).max(72),
});

export async function patchTeamRosterEmailSlug(req: Request, res: Response) {
  const parsed = patchSlugBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }
  try {
    const result = await updateTeamEmailSlug(req.user!, parsed.data);
    return res.status(200).json(result);
  } catch (error: unknown) {
    const e = error as { status?: number; message?: string };
    const status = typeof e?.status === "number" ? e.status : 500;
    const message = typeof e?.message === "string" ? e.message : "Failed to update.";
    if (status >= 500) logger.error({ err: error }, "[team-roster] patchTeamRosterEmailSlug");
    return res.status(status).json({ error: message });
  }
}

const patchAthleteBody = z.object({
  teamId: z.coerce.number().int().positive().optional(),
  name: z.string().min(1).max(255).optional(),
  age: z.coerce.number().int().min(5).max(99).optional(),
  birthDate: z.string().optional().nullable(),
  athleteType: z.enum(["youth", "adult"]).optional(),
  trainingPerWeek: z.coerce.number().int().min(1).max(14).optional(),
  performanceGoals: z.string().max(255).optional().nullable(),
  equipmentAccess: z.string().max(255).optional().nullable(),
  growthNotes: z.string().max(255).optional().nullable(),
  profilePicture: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.union([z.string().url(), z.null()]).optional(),
  ),
});

export async function patchTeamRosterAthleteHandler(req: Request, res: Response) {
  const athleteId = z.coerce.number().int().positive().parse(req.params.athleteId);
  const parsed = patchAthleteBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }
  try {
    const result = await updateTeamRosterAthlete(req.user!, { athleteId, ...parsed.data });
    return res.status(200).json(result);
  } catch (error: unknown) {
    const e = error as { status?: number; message?: string };
    const status = typeof e?.status === "number" ? e.status : 500;
    const message = typeof e?.message === "string" ? e.message : "Failed to update athlete.";
    if (status >= 500) logger.error({ err: error }, "[team-roster] patchTeamRosterAthleteHandler");
    return res.status(status).json({ error: message });
  }
}
