import type { Request, Response } from "express";
import { z } from "zod";
import { listVideoUploadsAdmin } from "../../services/admin/video.service";

const adminSearchQuerySchema = z.object({
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export async function listVideosAdmin(req: Request, res: Response) {
  const { q, limit } = adminSearchQuerySchema.parse(req.query ?? {});
  const items = await listVideoUploadsAdmin({ q, limit });
  return res.status(200).json({ items });
}
