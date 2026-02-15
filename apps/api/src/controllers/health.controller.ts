import type { Request, Response } from "express";

import { getHealthStatus } from "../services/health.service";

export function healthCheck(_req: Request, res: Response) {
  res.status(200).json(getHealthStatus());
}
