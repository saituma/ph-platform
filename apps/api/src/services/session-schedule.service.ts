import { and, asc, count as drizzleCount, desc, eq, gt, gte, inArray, lt, lte, sql } from "drizzle-orm";
import { db } from "../db";
import {
  athleteTable,
  notificationTable,
  scheduledSessionTable,
  sessionAttendanceTable,
  sessionTemplateTable,
  userTable,
} from "../db/schema";
import { createPushIntent } from "./outbox.service";
import { logger } from "../lib/logger";
import { getSocketServer } from "../socket-hub";
import { getGoogleCalendarConnectionForAdmin, upsertGoogleCalendarEvent } from "./google-calendar.service";

const MAX_MATERIALIZE_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 500): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * 2 ** attempt));
      }
    }
  }
  throw lastError;
}

type SessionType = "one_to_one" | "semi_private" | "in_person" | "team";
type SessionScope = "individual" | "group" | "team";
type AttendanceStatus = "unmarked" | "attended" | "missed";

type CreateTemplateInput = {
  name: string;
  type: SessionType;
  scope: SessionScope;
  isRecurring: boolean;
  weekday: number | null;
  startsAtTime: string;
  endsAtTime: string;
  location?: string | null;
  meetingLink?: string | null;
  notes?: string | null;
  teamId?: number | null;
  targetUserIds?: number[];
  googleSyncEnabled?: boolean;
  isActive?: boolean;
  createdBy: number;
};

function parseTimeToMinutes(v: string) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(v);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function toLocalDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSameSessionDay(a: Date, b: Date) {
  return toDateKey(a) === toDateKey(b) || toLocalDateKey(a) === toLocalDateKey(b);
}

function buildUtcFromDateAndTime(date: Date, hhmm: string) {
  const parts = hhmm.split(":").map(Number);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), parts[0] ?? 0, parts[1] ?? 0, 0, 0),
  );
}

async function resolveTemplateTargetUserIds(template: typeof sessionTemplateTable.$inferSelect) {
  if (template.scope === "team") {
    if (!template.teamId) return [] as number[];
    const rows = await db
      .select({ userId: athleteTable.userId })
      .from(athleteTable)
      .where(eq(athleteTable.teamId, template.teamId));
    return rows.map((r) => r.userId).filter((n): n is number => typeof n === "number");
  }
  const ids = Array.isArray(template.targetUserIds)
    ? template.targetUserIds.map((x) => Number(x)).filter((x) => Number.isFinite(x))
    : [];
  return [...new Set(ids)];
}

function emitScheduleChanged(userIds: number[], payload: Record<string, unknown>) {
  const io = getSocketServer();
  if (!io) return;
  const uniqueUserIds = [...new Set(userIds.filter((id) => Number.isFinite(id)))];
  for (const userId of uniqueUserIds) {
    io.to(`user:${userId}`).emit("schedule:changed", payload);
  }
  io.to("admin:all").emit("schedule:changed", payload);
}

function emitAttendanceChanged(userIds: number[], payload: Record<string, unknown>) {
  const io = getSocketServer();
  if (!io) return;
  const uniqueUserIds = [...new Set(userIds.filter((id) => Number.isFinite(id)))];
  for (const userId of uniqueUserIds) {
    io.to(`user:${userId}`).emit("schedule:attendance:changed", payload);
  }
  io.to("admin:all").emit("schedule:attendance:changed", payload);
}

export async function notifyMaterializedSessions(input: {
  userIds: number[];
  sessionIds: number[];
  templateName: string;
}) {
  const uniqueUserIds = [...new Set(input.userIds.filter((id) => Number.isFinite(id)))];
  if (!uniqueUserIds.length || !input.sessionIds.length) return;

  await db.insert(notificationTable).values(
    uniqueUserIds.map((userId) => ({
      userId,
      type: "schedule_session_created",
      content: `${input.templateName} was added to your schedule.`,
      link: "/schedule",
    })),
  );

  for (const userId of uniqueUserIds) {
    void createPushIntent({
      userId,
      title: "New session scheduled",
      body: `${input.templateName} was added to your schedule.`,
      data: { type: "schedule", screen: "schedule", url: "/schedule" },
    });
  }

  emitScheduleChanged(uniqueUserIds, {
    message: "Scheduled sessions updated",
    sessionIds: input.sessionIds,
  });
}

