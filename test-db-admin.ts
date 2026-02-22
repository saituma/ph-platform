import { db } from "./apps/api/src/db";
import { userTable, adminSettingsTable } from "./apps/api/src/db/schema";

async function main() {
  const users = await db.select().from(userTable);
  console.log("USERS:", users);
  
  const settings = await db.select().from(adminSettingsTable);
  console.log("SETTINGS:", settings);
  process.exit(0);
}
main();
