import { eq } from "drizzle-orm";

import { db } from "../db";
import { userTable } from "../db/schema";

const email = process.env.ADMIN_EMAIL ?? "admin@gmail.com";

async function main() {
  const result = await db.update(userTable).set({ role: "admin" }).where(eq(userTable.email, email)).returning();
  const user = result[0];
  if (!user) {
    throw new Error(`User not found: ${email}`);
  }
  console.log(`Role updated for ${email}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
