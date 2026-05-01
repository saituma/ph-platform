/**
 * One-shot repair: inserts hashes for migrations that were applied to the DB
 * outside the migration runner (e.g. via drizzle-kit push) and are therefore
 * missing from __drizzle_migrations. Skips any hash already recorded.
 *
 * Usage:  cd apps/api && pnpm tsx src/scripts/repair-migration-tracking.ts
 * After:  pnpm run db:migrate   (will now only apply truly new migrations)
 */
import { readMigrationFiles } from "drizzle-orm/migrator";
import { sql } from "drizzle-orm";
import path from "path";
import { env } from "../config/env";
import { db } from "../db";

const migrationsFolder = path.resolve(process.cwd(), "drizzle");
const migrationsTable = "__drizzle_migrations";

async function main() {
  const migrations = readMigrationFiles({ migrationsFolder });

  const appliedRows = await db.execute(
    sql.raw(`SELECT hash FROM "${migrationsTable}"`),
  );
  const appliedHashes = new Set(appliedRows.rows.map((r: any) => String(r.hash)));

  console.log(`Tracking table has ${appliedHashes.size} recorded migration(s).`);
  console.log(`Journal has ${migrations.length} migration(s) total.`);

  const missing = migrations.filter((m) => !appliedHashes.has(m.hash));
  console.log(`\n${missing.length} migration(s) not recorded in tracking table.`);

  let repaired = 0;
  for (const migration of missing) {
    const preview = (migration.sql[0] ?? "").trim().slice(0, 80).replace(/\s+/g, " ");
    // Try to run each untracked migration. If it fails with "already exists"
    // (SQLSTATE 42P07 / 42710 / duplicate_object), record the hash and move on.
    try {
      await db.transaction(async (tx) => {
        for (const stmt of migration.sql) {
          const trimmed = stmt.trim();
          if (!trimmed) continue;
          await tx.execute(sql.raw(stmt));
        }
        await tx.execute(
          sql.raw(
            `INSERT INTO "${migrationsTable}" (hash, created_at) VALUES ('${migration.hash}', ${migration.folderMillis})`,
          ),
        );
      });
      console.log(`  ✅ Applied & recorded  ${migration.folderMillis}  ${preview}`);
      repaired++;
    } catch (err: any) {
      const code: string = err?.cause?.code ?? err?.code ?? "";
      const alreadyExists = ["42P07", "42710", "42701", "42P04"].includes(code);
      if (alreadyExists) {
        // Object already exists — migration was applied outside the runner.
        // Record the hash so future runs skip it.
        await db.execute(
          sql.raw(
            `INSERT INTO "${migrationsTable}" (hash, created_at)
             VALUES ('${migration.hash}', ${migration.folderMillis})
             ON CONFLICT DO NOTHING`,
          ),
        );
        console.log(`  ⚠️  Already in DB, hash recorded  ${migration.folderMillis}  ${preview}`);
        repaired++;
      } else {
        console.log(`  ❌ Failed (${code})  ${migration.folderMillis}  ${preview}`);
        console.log(`     ${err?.cause?.message ?? err?.message ?? err}`);
      }
    }
  }

  console.log(`\nDone. ${repaired} migration(s) repaired.`);
  console.log("You can now run:  pnpm run db:migrate");

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
