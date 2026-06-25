import type { Request, Response } from "express";
import { z } from "zod";

import {
  getClientDataAthleteDetail,
  getClientDataAthleteSection,
  isClientDataSection,
  listClientDataAthletes,
} from "../../services/admin/client-data.service";

const listQuerySchema = z.object({
  q: z.string().trim().optional(),
  type: z.enum(["all", "youth", "adult", "team"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});

const detailQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const sectionQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

function managedByTeamAdminId(req: Request) {
  return req.user?.role === "team_coach" ? req.user.id : null;
}

export async function listAthletes(req: Request, res: Response) {
  const query = listQuerySchema.parse(req.query ?? {});
  const result = await listClientDataAthletes({
    q: query.q,
    type: query.type ?? "all",
    limit: query.limit,
    cursor: query.cursor,
    managedByTeamAdminId: managedByTeamAdminId(req),
  });
  return res.status(200).json(result);
}

export async function getAthleteDetail(req: Request, res: Response) {
  const athleteId = z.coerce.number().int().min(1).parse(req.params.athleteId);
  const query = detailQuerySchema.parse(req.query ?? {});
  const result = await getClientDataAthleteDetail(athleteId, {
    limit: query.limit,
    managedByTeamAdminId: managedByTeamAdminId(req),
  });
  if (!result) {
    return res.status(404).json({ error: "Athlete not found" });
  }
  return res.status(200).json(result);
}

export async function getAthleteSection(req: Request, res: Response) {
  const athleteId = z.coerce.number().int().min(1).parse(req.params.athleteId);
  const sectionRaw = String(req.params.section ?? "");
  if (!isClientDataSection(sectionRaw)) {
    return res.status(400).json({ error: "Invalid client data section" });
  }

  const query = sectionQuerySchema.parse(req.query ?? {});
  const result = await getClientDataAthleteSection(athleteId, {
    section: sectionRaw,
    limit: query.limit,
    cursor: query.cursor,
    from: query.from ? new Date(query.from) : null,
    to: query.to ? new Date(query.to) : null,
    managedByTeamAdminId: managedByTeamAdminId(req),
  });
  if (!result) {
    return res.status(404).json({ error: "Athlete not found" });
  }
  return res.status(200).json(result);
}
