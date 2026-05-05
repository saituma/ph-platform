import { db } from "./apps/api/src/db";
import { athleteTable, userTable, guardianTable } from "./apps/api/src/db/schema";
import { eq } from "drizzle-orm";

async function checkUser() {
  const email = "dawitanother@gmail.com";
  const users = await db.select().from(userTable).where(eq(userTable.email, email)).limit(1);
  if (!users[0]) {
    console.log("User not found");
    return;
  }
  const user = users[0];
  console.log("User:", { id: user.id, email: user.email, name: user.name });

  const guardians = await db.select().from(guardianTable).where(eq(guardianTable.userId, user.id)).limit(1);
  const guardian = guardians[0];
  if (guardian) {
    console.log("Guardian:", { id: guardian.id, activeAthleteId: guardian.activeAthleteId });
    const athletes = await db.select().from(athleteTable).where(eq(athleteTable.guardianId, guardian.id));
    console.log("Athletes for Guardian:", athletes.map(a => ({ id: a.id, name: a.name, birthDate: a.birthDate, age: a.age, createdAt: a.createdAt })));
  }

  const directAthletes = await db.select().from(athleteTable).where(eq(athleteTable.userId, user.id));
  console.log("Direct Athletes:", directAthletes.map(a => ({ id: a.id, name: a.name, birthDate: a.birthDate, age: a.age, createdAt: a.createdAt })));
}

checkUser().catch(console.error);
