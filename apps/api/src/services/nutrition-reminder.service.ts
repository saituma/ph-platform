import { and, eq, isNotNull } from "drizzle-orm";

import { db } from "../db";
import { athleteTable, guardianTable, nutritionLogsTable, userTable } from "../db/schema";
import { pushQueue } from "../jobs";

function getLocalDateKeyAndMinutes(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }

  const dateKey = `${map.year}-${map.month}-${map.day}`;
  const minutesNow = Number(map.hour) * 60 + Number(map.minute);
  return { dateKey, minutesNow };
}

function parseTimeLocal(timeLocal: string) {
  const [hhRaw, mmRaw] = timeLocal.split(":");
  const hh = Number(hhRaw);
  const mm = Number(mmRaw);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return { hh, mm, minutes: hh * 60 + mm };
}

function isNonEmptyText(value: unknown) {
  if (typeof value !== "string") return false;
  return value.trim().length > 0;
}

function isMeaningfulNutritionLog(log: typeof nutritionLogsTable.$inferSelect) {
  if (isNonEmptyText(log.foodDiary)) return true;

  if (isNonEmptyText(log.breakfast)) return true;
  if (isNonEmptyText(log.lunch)) return true;
  if (isNonEmptyText(log.dinner)) return true;

  if (isNonEmptyText(log.snacksMorning)) return true;
  if (isNonEmptyText(log.snacksAfternoon)) return true;
  if (isNonEmptyText(log.snacksEvening)) return true;
  if (isNonEmptyText(log.snacks)) return true;

  if ((log.waterIntake ?? 0) > 0) return true;
  if ((log.steps ?? 0) > 0) return true;
  if ((log.sleepHours ?? 0) > 0) return true;

  if (typeof log.mood === "number") return true;
  if (typeof log.energy === "number") return true;
  if (typeof log.pain === "number") return true;

  return false;
}

async function getGuardianUserIdsForAthleteUserId(athleteUserId: number) {
  const [athlete] = await db
    .select({ guardianId: athleteTable.guardianId })
    .from(athleteTable)
    .where(eq(athleteTable.userId, athleteUserId))
    .limit(1);

  if (!athlete?.guardianId) return [] as number[];

  const guardians = await db
    .select({ userId: guardianTable.userId })
    .from(guardianTable)
    .where(eq(guardianTable.id, athlete.guardianId));

  return guardians.map((g) => g.userId).filter((id) => Number.isFinite(id));
}

export async function runNutritionLogReminderSweep() {
  const now = new Date();

  const athletes = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      timezone: userTable.nutritionReminderTimezone,
      timeLocal: userTable.nutritionReminderTimeLocal,
      lastDateKey: userTable.lastNutritionReminderDateKey,
    })
    .from(userTable)
    .where(
      and(
        eq(userTable.role, "athlete"),
        eq(userTable.isDeleted, false),
        eq(userTable.isBlocked, false),
        eq(userTable.nutritionReminderEnabled, true),
        isNotNull(userTable.nutritionReminderTimeLocal),
      ),
    );

  let sent = 0;
  let skippedNotYet = 0;
  let skippedLogged = 0;
  let skippedDup = 0;

  for (const athlete of athletes) {
    const timeZone = athlete.timezone?.trim() || "UTC";
    const timeLocal = athlete.timeLocal?.trim();
    if (!timeLocal) continue;

    const parsed = parseTimeLocal(timeLocal);
    if (!parsed) continue;

    let dateKey: string;
    let minutesNow: number;
    try {
      ({ dateKey, minutesNow } = getLocalDateKeyAndMinutes(now, timeZone));
    } catch {
      ({ dateKey, minutesNow } = getLocalDateKeyAndMinutes(now, "UTC"));
    }

    if (athlete.lastDateKey === dateKey) {
      skippedDup++;
      continue;
    }

    if (minutesNow < parsed.minutes) {
      skippedNotYet++;
      continue;
    }

    const [log] = await db
      .select()
      .from(nutritionLogsTable)
      .where(and(eq(nutritionLogsTable.userId, athlete.id), eq(nutritionLogsTable.dateKey, dateKey)))
      .limit(1);

    if (log && isMeaningfulNutritionLog(log)) {
      skippedLogged++;
      continue;
    }

    const title = "Nutrition reminder";
    const body = "Don't forget to log today's nutrition.";

    // Update de-dupe marker first to prevent double-sends if the script overlaps.
    await db
      .update(userTable)
      .set({
        lastNutritionReminderDateKey: dateKey,
        lastNutritionReminderSentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, athlete.id));

    void pushQueue.enqueue({ userId: athlete.id, title, body, data: {
      type: "nutrition_reminder",
      url: "/nutrition",
      dateKey,
    } });

    const guardianUserIds = await getGuardianUserIdsForAthleteUserId(athlete.id);
    for (const guardianUserId of guardianUserIds) {
      void pushQueue.enqueue({ userId: guardianUserId, title, body, data: {
        type: "nutrition_reminder",
        url: "/nutrition",
        dateKey,
        athleteUserId: athlete.id,
      } });
    }

    sent++;
  }

  console.log(
    `[nutrition-reminder] sweep complete sent=${sent} skippedNotYet=${skippedNotYet} skippedLogged=${skippedLogged} skippedDup=${skippedDup} totalEligible=${athletes.length}`,
  );

  return { sent, skippedNotYet, skippedLogged, skippedDup, totalEligible: athletes.length };
}
