import type { Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { env } from "../config/env";
import { db } from "../db";
import { scheduledSessionTable } from "../db/schema";
import { logger } from "../lib/logger";
import { isTrainingStaff } from "../lib/user-roles";
import { cache, cacheKeys } from "../lib/cache";
import {
  cancelScheduledSession,
  checkInMySession,
  createSessionTemplate,
  deleteScheduledSession,
  deleteSessionTemplate,
  getAttendanceStats,
  listAdminScheduledSessions,
  listMyScheduledSessions,
  listSessionTemplates,
  markSessionAttendance,
  materializeTemplateSessions,
  notifyAttendanceUpdated,
  notifyMaterializedSessions,
  updateScheduledSession,
  updateSessionTemplate,
} from "../services/session-schedule.service";
import {
  completeGoogleOAuthConnection,
  getGoogleOAuthStartUrlForAdmin,
  disconnectGoogleCalendarConnectionForAdmin,
  getGoogleCalendarConnectionForAdmin,
  listGoogleCalendarsForAdmin,
  listGoogleCalendarEvents,
  saveGoogleCalendarConnectionForAdmin,
  selectGoogleCalendarForAdmin,
} from "../services/google-calendar.service";

const hhmmSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/);

const createTemplateSchema = z
  .object({
    name: z.string().trim().min(2).max(255),
    type: z.enum(["one_to_one", "semi_private", "in_person", "team"]),
    scope: z.enum(["individual", "group", "team"]),
    isRecurring: z.boolean().default(true),
    weekday: z.number().int().min(0).max(6).optional().nullable(),
    startsAtTime: hhmmSchema,
    endsAtTime: hhmmSchema,
    location: z.string().max(500).optional().nullable(),
    meetingLink: z.string().max(500).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    teamId: z.number().int().min(1).optional().nullable(),
    targetUserIds: z.array(z.number().int().min(1)).optional(),
    googleSyncEnabled: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.scope === "team" && !value.teamId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["teamId"], message: "teamId is required for team scope" });
    }
    if (value.scope !== "team" && (!value.targetUserIds || value.targetUserIds.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetUserIds"],
        message: "targetUserIds is required for individual/group scope",
      });
    }
    if (value.isRecurring && value.weekday == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["weekday"],
        message: "weekday is required for recurring templates",
      });
    }
  });

const materializeSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});

const mySessionsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

const adminSessionsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  userId: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
  offset: z.coerce.number().int().min(0).default(0),
});

const markAttendanceSchema = z.object({
  updates: z
    .array(
      z.object({
        userId: z.number().int().min(1),
        status: z.enum(["unmarked", "attended", "missed"]),
      }),
    )
    .min(1),
});

const googleCalendarEventsQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});

const calendarConnectionSchema = z.object({
  calendarId: z.string().trim().min(3).max(255),
  serviceAccountEmail: z.string().trim().email(),
  privateKey: z.string().trim().min(30),
});

export async function createTemplateAdmin(req: Request, res: Response) {
  if (!req.user || !isTrainingStaff(req.user.role)) return res.status(403).json({ error: "Forbidden" });
  const input = createTemplateSchema.parse(req.body);
  const item = await createSessionTemplate({
    ...input,
    weekday: input.weekday ?? null,
    createdBy: req.user.id,
  });
  return res.status(201).json({ template: item });
}

export async function listTemplatesAdmin(req: Request, res: Response) {
  if (!req.user || !isTrainingStaff(req.user.role)) return res.status(403).json({ error: "Forbidden" });
  const items = await listSessionTemplates();
  return res.status(200).json({ templates: items });
}

export async function materializeTemplateAdmin(req: Request, res: Response) {
  if (!req.user || !isTrainingStaff(req.user.role)) return res.status(403).json({ error: "Forbidden" });
  const templateId = z.coerce.number().int().min(1).parse(req.params.templateId);
  const input = materializeSchema.parse(req.body ?? {});
  const result = await materializeTemplateSessions({
    templateId,
    from: new Date(input.from),
    to: new Date(input.to),
    actorUserId: req.user.id,
  });
  if (result.sessionIds.length > 0) {
    void notifyMaterializedSessions({
      userIds: result.affectedUserIds,
      sessionIds: result.sessionIds,
      templateName: result.templateName,
    });
  }
  return res.status(200).json(result);
}

