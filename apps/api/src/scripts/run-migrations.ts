import "dotenv/config";
import { runMigrations } from "../db/migrations";

const databaseUrl = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL or DATABASE_MIGRATION_URL is required");
}

void runMigrations({ databaseUrl })
  .then(() => {
    console.log("Migrations applied successfully.");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
