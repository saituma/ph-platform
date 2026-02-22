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
import { ProgramType, notificationTable, athleteTable } from "../db/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

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

async function createNotificationForAthlete(athleteId: number, content: string, link?: string) {
  try {
    // Find the user associated with this athlete
    const athletes = await db.select().from(athleteTable).where(eq(athleteTable.id, athleteId)).limit(1);
    const athlete = athletes[0];
    if (!athlete?.userId) return;

    await db.insert(notificationTable).values({
      userId: athlete.userId,
      type: "physio_referral",
      content,
      link: link ?? null,
    });
  } catch {
    // Don't fail the referral creation if notification fails
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
  const existing = await getPhysioReferralForAthlete(input.athleteId);
  if (existing) {
    return res.status(409).json({ error: "Referral already exists for this athlete" });
  }
  const item = await createPhysioReferral({
    athleteId: input.athleteId,
    programTier: input.programTier ?? null,
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
  await createNotificationForAthlete(input.athleteId, notifContent, input.referalLink);

  return res.status(201).json({ item });
}

export async function updatePhysioReferralAdmin(req: Request, res: Response) {
  const id = z.coerce.number().int().min(1).parse(req.params.id);
  const input = updatePhysioSchema.parse(req.body);
  const updated = await updatePhysioReferral({
    id,
    referalLink: input.referalLink === "" ? null : input.referalLink ?? undefined,
    discountPercent: input.discountPercent ?? undefined,
    programTier: input.programTier ?? undefined,
    metadata: input.metadata ?? undefined,
  });
  if (!updated) {
    return res.status(404).json({ error: "Referral not found" });
  }
  return res.status(200).json({ item: updated });
}

export async function deletePhysioReferralAdmin(req: Request, res: Response) {
  const id = z.coerce.number().int().min(1).parse(req.params.id);
  const deleted = await deletePhysioReferral(id);
  if (!deleted) {
    return res.status(404).json({ error: "Referral not found" });
  }
  return res.status(200).json({ item: deleted });
}
