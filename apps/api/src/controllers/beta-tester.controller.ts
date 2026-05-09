import type { Request, Response } from "express";
import { z } from "zod";
import {
  createBetaTester,
  getBetaTesterCount,
  listBetaTesters,
} from "../services/beta-tester.service";

const submitSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(50).nullable().optional(),
  reason: z.string().trim().max(2000).nullable().optional(),
});

export async function submitBetaTester(req: Request, res: Response) {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }

  const tester = await createBetaTester(parsed.data);
  return res.status(201).json({ ok: true, tester });
}

export async function listBetaTestersAdmin(_req: Request, res: Response) {
  const items = await listBetaTesters();
  return res.status(200).json({ items, total: items.length });
}

export async function getBetaTesterStats(_req: Request, res: Response) {
  const count = await getBetaTesterCount();
  return res.status(200).json({ count });
}
