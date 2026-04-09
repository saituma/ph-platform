import type { Request, Response } from "express";
import { z } from "zod";

import * as runsService from "../services/runs.service";

const runPayloadSchema = z.object({
  clientId: z.string().min(1).max(64),
  date: z.string().min(1),
  distanceMeters: z.number().min(0),
  durationSeconds: z.number().int().min(0),
  avgPace: z.number().nullable().optional(),
  avgSpeed: z.number().nullable().optional(),
  calories: z.number().nullable().optional(),
  coordinates: z.any().optional(),
  effortLevel: z.number().int().min(0).max(10).nullable().optional(),
  feelTags: z.any().optional(),
  notes: z.string().max(500).nullable().optional(),
});

const syncBodySchema = z.object({
  runs: z.array(runPayloadSchema).min(1).max(50),
});

export async function syncRuns(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = syncBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const syncedIds = await runsService.upsertRuns(req.user.id, parsed.data.runs);
  return res.status(200).json({ synced: syncedIds });
}

export async function listRuns(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const after = typeof req.query.after === "string" ? req.query.after : undefined;
  const limitRaw = req.query.limit ? Number(req.query.limit) : undefined;
  const limit = limitRaw && Number.isFinite(limitRaw) ? limitRaw : undefined;

  const runs = await runsService.listRuns(req.user.id, { after, limit });
  return res.status(200).json({ runs });
}

export async function deleteRun(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const rawClientId = req.params.clientId;
  const clientId = Array.isArray(rawClientId) ? rawClientId[0] : rawClientId;
  if (!clientId || typeof clientId !== "string") {
    return res.status(400).json({ error: "Missing clientId" });
  }

  const deleted = await runsService.deleteRun(req.user.id, clientId);
  if (!deleted) {
    return res.status(404).json({ error: "Run not found" });
  }

  return res.status(200).json({ ok: true });
}
