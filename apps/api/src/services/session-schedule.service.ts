import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "../db";
import {
  athleteTable,
  notificationTable,
  scheduledSessionTable,
  sessionAttendanceTable,
  sessionTemplateTable,
  userTable,
} from "../db/schema";
import { pushQueue } from "../jobs";
import { logger } from "../lib/logger";
import { getSocketServer } from "../socket-hub";
import { getGoogleCalendarConnectionForAdmin, upsertGoogleCalendarEvent } from "./google-calendar.service";

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
    void pushQueue.enqueue({
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
  return db.select().from(sessionTemplateTable).orderBy(desc(sessionTemplateTable.id));
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
    };

  const startsMinutes = parseTimeToMinutes(template.startsAtTime);
  const endsMinutes = parseTimeToMinutes(template.endsAtTime);
  if (startsMinutes == null || endsMinutes == null || endsMinutes <= startsMinutes) {
    throw new Error("TEMPLATE_TIME_INVALID");
  }

  const targetUserIds = await resolveTemplateTargetUserIds(template);
  if (!targetUserIds.length)
    return {
      created: 0,
      sessionIds: [] as number[],
      touchedSessionIds: [] as number[],
      affectedUserIds: [] as number[],
      templateName: template.name,
    };

  const fromDay = startOfUtcDay(input.from);
  const toDay = startOfUtcDay(input.to);
  const createdIds: number[] = [];
  const touchedSessionIds: number[] = [];

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

    if (template.googleSyncEnabled) {
      try {
        const config = await getGoogleCalendarConnectionForAdmin(template.createdBy);
        const googleEventId = await upsertGoogleCalendarEvent(
          {
            title: session.name,
            description: session.notes ?? null,
            location: session.location ?? null,
            startsAt: new Date(session.startsAt),
            endsAt: new Date(session.endsAt),
            existingEventId: session.googleEventId ?? null,
          },
          config,
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
    .orderBy(desc(scheduledSessionTable.startsAt));

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
    attendees: bySession.get(s.id) ?? [],
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