export async function listSessionsAdmin(req: Request, res: Response) {
  if (!req.user || !isTrainingStaff(req.user.role)) return res.status(403).json({ error: "Forbidden" });
  const query = adminSessionsQuerySchema.parse(req.query ?? {});
  const items = await listAdminScheduledSessions({
    from: query.from ? new Date(query.from) : undefined,
    to: query.to ? new Date(query.to) : undefined,
    userId: query.userId,
  });
  return res.status(200).json({ sessions: items });
}

export async function markAttendanceAdmin(req: Request, res: Response) {
  if (!req.user || !isTrainingStaff(req.user.role)) return res.status(403).json({ error: "Forbidden" });
  const scheduledSessionId = z.coerce.number().int().min(1).parse(req.params.sessionId);
  const input = markAttendanceSchema.parse(req.body ?? {});
  const result = await markSessionAttendance({
    scheduledSessionId,
    markedBy: req.user.id,
    updates: input.updates,
  });
  if (result.updated > 0) {
    for (const update of input.updates) {
      void cache.del(cacheKeys.userSessions(update.userId));
    }
    void notifyAttendanceUpdated({
      scheduledSessionId,
      userIds: input.updates.map((update) => update.userId),
      message: "Your session attendance was updated.",
      createNotification: true,
    });
  }
  return res.status(200).json(result);
}

export async function listMySessions(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const query = mySessionsQuerySchema.parse(req.query ?? {});
  const userId = req.user.id;

  // Only cache the default (no date filters) request — filtered variants are uncached
  const isDefaultQuery = !query.from && !query.to;
  const items = isDefaultQuery
    ? await cache.getOrSet(cacheKeys.userSessions(userId), 30, () =>
        listMyScheduledSessions({ userId }),
      )
    : await listMyScheduledSessions({
        userId,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
      });

  return res.status(200).json({ sessions: items });
}

export async function checkInSession(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const scheduledSessionId = z.coerce.number().int().min(1).parse(req.params.sessionId);
  try {
    const result = await checkInMySession({ scheduledSessionId, userId: req.user.id });
    void cache.del(cacheKeys.userSessions(req.user.id));
    void notifyAttendanceUpdated({
      scheduledSessionId,
      userIds: [req.user.id],
      message: "Session attendance marked.",
    });
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "SESSION_ASSIGNMENT_NOT_FOUND") {
      return res.status(404).json({ error: "Session assignment not found" });
    }
    if (error instanceof Error && error.message === "SESSION_NOT_ATTENDABLE_TODAY") {
      return res.status(403).json({ error: "Session can only be attended on its scheduled day" });
    }
    throw error;
  }
}

export async function getCalendarConnectionAdmin(req: Request, res: Response) {
  if (!req.user || !isTrainingStaff(req.user.role)) return res.status(403).json({ error: "Forbidden" });
  const config = await getGoogleCalendarConnectionForAdmin(req.user.id);
  return res.status(200).json({
    connected: Boolean(config),
    calendarId: config?.calendarId ?? null,
    serviceAccountEmail: config?.mode === "service_account" ? config.clientEmail : null,
    accountEmail: config?.mode === "oauth" ? config.accountEmail : null,
    mode: config?.mode ?? null,
    connectedAt: config?.connectedAt ?? null,
  });
}

export async function getGoogleCalendarOAuthStartAdmin(req: Request, res: Response) {
  if (!req.user || !isTrainingStaff(req.user.role)) return res.status(403).json({ error: "Forbidden" });
  const authUrl = await getGoogleOAuthStartUrlForAdmin(req.user.id);
  return res.status(200).json({ authUrl });
}

export async function googleCalendarOAuthCallback(req: Request, res: Response) {
  const adminUrl = env.adminWebUrl.replace(/\/+$/, "");
  try {
    const code = z.string().min(1).parse(req.query.code);
    const state = z.string().min(1).parse(req.query.state);
    await completeGoogleOAuthConnection({ code, state });
    return res.redirect(`${adminUrl}/session-schedule?calendar=connected`);
  } catch (error) {
    logger.error({ err: error, query: req.query }, "Google Calendar OAuth callback failed");
    return res.redirect(`${adminUrl}/session-schedule?calendar=error`);
  }
}

