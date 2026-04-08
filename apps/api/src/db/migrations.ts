import dns from "node:dns";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { Pool } from "pg";

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
    if (mode === "require" || mode === "verify-full" || mode === "verify-ca")
      return true;
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

async function columnExists(
  db: ReturnType<typeof drizzle>,
  tableName: string,
  columnName: string,
) {
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
  const [
    hasModules,
    hasOthers,
    hasSessions,
    hasItems,
    hasOtherSettings,
    hasAudienceLabelOnModules,
    hasAudienceLabelOnOthers,
  ] = await Promise.all([
    tableExists(db, "training_modules"),
    tableExists(db, "training_other_contents"),
    tableExists(db, "training_module_sessions"),
    tableExists(db, "training_session_items"),
    tableExists(db, "training_other_settings"),
    columnExists(db, "training_modules", "audienceLabel"),
    columnExists(db, "training_other_contents", "audienceLabel"),
  ]);

  const missing = [
    !hasModules ? "training_modules" : null,
    !hasOthers ? "training_other_contents" : null,
    !hasSessions ? "training_module_sessions" : null,
    !hasItems ? "training_session_items" : null,
    !hasOtherSettings ? "training_other_settings" : null,
    !hasAudienceLabelOnModules ? "training_modules.audienceLabel" : null,
    !hasAudienceLabelOnOthers ? "training_other_contents.audienceLabel" : null,
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Training content v2 schema is still missing after migrations: ${missing.join(
        ", ",
      )}`,
    );
  }
}

export async function runMigrations(options?: {
  databaseUrl?: string;
  migrationsFolder?: string;
  skipTrainingV2Assertion?: boolean;
}) {
  const rawUrl = options?.databaseUrl ?? env.databaseUrl;
  const connectionString = normalizeConnectionString(rawUrl);
  const useSsl = Boolean(env.databaseSsl) || connectionWantsSsl(rawUrl);

  const pool = new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 60_000,
    keepAlive: true,
    max: 1,
  });

  try {
    const db = drizzle(pool);
    const migrationsFolder =
      options?.migrationsFolder ??
      path.resolve(process.cwd(), "drizzle");

    const sqlMigrationTags = readSqlMigrationTags(migrationsFolder);
    const journalEntries = readJournalEntries(migrationsFolder);
    const journalTags = new Set(journalEntries.map((entry) => entry.tag));
    const missingJournalTags = sqlMigrationTags.filter(
      (tag) => !journalTags.has(tag),
    );
    if (missingJournalTags.length > 0) {
      throw new Error(
        `Migration journal is out of sync with SQL files. Missing journal entries for: ${missingJournalTags.join(
          ", ",
        )}`,
      );
    }

    const migrations = readMigrationFiles({ migrationsFolder });
    const migrationsSchema = "public";
    const migrationsTable = "__drizzle_migrations";

    await db.execute(
      sql.raw(`CREATE TABLE IF NOT EXISTS "${migrationsSchema}"."${migrationsTable}" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )`),
    );

    const existingRows = await db.execute(
      sql.raw(
        `select id, hash, created_at from "${migrationsSchema}"."${migrationsTable}" order by created_at desc limit 1`,
      ),
    );
    const latest = existingRows.rows[0] as
      | { created_at?: number | string }
      | undefined;

    if (!latest) {
      const baselineCheck = await db.execute(
        sql.raw(`
          select exists (
            select 1
            from pg_type t
            join pg_namespace n on n.oid = t.typnamespace
            where n.nspname = 'public' and t.typname = 'enrollment_status'
          ) as enrolled_type_exists
        `),
      );
      const alreadyInitialized = Boolean(
        baselineCheck.rows[0]?.enrolled_type_exists,
      );
      if (alreadyInitialized) {
        const baseline = [...migrations].reverse().find(
          (entry) => entry.folderMillis <= 1773013000000,
        );
        if (!baseline) {
          throw new Error(
            "Could not resolve migration baseline for existing database.",
          );
        }
        await db.execute(
          sql.raw(
            `insert into "${migrationsSchema}"."${migrationsTable}" ("hash", "created_at") values ('${baseline.hash}', ${baseline.folderMillis})`,
          ),
        );
        console.log(
          `[Migrations] Bootstrapped drizzle migration history at ${baseline.folderMillis}.`,
        );
      }
    }

    await migrate(db, {
      migrationsFolder,
      migrationsSchema,
      migrationsTable,
    });

    if (!options?.skipTrainingV2Assertion) {
      await assertTrainingContentV2Schema(db);
    }
  } finally {
    await pool.end();
  }
}
