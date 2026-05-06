import type { Request, Response } from "express";
import { z } from "zod";
import { isTrainingStaff } from "../lib/user-roles";
import {
  checkInMySession,
  createSessionTemplate,
  listAdminScheduledSessions,
  listMyScheduledSessions,
  listSessionTemplates,
  markSessionAttendance,
  materializeTemplateSessions,
  notifyAttendanceUpdated,
  notifyMaterializedSessions,
} from "../services/session-schedule.service";
import {
  completeGoogleOAuthConnection,
  getGoogleOAuthStartUrlForAdmin,
  disconnectGoogleCalendarConnectionForAdmin,
  getGoogleCalendarConnectionForAdmin,
  listGoogleCalendarsForAdmin,
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
});

const adminSessionsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  userId: z.coerce.number().int().min(1).optional(),
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
  const items = await listMyScheduledSessions({
    userId: req.user.id,
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
  const code = z.string().min(1).parse(req.query.code);
  const state = z.string().min(1).parse(req.query.state);
  try {
    await completeGoogleOAuthConnection({ code, state });
    return res.redirect(`${process.env.ADMIN_WEB_URL || "http://localhost:3000"}/session-schedule?calendar=connected`);
  } catch {
    return res.redirect(`${process.env.ADMIN_WEB_URL || "http://localhost:3000"}/session-schedule?calendar=error`);
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

export async function disconnectCalendarAdmin(req: Request, res: Response) {
  if (!req.user || !isTrainingStaff(req.user.role)) return res.status(403).json({ error: "Forbidden" });
  await disconnectGoogleCalendarConnectionForAdmin(req.user.id);
  return res.status(200).json({ ok: true });
}
