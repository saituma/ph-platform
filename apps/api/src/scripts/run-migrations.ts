import "dotenv/config";
import { runMigrations } from "../db/migrations";

void runMigrations()
  .then(() => {
    console.log("Migrations applied successfully.");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
