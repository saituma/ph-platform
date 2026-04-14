import "dotenv/config";

async function main() {
  // Migrations should be runnable locally without requiring every production secret.
  // `apps/api/src/config/env.ts` supports this mode via `PH_API_SCRIPT=1`.
  process.env.PH_API_SCRIPT ??= "1";

  const databaseUrl =
    process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL or DATABASE_MIGRATION_URL is required");
  }

  const { runMigrations } = await import("../db/migrations");
  await runMigrations({ databaseUrl });
  console.log("Migrations applied successfully.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
