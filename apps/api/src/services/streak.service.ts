import { eq } from "drizzle-orm";
import { db } from "../db";
import { userStreakTable } from "../db/schema";

export interface StreakPayload {
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  totalSessions: number;
  totalMinutes: number;
  completedDates: string[];
  lastActivityDate: string | null;
}

export async function upsertUserStreak(userId: number, payload: StreakPayload) {
  const existing = await db
    .select({ id: userStreakTable.id })
    .from(userStreakTable)
    .where(eq(userStreakTable.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(userStreakTable)
      .set({
        currentStreak: payload.currentStreak,
        longestStreak: payload.longestStreak,
        totalDays: payload.totalDays,
        totalSessions: payload.totalSessions,
        totalMinutes: payload.totalMinutes,
        completedDates: payload.completedDates,
        lastActivityDate: payload.lastActivityDate ?? null,
        updatedAt: new Date(),
      })
      .where(eq(userStreakTable.userId, userId));
  } else {
    await db.insert(userStreakTable).values({
      userId,
      currentStreak: payload.currentStreak,
      longestStreak: payload.longestStreak,
      totalDays: payload.totalDays,
      totalSessions: payload.totalSessions,
      totalMinutes: payload.totalMinutes,
      completedDates: payload.completedDates,
      lastActivityDate: payload.lastActivityDate ?? null,
      updatedAt: new Date(),
    });
  }
}

export async function getUserStreak(userId: number) {
  const rows = await db
    .select()
    .from(userStreakTable)
    .where(eq(userStreakTable.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}