export async function notifyAttendanceUpdated(input: {
  scheduledSessionId: number;
  userIds: number[];
  message: string;
  createNotification?: boolean;
}) {
  const uniqueUserIds = [...new Set(input.userIds.filter((id) => Number.isFinite(id)))];
  if (!uniqueUserIds.length) return;

  if (input.createNotification) {
    await db.insert(notificationTable).values(
      uniqueUserIds.map((userId) => ({
        userId,
        type: "schedule_attendance_updated",
        content: input.message,
        link: "/schedule",
      })),
    );
  }

  emitAttendanceChanged(uniqueUserIds, {
    message: input.message,
    sessionId: input.scheduledSessionId,
  });
  emitScheduleChanged(uniqueUserIds, {
    message: input.message,
    sessionId: input.scheduledSessionId,
  });
}

export async function createSessionTemplate(input: CreateTemplateInput) {
  const [created] = await db
    .insert(sessionTemplateTable)
    .values({
      name: input.name,
      type: input.type,
      scope: input.scope,
      isRecurring: input.isRecurring,
      weekday: input.weekday,
      startsAtTime: input.startsAtTime,
      endsAtTime: input.endsAtTime,
      location: input.location ?? null,
      meetingLink: input.meetingLink ?? null,
      notes: input.notes ?? null,
      teamId: input.teamId ?? null,
      targetUserIds: input.targetUserIds ?? [],
      googleSyncEnabled: input.googleSyncEnabled ?? false,
      isActive: input.isActive ?? true,
      createdBy: input.createdBy,
    })
    .returning();
  return created;
}

export async function listSessionTemplates() {
  return db.select().from(sessionTemplateTable).orderBy(desc(sessionTemplateTable.id)).limit(500);
}

export async function materializeTemplateSessions(input: {
  templateId: number;
  from: Date;
  to: Date;
  actorUserId: number;
}) {
  const [template] = await db
    .select()
    .from(sessionTemplateTable)
    .where(eq(sessionTemplateTable.id, input.templateId))
    .limit(1);
  if (!template) throw new Error("TEMPLATE_NOT_FOUND");
  if (!template.isActive)
    return {
      created: 0,
      sessionIds: [] as number[],
      touchedSessionIds: [] as number[],
      affectedUserIds: [] as number[],
      templateName: "",
      reason: "template_inactive" as const,
    };

  const startsMinutes = parseTimeToMinutes(template.startsAtTime);
  const endsMinutes = parseTimeToMinutes(template.endsAtTime);
  if (startsMinutes == null || endsMinutes == null || endsMinutes <= startsMinutes) {
    throw new Error("TEMPLATE_TIME_INVALID");
  }

  const targetUserIds = await resolveTemplateTargetUserIds(template);
  if (template.scope !== "team" && !targetUserIds.length)
    return {
      created: 0,
      sessionIds: [] as number[],
      touchedSessionIds: [] as number[],
      affectedUserIds: [] as number[],
      templateName: template.name,
      reason: "no_target_users" as const,
    };

  const fromDay = startOfUtcDay(input.from);
  const toDay = startOfUtcDay(input.to);
  const createdIds: number[] = [];
  const touchedSessionIds: number[] = [];
  const calendarConfig = await getGoogleCalendarConnectionForAdmin(template.createdBy);

  for (let d = new Date(fromDay); d.getTime() <= toDay.getTime(); d = new Date(d.getTime() + 24 * 60 * 60 * 1000)) {
    if (template.isRecurring) {
      if (typeof template.weekday !== "number") continue;
      if (d.getUTCDay() !== template.weekday) continue;
    }
    const startsAt = buildUtcFromDateAndTime(d, template.startsAtTime);
    const endsAt = buildUtcFromDateAndTime(d, template.endsAtTime);

    let [session] = await db
      .select()
      .from(scheduledSessionTable)
      .where(and(eq(scheduledSessionTable.templateId, template.id), eq(scheduledSessionTable.startsAt, startsAt)))
      .limit(1);

    if (!session) {
      [session] = await db
        .insert(scheduledSessionTable)
        .values({
          templateId: template.id,
          name: template.name,
          type: template.type,
          scope: template.scope,
          startsAt,
          endsAt,
          status: "upcoming",
          location: template.location ?? null,
          meetingLink: template.meetingLink ?? null,
          notes: template.notes ?? null,
          teamId: template.teamId ?? null,
          createdBy: input.actorUserId,
        })
        .returning();
      createdIds.push(session.id);
    }
    touchedSessionIds.push(session.id);

    if (calendarConfig) {
      try {
        const googleEventId = await upsertGoogleCalendarEvent(
          {
            title: session.name,
            description: session.notes ?? null,
            location: session.location ?? null,
            startsAt: new Date(session.startsAt),
            endsAt: new Date(session.endsAt),
            existingEventId: session.googleEventId ?? null,
          },
          calendarConfig,
        );
        if (googleEventId && googleEventId !== session.googleEventId) {
          const [updatedSession] = await db
            .update(scheduledSessionTable)
            .set({ googleEventId, updatedAt: new Date() })
            .where(eq(scheduledSessionTable.id, session.id))
            .returning();
          session = updatedSession ?? session;
        }
      } catch (error) {
        logger.warn(
          {
            err: error,
            sessionId: session.id,
            templateId: template.id,
          },
          "Google Calendar sync failed for scheduled session",
        );
      }
    }

    const existing = await db
      .select({ userId: sessionAttendanceTable.userId })
      .from(sessionAttendanceTable)
      .where(eq(sessionAttendanceTable.scheduledSessionId, session.id));
    const existingSet = new Set(existing.map((r) => r.userId));
    const missing = targetUserIds.filter((uid) => !existingSet.has(uid));
    if (missing.length) {
      await db.insert(sessionAttendanceTable).values(
        missing.map((uid) => ({
          scheduledSessionId: session!.id,
          userId: uid,
          status: "unmarked" as const,
        })),
      );
    }
  }

  return {
    created: createdIds.length,
    sessionIds: createdIds,
    touchedSessionIds: [...new Set(touchedSessionIds)],
    affectedUserIds: targetUserIds,
    templateName: template.name,
    reason: createdIds.length > 0 ? ("created" as const) : ("already_exists" as const),
  };
}

