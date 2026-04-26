import type { Request, Response } from "express";
import { z } from "zod";
import { getActivityFeed } from "../services/activity.service";

const feedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function listActivityFeed(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = feedQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params" });
  }

  const { limit, offset } = parsed.data;
  const result = await getActivityFeed(req.user.id, limit, offset);

  return res.status(200).json(result);
}
