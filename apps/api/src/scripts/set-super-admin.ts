import { eq } from "drizzle-orm";
import dotenv from "dotenv";
import path from "path";
import { db } from "../db";
import { userTable } from "../db/schema";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const email = process.argv[2] || process.env.ADMIN_EMAIL || "dawitworkujima@gmail.com";

async function main() {
  const result = await db.update(userTable).set({ role: "superAdmin" }).where(eq(userTable.email, email)).returning();
  const user = result[0];
  if (!user) {
    throw new Error(`User not found: ${email}`);
  }
  console.log(`Role updated to superAdmin for ${email}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