export async function listGoogleCalendarsAdmin(req: Request, res: Response) {
  if (!req.user || !isTrainingStaff(req.user.role)) return res.status(403).json({ error: "Forbidden" });
  const calendars = await listGoogleCalendarsForAdmin(req.user.id);
  return res.status(200).json({ calendars });
}

export async function selectGoogleCalendarAdmin(req: Request, res: Response) {
  if (!req.user || !isTrainingStaff(req.user.role)) return res.status(403).json({ error: "Forbidden" });
  const payload = z.object({ calendarId: z.string().trim().min(1).max(255) }).parse(req.body ?? {});
  await selectGoogleCalendarForAdmin(req.user.id, payload.calendarId);
  return res.status(200).json({ ok: true });
}

export async function connectCalendarAdmin(req: Request, res: Response) {
  if (!req.user || !isTrainingStaff(req.user.role)) return res.status(403).json({ error: "Forbidden" });
  const input = calendarConnectionSchema.parse(req.body ?? {});
  await saveGoogleCalendarConnectionForAdmin(req.user.id, input);
  return res.status(200).json({ ok: true });
}

export async function listGoogleCalendarEventsAdmin(req: Request, res: Response) {
  if (!req.user || !isTrainingStaff(req.user.role)) return res.status(403).json({ error: "Forbidden" });
  const query = googleCalendarEventsQuerySchema.parse(req.query ?? {});
  const config = await getGoogleCalendarConnectionForAdmin(req.user.id);
  if (!config) return res.status(200).json({ events: [] });
  try {
    const events = await listGoogleCalendarEvents(config, query.from, query.to);
    return res.status(200).json({ events });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("GOOGLE_AUTH_REVOKED")) {
      return res.status(200).json({ events: [], error: "AUTH_REVOKED" });
    }
    throw error;
  }
}

export async function disconnectCalendarAdmin(req: Request, res: Response) {
  if (!req.user || !isTrainingStaff(req.user.role)) return res.status(403).json({ error: "Forbidden" });
  await disconnectGoogleCalendarConnectionForAdmin(req.user.id);
  return res.status(200).json({ ok: true });
}

const attendanceStatsQuerySchema = z.object({
  userId: z.coerce.number().int().min(1).optional(),
  teamId: z.coerce.number().int().min(1).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export async function getAttendanceStatsAdmin(req: Request, res: Response) {
  if (!req.user || !isTrainingStaff(req.user.role)) return res.status(403).json({ error: "Forbidden" });
  const query = attendanceStatsQuerySchema.parse(req.query ?? {});
  const stats = await getAttendanceStats({
    userId: query.userId,
    teamId: query.teamId,
    from: query.from ? new Date(query.from) : undefined,
    to: query.to ? new Date(query.to) : undefined,
  });
  return res.status(200).json({ stats });
}

const updateTemplateSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
  startTime: hhmmSchema.optional(),
  endTime: hhmmSchema.optional(),
  location: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  isActive: z.boolean().optional(),
  scope: z.enum(["individual", "group", "team"]).optional(),
  targetUserIds: z.array(z.number().int().min(1)).optional(),
  targetTeamId: z.number().int().min(1).optional().nullable(),
  googleSyncEnabled: z.boolean().optional(),
});

const updateScheduledSessionSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  location: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(["upcoming", "completed", "cancelled"]).optional(),
});

export async function deleteSessionTemplateAdmin(req: Request, res: Response) {
  if (!req.user || !isTrainingStaff(req.user.role)) return res.status(403).json({ error: "Forbidden" });
  const templateId = z.coerce.number().int().min(1).parse(req.params.templateId);
  const result = await deleteSessionTemplate(req.user.id, templateId);
  return res.status(200).json(result);
}

