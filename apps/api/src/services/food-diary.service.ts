import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "../db";
import { athleteTable, foodDiaryTable, guardianTable, userTable } from "../db/schema";

export async function listFoodDiaryForGuardian(guardianId: number, limit = 100) {
  return db
    .select({
      id: foodDiaryTable.id,
      athleteId: foodDiaryTable.athleteId,
      guardianId: foodDiaryTable.guardianId,
      date: foodDiaryTable.date,
      meals: foodDiaryTable.meals,
      notes: foodDiaryTable.notes,
      quantity: foodDiaryTable.quantity,
      photoUrl: foodDiaryTable.photoUrl,
      feedback: foodDiaryTable.feedback,
      reviewedAt: foodDiaryTable.reviewedAt,
      reviewedByCoach: foodDiaryTable.reviewedByCoach,
      createdAt: foodDiaryTable.createdAt,
      updatedAt: foodDiaryTable.updatedAt,
    })
    .from(foodDiaryTable)
    .where(eq(foodDiaryTable.guardianId, guardianId))
    .orderBy(desc(foodDiaryTable.date), desc(foodDiaryTable.createdAt))
    .limit(Math.max(1, Math.min(200, limit)));
}

export async function listFoodDiaryEntries(input: {
  guardianId?: number;
  athleteId?: number;
  q?: string;
  limit?: number;
}) {
  const filters = [];
  if (input.guardianId) {
    filters.push(eq(foodDiaryTable.guardianId, input.guardianId));
  }
  if (input.athleteId) {
    filters.push(eq(foodDiaryTable.athleteId, input.athleteId));
  }
  const q = input.q?.trim() ?? "";
  if (q) {
    const pattern = `%${q}%`;
    filters.push(
      or(
        ilike(athleteTable.name, pattern),
        ilike(userTable.name, pattern),
        ilike(guardianTable.email, pattern),
        ilike(foodDiaryTable.notes, pattern),
        ilike(foodDiaryTable.feedback, pattern),
        sql`${foodDiaryTable.id}::text ILIKE ${pattern}`,
      ),
    );
  }
  const requestedLimit = input.limit;
  const limit =
    typeof requestedLimit === "number" && Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(100, Math.floor(requestedLimit)))
      : 50;
  return db
    .select({
      id: foodDiaryTable.id,
      athleteId: foodDiaryTable.athleteId,
      guardianId: foodDiaryTable.guardianId,
      date: foodDiaryTable.date,
      meals: foodDiaryTable.meals,
      notes: foodDiaryTable.notes,
      quantity: foodDiaryTable.quantity,
      photoUrl: foodDiaryTable.photoUrl,
      feedback: foodDiaryTable.feedback,
      reviewedAt: foodDiaryTable.reviewedAt,
      reviewedByCoach: foodDiaryTable.reviewedByCoach,
      createdAt: foodDiaryTable.createdAt,
      updatedAt: foodDiaryTable.updatedAt,
      athleteName: athleteTable.name,
      guardianName: userTable.name,
      guardianEmail: guardianTable.email,
      guardianUserId: userTable.id,
    })
    .from(foodDiaryTable)
    .leftJoin(athleteTable, eq(foodDiaryTable.athleteId, athleteTable.id))
    .leftJoin(guardianTable, eq(foodDiaryTable.guardianId, guardianTable.id))
    .leftJoin(userTable, eq(guardianTable.userId, userTable.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(foodDiaryTable.date), desc(foodDiaryTable.createdAt))
    .limit(limit);
}

export async function createFoodDiaryEntry(input: {
  athleteId: number;
  guardianId: number;
  date: Date | string;
  meals?: unknown | null;
  notes?: string | null;
  quantity?: number | null;
  photoUrl?: string | null;
}) {
  const resolvedDate = typeof input.date === "string" ? input.date : input.date.toISOString().slice(0, 10);
  const result = await db
    .insert(foodDiaryTable)
    .values({
      athleteId: input.athleteId,
      guardianId: input.guardianId,
      date: resolvedDate,
      meals: input.meals ?? null,
      notes: input.notes ?? null,
      quantity: input.quantity ?? null,
      photoUrl: input.photoUrl ?? null,
    })
    .returning();
  return result[0];
}

export async function reviewFoodDiaryEntry(input: {
  entryId: number;
  feedback: string | null;
  reviewedByCoach: number;
}) {
  const updated = await db
    .update(foodDiaryTable)
    .set({
      feedback: input.feedback,
      reviewedByCoach: input.reviewedByCoach,
      reviewedAt: input.feedback ? new Date() : null,
    })
    .where(eq(foodDiaryTable.id, input.entryId))
    .returning();
  return updated[0];
}

export async function getFoodDiaryGuardianUser(entryId: number) {
  return db
    .select({
      guardianUserId: userTable.id,
      athleteName: athleteTable.name,
    })
    .from(foodDiaryTable)
    .leftJoin(guardianTable, eq(foodDiaryTable.guardianId, guardianTable.id))
    .leftJoin(userTable, eq(guardianTable.userId, userTable.id))
    .leftJoin(athleteTable, eq(foodDiaryTable.athleteId, athleteTable.id))
    .where(eq(foodDiaryTable.id, entryId))
    .limit(1);
}
