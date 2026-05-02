import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./index";
import path from "path";
import { logger } from "../lib/logger";

async function main() {
  logger.info("Running migrations...");

  try {
    // This will run migrations from the drizzle folder
    await migrate(db, {
      migrationsFolder: path.resolve(__dirname, "../../drizzle"),
    });

    logger.info("Migrations completed successfully!");
  } catch (error) {
    logger.error({ err: error }, "Migrations failed");
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
