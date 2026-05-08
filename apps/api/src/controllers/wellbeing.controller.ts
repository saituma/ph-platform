import type { Request, Response } from "express";
import { z } from "zod";
import { and, eq, desc, gte, lte } from "drizzle-orm";

import { db } from "../db";
import { wellbeingLogsTable, athleteTable, guardianTable } from "../db/schema";
import { isTrainingStaff } from "../lib/user-roles";
import { getSocketServer } from "../socket-hub";

const wellbeingLogSchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mood: z.number().int().min(1).max(5),
  energy: z.number().int().min(1).max(5),
  pain: z.number().int().min(1).max(5),
  notes: z.string().max(2000).optional().nullable(),
});

const feedbackSchema = z.object({
  feedback: z.string().max(2000),
});

async function canWriteForUser(input: {
  actorUserId: number;
  actorRole: string;
  targetUserId: number;
}) {
  if (input.targetUserId === input.actorUserId) return true;
  if (isTrainingStaff(input.actorRole)) return true;
  if (input.actorRole !== "guardian") return false;

  const [ownedAthlete] = await db
    .select({ id: athleteTable.id })
    .from(athleteTable)
    .innerJoin(guardianTable, eq(athleteTable.guardianId, guardianTable.id))
    .where(
      and(
        eq(guardianTable.userId, input.actorUserId),
        eq(athleteTable.userId, input.targetUserId),
      ),
    )
    .limit(1);

  return Boolean(ownedAthlete);
}

export async function listWellbeingLogs(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  try {
    const userIdRaw = typeof req.query.userId === "string" ? req.query.userId : null;
    let targetUserId = userIdRaw === "me"
      ? req.user.id
      : userIdRaw
        ? Number(userIdRaw)
        : req.user.id;

    if (!Number.isFinite(targetUserId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

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
      if (req.user.role === "guardian") {
        const [ownedAthlete] = await db
          .select({ id: athleteTable.id })
          .from(athleteTable)
          .innerJoin(guardianTable, eq(athleteTable.guardianId, guardianTable.id))
          .where(
            and(
              eq(guardianTable.userId, req.user.id),
              eq(athleteTable.userId, targetUserId),
            ),
          )
          .limit(1);
        if (!ownedAthlete) {
          return res.status(403).json({ error: "Forbidden" });
        }
      } else {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const limitRaw = req.query.limit ? Number(req.query.limit) : 50;
    const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
    const from = typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;
    const fromKey = from && dateKeySchema.safeParse(from).success ? from : null;
    const toKey = to && dateKeySchema.safeParse(to).success ? to : null;

    const whereClauses = [eq(wellbeingLogsTable.userId, targetUserId)];
    if (fromKey) whereClauses.push(gte(wellbeingLogsTable.dateKey, fromKey));
    if (toKey) whereClauses.push(lte(wellbeingLogsTable.dateKey, toKey));

    const logs = await db
      .select()
      .from(wellbeingLogsTable)
      .where(and(...whereClauses))
      .orderBy(desc(wellbeingLogsTable.dateKey))
      .limit(limitRaw);

    return res.status(200).json({ logs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch wellbeing logs";
    console.error("[wellbeing] listLogs error:", error);
    return res.status(500).json({ error: message });
  }
}

export async function upsertWellbeingLog(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  try {
    let targetUserId = req.body.athleteId ? Number(req.body.athleteId) : req.user.id;

    if (!Number.isFinite(targetUserId)) {
      return res.status(400).json({ error: "Invalid athlete ID" });
    }

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

    const parsed = wellbeingLogSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors });
    }
    const input = parsed.data;

    const canWrite = await canWriteForUser({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      targetUserId,
    });
    if (!canWrite) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const result = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(wellbeingLogsTable)
        .where(
          and(
            eq(wellbeingLogsTable.userId, targetUserId),
            eq(wellbeingLogsTable.dateKey, input.dateKey),
          ),
        )
        .limit(1);

      if (existing) {
        const [updated] = await tx
          .update(wellbeingLogsTable)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(wellbeingLogsTable.id, existing.id))
          .returning();
        return updated;
      }

      const [inserted] = await tx
        .insert(wellbeingLogsTable)
        .values({ userId: targetUserId, ...input })
        .returning();
      return inserted;
    });

    const io = getSocketServer();
    if (io && result) {
      const payload = { log: result };
      io.to(`user:${targetUserId}`).emit("wellbeing:log:updated", payload);
      io.to("admin:all").emit("wellbeing:log:updated", payload);
    }

    return res.status(200).json({ log: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save wellbeing log";
    console.error("[wellbeing] upsertLog error:", error);
    return res.status(500).json({ error: message });
  }
}

export async function deleteWellbeingLog(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const logId = Number(req.params.logId);
  if (!Number.isFinite(logId)) {
    return res.status(400).json({ error: "Invalid log ID" });
  }

  const [log] = await db
    .select()
    .from(wellbeingLogsTable)
    .where(eq(wellbeingLogsTable.id, logId))
    .limit(1);

  if (!log) return res.status(404).json({ error: "Not found" });

  const canWrite = await canWriteForUser({
    actorUserId: req.user.id,
    actorRole: req.user.role,
    targetUserId: log.userId,
  });
  if (!canWrite) return res.status(403).json({ error: "Forbidden" });

  await db.delete(wellbeingLogsTable).where(eq(wellbeingLogsTable.id, logId));

  const io = getSocketServer();
  if (io) {
    io.to(`user:${log.userId}`).emit("wellbeing:log:deleted", { logId });
    io.to("admin:all").emit("wellbeing:log:deleted", { logId });
  }

  return res.status(200).json({ success: true });
}

export async function addWellbeingFeedback(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (!isTrainingStaff(req.user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const logId = Number(req.params.logId);
  if (!Number.isFinite(logId)) {
    return res.status(400).json({ error: "Invalid log ID" });
  }

  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors });
  }

  const [log] = await db
    .select()
    .from(wellbeingLogsTable)
    .where(eq(wellbeingLogsTable.id, logId))
    .limit(1);

  if (!log) return res.status(404).json({ error: "Not found" });

  const [updated] = await db
    .update(wellbeingLogsTable)
    .set({
      coachFeedback: parsed.data.feedback,
      coachId: req.user.id,
      updatedAt: new Date(),
    })
    .where(eq(wellbeingLogsTable.id, logId))
    .returning();

  const io = getSocketServer();
  if (io && updated) {
    io.to(`user:${log.userId}`).emit("wellbeing:log:updated", { log: updated });
  }

  return res.status(200).json({ log: updated });
}
