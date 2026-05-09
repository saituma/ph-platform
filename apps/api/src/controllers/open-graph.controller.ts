import type { Request, Response } from "express";
import { z } from "zod";

import { fetchOpenGraph } from "../services/open-graph.service";

const querySchema = z.object({
  url: z.string().url().max(2048).refine(
    (val) => val.startsWith("http://") || val.startsWith("https://"),
    { message: "Only HTTP(S) URLs are allowed" },
  ),
});

export async function getOpenGraph(req: Request, res: Response) {
  const { url } = querySchema.parse(req.query);
  const data = await fetchOpenGraph(String(url));
  return res.status(200).json({ data });
}
