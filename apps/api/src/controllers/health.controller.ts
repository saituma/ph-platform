import type { Request, Response } from "express";

import { getHealthStatus, getDeepHealthStatus } from "../services/health.service";

/** Shallow ping — no DB hit. Used by load balancer keep-alive. */
export function healthCheck(_req: Request, res: Response) {
  res.status(200).json(getHealthStatus());
}

/** Deep health check — probes DB. Returns 503 if unhealthy.
 *  Used by deployment pipelines and monitoring to detect dead instances. */
export async function deepHealthCheck(_req: Request, res: Response) {
  const result = await getDeepHealthStatus();
  res.status(result.ok ? 200 : 503).json(result);
}
