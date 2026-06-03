import type { Request, Response } from "express";
import { z } from "zod";
import { findManagedTeamIdForUser } from "../services/team-membership";
import {
  getTeamSocialSettings,
  updateTeamSocialSettings,
} from "../services/team-social-settings.service";

const updateSchema = z.object({
  socialEnabled: z.boolean().optional(),
  shareRunsPublicly: z.boolean().optional(),
  allowComments: z.boolean().optional(),
  showInLeaderboard: z.boolean().optional(),
  showInDirectory: z.boolean().optional(),
});

export async function teamSocialSettingsGet(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const teamId = await findManagedTeamIdForUser(req.user.id);
  if (teamId == null) return res.status(403).json({ error: "Not a team manager" });
  const settings = await getTeamSocialSettings(teamId);
  return res.status(200).json({ settings });
}

export async function teamSocialSettingsUpdate(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const teamId = await findManagedTeamIdForUser(req.user.id);
  if (teamId == null) return res.status(403).json({ error: "Not a team manager" });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const settings = await updateTeamSocialSettings(teamId, parsed.data);
  return res.status(200).json({ settings });
}
