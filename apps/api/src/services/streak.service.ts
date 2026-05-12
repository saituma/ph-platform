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
  freezesAvailable?: number;
  freezesUsedDates?: string[];
  timezone?: string;
}

export interface StreakRow {
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  totalSessions: number;
  totalMinutes: number;
  completedDates: string[];
  freezesAvailable: number;
  freezesUsedDates: string[];
  timezone: string | null;
  lastActivityDate: string | null;
}

function serverCalcStreak(completedDates: string[], freezeUsedDates: string[]): number {
  const all = [...new Set([...completedDates, ...freezeUsedDates])].sort().reverse();
  if (all.length === 0) return 0;

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (all[0] !== today && all[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < all.length; i++) {
    const cur = new Date(all[i - 1] + "T12:00:00Z").getTime();
    const prev = new Date(all[i] + "T12:00:00Z").getTime();
    const diff = Math.round((cur - prev) / 86400000);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

export async function upsertUserStreak(userId: number, payload: StreakPayload): Promise<StreakRow> {
  const existing = await db.select().from(userStreakTable).where(eq(userStreakTable.userId, userId)).limit(1);

  let merged: StreakRow;

  if (existing.length > 0) {
    const row = existing[0];
    const mergedDates = [...new Set([...row.completedDates, ...payload.completedDates])].sort();
    const mergedFreezes = [...new Set([...(row.freezesUsedDates ?? []), ...(payload.freezesUsedDates ?? [])])].sort();
    const newStreak = serverCalcStreak(mergedDates, mergedFreezes);

    merged = {
      currentStreak: newStreak,
      longestStreak: Math.max(Math.max(row.longestStreak, payload.longestStreak), newStreak),
      totalDays: Math.max(row.totalDays, payload.totalDays),
      totalSessions: Math.max(row.totalSessions, payload.totalSessions),
      totalMinutes: Math.max(row.totalMinutes, payload.totalMinutes),
      completedDates: mergedDates,
      freezesAvailable: Math.max(row.freezesAvailable, payload.freezesAvailable ?? 0),
      freezesUsedDates: mergedFreezes,
      timezone: payload.timezone ?? row.timezone,
      lastActivityDate: payload.lastActivityDate ?? row.lastActivityDate,
    };

    await db
      .update(userStreakTable)
      .set({ ...merged, updatedAt: new Date() })
      .where(eq(userStreakTable.userId, userId));
  } else {
    const freezes = payload.freezesUsedDates ?? [];
    const newStreak = serverCalcStreak(payload.completedDates, freezes);

    merged = {
      currentStreak: newStreak,
      longestStreak: Math.max(payload.longestStreak, newStreak),
      totalDays: payload.totalDays,
      totalSessions: payload.totalSessions,
      totalMinutes: payload.totalMinutes,
      completedDates: payload.completedDates,
      freezesAvailable: payload.freezesAvailable ?? 0,
      freezesUsedDates: freezes,
      timezone: payload.timezone ?? null,
      lastActivityDate: payload.lastActivityDate,
    };

    await db.insert(userStreakTable).values({
      userId,
      ...merged,
      updatedAt: new Date(),
    });
  }

  return merged;
}

export async function getUserStreak(userId: number): Promise<StreakRow | null> {
  const rows = await db.select().from(userStreakTable).where(eq(userStreakTable.userId, userId)).limit(1);

  if (!rows[0]) return null;
  const row = rows[0];
  return {
    currentStreak: row.currentStreak,
    longestStreak: row.longestStreak,
    totalDays: row.totalDays,
    totalSessions: row.totalSessions,
    totalMinutes: row.totalMinutes,
    completedDates: row.completedDates,
    freezesAvailable: row.freezesAvailable,
    freezesUsedDates: row.freezesUsedDates ?? [],
    timezone: row.timezone ?? null,
    lastActivityDate: row.lastActivityDate ?? null,
  };
}
