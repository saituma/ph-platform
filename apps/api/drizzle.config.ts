import "dotenv/config";
import dns from "node:dns";
import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL or DATABASE_MIGRATION_URL environment variable is not set");
}

dns.setDefaultResultOrder("ipv4first");

function normalizeConnectionString(raw: string) {
  try {
    const url = new URL(raw);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("ssl");
    url.searchParams.delete("sslrootcert");
    url.searchParams.delete("channel_binding");
    url.searchParams.delete("pgbouncer");
    return url.toString();
  } catch {
    return raw;
  }
}

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

const normalizedUrl = normalizeConnectionString(databaseUrl);
const parsed = new URL(normalizedUrl);
const username = decodeURIComponent(parsed.username || "");
const password = decodeURIComponent(parsed.password || "");
const database = parsed.pathname.replace(/^\//, "");
const port = parsed.port ? Number(parsed.port) : 5432;
const useSsl =
  process.env.DATABASE_SSL === "true" ||
  (process.env.DATABASE_MIGRATION_SSL === "true") ||
  connectionWantsSsl(databaseUrl);

export default defineConfig({
  out: "./drizzle",
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  migrations: {
    schema: "public",
    table: "__drizzle_migrations",
  },
  dbCredentials: {
    host: parsed.hostname,
    port,
    user: username,
    password,
    database,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  },
});
