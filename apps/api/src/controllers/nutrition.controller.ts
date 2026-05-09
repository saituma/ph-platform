import type { Request, Response } from "express";
import { z } from "zod";
import { and, eq, desc, gte, lte } from "drizzle-orm";

import { db } from "../db";
import {
  athleteTable,
  guardianTable,
  nutritionTargetsTable,
  nutritionLogsTable,
  nutritionOnboardingProfileTable,
  userTable,
  notificationTable,
} from "../db/schema";
import { createPushIntent } from "../services/outbox.service";
import { isAthleteUserRole, isTrainingStaff } from "../lib/user-roles";
import { getSocketServer } from "../socket-hub";

const targetSchema = z.object({
  calories: z.number().int().min(0).optional().nullable(),
  protein: z.number().int().min(0).optional().nullable(),
  carbs: z.number().int().min(0).optional().nullable(),
  fats: z.number().int().min(0).optional().nullable(),
  micronutrientsGuidance: z.string().max(1000).optional().nullable(),
});

const logSchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealType: z
    .string()
    .trim()
    .min(1)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional()
    .default("daily"),
  loggedAt: z.coerce.date().optional(),
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

type NutritionLogInput = z.infer<typeof logSchema>;
type NutritionLogRow = typeof nutritionLogsTable.$inferSelect;

const MEAL_AND_DIARY_TEXT_KEYS = [
  "breakfast",
  "lunch",
  "dinner",
  "snacks",
  "snacksMorning",
  "snacksAfternoon",
  "snacksEvening",
  "foodDiary",
] as const;

/**
 * Same calendar day can be saved multiple times (e.g. breakfast now, dinner later).
 * Clients often send cleared meal slots as "" — without merge that would wipe earlier meals.
 */
function buildNutritionUpdatePayload(existing: NutritionLogRow, input: NutritionLogInput): Record<string, unknown> {
  const out: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (input.loggedAt) {
    out.loggedAt = input.loggedAt;
  }

  for (const key of MEAL_AND_DIARY_TEXT_KEYS) {
    const incoming = input[key];
    const incStr = incoming == null ? "" : String(incoming).trim();
    const prevRaw = existing[key];
    const prevStr = prevRaw == null ? "" : String(prevRaw).trim();
    if (incStr === "" && prevStr !== "") {
      out[key] = prevRaw;
    } else {
      out[key] = incoming ?? null;
    }
  }

  const numKeys = ["waterIntake", "steps", "sleepHours", "mood", "energy", "pain"] as const;
  for (const key of numKeys) {
    const v = input[key];
    out[key] = v !== undefined && v !== null ? v : existing[key];
  }

  return out;
}

const feedbackSchema = z.object({
  feedback: z.string().max(2000),
  mediaUrl: z.string().url().optional().nullable(),
  mediaType: z.enum(["video", "image"]).optional().nullable(),
});

const nutritionOnboardingProfileSchema = z.object({
  dietaryRequirements: z.string().trim().min(1).max(3000),
  allergies: z.string().trim().min(1).max(3000),
  generalNutritionHabits: z.string().trim().min(1).max(3000),
  primaryGoal: z.string().trim().max(120).optional().nullable(),
  mealsPerDay: z.number().int().min(1).max(12).optional().nullable(),
  hydrationLitersPerDay: z.number().int().min(0).max(20).optional().nullable(),
  supplements: z.string().trim().max(3000).optional().nullable(),
  medicalNotes: z.string().trim().max(3000).optional().nullable(),
  additionalContext: z.string().trim().max(3000).optional().nullable(),
});

