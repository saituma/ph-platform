import type { Request, Response } from "express";
import { z } from "zod";

import { getAthleteForUser } from "../services/user.service";
import {
  createPhysioReferral,
  deletePhysioReferral,
  getPhysioReferralForAthlete,
  listPhysioReferrals,
  updatePhysioReferral,
} from "../services/physio-referral.service";
import { ProgramType, notificationTable, athleteTable, guardianTable, physioRefferalsTable } from "../db/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { getSocketServer } from "../socket-hub";
import { sendPushNotification } from "../services/push.service";

const physioMetadataSchema = z.object({
  physioName: z.string().optional().nullable(),
  clinicName: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  specialty: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
}).optional().nullable();

const createPhysioSchema = z.object({
  athleteId: z.coerce.number().int().min(1),
  programTier: z.enum(ProgramType.enumValues).optional().nullable(),
  referalLink: z
    .string()
    .transform((val) => val?.trim() || "")
    .refine((val) => val !== "" && z.string().url().safeParse(val).success, {
      message: "Invalid URL format",
    }),
  discountPercent: z.number().int().min(0).max(100).optional().nullable(),
  metadata: physioMetadataSchema,
});

const updatePhysioSchema = z.object({
  referalLink: z
    .string()
    .transform((val) => val?.trim() || "")
    .refine((val) => val === "" || z.string().url().safeParse(val).success, {
      message: "Invalid URL format",
    })
    .optional(),
  programTier: z.enum(ProgramType.enumValues).optional().nullable(),
  discountPercent: z.number().int().min(0).max(100).optional().nullable(),
  metadata: physioMetadataSchema,
});

const ELIGIBLE_TIERS = new Set(["PHP_Plus", "PHP_Premium"]);

async function resolveReferralRecipientUserIds(athleteId: number) {
  const rows = await db
    .select({
      athleteUserId: athleteTable.userId,
      guardianUserId: guardianTable.userId,
    })
    .from(athleteTable)
    .leftJoin(guardianTable, eq(athleteTable.guardianId, guardianTable.id))
    .where(eq(athleteTable.id, athleteId))
    .limit(1);

  const row = rows[0];
  if (!row) return [] as number[];

  return Array.from(
    new Set(
      [row.athleteUserId, row.guardianUserId].filter(
        (value): value is number => Number.isFinite(value)
      )
    )
  );
}

async function notifyReferralRecipients(input: {
  athleteId: number;
  content: string;
  link?: string | null;
  referralId?: number;
  event: "created" | "updated" | "deleted";
  sendPush?: boolean;
}) {
  try {
    const recipientUserIds = await resolveReferralRecipientUserIds(input.athleteId);
    if (!recipientUserIds.length) return;

    if (input.event === "created") {
      await db.insert(notificationTable).values(
        recipientUserIds.map((userId) => ({
          userId,
          type: "physio_referral",
          content: input.content,
          link: input.link ?? null,
        }))
      );
    }

    const io = getSocketServer();
    if (io) {
      const socketEvent = input.event === "deleted" ? "physio:referral:deleted" : "physio:referral:updated";
      const payload = {
        athleteId: input.athleteId,
        referralId: input.referralId ?? null,
        referalLink: input.link ?? null,
        content: input.content,
        event: input.event,
        updatedAt: new Date().toISOString(),
      };
      recipientUserIds.forEach((userId) => {
        io.to(`user:${userId}`).emit(socketEvent, payload);
      });
    }

    if (input.sendPush) {
      await Promise.all(
        recipientUserIds.map((userId) =>
          sendPushNotification(userId, "Physio referral", input.content, {
            type: "physio-referral",
            screen: "physio-referral",
            url: "/physio-referral",
            athleteId: String(input.athleteId),
            referralId: input.referralId ? String(input.referralId) : undefined,
          })
        )
      );
    }
  } catch {
    // Don't fail referral operations if notification/realtime emit fails
  }
}

