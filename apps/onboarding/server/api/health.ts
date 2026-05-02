import { sql } from "../../src/db/index.ts";

export default async function (_request: Request): Promise<Response> {
  let dbStatus = "unknown";
  try {
    await sql`SELECT 1`;
    dbStatus = "connected";
  } catch {
    dbStatus = "disconnected";
  }

  const health = {
    status: dbStatus === "connected" ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "unknown",
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    database: dbStatus,
  };

  const statusCode = dbStatus === "connected" ? 200 : 503;

  return new Response(JSON.stringify(health), {
    status: statusCode,
    headers: { "Content-Type": "application/json" },
  });
}
