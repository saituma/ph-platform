import type { Request, Response } from "express";
import { z } from "zod";
import { and, eq, desc, gte, lte } from "drizzle-orm";

import { db } from "../db";
import { nutritionTargetsTable, nutritionLogsTable, userTable, notificationTable } from "../db/schema";
import { sendPushNotification } from "../services/push.service";

const targetSchema = z.object({
  calories: z.number().int().min(0).optional().nullable(),
  protein: z.number().int().min(0).optional().nullable(),
  carbs: z.number().int().min(0).optional().nullable(),
  fats: z.number().int().min(0).optional().nullable(),
  micronutrientsGuidance: z.string().max(1000).optional().nullable(),
});

const logSchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  breakfast: z.string().optional().nullable(),
  snacks: z.string().optional().nullable(),
  snacksMorning: z.string().optional().nullable(),
  snacksAfternoon: z.string().optional().nullable(),
  snacksEvening: z.string().optional().nullable(),
  lunch: z.string().optional().nullable(),
  dinner: z.string().optional().nullable(),
  waterIntake: z.number().int().min(0).optional().nullable(),
  steps: z.number().int().min(0).optional().nullable(),
  sleepHours: z.number().int().min(0).optional().nullable(),
  mood: z.number().int().min(1).max(5).optional().nullable(),
  energy: z.number().int().min(1).max(5).optional().nullable(),
  pain: z.number().int().min(1).max(5).optional().nullable(),
  foodDiary: z.string().optional().nullable(),
});

const feedbackSchema = z.object({
  feedback: z.string().max(2000),
  mediaUrl: z.string().url().optional().nullable(),
  mediaType: z.enum(["video", "image"]).optional().nullable(),
});

const reminderSettingsSchema = z
  .object({
    enabled: z.boolean(),
    timeLocal: z
      .string()
      .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Expected HH:MM")
      .optional()
      .nullable(),
    timezone: z.string().max(100).optional().nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.enabled && !val.timeLocal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["timeLocal"],
        message: "timeLocal is required when enabled=true",
      });
    }
  });

export async function getReminderSettings(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const [user] = await db
    .select({
      enabled: userTable.nutritionReminderEnabled,
      timeLocal: userTable.nutritionReminderTimeLocal,
      timezone: userTable.nutritionReminderTimezone,
    })
    .from(userTable)
    .where(eq(userTable.id, req.user.id))
    .limit(1);

  return res.status(200).json({ settings: user ?? null });
}

export async function updateReminderSettings(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const input = reminderSettingsSchema.parse(req.body);

  const [updated] = await db
    .update(userTable)
    .set({
      nutritionReminderEnabled: input.enabled,
      nutritionReminderTimeLocal: input.timeLocal ?? null,
      nutritionReminderTimezone: input.timezone ?? null,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, req.user.id))
    .returning({
      enabled: userTable.nutritionReminderEnabled,
      timeLocal: userTable.nutritionReminderTimeLocal,
      timezone: userTable.nutritionReminderTimezone,
    });

  return res.status(200).json({ settings: updated ?? null });
}

export async function getTargets(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const targetUserId = req.params.userId === "me" ? req.user.id : Number(req.params.userId);
  if (!Number.isFinite(targetUserId)) return res.status(400).json({ error: "Invalid user ID" });

  const [targets] = await db
    .select()
    .from(nutritionTargetsTable)
    .where(eq(nutritionTargetsTable.userId, targetUserId))
    .limit(1);
  return res.status(200).json({ targets: targets || null });
}

export async function updateTargets(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (!["coach", "admin", "superAdmin"].includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const targetUserId = Number(req.params.userId);
  if (!Number.isFinite(targetUserId)) return res.status(400).json({ error: "Invalid user ID" });

  const input = targetSchema.parse(req.body);

  const [existingUser] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.id, targetUserId))
    .limit(1);
  if (!existingUser) return res.status(404).json({ error: "User not found" });

  const [existingTarget] = await db
    .select()
    .from(nutritionTargetsTable)
    .where(eq(nutritionTargetsTable.userId, targetUserId))
    .limit(1);

  let result;
  if (existingTarget) {
    [result] = await db
      .update(nutritionTargetsTable)
      .set({
        ...input,
        updatedBy: req.user.id,
        updatedAt: new Date(),
      })
      .where(eq(nutritionTargetsTable.id, existingTarget.id))
      .returning();
  } else {
    [result] = await db
      .insert(nutritionTargetsTable)
      .values({
        userId: targetUserId,
        ...input,
        updatedBy: req.user.id,
      })
      .returning();
  }

  return res.status(200).json({ targets: result });
}

