import type { Request, Response } from "express";
import { z } from "zod";

import { getAthleteForUser } from "../services/user.service";
import {
  createPhysioReferral,
  deletePhysioReferral,
  getPhysioReferralForAthlete,
  getPhysioReferralsForAthlete,
  listPhysioReferrals,
  updatePhysioReferral,
} from "../services/physio-referral.service";
import {
  ProgramType,
  notificationTable,
  athleteTable,
  guardianTable,
  physioRefferalsTable,
  userTable,
} from "../db/schema";
import { db } from "../db";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { getSocketServer } from "../socket-hub";
import { sendPushNotification } from "../services/push.service";
import { createReferralGroup, getReferralGroupAthletes, listReferralGroups } from "../services/referral-group.service";
import { sendReferralAssignedEmail } from "../lib/mailer";

const physioMetadataSchema = z
  .object({
    referralType: z.string().optional().nullable(),
    assignmentMode: z.enum(["single", "team", "age_range", "group"]).optional().nullable(),
    targetLabel: z.string().optional().nullable(),
    targetGroupKey: z.string().optional().nullable(),
    targetTeam: z.string().optional().nullable(),
    minAge: z.number().int().optional().nullable(),
    maxAge: z.number().int().optional().nullable(),
    providerName: z.string().optional().nullable(),
    organizationName: z.string().optional().nullable(),
    imageUrl: z.string().url().optional().nullable(),
    physioName: z.string().optional().nullable(),
    clinicName: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    specialty: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .optional()
  .nullable();

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

const bulkTargetingSchema = z
  .discriminatedUnion("mode", [
    z.object({
      mode: z.literal("single"),
      athleteId: z.coerce.number().int().min(1),
    }),
    z.object({
      mode: z.literal("team"),
      team: z.string().trim().min(1),
    }),
    z.object({
      mode: z.literal("age_range"),
      minAge: z.coerce.number().int().min(1),
      maxAge: z.coerce.number().int().min(1),
    }),
    z.object({
      mode: z.literal("group"),
      groupId: z.coerce.number().int().min(1),
    }),
  ])
  .superRefine((value, ctx) => {
    if (value.mode === "age_range" && value.minAge > value.maxAge) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum age cannot exceed maximum age.",
        path: ["minAge"],
      });
    }
  });

const bulkCreatePhysioSchema = z.object({
  targeting: bulkTargetingSchema,
  referalLink: z
    .string()
    .transform((val) => val?.trim() || "")
    .refine((val) => val !== "" && z.string().url().safeParse(val).success, {
      message: "Invalid URL format",
    }),
  discountPercent: z.number().int().min(0).max(100).optional().nullable(),
  metadata: physioMetadataSchema,
});

const createReferralGroupSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    expectedSize: z.coerce.number().int().min(1),
    athleteIds: z.array(z.coerce.number().int().min(1)).min(1),
  })
  .superRefine((value, ctx) => {
    if (value.expectedSize !== value.athleteIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Expected size must match the number of athletes selected.",
        path: ["expectedSize"],
      });
    }
  });

