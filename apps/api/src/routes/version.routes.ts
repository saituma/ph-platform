import { Router } from "express";
import { sql } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";

import { db } from "../db";
import { env } from "../config/env";

const router = Router();

function normalizeDbIdentity(value: string) {
  try {
    const url = new URL(value);
    const db = url.pathname.replace(/^\//, "");
    return `${url.hostname}:${url.port || "5432"}/${db}`;
  } catch {
    return value;
  }
}

async function columnExists(tableName: string, columnName: string) {
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

router.get("/version", async (_req, res) => {
  const [hasGroupLastReadAt, hasEligiblePlans] = await Promise.all([
    columnExists("chat_group_members", "lastReadAt"),
    columnExists("service_types", "eligiblePlans"),
  ]);

  let databaseTargets:
    | { hasDatabaseMigrationUrl: boolean; sameAsDatabaseUrl: boolean | null }
    | null = null;
  try {
    const urlA = process.env.DATABASE_URL ?? "";
    const urlB = process.env.DATABASE_MIGRATION_URL ?? "";
    const hasDatabaseMigrationUrl = Boolean(urlB.trim());
    const sameAsDatabaseUrl = hasDatabaseMigrationUrl
      ? normalizeDbIdentity(urlA) === normalizeDbIdentity(urlB)
      : null;
    databaseTargets = { hasDatabaseMigrationUrl, sameAsDatabaseUrl };
  } catch {
    databaseTargets = null;
  }

  let codeMigrations: { has0059: boolean; has0060: boolean } | null = null;
  try {
    const folder = path.resolve(process.cwd(), "drizzle");
    const files = fs.readdirSync(folder);
    codeMigrations = {
      has0059: files.includes("0059_chat_group_member_last_read_at.sql"),
      has0060: files.includes("0060_service_types_eligible_plans.sql"),
    };
  } catch {
    codeMigrations = null;
  }

  let drizzleMigrations: { count: number; latestCreatedAt: number | null } = {
    count: 0,
    latestCreatedAt: null,
  };
  try {
    const rows = await db.execute(sql`
      select count(*)::int as count, max(created_at)::bigint as latest
      from "__drizzle_migrations"
    `);
    drizzleMigrations = {
      count: Number(rows.rows[0]?.count ?? 0) || 0,
      latestCreatedAt: rows.rows[0]?.latest ? Number(rows.rows[0].latest) : null,
    };
  } catch {
    // ignore if migrations table is missing
  }

  return res.status(200).json({
    ok: true,
    nodeEnv: env.nodeEnv,
    runMigrationsOnStartup: env.runMigrationsOnStartup,
    gitCommit:
      process.env.RENDER_GIT_COMMIT ||
      process.env.GIT_COMMIT ||
      process.env.VERCEL_GIT_COMMIT_SHA ||
      null,
    now: new Date().toISOString(),
    databaseTargets,
    codeMigrations,
    schema: {
      chat_group_members_lastReadAt: hasGroupLastReadAt,
      service_types_eligiblePlans: hasEligiblePlans,
    },
    drizzleMigrations,
  });
});

export default router;
