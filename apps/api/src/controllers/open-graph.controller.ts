import type { Request, Response } from "express";
import { z } from "zod";

import { fetchOpenGraph } from "../services/open-graph.service";

const querySchema = z.object({
  url: z.string().min(1).max(2048),
});

export async function getOpenGraph(req: Request, res: Response) {
  const { url } = querySchema.parse(req.query);
  const data = await fetchOpenGraph(String(url));
  return res.status(200).json({ data });
}
