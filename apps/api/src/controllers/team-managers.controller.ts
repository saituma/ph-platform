import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db";
import { teamTable } from "../db/schema";
import { logger } from "../lib/logger";
import { addCoManager, listTeamManagers, removeCoManager } from "../services/team-managers.service";
import { isTeamManager } from "../services/team-membership";
import { resolveManagedTeam } from "../services/team-roster.service";

const addManagerBody = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255).optional(),
});

const teamIdQuery = z.coerce.number().int().positive().optional();

function isPlatformAdmin(req: Request) {
  return req.user?.role === "admin" || req.user?.role === "superAdmin";
}

function handleError(res: Response, error: unknown, fallback: string, tag: string) {
  const e = error as { status?: number; message?: string };
  const status = typeof e?.status === "number" ? e.status : 500;
  const message = typeof e?.message === "string" ? e.message : fallback;
  if (status >= 500) logger.error({ err: error }, tag);
  return res.status(status).json({ error: message });
}

async function getTeamByName(teamName: string) {
  const [team] = await db
    .select({ id: teamTable.id, adminId: teamTable.adminId })
    .from(teamTable)
    .where(eq(teamTable.name, teamName.trim()))
    .limit(1);
  return team ?? null;
}

// ---------------------------------------------------------------------------
// Admin path — keyed by team name, mounted under /admin/teams/:teamName/managers
// ---------------------------------------------------------------------------

export async function listTeamManagersAdmin(req: Request, res: Response) {
  try {
    const teamName = z.string().min(1).parse(req.params.teamName);
    const team = await getTeamByName(teamName);
    if (!team) return res.status(404).json({ error: "Team not found" });
    // Any manager of the team (primary or co) and platform admins may view.
    if (!isPlatformAdmin(req) && !(await isTeamManager(req.user!.id, team.id))) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return res.status(200).json(await listTeamManagers(team.id));
  } catch (error) {
    return handleError(res, error, "Failed to load team managers.", "[team-managers] listTeamManagersAdmin");
  }
}

export async function addTeamManagerAdmin(req: Request, res: Response) {
  try {
    const teamName = z.string().min(1).parse(req.params.teamName);
    const parsed = addManagerBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
    }
    const team = await getTeamByName(teamName);
    if (!team) return res.status(404).json({ error: "Team not found" });
    // Only the primary owner or a platform admin may add co-managers.
    if (!isPlatformAdmin(req) && team.adminId !== req.user!.id) {
      return res.status(403).json({ error: "Only the primary manager can add co-managers." });
    }
    const result = await addCoManager({
      teamId: team.id,
      email: parsed.data.email,
      name: parsed.data.name,
      createdByUserId: req.user!.id,
    });
    return res.status(201).json(result);
  } catch (error) {
    return handleError(res, error, "Failed to add co-manager.", "[team-managers] addTeamManagerAdmin");
  }
}

export async function removeTeamManagerAdmin(req: Request, res: Response) {
  try {
    const teamName = z.string().min(1).parse(req.params.teamName);
    const userId = z.coerce.number().int().positive().parse(req.params.userId);
    const team = await getTeamByName(teamName);
    if (!team) return res.status(404).json({ error: "Team not found" });
    if (!isPlatformAdmin(req) && team.adminId !== req.user!.id) {
      return res.status(403).json({ error: "Only the primary manager can remove co-managers." });
    }
    return res.status(200).json(await removeCoManager({ teamId: team.id, userId }));
  } catch (error) {
    return handleError(res, error, "Failed to remove co-manager.", "[team-managers] removeTeamManagerAdmin");
  }
}

// ---------------------------------------------------------------------------
// Primary-manager / onboarding path — keyed by ?teamId, resolved for the caller
// ---------------------------------------------------------------------------

export async function listTeamManagersForManager(req: Request, res: Response) {
  try {
    const q = teamIdQuery.safeParse(req.query.teamId);
    const managed = await resolveManagedTeam(req.user!, q.success ? (q.data ?? null) : null);
    if (!managed) return res.status(404).json({ error: "Team not found or access denied." });
    const managers = await listTeamManagers(managed.team.id);
    return res.status(200).json({ ...managers, teamId: managed.team.id, isPrimary: managed.isPrimary });
  } catch (error) {
    return handleError(res, error, "Failed to load team managers.", "[team-managers] listTeamManagersForManager");
  }
}

export async function addTeamManagerForManager(req: Request, res: Response) {
  try {
    const parsed = addManagerBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
    }
    const q = teamIdQuery.safeParse(req.query.teamId);
    const managed = await resolveManagedTeam(req.user!, q.success ? (q.data ?? null) : null);
    if (!managed) return res.status(404).json({ error: "Team not found or access denied." });
    if (!managed.isPrimary) {
      return res.status(403).json({ error: "Only the primary manager can add co-managers." });
    }
    const result = await addCoManager({
      teamId: managed.team.id,
      email: parsed.data.email,
      name: parsed.data.name,
      createdByUserId: req.user!.id,
    });
    return res.status(201).json(result);
  } catch (error) {
    return handleError(res, error, "Failed to add co-manager.", "[team-managers] addTeamManagerForManager");
  }
}

export async function removeTeamManagerForManager(req: Request, res: Response) {
  try {
    const userId = z.coerce.number().int().positive().parse(req.params.userId);
    const q = teamIdQuery.safeParse(req.query.teamId);
    const managed = await resolveManagedTeam(req.user!, q.success ? (q.data ?? null) : null);
    if (!managed) return res.status(404).json({ error: "Team not found or access denied." });
    if (!managed.isPrimary) {
      return res.status(403).json({ error: "Only the primary manager can remove co-managers." });
    }
    return res.status(200).json(await removeCoManager({ teamId: managed.team.id, userId }));
  } catch (error) {
    return handleError(res, error, "Failed to remove co-manager.", "[team-managers] removeTeamManagerForManager");
  }
}
