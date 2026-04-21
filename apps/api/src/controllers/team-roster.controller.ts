import type { Request, Response } from "express";
import { z } from "zod";

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

const teamIdQuery = z.coerce.number().int().positive().optional();

const coachSetPasswordMessage = `Password must be ${STRONG_TEAM_PASSWORD_MIN}–${STRONG_TEAM_PASSWORD_MAX} characters and include uppercase, lowercase, a number, and a symbol.`;

const optionalCoachSetPassword = z
  .preprocess(
    (val) => {
      if (val === undefined || val === null) return undefined;
      if (typeof val !== "string") return val;
      const t = val.trim();
      return t === "" ? undefined : t;
    },
    z.string().max(STRONG_TEAM_PASSWORD_MAX).optional(),
  )
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
    if (status >= 500) console.error("[team-roster] getTeamRosterAthlete", error);
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
    const result = await resetTeamAthletePassword(
      req.user!,
      athleteId,
      teamId ?? null,
      parsed.data.customPassword,
    );
    return res.status(200).json(result);
  } catch (error: unknown) {
    const e = error as { status?: number; message?: string };
    const status = typeof e?.status === "number" ? e.status : 500;
    const message = typeof e?.message === "string" ? e.message : "Failed to reset password.";
    if (status >= 500) console.error("[team-roster] postTeamRosterAthleteResetPassword", error);
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
    if (status >= 500) console.error("[team-roster] postTeamRosterAthlete", error);
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
    if (status >= 500) console.error("[team-roster] patchTeamRosterEmailSlug", error);
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
    if (status >= 500) console.error("[team-roster] patchTeamRosterAthleteHandler", error);
    return res.status(status).json({ error: message });
  }
}
