import type { Request, Response } from "express";
import { z } from "zod";

import { listLatestUserLocations, listUserLocationHistory, recordUserLocation } from "../services/location.service";

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().int().positive().optional(),
});

export async function recordLocation(req: Request, res: Response) {
  const input = locationSchema.parse(req.body);
  const location = await recordUserLocation({
    userId: req.user!.id,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy: input.accuracy ?? null,
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
