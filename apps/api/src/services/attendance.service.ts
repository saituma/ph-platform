import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "../db";
import { athleteTable, guardianTable, notificationTable, programSessionCompletionTable, userTable } from "../db/schema";
import { createPushIntent } from "./outbox.service";

const DAY_IDS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

type DayId = (typeof DAY_IDS)[number];

function normalizeDays(input: unknown): DayId[] {
  if (!Array.isArray(input)) return [];
  const out: DayId[] = [];
  for (const item of input) {
    const value = String(item ?? "").toLowerCase() as DayId;
    if (DAY_IDS.includes(value) && !out.includes(value)) out.push(value);
  }
  return out;
}

function utcDayBounds(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function dayIdForDateUtc(date: Date): DayId {
  return DAY_IDS[date.getUTCDay()] ?? "mon";
}

function dateKeyUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function resolveAthleteForUser(userId: number) {
  const [directAthlete] = await db
    .select({
      athleteId: athleteTable.id,
      athleteName: athleteTable.name,
      athleteUserId: athleteTable.userId,
      preferredTrainingDays: athleteTable.preferredTrainingDays,
    })
    .from(athleteTable)
    .where(eq(athleteTable.userId, userId))
    .limit(1);

  if (directAthlete) return directAthlete;

  const [guardian] = await db
    .select({ id: guardianTable.id, activeAthleteId: guardianTable.activeAthleteId })
    .from(guardianTable)
    .where(eq(guardianTable.userId, userId))
    .limit(1);

  if (!guardian?.activeAthleteId) return null;

  const [athlete] = await db
    .select({
      athleteId: athleteTable.id,
      athleteName: athleteTable.name,
      athleteUserId: athleteTable.userId,
      preferredTrainingDays: athleteTable.preferredTrainingDays,
    })
    .from(athleteTable)
    .where(eq(athleteTable.id, guardian.activeAthleteId))
    .limit(1);

  return athlete ?? null;
}

export async function getMyAttendanceStatus(userId: number) {
  const athlete = await resolveAthleteForUser(userId);
  if (!athlete) return null;

  const now = new Date();
  const todayId = dayIdForDateUtc(now);
  const preferredDays = normalizeDays(athlete.preferredTrainingDays);
  const requiredToday = preferredDays.includes(todayId);
  const { start, end } = utcDayBounds(now);

  const [completion] = await db
    .select({ id: programSessionCompletionTable.id, completedAt: programSessionCompletionTable.completedAt })
    .from(programSessionCompletionTable)
    .where(
      and(
        eq(programSessionCompletionTable.athleteId, athlete.athleteId),
        gte(programSessionCompletionTable.completedAt, start),
        lt(programSessionCompletionTable.completedAt, end),
      ),
    )
    .orderBy(desc(programSessionCompletionTable.completedAt))
    .limit(1);

  const completedToday = Boolean(completion);
  const status = requiredToday ? (completedToday ? "present" : "absent") : "not_scheduled";

  const message = requiredToday && !completedToday
    ? "Today is one of your training days. Complete a session to mark attendance."
    : null;

  if (requiredToday && !completedToday) {
    const key = dateKeyUtc(now);
    const link = `/programs?attendanceDate=${key}`;
    const [existing] = await db
      .select({ id: notificationTable.id })
      .from(notificationTable)
      .where(
        and(
          eq(notificationTable.userId, athlete.athleteUserId),
          eq(notificationTable.type, "attendance-reminder"),
          eq(notificationTable.link, link),
          sql`DATE(${notificationTable.createdAt}) = CURRENT_DATE`,
        ),
      )
      .limit(1);

    if (!existing) {
      const content = "Today is your set training day. Complete a session to mark attendance.";
      await db.insert(notificationTable).values({
        userId: athlete.athleteUserId,
        type: "attendance-reminder",
        content,
        link,
      });
      void createPushIntent({
        userId: athlete.athleteUserId,
        title: "Training day reminder",
        body: "Today is your set day. Complete a session to mark attendance.",
        data: { type: "attendance-reminder", url: link },
      }).catch(() => undefined);
    }
  }

  return {
    athleteId: athlete.athleteId,
    athleteName: athlete.athleteName,
    date: dateKeyUtc(now),
    dayId: todayId,
    preferredTrainingDays: preferredDays,
    requiredToday,
    completedToday,
    status,
    message,
  };
}

export async function listAttendanceForAdmin(input: { from: Date; to: Date }) {
  const athletes = await db
    .select({
      athleteId: athleteTable.id,
      athleteName: athleteTable.name,
      athleteUserId: athleteTable.userId,
      preferredTrainingDays: athleteTable.preferredTrainingDays,
      team: athleteTable.team,
      userName: userTable.name,
      userEmail: userTable.email,
    })
    .from(athleteTable)
    .leftJoin(userTable, eq(userTable.id, athleteTable.userId));

  const completions = await db
    .select({
      athleteId: programSessionCompletionTable.athleteId,
      completedAt: programSessionCompletionTable.completedAt,
    })
    .from(programSessionCompletionTable)
    .where(
      and(
        gte(programSessionCompletionTable.completedAt, input.from),
        lt(programSessionCompletionTable.completedAt, input.to),
      ),
    );

  const completionSet = new Set(
    completions.map((row) => `${row.athleteId}:${dateKeyUtc(new Date(row.completedAt as Date))}`),
  );

  const out: Array<Record<string, unknown>> = [];
  for (let d = new Date(input.from); d < input.to; d = new Date(d.getTime() + 24 * 60 * 60 * 1000)) {
    const dayKey = dateKeyUtc(d);
    const dayId = dayIdForDateUtc(d);
    for (const athlete of athletes) {
      const preferred = normalizeDays(athlete.preferredTrainingDays);
      if (!preferred.includes(dayId)) continue;
      const completed = completionSet.has(`${athlete.athleteId}:${dayKey}`);
      out.push({
        date: dayKey,
        dayId,
        athleteId: athlete.athleteId,
        athleteName: athlete.athleteName,
        team: athlete.team,
        userName: athlete.userName,
        userEmail: athlete.userEmail,
        status: completed ? "present" : "absent",
      });
    }
  }

  return out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}
