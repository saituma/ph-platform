import type { Request, Response } from "express";
import { z } from "zod";
import {
  listTeamsAdmin,
  createTeamAdmin,
  getTeamDetailsAdmin,
  getTeamMemberAdmin,
  updateTeamDefaultsAdmin,
  updateTeamMemberAdmin,
  attachAthleteToTeamAdmin,
} from "../../services/admin/team.service";
import { ProgramType, teamTable } from "../../db/schema";
import { db } from "../../db";
import { and, eq } from "drizzle-orm";

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
  injuries: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .nullable(),
  growthNotes: z.string().optional().nullable(),
  performanceGoals: z.string().optional().nullable(),
  equipmentAccess: z.string().optional().nullable(),
  guardianEmail: z.string().email().optional().nullable(),
  guardianPhone: z.string().optional().nullable(),
  relationToAthlete: z.string().optional().nullable(),
});

function teamManagerScope(req: Request) {
  return req.user?.role === "team_coach" ? req.user.id : null;
}

async function canAccessTeam(req: Request, teamName: string) {
  const managerId = teamManagerScope(req);
  if (managerId == null) return true;
  const [team] = await db
    .select({ id: teamTable.id })
    .from(teamTable)
    .where(and(eq(teamTable.name, teamName.trim()), eq(teamTable.adminId, managerId)))
    .limit(1);
  return Boolean(team);
}

export async function listTeamsAdminDetails(req: Request, res: Response) {
  const teams = await listTeamsAdmin({ adminId: teamManagerScope(req) });
  return res.status(200).json({ teams });
}

function safeAdminErrorMessage(error: unknown, fallback: string) {
  const err = error as any;
  const message = typeof err?.message === "string" ? err.message : "";

  // Drizzle's DrizzleQueryError message includes full SQL + params.
  if (err?.name === "DrizzleQueryError" || typeof err?.query === "string") {
    const pgCode = err?.cause?.code;
    if (pgCode === "42P01") {
      return "Database is missing required tables. Run migrations and try again.";
    }
    return fallback;
  }

  if (message.startsWith("Failed query:")) return fallback;
  return message || fallback;
}

export async function createTeamAdminDetails(req: Request, res: Response) {
  const parsed = z
    .object({
      teamName: z.string().min(1),
      athleteType: z.enum(["youth", "adult"]).default("youth"),
      minAge: z.coerce.number().int().min(1).optional().nullable(),
      maxAge: z.coerce.number().int().min(1).optional().nullable(),
      tier: z.enum(ProgramType.enumValues),
      maxAthletes: z.coerce.number().int().min(1),
      paymentMethod: z.enum(["pay_now", "email_link", "cash"]).default("pay_now"),
      billingCycle: z.enum(["monthly", "6months", "yearly"]).default("monthly"),
      managerEmail: z.string().email().optional().nullable(),
      managerPassword: z.string().min(8).optional().nullable(),
      managerName: z.string().optional().nullable(),
      emailSlug: z.string().min(2).max(80).optional().nullable(),
      hasSponsoredPlayers: z.coerce.boolean().optional().default(false),
      sponsoredPlayerCount: z.coerce.number().int().min(0).optional().default(0),
      sponsoredTier: z.enum(ProgramType.enumValues).optional().nullable(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }

  const { managerEmail, managerPassword, managerName, emailSlug } = parsed.data;
  const hasManagerCredentials = managerEmail && managerPassword;

  try {
    const result = await createTeamAdmin({
      teamName: parsed.data.teamName,
      athleteType: parsed.data.athleteType,
      emailSlug: emailSlug ?? undefined,
      minAge: parsed.data.minAge ?? undefined,
      maxAge: parsed.data.maxAge ?? undefined,
      adminId: hasManagerCredentials ? undefined : req.user!.id,
      managerEmail: managerEmail ?? undefined,
      managerPassword: managerPassword ?? undefined,
      managerName: managerName ?? undefined,
      tier: parsed.data.tier,
      maxAthletes: parsed.data.maxAthletes,
      createdByUserId: req.user!.id,
      paymentMethod: parsed.data.paymentMethod,
      billingCycle: parsed.data.billingCycle,
      hasSponsoredPlayers: parsed.data.hasSponsoredPlayers,
      sponsoredPlayerCount: parsed.data.sponsoredPlayerCount,
      sponsoredTier: parsed.data.sponsoredTier ?? undefined,
    });
    return res.status(201).json(result);
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : 500;
    const message = safeAdminErrorMessage(error, "Failed to create team.");
    if (status >= 500) {
      console.error("[admin] createTeamAdminDetails", error);
    }
    return res.status(status).json({ error: message });
  }
}

export async function getTeamAdminDetails(req: Request, res: Response) {
  try {
    const teamName = z.string().min(1).parse(req.params.teamName);
    if (!(await canAccessTeam(req, teamName))) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const details = await getTeamDetailsAdmin(teamName);
    if (!details) {
      return res.status(404).json({ error: "Team not found" });
    }
    return res.status(200).json(details);
  } catch (error) {
    const status = typeof (error as any)?.status === "number" ? (error as any).status : 500;
    if (status >= 500) console.error("[getTeamAdminDetails]", error);
    return res.status(status).json({ error: safeAdminErrorMessage(error, "Failed to load team details.") });
  }
}

export async function getTeamMemberAdminDetails(req: Request, res: Response) {
  const teamName = z.string().min(1).parse(req.params.teamName);
  if (!(await canAccessTeam(req, teamName))) {
    return res.status(403).json({ error: "Forbidden" });
  }
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
    if (!(await canAccessTeam(req, parsed.data.teamName))) {
      return res.status(403).json({ error: "Forbidden" });
    }
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
  if (!(await canAccessTeam(req, teamName))) {
    return res.status(403).json({ error: "Forbidden" });
  }
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
  if (!(await canAccessTeam(req, teamName))) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const athleteId = z.coerce.number().int().min(1).parse(req.params.athleteId);
  try {
    const parsed = z.object({
      allowMoveFromOtherTeam: z.coerce.boolean().optional(),
      isSponsored: z.coerce.boolean().optional(),
    }).safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const result = await attachAthleteToTeamAdmin({
      teamName,
      athleteId,
      allowMoveFromOtherTeam: parsed.data.allowMoveFromOtherTeam === true,
      isSponsored: parsed.data.isSponsored === true,
      createdByUserId: req.user!.id,
    });
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
