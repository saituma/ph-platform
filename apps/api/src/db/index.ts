import dns from "node:dns";
import net from "node:net";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

import { env } from "../config/env";

dns.setDefaultResultOrder("ipv4first");
if (typeof net.setDefaultAutoSelectFamily === "function") {
  net.setDefaultAutoSelectFamily(false);
}

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

/** Treat common hosted Postgres URLs as TLS even when DATABASE_SSL is unset (avoids ECONNRESET / failed handshakes). */
function connectionWantsSsl(raw: string): boolean {
  try {
    const u = new URL(raw);
    const mode = (u.searchParams.get("sslmode") ?? "").toLowerCase();
    if (mode === "require" || mode === "verify-full" || mode === "verify-ca") return true;
    if (u.searchParams.get("ssl") === "true") return true;
    const host = u.hostname.toLowerCase();
    return (
      host.includes("neon.tech") ||
      host.includes("supabase.co") ||
      host.endsWith(".pooler.supabase.com") ||
      host.includes("render.com") ||
      host.includes(".database.azure.com")
    );
  } catch {
    return false;
  }
}

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const useSsl = Boolean(env.databaseSsl) || connectionWantsSsl(env.databaseUrl);
const connectionString = useSsl ? normalizeConnectionString(env.databaseUrl) : env.databaseUrl;
const sslOption = useSsl ? (env.databaseSsl ?? { rejectUnauthorized: false }) : undefined;

/** Neon (pooler or direct): recycle clients before the proxy/server closes idle sockets (reduces ECONNRESET). */
const isNeonHost = (() => {
  try {
    return new URL(env.databaseUrl).hostname.toLowerCase().includes("neon.tech");
  } catch {
    return false;
  }
})();

export const pool = new Pool({
  connectionString,
  ssl: sslOption,
  connectionTimeoutMillis: 30_000,
  keepAlive: true,
  ...(isNeonHost
    ? {
        maxUses: 750,
        maxLifetimeSeconds: 60 * 60,
      }
    : {}),
});

pool.on("error", (err) => {
  console.error("[DB] Pool idle client error:", err);
});

// Ensure public schema is on the search_path for pooled Neon connections.
pool.on("connect", (client) => {
  client.query("set search_path to public");
});

export const db = drizzle(pool);
