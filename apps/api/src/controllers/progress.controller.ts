import type { Request, Response } from "express";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";

import { db } from "../db";
import { progressEntryTable, athleteTable, guardianTable } from "../db/schema";
import { isTrainingStaff } from "../lib/user-roles";
import { canManageAthleteUser } from "../services/team-membership";

const entrySchema = z
  .object({
    clientId: z.string().min(1).max(64),
    type: z.enum(["strength", "body_weight", "measurement"]),
    entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    exerciseName: z.string().max(120).optional().nullable(),
    weightKg: z.number().finite().optional().nullable(),
    reps: z.number().int().optional().nullable(),
    sets: z.number().int().optional().nullable(),
    measureKind: z.string().max(16).optional().nullable(),
    label: z.string().max(120).optional().nullable(),
    valueCm: z.number().finite().optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.type === "strength" && (!val.exerciseName?.trim() || val.weightKg == null)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "strength requires exerciseName and weightKg" });
    }
    if (val.type === "body_weight" && val.weightKg == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "body_weight requires weightKg" });
    }
    if (val.type === "measurement" && val.valueCm == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "measurement requires valueCm" });
    }
  });

/** Resolve the user whose entries the actor is allowed to read. */
async function resolveReadableUserId(req: Request): Promise<number | null> {
  const userIdRaw = typeof req.query.userId === "string" ? req.query.userId : null;
  let targetUserId = userIdRaw === "me" || !userIdRaw ? req.user!.id : Number(userIdRaw);
  if (!Number.isFinite(targetUserId)) return null;

  if (targetUserId === req.user!.id) return targetUserId;
  if (isTrainingStaff(req.user!.role)) return targetUserId;

  if (req.user!.role === "guardian") {
    const [owned] = await db
      .select({ id: athleteTable.id })
      .from(athleteTable)
      .innerJoin(guardianTable, eq(athleteTable.guardianId, guardianTable.id))
      .where(and(eq(guardianTable.userId, req.user!.id), eq(athleteTable.userId, targetUserId)))
      .limit(1);
    return owned ? targetUserId : null;
  }

  if (req.user!.role === "team_coach" && (await canManageAthleteUser(req.user!.id, targetUserId))) {
    return targetUserId;
  }

  return null;
}

export async function listProgressEntries(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  try {
    const targetUserId = await resolveReadableUserId(req);
    if (targetUserId == null) return res.status(403).json({ error: "Forbidden" });

    const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 200));
    const entries = await db
      .select()
      .from(progressEntryTable)
      .where(eq(progressEntryTable.userId, targetUserId))
      .orderBy(desc(progressEntryTable.entryDate), desc(progressEntryTable.createdAt))
      .limit(limit);

    return res.status(200).json({ entries });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch progress entries";
    console.error("[progress] listEntries error:", error);
    return res.status(500).json({ error: message });
  }
}

export async function upsertProgressEntry(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  try {
    const parsed = entrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors });
    }
    const input = parsed.data;
    const userId = req.user.id;

    // Idempotent on (userId, clientId) so retries/offline replays don't duplicate.
    const result = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: progressEntryTable.id })
        .from(progressEntryTable)
        .where(and(eq(progressEntryTable.userId, userId), eq(progressEntryTable.clientId, input.clientId)))
        .limit(1);

      const values = {
        type: input.type,
        entryDate: input.entryDate,
        exerciseName: input.exerciseName?.trim() || null,
        weightKg: input.weightKg ?? null,
        reps: input.reps ?? null,
        sets: input.sets ?? null,
        measureKind: input.measureKind ?? null,
        label: input.label?.trim() || null,
        valueCm: input.valueCm ?? null,
        notes: input.notes ?? "",
      };

      if (existing) {
        const [updated] = await tx
          .update(progressEntryTable)
          .set({ ...values, updatedAt: new Date() })
          .where(eq(progressEntryTable.id, existing.id))
          .returning();
        return updated;
      }

      const [inserted] = await tx
        .insert(progressEntryTable)
        .values({ userId, clientId: input.clientId, ...values })
        .returning();
      return inserted;
    });

    return res.status(200).json({ entry: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save progress entry";
    console.error("[progress] upsertEntry error:", error);
    return res.status(500).json({ error: message });
  }
}

export async function deleteProgressEntry(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const entryId = Number(req.params.entryId);
  if (!Number.isFinite(entryId)) return res.status(400).json({ error: "Invalid entry ID" });

  const [entry] = await db
    .select({ id: progressEntryTable.id, userId: progressEntryTable.userId })
    .from(progressEntryTable)
    .where(eq(progressEntryTable.id, entryId))
    .limit(1);

  if (!entry) return res.status(404).json({ error: "Not found" });
  if (entry.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

  await db.delete(progressEntryTable).where(eq(progressEntryTable.id, entryId));

  return res.status(200).json({ success: true });
}
