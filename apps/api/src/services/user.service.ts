import { and, eq } from "drizzle-orm";

import { db } from "../db";
import { athleteTable, guardianTable, userTable } from "../db/schema";

export async function getUserByCognitoSub(sub: string) {
  const users = await db
    .select()
    .from(userTable)
    .where(and(eq(userTable.cognitoSub, sub), eq(userTable.isDeleted, false)))
    .limit(1);
  return users[0] ?? null;
}

export async function getUserById(id: number) {
  const users = await db
    .select()
    .from(userTable)
    .where(and(eq(userTable.id, id), eq(userTable.isDeleted, false)))
    .limit(1);
  return users[0] ?? null;
}

export async function getUserByEmail(email: string) {
  const users = await db
    .select()
    .from(userTable)
    .where(and(eq(userTable.email, email), eq(userTable.isDeleted, false)))
    .limit(1);
  return users[0] ?? null;
}

export async function createUserFromCognito(input: {
  sub: string;
  email: string;
  name: string;
  role?: "guardian" | "athlete" | "coach" | "admin" | "superAdmin";
}) {
  const result = await db
    .insert(userTable)
    .values({
      cognitoSub: input.sub,
      email: input.email,
      name: input.name,
      role: input.role,
    })
    .returning();

  return result[0];
}

export async function updateUserRole(
  userId: number,
  role: "guardian" | "athlete" | "coach" | "admin" | "superAdmin"
) {
  const result = await db
    .update(userTable)
    .set({ role })
    .where(eq(userTable.id, userId))
    .returning();

  return result[0] ?? null;
}

export async function getGuardianAndAthlete(userId: number) {
  const guardians = await db.select().from(guardianTable).where(eq(guardianTable.userId, userId)).limit(1);
  const guardian = guardians[0] ?? null;
  if (!guardian) {
    return { guardian: null, athlete: null };
  }
  const athletes = await db.select().from(athleteTable).where(eq(athleteTable.guardianId, guardian.id)).limit(1);
  return { guardian, athlete: athletes[0] ?? null };
}