export async function updateSessionTemplateAdmin(req: Request, res: Response) {
  if (!req.user || !isTrainingStaff(req.user.role)) return res.status(403).json({ error: "Forbidden" });
  const templateId = z.coerce.number().int().min(1).parse(req.params.templateId);
  const updates = updateTemplateSchema.parse(req.body ?? {});
  const template = await updateSessionTemplate(req.user.id, templateId, updates);
  return res.status(200).json({ template });
}

export async function deleteScheduledSessionAdmin(req: Request, res: Response) {
  if (!req.user || !isTrainingStaff(req.user.role)) return res.status(403).json({ error: "Forbidden" });
  const sessionId = z.coerce.number().int().min(1).parse(req.params.sessionId);
  const result = await deleteScheduledSession(req.user.id, sessionId);
  return res.status(200).json(result);
}

export async function updateScheduledSessionAdmin(req: Request, res: Response) {
  if (!req.user || !isTrainingStaff(req.user.role)) return res.status(403).json({ error: "Forbidden" });
  const sessionId = z.coerce.number().int().min(1).parse(req.params.sessionId);
  const updates = updateScheduledSessionSchema.parse(req.body ?? {});
  const session = await updateScheduledSession(req.user.id, sessionId, {
    ...updates,
    startsAt: updates.startsAt ? new Date(updates.startsAt) : undefined,
    endsAt: updates.endsAt ? new Date(updates.endsAt) : undefined,
  });
  return res.status(200).json({ session });
}

export async function cancelScheduledSessionAdmin(req: Request, res: Response) {
  if (!req.user || !isTrainingStaff(req.user.role)) return res.status(403).json({ error: "Forbidden" });
  const sessionId = z.coerce.number().int().min(1).parse(req.params.sessionId);
  const session = await cancelScheduledSession(req.user.id, sessionId);
  return res.status(200).json({ session });
}

const generateQrTokenSchema = z.object({ sessionId: z.number().int().min(1) });

export async function generateQrToken(req: Request, res: Response) {
  if (!req.user || !isTrainingStaff(req.user.role)) return res.status(403).json({ error: "Forbidden" });

  const { sessionId } = generateQrTokenSchema.parse(req.body);

  const [session] = await db
    .select({ id: scheduledSessionTable.id })
    .from(scheduledSessionTable)
    .where(eq(scheduledSessionTable.id, sessionId))
    .limit(1);

  if (!session) return res.status(404).json({ error: "Session not found" });

  const secret = new TextEncoder().encode(env.jwtSecret);
  const token = await new SignJWT({ sessionId, purpose: "attendance-qr" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret);

  return res.status(200).json({
    token,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  });
}

const scanQrTokenSchema = z.object({ token: z.string().min(1) });

export async function scanQrToken(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const { token } = scanQrTokenSchema.parse(req.body);

  let payload: Awaited<ReturnType<typeof jwtVerify>>["payload"];
  try {
    const secret = new TextEncoder().encode(env.jwtSecret);
    const verified = await jwtVerify(token, secret);
    payload = verified.payload;
  } catch {
    return res.status(401).json({ error: "Invalid or expired QR token" });
  }

  if (payload.purpose !== "attendance-qr" || typeof payload.sessionId !== "number") {
    return res.status(400).json({ error: "Invalid QR token payload" });
  }

  try {
    const result = await checkInMySession({ scheduledSessionId: payload.sessionId, userId: req.user.id });
    void cache.del(cacheKeys.userSessions(req.user.id));
    const [session] = await db
      .select({ name: scheduledSessionTable.name })
      .from(scheduledSessionTable)
      .where(eq(scheduledSessionTable.id, payload.sessionId))
      .limit(1);
    void notifyAttendanceUpdated({
      scheduledSessionId: payload.sessionId,
      userIds: [req.user.id],
      message: "Session attendance marked via QR.",
    });
    return res.status(200).json({
      ...result,
      sessionName: session?.name ?? null,
      message: "Attendance marked successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SESSION_ASSIGNMENT_NOT_FOUND") {
      return res.status(404).json({ error: "Session assignment not found", message: "This session is not assigned to you" });
    }
    if (error instanceof Error && error.message === "SESSION_NOT_ATTENDABLE_TODAY") {
      return res.status(403).json({ error: "Session can only be attended on its scheduled day", message: "This session is not scheduled for today" });
    }
    throw error;
  }
}
