import { and, eq, gt, isNotNull, ne } from "drizzle-orm";
import { db } from "../db";
import { logger } from "../lib/logger";
import { userStreakTable, userTable } from "../db/schema";
import { createPushIntent } from "./outbox.service";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STREAK_MESSAGES = [
  { title: "🔥 Don't break your streak!", body: "You haven't logged activity today. Keep your streak alive before midnight!" },
  { title: "⚡ Streak at risk!", body: "Log a session or sleep to protect your streak today." },
  { title: "🏃 Your streak is waiting!", body: "You're on a roll — don't let today slip by without logging." },
];

function pickMessage(streak: number) {
  if (streak >= 7) return STREAK_MESSAGES[0];
  if (streak >= 3) return STREAK_MESSAGES[1];
  return STREAK_MESSAGES[2];
}

export async function runStreakReminderSweep() {
  const today = todayKey();

  // Find users with an active streak who haven't logged today yet
  const atRisk = await db
    .select({
      userId: userStreakTable.userId,
      currentStreak: userStreakTable.currentStreak,
      lastActivityDate: userStreakTable.lastActivityDate,
      name: userTable.name,
      isBlocked: userTable.isBlocked,
      isDeleted: userTable.isDeleted,
    })
    .from(userStreakTable)
    .innerJoin(userTable, eq(userTable.id, userStreakTable.userId))
    .where(
      and(
        gt(userStreakTable.currentStreak, 0),
        isNotNull(userStreakTable.lastActivityDate),
        ne(userStreakTable.lastActivityDate, today),
        eq(userTable.isDeleted, false),
        eq(userTable.isBlocked, false),
      ),
    );

  let sent = 0;
  let skipped = 0;

  for (const row of atRisk) {
    const msg = pickMessage(row.currentStreak);
    try {
      await createPushIntent({
        userId: row.userId,
        title: msg.title,
        body: msg.body,
        data: {
          type: "streak_reminder",
          url: "/",
          streak: row.currentStreak,
        },
      });
      sent++;
    } catch {
      skipped++;
    }
  }

  logger.info(
    { sent, skipped, totalAtRisk: atRisk.length, today },
    "[streak-reminder] sweep complete",
  );

  return { sent, skipped, totalAtRisk: atRisk.length };
}
