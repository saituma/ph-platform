import "dotenv/config";
import dns from "node:dns";
import fs from "node:fs";
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

function readJournalEntries(migrationsFolder: string) {
  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as {
    entries?: Array<{ idx: number; when: number; tag: string }>;
  };
  return journal.entries ?? [];
}

function readSqlMigrationTags(migrationsFolder: string) {
  return fs
    .readdirSync(migrationsFolder)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => file.replace(/\.sql$/, ""));
}

async function tableExists(db: ReturnType<typeof drizzle>, tableName: string) {
  const result = await db.execute(sql`
    select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = ${tableName}
    ) as exists
  `);
  return Boolean(result.rows[0]?.exists);
}

async function columnExists(db: ReturnType<typeof drizzle>, tableName: string, columnName: string) {
  const result = await db.execute(sql`
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = ${tableName}
        and column_name = ${columnName}
    ) as exists
  `);
  return Boolean(result.rows[0]?.exists);
}

async function assertTrainingContentV2Schema(db: ReturnType<typeof drizzle>) {
  const [hasModules, hasOthers, hasSessions, hasItems, hasAudienceLabelOnModules, hasAudienceLabelOnOthers] =
    await Promise.all([
      tableExists(db, "training_modules"),
      tableExists(db, "training_other_contents"),
      tableExists(db, "training_module_sessions"),
      tableExists(db, "training_session_items"),
      columnExists(db, "training_modules", "audienceLabel"),
      columnExists(db, "training_other_contents", "audienceLabel"),
    ]);

  const missing = [
    !hasModules ? "training_modules" : null,
    !hasOthers ? "training_other_contents" : null,
    !hasSessions ? "training_module_sessions" : null,
    !hasItems ? "training_session_items" : null,
    !hasAudienceLabelOnModules ? 'training_modules.audienceLabel' : null,
    !hasAudienceLabelOnOthers ? 'training_other_contents.audienceLabel' : null,
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Training content v2 schema is still missing after migrations: ${missing.join(", ")}`);
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
  const sqlMigrationTags = readSqlMigrationTags(migrationsFolder);
  const journalEntries = readJournalEntries(migrationsFolder);
  const journalTags = new Set(journalEntries.map((entry) => entry.tag));
  const missingJournalTags = sqlMigrationTags.filter((tag) => !journalTags.has(tag));
  if (missingJournalTags.length > 0) {
    throw new Error(
      `Migration journal is out of sync with SQL files. Missing journal entries for: ${missingJournalTags.join(", ")}`
    );
  }
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

  await assertTrainingContentV2Schema(db);

  console.log("Migrations applied successfully.");
  await pool.end();
}

void main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