export async function listMyScheduledSessions(input: { userId: number; from?: Date; to?: Date }) {
  const where = [eq(sessionAttendanceTable.userId, input.userId)];
  if (input.from) where.push(gte(scheduledSessionTable.startsAt, input.from));
  if (input.to) where.push(lte(scheduledSessionTable.startsAt, input.to));

  const rows = await db
    .select({
      sessionId: scheduledSessionTable.id,
      name: scheduledSessionTable.name,
      type: scheduledSessionTable.type,
      startsAt: scheduledSessionTable.startsAt,
      endsAt: scheduledSessionTable.endsAt,
      location: scheduledSessionTable.location,
      meetingLink: scheduledSessionTable.meetingLink,
      sessionStatus: scheduledSessionTable.status,
      attendanceStatus: sessionAttendanceTable.status,
      checkInAt: sessionAttendanceTable.checkInAt,
    })
    .from(sessionAttendanceTable)
    .innerJoin(scheduledSessionTable, eq(sessionAttendanceTable.scheduledSessionId, scheduledSessionTable.id))
    .where(and(...where))
    .orderBy(asc(scheduledSessionTable.startsAt));

  const now = Date.now();
  return rows.map((row) => {
    let status: "Upcoming" | "Completed" | "Missed" = "Upcoming";
    if (row.attendanceStatus === "attended") status = "Completed";
    else if (row.attendanceStatus === "missed") status = "Missed";
    else if (row.endsAt && new Date(row.endsAt).getTime() < now) status = "Missed";
    return {
      ...row,
      status,
      dateKey: toDateKey(new Date(row.startsAt)),
    };
  });
}

export async function listAdminScheduledSessions(input: { from?: Date; to?: Date; userId?: number }) {
  const where: any[] = [];
  if (input.from) where.push(gte(scheduledSessionTable.startsAt, input.from));
  if (input.to) where.push(lte(scheduledSessionTable.startsAt, input.to));

  const baseRows = await db
    .select()
    .from(scheduledSessionTable)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(scheduledSessionTable.startsAt))
    .limit(500); // safety cap; callers should pass from/to for bounded windows

  if (!baseRows.length) return [];

  const sessionIds = baseRows.map((s) => s.id);
  const attendanceRows = await db
    .select({
      sessionId: sessionAttendanceTable.scheduledSessionId,
      userId: sessionAttendanceTable.userId,
      status: sessionAttendanceTable.status,
      checkInAt: sessionAttendanceTable.checkInAt,
      markedBy: sessionAttendanceTable.markedBy,
      markedAt: sessionAttendanceTable.markedAt,
      userName: userTable.name,
      userEmail: userTable.email,
      guardianEmail: sql<string | null>`(
        SELECT gu."email" FROM "users" gu
        INNER JOIN "guardians" g ON g."userId" = gu."id"
        INNER JOIN "athletes" a ON a."guardianId" = g."id"
        WHERE a."userId" = ${sessionAttendanceTable.userId}
        AND gu."isDeleted" = false
        LIMIT 1
      )`.as("guardian_email"),
    })
    .from(sessionAttendanceTable)
    .innerJoin(userTable, eq(sessionAttendanceTable.userId, userTable.id))
    .where(
      and(
        inArray(sessionAttendanceTable.scheduledSessionId, sessionIds),
        input.userId ? eq(sessionAttendanceTable.userId, input.userId) : undefined,
      ),
    );

  const bySession = new Map<number, typeof attendanceRows>();
  for (const row of attendanceRows) {
    const list = bySession.get(row.sessionId) ?? [];
    list.push(row);
    bySession.set(row.sessionId, list);
  }

  return baseRows.map((s) => ({
    ...s,
    attendees: (bySession.get(s.id) ?? []).map((a) => ({
      ...a,
      userEmail: a.guardianEmail || a.userEmail,
    })),
  }));
}

