import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./index";
import path from "path";

async function main() {
  console.log("Running migrations...");

  try {
    // This will run migrations from the drizzle folder
    await migrate(db, {
      migrationsFolder: path.resolve(__dirname, "../../drizzle"),
    });

    console.log("Migrations completed successfully!");
  } catch (error) {
    console.error("Migrations failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
