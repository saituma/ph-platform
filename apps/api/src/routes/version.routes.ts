import { Router } from "express";
import { sql } from "drizzle-orm";

import { db } from "../db";
import { env } from "../config/env";

const router = Router();

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
    schema: {
      chat_group_members_lastReadAt: hasGroupLastReadAt,
      service_types_eligiblePlans: hasEligiblePlans,
    },
    drizzleMigrations,
  });
});

export default router;