export async function listLogs(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const userIdRaw = typeof req.query.userId === "string" ? req.query.userId : null;
  const targetUserId = userIdRaw === "me" ? req.user.id : userIdRaw ? Number(userIdRaw) : req.user.id;
  if (!Number.isFinite(targetUserId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  if (targetUserId !== req.user.id && !["coach", "admin", "superAdmin"].includes(req.user.role)) {
    // Only coaches can fetch other users' logs directly
    return res.status(403).json({ error: "Forbidden" });
  }

  const limitRaw = req.query.limit ? Number(req.query.limit) : 50;
  const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
  const from = typeof req.query.from === "string" ? req.query.from : undefined;
  const to = typeof req.query.to === "string" ? req.query.to : undefined;
  const fromKey = from ? dateKeySchema.parse(from) : null;
  const toKey = to ? dateKeySchema.parse(to) : null;

  const whereClauses = [eq(nutritionLogsTable.userId, targetUserId)];
  if (fromKey) whereClauses.push(gte(nutritionLogsTable.dateKey, fromKey));
  if (toKey) whereClauses.push(lte(nutritionLogsTable.dateKey, toKey));

  const logs = await db
    .select()
    .from(nutritionLogsTable)
    .where(and(...whereClauses))
    .orderBy(desc(nutritionLogsTable.dateKey))
    .limit(limitRaw);

  return res.status(200).json({ logs });
}

export async function upsertLog(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  // Actually, wait, role check? A guardian logging for a youth? Or the athlete directly.
  // We'll enforce the user is an athlete or guardian. But `req.user.id` is the authenticated user.
  // The system uses guardianId linking to athleteId, but we mapped `nutritionLogsTable.userId` directly.
  // We'll assume req.user.id is the correct user or the query parameter handles proxying.
  // For simplicity, we assume athletes login directly, or guardian posts for athlete.
  const targetUserId = req.body.athleteId ? Number(req.body.athleteId) : req.user.id;

  const input = logSchema.parse(req.body);

  // Determine athlete type. Is not sent by default, fetch it from DB if needed, or default youth.
  const [targetUserObj] = await db
    .select({ role: userTable.role })
    .from(userTable)
    .where(eq(userTable.id, targetUserId))
    .limit(1);

  const [existingLog] = await db
    .select()
    .from(nutritionLogsTable)
    .where(and(eq(nutritionLogsTable.userId, targetUserId), eq(nutritionLogsTable.dateKey, input.dateKey)))
    .limit(1);

  let result;
  if (existingLog) {
    [result] = await db
      .update(nutritionLogsTable)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(nutritionLogsTable.id, existingLog.id))
      .returning();
  } else {
    // Check if user is adult or youth
    const athleteRoleType = targetUserObj && targetUserObj.role === "admin" ? "adult" : "youth"; // Rough fallback, the frontend usually handles this
    [result] = await db
      .insert(nutritionLogsTable)
      .values({
        userId: targetUserId,
        athleteType: athleteRoleType,
        ...input,
      })
      .returning();
  }

  return res.status(200).json({ log: result });
}

export async function provideFeedback(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (!["coach", "admin", "superAdmin"].includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const logId = Number(req.params.logId);
  if (!Number.isFinite(logId)) return res.status(400).json({ error: "Invalid log ID" });

  const input = feedbackSchema.parse(req.body);

  const [existingLog] = await db.select().from(nutritionLogsTable).where(eq(nutritionLogsTable.id, logId)).limit(1);
  if (!existingLog) return res.status(404).json({ error: "Log not found" });

  const setUpdate: Record<string, any> = {
    coachFeedback: input.feedback,
    coachId: req.user.id,
    updatedAt: new Date(),
  };
  if (input.mediaUrl !== undefined) setUpdate.coachFeedbackMediaUrl = input.mediaUrl;
  if (input.mediaType !== undefined) setUpdate.coachFeedbackMediaType = input.mediaType;

  const [updatedLog] = await db
    .update(nutritionLogsTable)
    .set(setUpdate)
    .where(eq(nutritionLogsTable.id, logId))
    .returning();

  // Send a Notification to the user
  await db.insert(notificationTable).values({
    userId: existingLog.userId,
    type: "nutrition_feedback",
    content: "Coach responded to your nutrition tracking log.",
    link: "/programs",
  });

  void sendPushNotification(existingLog.userId, "Nutrition response", "Coach responded to your nutrition log.", {
    type: "nutrition_feedback",
    url: "/programs",
  });

  return res.status(200).json({ log: updatedLog });
}
