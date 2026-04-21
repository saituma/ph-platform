import dns from "node:dns";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { Client } from "pg";

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

    // Migrating through a Neon pooler often results in ECONNRESET
    // due to connection proxy timeouts or dropped TCP packets during DDL statements.
    // We enforce the direct connection endpoint:
    if (url.hostname.includes("-pooler.aws.neon.tech") || url.hostname.includes("-pooler.eu-")) {
      const match = url.hostname.match(/^(ep-[a-z0-9-]+)-pooler/);
      if (match && match[1]) {
        // Neon handles direct connections properly when we explicitly pass the endpoint ID
        url.searchParams.set("options", `endpoint=${match[1]}`);
      }
      url.hostname = url.hostname.replace("-pooler", "");
    }

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

function safeDbTarget(raw: string) {
  try {
    const u = new URL(raw);
    const db = u.pathname?.replace(/^\//, "") ?? "";
    const host = u.hostname;
    const port = u.port ? Number(u.port) : undefined;
    return {
      host: host || "(unknown)",
      port,
      database: db || undefined,
    };
  } catch {
    return { host: "(unparsed)", port: undefined as number | undefined, database: undefined as string | undefined };
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

async function executeWithRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (err.code === "ECONNRESET" || err.message?.includes("ECONNRESET")) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function tableExists(db: any, tableName: string) {
  return executeWithRetry(async () => {
    const result = await db.execute(sql`
      select to_regclass('public.' || ${tableName}) is not null as exists
    `);
    return Boolean(result.rows[0]?.exists);
  });
}

async function columnExists(db: any, tableName: string, columnName: string) {
  return executeWithRetry(async () => {
    const result = await db.execute(sql`
      select exists(
        select 1
        from pg_attribute a
        join pg_class t on t.oid = a.attrelid
        join pg_namespace n on n.oid = t.relnamespace
        where n.nspname = 'public'
          and t.relname = ${tableName}
          and a.attname = ${columnName}
          and a.attnum > 0
          and not a.attisdropped
      ) as exists
    `);
    return Boolean(result.rows[0]?.exists);
  });
}

function isSafePgIdentifier(value: string) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}

async function renameColumnTo(db: any, tableName: string, from: string, to: string) {
  await db.execute(sql.raw(`ALTER TABLE "${tableName}" RENAME COLUMN "${from}" TO "${to}"`));
}

async function renameColumnIfPresent(db: any, tableName: string, fromCandidates: string[], to: string) {
  const hasTo = await columnExists(db, tableName, to);
  if (hasTo) return;

  for (const from of fromCandidates) {
    const hasFrom = await columnExists(db, tableName, from);
    if (hasFrom) {
      await renameColumnTo(db, tableName, from, to);
      return;
    }
  }
}

async function getTableColumns(db: any, tableName: string): Promise<string[]> {
  return executeWithRetry(async () => {
    const result = await db.execute(sql`
      select a.attname as name
      from pg_attribute a
      join pg_class t on t.oid = a.attrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = ${tableName}
        and a.attnum > 0
        and not a.attisdropped
    `);
    return result.rows.map((r: any) => String(r.name));
  });
}

async function normalizeRunLogsSchema(db: any) {
  const hasRunLogs = await tableExists(db, "run_logs");
  if (!hasRunLogs) return;

  const existingColumns = await getTableColumns(db, "run_logs");
  const colSet = new Set(existingColumns);

  const renames: Array<{ from: string[]; to: string }> = [
    { from: ["client_id", "clientid"], to: "clientId" },
    { from: ["user_id", "userid"], to: "userId" },
    { from: ["distance_meters", "distancemeters"], to: "distanceMeters" },
    { from: ["duration_seconds", "durationseconds"], to: "durationSeconds" },
    { from: ["avg_pace", "avgpace"], to: "avgPace" },
    { from: ["avg_speed", "avgspeed"], to: "avgSpeed" },
    { from: ["effort_level", "effortlevel"], to: "effortLevel" },
    { from: ["feel_tags", "feeltags"], to: "feelTags" },
    { from: ["created_at", "createdat"], to: "createdAt" },
    { from: ["updated_at", "updatedat"], to: "updatedAt" },
  ];

  for (const mapping of renames) {
    if (colSet.has(mapping.to)) continue;
    const found = mapping.from.find((f) => colSet.has(f));
    if (found) {
      await executeWithRetry(() =>
        db.execute(sql.raw(`ALTER TABLE "run_logs" RENAME COLUMN "${found}" TO "${mapping.to}"`)),
      );
    }
  }

  // If an older schema created the FK constraint under a different name,
  // rename it to match what newer drizzle snapshots expect.
  const desiredFkName = "run_logs_userId_users_id_fk";
  const desiredFkExists = await executeWithRetry(async () => {
    const res = await db.execute(sql`
      select exists(
        select 1
        from pg_constraint
        where conname = ${desiredFkName}
      ) as exists
    `);
    return Boolean(res.rows[0]?.exists);
  });

  if (!desiredFkExists) {
    const existingFk = await executeWithRetry(async () => {
      return db.execute(sql`
        select c.conname
        from pg_constraint c
        join pg_class t on t.oid = c.conrelid
        join pg_namespace n on n.oid = t.relnamespace
        where n.nspname = 'public'
          and t.relname = 'run_logs'
          and c.contype = 'f'
          and c.confrelid = 'public.users'::regclass
        limit 1
      `);
    });
    const conname = String(existingFk.rows[0]?.conname ?? "");
    if (conname && conname !== desiredFkName && isSafePgIdentifier(conname)) {
      await executeWithRetry(() =>
        db.execute(sql.raw(`ALTER TABLE "run_logs" RENAME CONSTRAINT "${conname}" TO "${desiredFkName}"`)),
      );
    }
  }
}

async function normalizeLegacyBookingTypes(db: any) {
  const hasBookings = await tableExists(db, "bookings");
  const hasServiceTypes = await tableExists(db, "service_types");

  const normalizeTable = async (tableName: "bookings" | "service_types") => {
    const hasType = await columnExists(db, tableName, "type");
    if (!hasType) return;

    // Make updates robust regardless of prior enum shape.
    await db.execute(sql.raw(`ALTER TABLE "${tableName}" ALTER COLUMN "type" SET DATA TYPE text USING "type"::text`));

    await db.execute(
      sql.raw(`
      UPDATE "${tableName}"
      SET "type" = CASE
        WHEN "type" IN ('one_on_one', 'call', 'individual_call', 'lift_lab_1on1') THEN 'one_to_one'
        WHEN "type" = 'group_call' THEN 'semi_private'
        WHEN "type" = 'role_model' THEN 'in_person'
        ELSE "type"
      END
      WHERE "type" IN ('one_on_one', 'call', 'individual_call', 'lift_lab_1on1', 'group_call', 'role_model')
    `),
    );
  };

  if (hasBookings) {
    await normalizeTable("bookings");
  }
  if (hasServiceTypes) {
    await normalizeTable("service_types");
  }
}

function isTransientMigrationConnectionError(err: unknown): boolean {
  const e = err as NodeJS.ErrnoException & { code?: string };
  const code = e?.code;
  if (
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "EPIPE" ||
    code === "ENOTFOUND"
  ) {
    return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  const low = msg.toLowerCase();
  return (
    low.includes("econnreset") ||
    low.includes("connection terminated") ||
    low.includes("db_termination") ||
    low.includes("server closed the connection")
  );
}

function describeMigrationErr(err: unknown): string {
  const e = err as NodeJS.ErrnoException & { code?: string };
  if (e?.code) return `${e.code}: ${e instanceof Error ? e.message : String(err)}`;
  return err instanceof Error ? err.message : String(err);
}

async function assertTrainingContentV2Schema(db: any) {
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
    throw new Error(`Training content v2 schema is still missing after migrations: ${missing.join(", ")}`);
  }
}

async function assertTeamsSchema(db: any) {
  const hasTeams = await tableExists(db, "teams");
  if (!hasTeams) {
    throw new Error(`Teams table is still missing after migrations: teams`);
  }

  const [hasAdminId, hasPlanPaymentType, hasPlanCommitmentMonths] = await Promise.all([
    columnExists(db, "teams", "adminId"),
    columnExists(db, "teams", "planPaymentType"),
    columnExists(db, "teams", "planCommitmentMonths"),
  ]);

  const missing = [
    !hasAdminId ? "teams.adminId" : null,
    !hasPlanPaymentType ? "teams.planPaymentType" : null,
    !hasPlanCommitmentMonths ? "teams.planCommitmentMonths" : null,
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Teams schema is still missing after migrations: ${missing.join(
        ", ",
      )}. If this database existed before Drizzle migration tracking was enabled, the migration history may have been bootstrapped incorrectly—remove the incorrect entries from public.__drizzle_migrations (or drop and recreate the DB) and re-run migrations.`,
    );
  }
}

async function executeMigrationsOnce(options: {
  databaseUrl: string;
  migrationsFolder?: string;
  skipTrainingV2Assertion?: boolean;
}) {
  const rawUrl = options.databaseUrl;
  const connectionString = normalizeConnectionString(rawUrl);
  const useSsl = Boolean(env.databaseSsl) || connectionWantsSsl(rawUrl);

  const client = new Client({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 60_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });

  try {
    await client.connect();
    const db = drizzle(client);

    // Compatibility shim: older DBs may have snake_case run_logs columns.
    // Newer migrations expect camelCase columns (e.g. "userId").
    try {
      await normalizeRunLogsSchema(db);
    } catch (e) {
      console.warn("[Migrations] Could not normalize run_logs schema (discovery failed), proceeding...");
    }

    // Compatibility shim: older booking/service type values (group_call, one_on_one, etc.)
    // must be normalized before enum-cast migrations run.
    try {
      await normalizeLegacyBookingTypes(db);
    } catch (e) {
      console.warn("[Migrations] Could not normalize legacy booking types (discovery failed), proceeding...");
    }

    const migrationsFolder = options?.migrationsFolder ?? path.resolve(process.cwd(), "drizzle");

    const sqlMigrationTags = readSqlMigrationTags(migrationsFolder);
    const journalEntries = readJournalEntries(migrationsFolder);
    const journalTags = new Set(journalEntries.map((entry) => entry.tag));
    const missingJournalTags = sqlMigrationTags.filter((tag) => !journalTags.has(tag));
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
    const latest = existingRows.rows[0] as { created_at?: number | string } | undefined;

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
      const alreadyInitialized = Boolean(baselineCheck.rows[0]?.enrolled_type_exists);
      if (alreadyInitialized) {
        const baseline = [...migrations].reverse().find((entry) => entry.folderMillis <= 1773013000000);
        if (!baseline) {
          throw new Error("Could not resolve migration baseline for existing database.");
        }
        await db.execute(
          sql.raw(
            `insert into "${migrationsSchema}"."${migrationsTable}" ("hash", "created_at") values ('${baseline.hash}', ${baseline.folderMillis})`,
          ),
        );
        console.log(`[Migrations] Bootstrapped drizzle migration history at ${baseline.folderMillis}.`);
      }
    }

    await migrate(db, {
      migrationsFolder,
      migrationsSchema,
      migrationsTable,
    });

    await assertTeamsSchema(db);

    if (!options?.skipTrainingV2Assertion) {
      await assertTrainingContentV2Schema(db);
    }
  } finally {
    await client.end();
  }
}

const MIGRATION_CONNECTION_ATTEMPTS = 5;

export async function runMigrations(options?: {
  databaseUrl?: string;
  migrationsFolder?: string;
  skipTrainingV2Assertion?: boolean;
}) {
  const rawUrl = options?.databaseUrl ?? env.databaseUrl;

  for (let attempt = 0; attempt < MIGRATION_CONNECTION_ATTEMPTS; attempt++) {
    try {
      await executeMigrationsOnce({
        databaseUrl: rawUrl,
        migrationsFolder: options?.migrationsFolder,
        skipTrainingV2Assertion: options?.skipTrainingV2Assertion,
      });
      return;
    } catch (error) {
      const useSsl = Boolean(env.databaseSsl) || connectionWantsSsl(rawUrl);
      const target = safeDbTarget(rawUrl);
      const folder = options?.migrationsFolder ?? path.resolve(process.cwd(), "drizzle");
      const message =
        error instanceof Error
          ? `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ""}`
          : String(error);

      if (attempt < MIGRATION_CONNECTION_ATTEMPTS - 1 && isTransientMigrationConnectionError(error)) {
        const delay = Math.min(15_000, 500 * Math.pow(2, attempt));
        console.warn(
          `[Migrations] ${describeMigrationErr(error)} — retry ${attempt + 2}/${MIGRATION_CONNECTION_ATTEMPTS} after ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      console.error(
        `[Migrations] Failed (ssl=${useSsl ? "on" : "off"}, folder=${folder}, host=${target.host}${target.port ? `:${target.port}` : ""}${target.database ? `/${target.database}` : ""}).\n${message}`,
      );
      throw error;
    }
  }
}
