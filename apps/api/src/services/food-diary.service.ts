import { and, desc, eq } from "drizzle-orm";

import { db } from "../db";
import { athleteTable, foodDiaryTable, guardianTable, userTable } from "../db/schema";

export async function listFoodDiaryForGuardian(guardianId: number) {
  return db
    .select()
    .from(foodDiaryTable)
    .where(eq(foodDiaryTable.guardianId, guardianId))
    .orderBy(desc(foodDiaryTable.date), desc(foodDiaryTable.createdAt));
}

export async function listFoodDiaryEntries(input: { guardianId?: number; athleteId?: number }) {
  const filters = [];
  if (input.guardianId) {
    filters.push(eq(foodDiaryTable.guardianId, input.guardianId));
  }
  if (input.athleteId) {
    filters.push(eq(foodDiaryTable.athleteId, input.athleteId));
  }
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
    .orderBy(desc(foodDiaryTable.date), desc(foodDiaryTable.createdAt));
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
  const resolvedDate =
    typeof input.date === "string"
      ? input.date
      : input.date.toISOString().slice(0, 10);
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