export async function markSessionAttendance(input: {
  scheduledSessionId: number;
  markedBy: number;
  updates: Array<{ userId: number; status: AttendanceStatus }>;
}) {
  if (!input.updates.length) return { updated: 0 };
  let count = 0;
  for (const update of input.updates) {
    const [row] = await db
      .update(sessionAttendanceTable)
      .set({
        status: update.status,
        markedBy: input.markedBy,
        markedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(sessionAttendanceTable.scheduledSessionId, input.scheduledSessionId),
          eq(sessionAttendanceTable.userId, update.userId),
        ),
      )
      .returning({ id: sessionAttendanceTable.id });
    if (row?.id) count += 1;
  }
  return { updated: count };
}

export async function checkInMySession(input: { scheduledSessionId: number; userId: number }) {
  const [assignment] = await db
    .select({
      attendanceId: sessionAttendanceTable.id,
      status: sessionAttendanceTable.status,
      startsAt: scheduledSessionTable.startsAt,
    })
    .from(sessionAttendanceTable)
    .innerJoin(scheduledSessionTable, eq(sessionAttendanceTable.scheduledSessionId, scheduledSessionTable.id))
    .where(
      and(
        eq(sessionAttendanceTable.scheduledSessionId, input.scheduledSessionId),
        eq(sessionAttendanceTable.userId, input.userId),
      ),
    )
    .limit(1);

  if (!assignment) throw new Error("SESSION_ASSIGNMENT_NOT_FOUND");
  if (!isSameSessionDay(new Date(assignment.startsAt), new Date())) {
    throw new Error("SESSION_NOT_ATTENDABLE_TODAY");
  }

  const now = new Date();
  const [row] = await db
    .update(sessionAttendanceTable)
    .set({
      status: "attended",
      checkInAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(sessionAttendanceTable.scheduledSessionId, input.scheduledSessionId),
        eq(sessionAttendanceTable.userId, input.userId),
      ),
    )
    .returning({
      id: sessionAttendanceTable.id,
      checkInAt: sessionAttendanceTable.checkInAt,
      status: sessionAttendanceTable.status,
    });
  if (!row) throw new Error("SESSION_ASSIGNMENT_NOT_FOUND");
  return { ok: true, attendanceStatus: row.status, checkInAt: row.checkInAt };
}

export async function deleteSessionTemplate(userId: number, templateId: number) {
  await db.delete(scheduledSessionTable).where(eq(scheduledSessionTable.templateId, templateId));
  await db.delete(sessionTemplateTable).where(eq(sessionTemplateTable.id, templateId));
  return { deleted: true };
}

export async function updateSessionTemplate(
  userId: number,
  templateId: number,
  updates: Partial<{
    name: string;
    dayOfWeek: number | null;
    startTime: string;
    endTime: string;
    location: string | null;
    notes: string | null;
    isActive: boolean;
    scope: SessionScope;
    targetUserIds: number[];
    targetTeamId: number | null;
    googleSyncEnabled: boolean;
  }>,
) {
  const setValues: Record<string, unknown> = { updatedAt: new Date() };
  if (updates.name !== undefined) setValues.name = updates.name;
  if (updates.dayOfWeek !== undefined) setValues.weekday = updates.dayOfWeek;
  if (updates.startTime !== undefined) setValues.startsAtTime = updates.startTime;
  if (updates.endTime !== undefined) setValues.endsAtTime = updates.endTime;
  if (updates.location !== undefined) setValues.location = updates.location;
  if (updates.notes !== undefined) setValues.notes = updates.notes;
  if (updates.isActive !== undefined) setValues.isActive = updates.isActive;
  if (updates.scope !== undefined) setValues.scope = updates.scope;
  if (updates.targetUserIds !== undefined) setValues.targetUserIds = updates.targetUserIds;
  if (updates.targetTeamId !== undefined) setValues.teamId = updates.targetTeamId;
  if (updates.googleSyncEnabled !== undefined) setValues.googleSyncEnabled = updates.googleSyncEnabled;

  const [updated] = await db
    .update(sessionTemplateTable)
    .set(setValues)
    .where(eq(sessionTemplateTable.id, templateId))
    .returning();
  if (!updated) throw new Error("TEMPLATE_NOT_FOUND");
  return updated;
}

