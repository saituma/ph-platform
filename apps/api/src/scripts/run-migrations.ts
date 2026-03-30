import "dotenv/config";
import dns from "node:dns";
import path from "node:path";

import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { Pool } from "pg";

dns.setDefaultResultOrder("ipv4first");

const envUrl = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
if (!envUrl) {
  throw new Error("DATABASE_URL or DATABASE_MIGRATION_URL is required");
}
const rawUrl = envUrl;

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

async function main() {
  const connectionString = normalizeConnectionString(rawUrl);
  const useSsl =
    process.env.DATABASE_SSL === "true" ||
    process.env.DATABASE_MIGRATION_SSL === "true" ||
    connectionWantsSsl(rawUrl);

  const pool = new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 60_000,
    keepAlive: true,
    max: 1,
  });

  const db = drizzle(pool);
  const migrationsFolder = path.resolve(process.cwd(), "drizzle");
  const migrations = readMigrationFiles({ migrationsFolder });

  const migrationsSchema = "public";
  const migrationsTable = "__drizzle_migrations";

  await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS "${migrationsSchema}"."${migrationsTable}" (
    id SERIAL PRIMARY KEY,
    hash text NOT NULL,
    created_at bigint
  )`));

  const existingRows = await db.execute(
    sql.raw(`select id, hash, created_at from "${migrationsSchema}"."${migrationsTable}" order by created_at desc limit 1`)
  );
  const latest = existingRows.rows[0] as { created_at?: number | string } | undefined;

  if (!latest) {
    const baselineCheck = await db.execute(sql.raw(`
      select exists (
        select 1
        from pg_type t
        join pg_namespace n on n.oid = t.typnamespace
        where n.nspname = 'public' and t.typname = 'enrollment_status'
      ) as enrolled_type_exists
    `));
    const alreadyInitialized = Boolean(baselineCheck.rows[0]?.enrolled_type_exists);
    if (alreadyInitialized) {
      const baseline = [...migrations].reverse().find((entry) => entry.folderMillis <= 1773013000000);
      if (!baseline) {
        throw new Error("Could not resolve migration baseline for existing database.");
      }
      await db.execute(
        sql.raw(
          `insert into "${migrationsSchema}"."${migrationsTable}" ("hash", "created_at") values ('${baseline.hash}', ${baseline.folderMillis})`
        )
      );
      console.log(`Bootstrapped drizzle migration history at ${baseline.folderMillis}.`);
    }
  }

  await migrate(db, {
    migrationsFolder,
    migrationsSchema,
    migrationsTable,
  });

  console.log("Migrations applied successfully.");
  await pool.end();
}

void main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
