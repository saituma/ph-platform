import { db } from "../db";
import { userTable } from "../db/schema";
import { eq } from "drizzle-orm";

export async function ensureAiCoachUser() {
  const email = "ai-coach@football-performance.ai";
  const existing = await db.select().from(userTable).where(eq(userTable.email, email)).limit(1);

  if (existing[0]) {
    console.log(`[AI Seed] AI Coach already exists with ID: ${existing[0].id}`);
    return existing[0].id;
  }

  const [inserted] = await db
    .insert(userTable)
    .values({
      name: "AI Coach",
      email: email,
      role: "admin",
      cognitoSub: "ai-coach-virtual-sub",
      profilePicture: null,
    })
    .returning();

  console.log(`[AI Seed] Created AI Coach with ID: ${inserted.id}`);
  return inserted.id;
}

if (require.main === module) {
  ensureAiCoachUser()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
