import type { Request, Response } from "express";
import { z } from "zod";

import { and, eq, inArray } from "drizzle-orm";

import { createFoodDiaryEntry, getFoodDiaryGuardianUser, listFoodDiaryEntries, listFoodDiaryForGuardian, reviewFoodDiaryEntry } from "../services/food-diary.service";
import { getGuardianAndAthlete } from "../services/user.service";
import { normalizeDate } from "../lib/age";
import { db } from "../db";
import { notificationTable, userTable } from "../db/schema";
import { env } from "../config/env";

const mealsSchema = z.union([z.array(z.any()), z.record(z.any())]).optional();

const photoUrlSchema = z.preprocess(
  (val) => {
    if (val === null || val === undefined) return "";
    return typeof val === "string" ? val.trim() : val;
  },
  z
    .string()
    .refine((val) => val === "" || z.string().url().safeParse(val).success, {
      message: "Invalid URL format",
    })
    .refine((val) => !val.startsWith("data:"), {
      message: "Use a URL instead of base64 data.",
    })
);

const createFoodDiarySchema = z.object({
  date: z.string().optional(),
  meals: mealsSchema,
  notes: z.string().max(500).optional(),
  quantity: z.number().int().min(0).optional(),
  photoUrl: photoUrlSchema.optional(),
});

const reviewFoodDiarySchema = z.object({
  feedback: z.string().trim().max(2000).optional(),
});

export async function listFoodDiary(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (req.user.role !== "guardian") {
    return res.status(403).json({ error: "Forbidden" });
  }
  const { guardian } = await getGuardianAndAthlete(req.user.id);
  if (!guardian) {
    return res.status(404).json({ error: "Guardian profile not found" });
  }
  const items = await listFoodDiaryForGuardian(guardian.id);
  return res.status(200).json({ items });
}

export async function createFoodDiary(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (req.user.role !== "guardian") {
    return res.status(403).json({ error: "Forbidden" });
  }
  const input = createFoodDiarySchema.parse(req.body);
  const { guardian, athlete } = await getGuardianAndAthlete(req.user.id);
  if (!guardian || !athlete) {
    return res.status(404).json({ error: "Guardian profile not found" });
  }
  const parsedDate = input.date ? normalizeDate(input.date) : null;
  const entry = await createFoodDiaryEntry({
    athleteId: athlete.id,
    guardianId: guardian.id,
    date: parsedDate ?? new Date(),
    meals: input.meals ?? null,
    notes: input.notes ?? null,
    quantity: input.quantity ?? null,
    photoUrl: input.photoUrl || null,
  });

  const coaches = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(
      and(
        eq(userTable.isDeleted, false),
        inArray(userTable.role, ["coach", "admin", "superAdmin"])
      )
    );
  if (coaches.length) {
    await db.insert(notificationTable).values(
      coaches.map((coach) => ({
        userId: coach.id,
        type: "food_diary_submitted",
        content: `${athlete.name} submitted a food diary entry.`,
        link: "/exercise-library?tab=nutrition",
      }))
    );
    if (env.pushWebhookUrl) {
      await Promise.all(
        coaches.map((coach) =>
          fetch(env.pushWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: coach.id,
              title: "Food diary submitted",
              body: `${athlete.name} sent a new food diary entry.`,
              link: "/exercise-library?tab=nutrition",
            }),
          }).catch((error) => {
            console.error("Failed to send push notification", error);
          })
        )
      );
    }
  }

  return res.status(201).json({ item: entry });
}

export async function listFoodDiaryAdmin(req: Request, res: Response) {
  const athleteRaw = req.query.athleteId ? Number(req.query.athleteId) : undefined;
  const guardianRaw = req.query.guardianId ? Number(req.query.guardianId) : undefined;
  const athleteId = athleteRaw && Number.isFinite(athleteRaw) ? athleteRaw : undefined;
  const guardianId = guardianRaw && Number.isFinite(guardianRaw) ? guardianRaw : undefined;
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  const limitRaw = req.query.limit ? Number(req.query.limit) : undefined;
  const limit = limitRaw && Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, Math.floor(limitRaw))) : undefined;
  const items = await listFoodDiaryEntries({ athleteId, guardianId, q, limit });
  return res.status(200).json({ items });
}

export async function reviewFoodDiaryAdmin(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const entryId = Number(req.params.entryId);
  if (!Number.isFinite(entryId)) {
    return res.status(400).json({ error: "Invalid entry id" });
  }
  const input = reviewFoodDiarySchema.parse(req.body ?? {});
  const feedback = input.feedback?.trim() || null;
  const updated = await reviewFoodDiaryEntry({
    entryId,
    feedback,
    reviewedByCoach: req.user.id,
  });
  if (!updated) {
    return res.status(404).json({ error: "Entry not found" });
  }

  const guardianResult = await getFoodDiaryGuardianUser(entryId);
  const guardianUserId = guardianResult[0]?.guardianUserId;
  const athleteName = guardianResult[0]?.athleteName ?? "Athlete";
  if (guardianUserId) {
    await db.insert(notificationTable).values({
      userId: guardianUserId,
      type: "food_diary_feedback",
      content: `Coach responded to ${athleteName}'s food diary.`,
      link: "/programs",
    });
    if (env.pushWebhookUrl) {
      try {
        await fetch(env.pushWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: guardianUserId,
            title: "Coach feedback",
            body: `Coach reviewed ${athleteName}'s food diary.`,
            link: "/programs",
          }),
        });
      } catch (error) {
        console.error("Failed to send push notification", error);
      }
    }
  }

  return res.status(200).json({ item: updated });
}
