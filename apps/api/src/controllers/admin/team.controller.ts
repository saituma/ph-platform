import type { Request, Response } from "express";
import { z } from "zod";
import {
  listTeamsAdmin,
  getTeamDetailsAdmin,
  getTeamMemberAdmin,
  updateTeamDefaultsAdmin,
  updateTeamMemberAdmin,
  attachAthleteToTeamAdmin,
} from "../../services/admin/team.service";
import { ProgramType } from "../../db/schema";

const teamDefaultsSchema = z.object({
  teamName: z.string().min(1),
  injuries: z.string().optional().nullable(),
  growthNotes: z.string().optional().nullable(),
  performanceGoals: z.string().optional().nullable(),
  equipmentAccess: z.string().optional().nullable(),
});

const teamMemberUpdateSchema = z.object({
  athleteName: z.string().min(1).optional(),
  birthDate: z.string().optional().nullable(),
  trainingPerWeek: z.coerce.number().int().min(0).optional(),
  currentProgramTier: z.enum(ProgramType.enumValues).optional().nullable(),
  injuries: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  growthNotes: z.string().optional().nullable(),
  performanceGoals: z.string().optional().nullable(),
  equipmentAccess: z.string().optional().nullable(),
  guardianEmail: z.string().email().optional().nullable(),
  guardianPhone: z.string().optional().nullable(),
  relationToAthlete: z.string().optional().nullable(),
});

export async function listTeamsAdminDetails(_req: Request, res: Response) {
  const teams = await listTeamsAdmin();
  return res.status(200).json({ teams });
}

export async function getTeamAdminDetails(req: Request, res: Response) {
  const teamName = z.string().min(1).parse(req.params.teamName);
  const details = await getTeamDetailsAdmin(teamName);
  if (!details) {
    return res.status(404).json({ error: "Team not found" });
  }
  return res.status(200).json(details);
}

export async function getTeamMemberAdminDetails(req: Request, res: Response) {
  const teamName = z.string().min(1).parse(req.params.teamName);
  const athleteId = z.coerce.number().int().min(1).parse(req.params.athleteId);
  const details = await getTeamMemberAdmin({ teamName, athleteId });
  if (!details) {
    return res.status(404).json({ error: "Team member not found" });
  }
  return res.status(200).json(details);
}

export async function saveTeamDefaultsAdmin(req: Request, res: Response) {
  const parsed = teamDefaultsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }

  try {
    const result = await updateTeamDefaultsAdmin(parsed.data);
    return res.status(200).json(result);
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : 500;
    const message = typeof error?.message === "string" ? error.message : "Failed to save team defaults.";
    if (status >= 500) {
      console.error("[admin] saveTeamDefaultsAdmin", error);
    }
    return res.status(status).json({ error: message });
  }
}

export async function updateTeamMemberAdminDetails(req: Request, res: Response) {
  const teamName = z.string().min(1).parse(req.params.teamName);
  const athleteId = z.coerce.number().int().min(1).parse(req.params.athleteId);
  const parsed = teamMemberUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }

  try {
    const result = await updateTeamMemberAdmin({
      teamName,
      athleteId,
      ...parsed.data,
    });
    return res.status(200).json(result);
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : 500;
    const message = typeof error?.message === "string" ? error.message : "Failed to update team member.";
    if (status >= 500) {
      console.error("[admin] updateTeamMemberAdminDetails", error);
    }
    return res.status(status).json({ error: message });
  }
}

export async function attachAthleteToTeamAdminDetails(req: Request, res: Response) {
  const teamName = z.string().min(1).parse(req.params.teamName);
  const athleteId = z.coerce.number().int().min(1).parse(req.params.athleteId);
  try {
    const result = await attachAthleteToTeamAdmin({ teamName, athleteId });
    return res.status(200).json(result);
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : 500;
    const message = typeof error?.message === "string" ? error.message : "Failed to attach athlete to team.";
    if (status >= 500) {
      console.error("[admin] attachAthleteToTeamAdminDetails", error);
    }
    return res.status(status).json({ error: message });
  }
}
