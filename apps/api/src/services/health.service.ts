import { sql } from "drizzle-orm";
import { db } from "../db";
import { isApiReady } from "../config/readiness";

export function getHealthStatus() {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    ready: isApiReady(),
  };
}

/** Deep health check — probes the DB. Returns 200 if healthy, 503 if not. */
export async function getDeepHealthStatus(): Promise<{
  ok: boolean;
  db: boolean;
  ts: number;
}> {
  let dbOk = false;
  try {
    await db.execute(sql`SELECT 1`);
    dbOk = true;
  } catch {
    dbOk = false;
  }
  return { ok: dbOk, db: dbOk, ts: Date.now() };
}
