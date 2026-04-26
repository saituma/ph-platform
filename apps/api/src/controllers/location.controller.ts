import type { Request, Response } from "express";
import { z } from "zod";

import {
  listLatestUserLocations,
  listTeamLocations,
  listUserLocationHistory,
  recordUserLocation,
} from "../services/location.service";
import { assertTeamMemberSocial } from "../services/social.service";

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().int().positive().optional().nullable(),
  routePoints: z.array(z.object({ lat: z.number(), lng: z.number() })).max(100).optional().nullable(),
});

export async function recordLocation(req: Request, res: Response) {
  const input = locationSchema.parse(req.body);
  const location = await recordUserLocation({
    userId: req.user!.id,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy: input.accuracy ?? null,
    routePoints: input.routePoints ?? null,
  });
  return res.status(200).json({ location });
}

export async function listUserLocations(req: Request, res: Response) {
  const daysParam = req.query.days;
  const days = daysParam ? z.coerce.number().int().min(1).max(365).parse(daysParam) : null;
  const latest = await listLatestUserLocations();
  const history = days ? await listUserLocationHistory(days) : [];
  return res.status(200).json({ latest, history, rangeDays: days ?? null });
}

export async function listTeamLocationsHandler(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { teamId } = await assertTeamMemberSocial(req.user.id);
    const locations = await listTeamLocations(teamId);
    return res.status(200).json({ locations });
  } catch (err: any) {
    if (err.name === "SocialAccessError" && err.code === "NOT_TEAM") {
      return res.status(403).json({ error: "Team membership required", code: "NOT_TEAM" });
    }
    return res.status(500).json({ error: "Internal error" });
  }
}