export async function deleteScheduledSession(userId: number, sessionId: number) {
  await db.delete(sessionAttendanceTable).where(eq(sessionAttendanceTable.scheduledSessionId, sessionId));
  await db.delete(scheduledSessionTable).where(eq(scheduledSessionTable.id, sessionId));
  return { deleted: true };
}

export async function updateScheduledSession(
  userId: number,
  sessionId: number,
  updates: Partial<{
    name: string;
    startsAt: Date;
    endsAt: Date;
    location: string | null;
    notes: string | null;
    status: string;
  }>,
) {
  const setValues: Record<string, unknown> = { updatedAt: new Date() };
  if (updates.name !== undefined) setValues.name = updates.name;
  if (updates.startsAt !== undefined) setValues.startsAt = updates.startsAt;
  if (updates.endsAt !== undefined) setValues.endsAt = updates.endsAt;
  if (updates.location !== undefined) setValues.location = updates.location;
  if (updates.notes !== undefined) setValues.notes = updates.notes;
  if (updates.status !== undefined) setValues.status = updates.status;

  const [updated] = await db
    .update(scheduledSessionTable)
    .set(setValues)
    .where(eq(scheduledSessionTable.id, sessionId))
    .returning();
  if (!updated) throw new Error("SESSION_NOT_FOUND");
  return updated;
}

export async function cancelScheduledSession(userId: number, sessionId: number) {
  const [updated] = await db
    .update(scheduledSessionTable)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(scheduledSessionTable.id, sessionId))
    .returning();
  if (!updated) throw new Error("SESSION_NOT_FOUND");
  return updated;
}

export async function getAttendanceStats(input: {
  userId?: number;
  teamId?: number;
  from?: Date;
  to?: Date;
}) {
  const conditions: any[] = [];
  if (input.userId) conditions.push(eq(sessionAttendanceTable.userId, input.userId));
  if (input.teamId) conditions.push(eq(scheduledSessionTable.teamId, input.teamId));
  if (input.from) conditions.push(gte(scheduledSessionTable.startsAt, input.from));
  if (input.to) conditions.push(lte(scheduledSessionTable.startsAt, input.to));

  const guardianEmailExpr = sql<string | null>`(
    SELECT gu."email" FROM "users" gu
    INNER JOIN "guardians" g ON g."userId" = gu."id"
    INNER JOIN "athletes" a ON a."guardianId" = g."id"
    WHERE a."userId" = ${sessionAttendanceTable.userId}
    AND gu."isDeleted" = false
    LIMIT 1
  )`.as("guardian_email");

  const rows = await db
    .select({
      userId: sessionAttendanceTable.userId,
      userName: userTable.name,
      userEmail: userTable.email,
      guardianEmail: guardianEmailExpr,
      totalSessions: drizzleCount(sessionAttendanceTable.id),
      attended: sql<number>`count(*) filter (where ${sessionAttendanceTable.status} = 'attended')`.as("attended"),
      missed: sql<number>`count(*) filter (where ${sessionAttendanceTable.status} = 'missed')`.as("missed"),
      unmarked: sql<number>`count(*) filter (where ${sessionAttendanceTable.status} = 'unmarked')`.as("unmarked"),
    })
    .from(sessionAttendanceTable)
    .innerJoin(scheduledSessionTable, eq(sessionAttendanceTable.scheduledSessionId, scheduledSessionTable.id))
    .innerJoin(userTable, eq(sessionAttendanceTable.userId, userTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(sessionAttendanceTable.userId, userTable.name, userTable.email, guardianEmailExpr)
    .orderBy(
      asc(
        sql`case when count(*) = 0 then 0 else round(count(*) filter (where ${sessionAttendanceTable.status} = 'attended') * 100.0 / count(*)) end`,
      ),
    );

  return rows.map((r) => ({
    userId: r.userId,
    userName: r.userName,
    userEmail: r.guardianEmail || r.userEmail,
    totalSessions: Number(r.totalSessions),
    attended: Number(r.attended),
    missed: Number(r.missed),
    unmarked: Number(r.unmarked),
    attendancePercent:
      Number(r.totalSessions) === 0 ? 0 : Math.round((Number(r.attended) * 100) / Number(r.totalSessions)),
  }));
}