export async function getPhysioReferral(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const athlete = await getAthleteForUser(req.user.id);
  if (!athlete) {
    return res.status(404).json({ error: "Athlete profile not found" });
  }
  const referral = await getPhysioReferralForAthlete(athlete.id);
  return res.status(200).json({ item: referral });
}

export async function listPhysioReferralsAdmin(_req: Request, res: Response) {
  const items = await listPhysioReferrals();
  return res.status(200).json({ items });
}

export async function createPhysioReferralAdmin(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const input = createPhysioSchema.parse(req.body);
  const athleteRows = await db
    .select({ currentProgramTier: athleteTable.currentProgramTier })
    .from(athleteTable)
    .where(eq(athleteTable.id, input.athleteId))
    .limit(1);
  const athleteTier = athleteRows[0]?.currentProgramTier ?? null;
  if (!athleteTier || !ELIGIBLE_TIERS.has(athleteTier)) {
    return res.status(400).json({ error: "Physio referrals are only available for PHP Plus and PHP Premium athletes." });
  }
  const existing = await getPhysioReferralForAthlete(input.athleteId);
  if (existing) {
    return res.status(409).json({ error: "Referral already exists for this athlete" });
  }
  const item = await createPhysioReferral({
    athleteId: input.athleteId,
    programTier: athleteTier,
    referalLink: input.referalLink,
    discountPercent: input.discountPercent ?? null,
    metadata: input.metadata ?? null,
    createdBy: req.user.id,
  });

  // Send notification to the athlete
  const physioName = (input.metadata as any)?.physioName;
  const notifContent = physioName
    ? `You have a new physio referral from ${physioName}. Tap to view.`
    : "You have a new physio referral. Tap to view.";
  await notifyReferralRecipients({
    athleteId: input.athleteId,
    content: notifContent,
    link: input.referalLink,
    referralId: item.id,
    event: "created",
    sendPush: true,
  });

  return res.status(201).json({ item });
}

export async function updatePhysioReferralAdmin(req: Request, res: Response) {
  const id = z.coerce.number().int().min(1).parse(req.params.id);
  const input = updatePhysioSchema.parse(req.body);
  const existing = await db
    .select({ athleteId: physioRefferalsTable.athleteId })
    .from(physioRefferalsTable)
    .where(eq(physioRefferalsTable.id, id))
    .limit(1);
  const athleteId = existing[0]?.athleteId ?? null;
  if (!athleteId) {
    return res.status(404).json({ error: "Referral not found" });
  }
  const athleteRows = await db
    .select({ currentProgramTier: athleteTable.currentProgramTier })
    .from(athleteTable)
    .where(eq(athleteTable.id, athleteId))
    .limit(1);
  const athleteTier = athleteRows[0]?.currentProgramTier ?? null;
  if (!athleteTier || !ELIGIBLE_TIERS.has(athleteTier)) {
    return res.status(400).json({ error: "Physio referrals are only available for PHP Plus and PHP Premium athletes." });
  }
  const updated = await updatePhysioReferral({
    id,
    referalLink: input.referalLink === "" ? null : input.referalLink ?? undefined,
    discountPercent: input.discountPercent ?? undefined,
    programTier: athleteTier,
    metadata: input.metadata ?? undefined,
  });
  if (!updated) {
    return res.status(404).json({ error: "Referral not found" });
  }
  await notifyReferralRecipients({
    athleteId: updated.athleteId,
    content: "Your physio referral has been updated. Tap to view.",
    link: updated.referalLink,
    referralId: updated.id,
    event: "updated",
  });
  return res.status(200).json({ item: updated });
}

export async function deletePhysioReferralAdmin(req: Request, res: Response) {
  const id = z.coerce.number().int().min(1).parse(req.params.id);
  const deleted = await deletePhysioReferral(id);
  if (!deleted) {
    return res.status(404).json({ error: "Referral not found" });
  }
  await notifyReferralRecipients({
    athleteId: deleted.athleteId,
    content: "Your physio referral has been removed.",
    link: null,
    referralId: deleted.id,
    event: "deleted",
  });
  return res.status(200).json({ item: deleted });
}
