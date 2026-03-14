import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

import { env } from "../config/env";

function normalizeConnectionString(raw: string) {
  try {
    const url = new URL(raw);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("ssl");
    url.searchParams.delete("sslrootcert");
    return url.toString();
  } catch {
    return raw;
  }
}

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const connectionString = env.databaseSsl
  ? normalizeConnectionString(env.databaseUrl)
  : env.databaseUrl;

export const pool = new Pool({
  connectionString,
  ssl: env.databaseSsl,
});

// Ensure public schema is on the search_path for pooled Neon connections.
pool.on("connect", (client) => {
  client.query("set search_path to public");
});

export const db = drizzle(pool);