async function canWriteNutritionForUser(input: { actorUserId: number; actorRole: string; targetUserId: number }) {
  if (input.targetUserId === input.actorUserId) return true;
  if (isTrainingStaff(input.actorRole)) return true;

  if (input.actorRole !== "guardian") return false;

  const [ownedAthlete] = await db
    .select({ id: athleteTable.id })
    .from(athleteTable)
    .innerJoin(guardianTable, eq(athleteTable.guardianId, guardianTable.id))
    .where(and(eq(guardianTable.userId, input.actorUserId), eq(athleteTable.userId, input.targetUserId)))
    .limit(1);

  return Boolean(ownedAthlete);
}

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

  if (targetUserId !== req.user.id && !isTrainingStaff(req.user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const [targets] = await db
    .select()
    .from(nutritionTargetsTable)
    .where(eq(nutritionTargetsTable.userId, targetUserId))
    .limit(1);
  return res.status(200).json({ targets: targets || null });
}

export async function getNutritionOnboardingProfile(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const userIdRaw = typeof req.query.userId === "string" ? req.query.userId : null;
  const targetUserId = userIdRaw === "me" ? req.user.id : userIdRaw ? Number(userIdRaw) : req.user.id;
  if (!Number.isFinite(targetUserId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  if (targetUserId !== req.user.id && !isTrainingStaff(req.user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const [profile] = await db
    .select()
    .from(nutritionOnboardingProfileTable)
    .where(eq(nutritionOnboardingProfileTable.userId, targetUserId))
    .limit(1);

  return res.status(200).json({ profile: profile ?? null });
}

export async function upsertNutritionOnboardingProfile(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (!isAthleteUserRole(req.user.role)) {
    return res.status(403).json({ error: "Only athlete accounts can submit nutrition onboarding." });
  }

  const input = nutritionOnboardingProfileSchema.parse(req.body);

  const [existing] = await db
    .select({ id: nutritionOnboardingProfileTable.id })
    .from(nutritionOnboardingProfileTable)
    .where(eq(nutritionOnboardingProfileTable.userId, req.user.id))
    .limit(1);

  if (existing) {
    const [profile] = await db
      .update(nutritionOnboardingProfileTable)
      .set({
        ...input,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(nutritionOnboardingProfileTable.id, existing.id))
      .returning();
    return res.status(200).json({ profile });
  }

  const [profile] = await db
    .insert(nutritionOnboardingProfileTable)
    .values({
      userId: req.user.id,
      ...input,
      completedAt: new Date(),
    })
    .returning();

  return res.status(201).json({ profile });
}

export async function updateTargets(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (!isTrainingStaff(req.user.role)) {
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

  try {
    const userIdRaw = typeof req.query.userId === "string" ? req.query.userId : null;
    let targetUserId = userIdRaw === "me" ? req.user.id : userIdRaw ? Number(userIdRaw) : req.user.id;
    if (!Number.isFinite(targetUserId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Guardian viewing "me" should see their active athlete's logs, not their own
    if (targetUserId === req.user.id && req.user.role === "guardian") {
      const [activeAthlete] = await db
        .select({ athleteUserId: athleteTable.userId })
        .from(guardianTable)
        .innerJoin(athleteTable, eq(guardianTable.activeAthleteId, athleteTable.id))
        .where(eq(guardianTable.userId, req.user.id))
        .limit(1);
      if (activeAthlete?.athleteUserId) {
        targetUserId = activeAthlete.athleteUserId;
      }
    }

    if (targetUserId !== req.user.id && !isTrainingStaff(req.user.role)) {
      // Guardians can read their own athlete's logs
      if (req.user.role === "guardian") {
        const [ownedAthlete] = await db
          .select({ id: athleteTable.id })
          .from(athleteTable)
          .innerJoin(guardianTable, eq(athleteTable.guardianId, guardianTable.id))
          .where(and(eq(guardianTable.userId, req.user.id), eq(athleteTable.userId, targetUserId)))
          .limit(1);
        if (!ownedAthlete) {
          return res.status(403).json({ error: "Forbidden" });
        }
      } else {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const limitRaw = req.query.limit ? Number(req.query.limit) : 50;
    const limit = Math.max(1, Math.min(200, Number(limitRaw) || 50));
    const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
    const from = typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;
    const fromKey = from && dateKeySchema.safeParse(from).success ? from : null;
    const toKey = to && dateKeySchema.safeParse(to).success ? to : null;

    const whereClauses = [eq(nutritionLogsTable.userId, targetUserId)];
    if (fromKey) whereClauses.push(gte(nutritionLogsTable.dateKey, fromKey));
    if (toKey) whereClauses.push(lte(nutritionLogsTable.dateKey, toKey));

    const logs = await db
      .select()
      .from(nutritionLogsTable)
      .where(and(...whereClauses))
      .orderBy(desc(nutritionLogsTable.dateKey), desc(nutritionLogsTable.id))
      .limit(limit);

    return res.status(200).json({ logs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch nutrition logs";
    console.error("[nutrition] listLogs error:", error);
    return res.status(500).json({ error: message });
  }
}

export async function upsertLog(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  try {
    let targetUserId = req.body.athleteId ? Number(req.body.athleteId) : req.user.id;
    if (!Number.isFinite(targetUserId)) {
      return res.status(400).json({ error: "Invalid athlete ID" });
    }

    // Guardian clients may submit nutrition logs without athleteId in payload.
    // In that case, route the log to guardian.activeAthleteId -> athlete.userId.
    if (!req.body.athleteId && req.user.role === "guardian") {
      const [activeAthlete] = await db
        .select({ athleteUserId: athleteTable.userId })
        .from(guardianTable)
        .innerJoin(athleteTable, eq(guardianTable.activeAthleteId, athleteTable.id))
        .where(eq(guardianTable.userId, req.user.id))
        .limit(1);
      if (activeAthlete?.athleteUserId) {
        targetUserId = activeAthlete.athleteUserId;
      }
    }

    const parsed = logSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors });
    }
    const input = parsed.data;

    const canWrite = await canWriteNutritionForUser({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      targetUserId,
    });
    if (!canWrite) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Determine athlete type. Is not sent by default, fetch it from DB if needed, or default youth.
    const [targetAthlete] = await db
      .select({ athleteType: athleteTable.athleteType })
      .from(athleteTable)
      .where(eq(athleteTable.userId, targetUserId))
      .limit(1);

    const result = await db.transaction(async (tx) => {
      const [existingLog] = await tx
        .select()
        .from(nutritionLogsTable)
        .where(
          and(
            eq(nutritionLogsTable.userId, targetUserId),
            eq(nutritionLogsTable.dateKey, input.dateKey),
            eq(nutritionLogsTable.mealType, input.mealType),
          ),
        )
        .limit(1);

      if (existingLog) {
        const [updated] = await tx
          .update(nutritionLogsTable)
          .set(buildNutritionUpdatePayload(existingLog, input))
          .where(eq(nutritionLogsTable.id, existingLog.id))
          .returning();
        return updated;
      }

      const [inserted] = await tx
        .insert(nutritionLogsTable)
        .values({
          userId: targetUserId,
          athleteType: targetAthlete?.athleteType ?? "youth",
          ...input,
          mealType: input.mealType,
          loggedAt: input.loggedAt ?? new Date(),
        })
        .onConflictDoUpdate({
          target: [nutritionLogsTable.userId, nutritionLogsTable.dateKey, nutritionLogsTable.mealType],
          set: {
            breakfast: input.breakfast ?? undefined,
            lunch: input.lunch ?? undefined,
            dinner: input.dinner ?? undefined,
            snacks: input.snacks ?? undefined,
            snacksMorning: input.snacksMorning ?? undefined,
            snacksAfternoon: input.snacksAfternoon ?? undefined,
            snacksEvening: input.snacksEvening ?? undefined,
            foodDiary: input.foodDiary ?? undefined,
            waterIntake: input.waterIntake ?? undefined,
            steps: input.steps ?? undefined,
            sleepHours: input.sleepHours ?? undefined,
            mood: input.mood ?? undefined,
            energy: input.energy ?? undefined,
            pain: input.pain ?? undefined,
            updatedAt: new Date(),
          },
        })
        .returning();
      return inserted;
    });

    // Realtime update for athlete + staff viewers (portal nutrition + team athlete detail).
    const io = getSocketServer();
    if (io && result) {
      const payload = {
        userId: targetUserId,
        logId: result.id,
        dateKey: result.dateKey,
        updatedAt: result.updatedAt,
        actorUserId: req.user.id,
      };
      io.to(`user:${targetUserId}`).emit("nutrition:log:updated", payload);
      io.to("admin:all").emit("nutrition:log:updated", payload);
    }

    return res.status(200).json({ log: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save nutrition log";
    console.error("[nutrition] upsertLog error:", error);
    return res.status(500).json({ error: message });
  }
}

export async function provideFeedback(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (!isTrainingStaff(req.user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const logId = Number(req.params.logId);
    if (!Number.isFinite(logId)) return res.status(400).json({ error: "Invalid log ID" });

    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors });
    }
    const input = parsed.data;

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

    await db.insert(notificationTable).values({
      userId: existingLog.userId,
      type: "nutrition_feedback",
      content: "Coach responded to your nutrition tracking log.",
      link: "/nutrition",
    });

    void createPushIntent({
      userId: existingLog.userId,
      title: "Nutrition Feedback",
      body: "Your coach responded to your nutrition log.",
      data: {
        type: "nutrition_feedback",
        url: "/nutrition",
      },
    }).catch(() => undefined);

    const io = getSocketServer();
    if (io && updatedLog) {
      const payload = {
        userId: existingLog.userId,
        logId: updatedLog.id,
        dateKey: updatedLog.dateKey,
        updatedAt: updatedLog.updatedAt,
        actorUserId: req.user.id,
      };
      io.to(`user:${existingLog.userId}`).emit("nutrition:feedback:updated", payload);
      io.to("admin:all").emit("nutrition:feedback:updated", payload);
    }

    return res.status(200).json({ log: updatedLog });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save feedback";
    console.error("[nutrition] provideFeedback error:", error);
    return res.status(500).json({ error: message });
  }
}