function normalizeReferralType(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getMetadataString(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : null;
}

function getReferralTypeLabel(metadata?: Record<string, unknown> | null) {
  const rawType = getMetadataString(metadata, "referralType");
  return rawType?.trim() || "General";
}

function getReferralProviderLabel(metadata?: Record<string, unknown> | null) {
  const providerName = getMetadataString(metadata, "providerName") ?? getMetadataString(metadata, "physioName");
  return providerName?.trim() || null;
}

function getAssignmentLabel(input: {
  mode: "single" | "team" | "age_range" | "group";
  team?: string;
  minAge?: number;
  maxAge?: number;
  groupName?: string;
}) {
  if (input.mode === "team") {
    return input.team?.trim() ? `Team ${input.team.trim()}` : "Team";
  }
  if (input.mode === "age_range") {
    if (input.minAge === input.maxAge) {
      return `Age ${input.minAge}`;
    }
    return `Ages ${input.minAge}-${input.maxAge}`;
  }
  if (input.mode === "group") {
    return input.groupName?.trim() || "Referral group";
  }
  return "Individual athlete";
}

async function listEligibleAthleteTargets(
  input:
    | { mode: "single"; athleteId: number }
    | { mode: "team"; team: string }
    | { mode: "age_range"; minAge: number; maxAge: number }
    | { mode: "group"; groupId: number },
) {
  const filters = [] as any[];
  if (input.mode === "single") {
    filters.push(eq(athleteTable.id, input.athleteId));
  } else if (input.mode === "team") {
    filters.push(eq(athleteTable.team, input.team));
  } else if (input.mode === "age_range") {
    filters.push(gte(athleteTable.age, input.minAge), lte(athleteTable.age, input.maxAge));
  } else {
    const members = await getReferralGroupAthletes(input.groupId);
    return members;
  }

  const rows = await db
    .select({
      athleteId: athleteTable.id,
      athleteName: athleteTable.name,
      athleteAge: athleteTable.age,
      programTier: athleteTable.currentProgramTier,
    })
    .from(athleteTable)
    .where(and(...filters));

  return rows;
}

async function resolveReferralRecipients(athleteId: number) {
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
  if (!row) return [] as { userId: number; email: string | null; name: string | null }[];

  const userIds = Array.from(
    new Set([row.athleteUserId, row.guardianUserId].filter((value): value is number => Number.isFinite(value))),
  );

  if (!userIds.length) return [];
  const users = await db
    .select({
      userId: userTable.id,
      email: userTable.email,
      name: userTable.name,
    })
    .from(userTable)
    .where(inArray(userTable.id, userIds));

  return users;
}

async function notifyReferralRecipients(input: {
  athleteId: number;
  content: string;
  link?: string | null;
  referralId?: number;
  event: "created" | "updated" | "deleted";
  sendPush?: boolean;
  sendEmail?: boolean;
  emailPayload?: {
    referralType: string;
    providerName?: string | null;
    organizationName?: string | null;
    imageUrl?: string | null;
    targetLabel?: string | null;
    referralLink: string;
    discountPercent?: number | null;
    notes?: string | null;
  };
}) {
  try {
    const recipients = await resolveReferralRecipients(input.athleteId);
    if (!recipients.length) return;
    const recipientUserIds = recipients.map((recipient) => recipient.userId);

    if (input.event === "created") {
      await db.insert(notificationTable).values(
        recipientUserIds.map((userId) => ({
          userId,
          type: "physio_referral",
          content: input.content,
          link: input.link ?? null,
        })),
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
          sendPushNotification(userId, "Referral", input.content, {
            type: "physio-referral",
            screen: "physio-referral",
            url: "/physio-referral",
            athleteId: String(input.athleteId),
            referralId: input.referralId ? String(input.referralId) : undefined,
          }),
        ),
      );
    }

    if (input.sendEmail && input.emailPayload) {
      await Promise.all(
        recipients
          .filter((recipient) => recipient.email)
          .map((recipient) =>
            sendReferralAssignedEmail({
              to: recipient.email!,
              name: recipient.name?.trim() || "there",
              ...input.emailPayload!,
            }).catch(() => null),
          ),
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
  const q = typeof _req.query.q === "string" ? _req.query.q : undefined;
  const limitRaw = _req.query.limit ? Number(_req.query.limit) : undefined;
  const limit = limitRaw && Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, Math.floor(limitRaw))) : undefined;
  const items = await listPhysioReferrals({ q, limit });
  return res.status(200).json({ items });
}

export async function listReferralGroupsAdmin(_req: Request, res: Response) {
  const items = await listReferralGroups();
  return res.status(200).json({ items });
}

export async function createReferralGroupAdmin(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const input = createReferralGroupSchema.parse(req.body);
  const item = await createReferralGroup({
    name: input.name,
    expectedSize: input.expectedSize,
    athleteIds: Array.from(new Set(input.athleteIds)),
    createdBy: req.user.id,
  });
  return res.status(201).json({ item });
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
  if (!athleteTier) {
    return res.status(400).json({ error: "Athlete program tier is missing." });
  }
  const nextReferralType = normalizeReferralType(input.metadata?.referralType);
  const existingEntries = await getPhysioReferralsForAthlete(input.athleteId);
  const duplicate = existingEntries.find((item) => {
    const existingType = normalizeReferralType(
      getMetadataString(item.metadata as Record<string, unknown> | null, "referralType"),
    );
    return existingType === nextReferralType;
  });
  if (duplicate) {
    return res.status(409).json({ error: "A referral of this type already exists for this athlete" });
  }
  const item = await createPhysioReferral({
    athleteId: input.athleteId,
    programTier: athleteTier,
    referalLink: input.referalLink,
    discountPercent: input.discountPercent ?? null,
    metadata: input.metadata ?? null,
    createdBy: req.user.id,
  });

  const referralType = getReferralTypeLabel(input.metadata ?? null);
  const providerName = getReferralProviderLabel(input.metadata ?? null);
  const notifContent = providerName
    ? `You have a new ${referralType} referral from ${providerName}. Tap to view.`
    : `You have a new ${referralType} referral. Tap to view.`;
  await notifyReferralRecipients({
    athleteId: input.athleteId,
    content: notifContent,
    link: input.referalLink,
    referralId: item.id,
    event: "created",
    sendPush: true,
    sendEmail: true,
    emailPayload: {
      referralType,
      providerName,
      organizationName:
        getMetadataString(input.metadata ?? null, "organizationName") ??
        getMetadataString(input.metadata ?? null, "clinicName"),
      imageUrl: getMetadataString(input.metadata ?? null, "imageUrl"),
      targetLabel: getMetadataString(input.metadata ?? null, "targetLabel"),
      referralLink: input.referalLink,
      discountPercent: input.discountPercent ?? null,
      notes: getMetadataString(input.metadata ?? null, "notes"),
    },
  });

  return res.status(201).json({ item });
}

export async function createPhysioReferralBulkAdmin(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const input = bulkCreatePhysioSchema.parse(req.body);
  const referralType = getReferralTypeLabel(input.metadata ?? null);
  const providerName = getReferralProviderLabel(input.metadata ?? null);
  const organizationName =
    getMetadataString(input.metadata ?? null, "organizationName") ??
    getMetadataString(input.metadata ?? null, "clinicName");
  const imageUrl = getMetadataString(input.metadata ?? null, "imageUrl");
  const notes = getMetadataString(input.metadata ?? null, "notes");
  const targeting = input.targeting;
  let groupName: string | undefined;
  if (targeting.mode === "group") {
    groupName = (await listReferralGroups()).find((group) => group.id === targeting.groupId)?.name ?? "Referral group";
  }
  const targetLabel =
    targeting.mode === "single"
      ? "Individual athlete"
      : targeting.mode === "team"
        ? getAssignmentLabel({ mode: "team", team: targeting.team })
        : targeting.mode === "age_range"
          ? getAssignmentLabel({
              mode: "age_range",
              minAge: targeting.minAge,
              maxAge: targeting.maxAge,
            })
          : getAssignmentLabel({ mode: "group", groupName });

  const athletes = await listEligibleAthleteTargets(targeting as any);
  if (!athletes.length) {
    return res.status(400).json({ error: "No athletes matched that target." });
  }

  const created: any[] = [];
  const skipped: { athleteId: number; athleteName: string | null; reason: string }[] = [];

  for (const athlete of athletes) {
    const existingEntries = await getPhysioReferralsForAthlete(athlete.athleteId);
    const duplicate = existingEntries.find((item) => {
      const existingType = normalizeReferralType(
        getMetadataString(item.metadata as Record<string, unknown> | null, "referralType"),
      );
      return existingType === normalizeReferralType(input.metadata?.referralType);
    });
    if (duplicate) {
      skipped.push({
        athleteId: athlete.athleteId,
        athleteName: athlete.athleteName ?? null,
        reason: "duplicate_type",
      });
      continue;
    }

    const metadata = {
      ...(input.metadata ?? {}),
      assignmentMode: targeting.mode,
      targetLabel,
      targetTeam: targeting.mode === "team" ? targeting.team : null,
      targetGroupKey: targeting.mode === "group" ? String(targeting.groupId) : null,
      minAge: targeting.mode === "age_range" ? targeting.minAge : null,
      maxAge: targeting.mode === "age_range" ? targeting.maxAge : null,
    };

    const item = await createPhysioReferral({
      athleteId: athlete.athleteId,
      programTier: athlete.programTier,
      referalLink: input.referalLink,
      discountPercent: input.discountPercent ?? null,
      metadata,
      createdBy: req.user.id,
    });
    created.push(item);

    const notifContent = providerName
      ? `You have a new ${referralType} referral from ${providerName}. Tap to view.`
      : `You have a new ${referralType} referral. Tap to view.`;
    await notifyReferralRecipients({
      athleteId: athlete.athleteId,
      content: notifContent,
      link: input.referalLink,
      referralId: item.id,
      event: "created",
      sendPush: true,
      sendEmail: true,
      emailPayload: {
        referralType,
        providerName,
        organizationName,
        imageUrl,
        targetLabel,
        referralLink: input.referalLink,
        discountPercent: input.discountPercent ?? null,
        notes,
      },
    });
  }

  return res.status(201).json({
    created,
    summary: {
      targetMode: input.targeting.mode,
      targetLabel,
      matchedAthletes: athletes.length,
      createdCount: created.length,
      skippedCount: skipped.length,
    },
    skipped,
  });
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
  if (!athleteTier) {
    return res.status(400).json({ error: "Athlete program tier is missing." });
  }
  if (input.metadata) {
    const nextReferralType = normalizeReferralType(input.metadata.referralType);
    const existingEntries = await getPhysioReferralsForAthlete(athleteId);
    const duplicate = existingEntries.find((item) => {
      if (item.id === id) return false;
      const existingType = normalizeReferralType(
        getMetadataString(item.metadata as Record<string, unknown> | null, "referralType"),
      );
      return existingType === nextReferralType;
    });
    if (duplicate) {
      return res.status(409).json({ error: "A referral of this type already exists for this athlete" });
    }
  }
  const updated = await updatePhysioReferral({
    id,
    referalLink: input.referalLink === "" ? null : (input.referalLink ?? undefined),
    discountPercent: input.discountPercent ?? undefined,
    programTier: athleteTier,
    metadata: input.metadata ?? undefined,
  });
  if (!updated) {
    return res.status(404).json({ error: "Referral not found" });
  }
  await notifyReferralRecipients({
    athleteId: updated.athleteId,
    content: `Your ${getReferralTypeLabel(updated.metadata as Record<string, unknown> | null)} referral has been updated. Tap to view.`,
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
    content: "One of your referrals has been removed.",
    link: null,
    referralId: deleted.id,
    event: "deleted",
  });
  return res.status(200).json({ item: deleted });
}
