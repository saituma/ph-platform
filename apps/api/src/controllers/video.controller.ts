import type { Request, Response } from "express";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";

import { getPresignedUploadUrl } from "../services/s3.service";
import { env } from "../config/env";
import { createVideoUpload, listVideoUploadsByAthlete, reviewVideoUpload } from "../services/video.service";
import { getAthleteForUser } from "../services/user.service";
import { getProgramSectionContentById } from "../services/program-section.service";
import { getTrainingSessionItemById } from "../services/training-content-v2.service";
import { MediaKey, MediaFolder } from "../lib/media-key";
import { athleteHasFeature } from "../services/billing/feature-access.service";
import { db } from "../db";
import {
  ProgramType,
  subscriptionPlanTable,
  teamSubscriptionRequestTable,
  teamTable,
} from "../db/schema";

const presignSchema = z.object({
  folder: z.enum(["profile-photos", "training-videos", "chat-media"] as [MediaFolder, ...MediaFolder[]]),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

const createSchema = z.object({
  videoUrl: z.string().url(),
  notes: z.string().optional(),
  programSectionContentId: z.number().int().min(1).optional(),
});

const reviewSchema = z.object({
  uploadId: z.number().int().min(1),
  feedback: z.string().min(1),
});

async function resolveTeamPlanTierForAthlete(athlete: {
  teamId?: number | null;
  team?: string | null;
}): Promise<(typeof ProgramType.enumValues)[number] | null> {
  const teamId =
    typeof athlete.teamId === "number" && Number.isFinite(athlete.teamId) && athlete.teamId > 0
      ? athlete.teamId
      : null;
  const [team] = teamId
    ? await db
        .select({
          id: teamTable.id,
          planId: teamTable.planId,
          subscriptionStatus: teamTable.subscriptionStatus,
        })
        .from(teamTable)
        .where(eq(teamTable.id, teamId))
        .limit(1)
    : [];
  if (!team) return null;

  if (team.planId) {
    const [plan] = await db
      .select({ tier: subscriptionPlanTable.tier })
      .from(subscriptionPlanTable)
      .where(eq(subscriptionPlanTable.id, team.planId))
      .limit(1);
    if (plan?.tier) return plan.tier;
  }

  const [fallback] = await db
    .select({ tier: subscriptionPlanTable.tier })
    .from(teamSubscriptionRequestTable)
    .innerJoin(
      subscriptionPlanTable,
      eq(teamSubscriptionRequestTable.planId, subscriptionPlanTable.id),
    )
    .where(
      and(
        eq(teamSubscriptionRequestTable.teamId, team.id),
        eq(teamSubscriptionRequestTable.status, "approved"),
      ),
    )
    .orderBy(
      desc(teamSubscriptionRequestTable.updatedAt),
      desc(teamSubscriptionRequestTable.id),
    )
    .limit(1);
  return fallback?.tier ?? null;
}

export async function createUploadUrl(req: Request, res: Response) {
  const input = presignSchema.parse(req.body);
  const maxBytes = Math.max(1, env.videoMaxMb) * 1024 * 1024;

  if (input.sizeBytes > maxBytes) {
    return res.status(413).json({ error: `File exceeds ${env.videoMaxMb}MB limit.` });
  }

  // Generate a structured key server-side for better security and organization
  const key = MediaKey.generate({
    folder: input.folder,
    userId: req.user!.id,
    fileName: input.fileName,
  });

  const url = await getPresignedUploadUrl({ key, contentType: input.contentType });
  return res.status(200).json({ url, key });
}

export async function createVideo(req: Request, res: Response) {
  const input = createSchema.parse(req.body);
  const athlete = await getAthleteForUser(req.user!.id);
  if (!athlete) {
    return res.status(400).json({ error: "Onboarding incomplete" });
  }
  const teamTierFallback = await resolveTeamPlanTierForAthlete(athlete);
  const effectiveTier = athlete.currentProgramTier ?? teamTierFallback;
  if (!effectiveTier) {
    return res.status(403).json({ error: "No active plan." });
  }
  // Feature-gate: video upload requires the `video_upload` feature key on the user's plan.
  if (!(await athleteHasFeature(athlete.id, "video_upload"))) {
    return res.status(403).json({ error: "Video uploads are not included in your plan." });
  }
  if (!input.programSectionContentId) {
    return res.status(400).json({ error: "Training section is required for video uploads." });
  }

  const contentId = input.programSectionContentId;

  // For training-content-v2 module sessions, the client sends the training session item id.
  // For legacy plans, the client sends the program section content id.
  const sessionItem = await getTrainingSessionItemById(contentId);
  if (sessionItem) {
    if (!sessionItem.allowVideoUpload) {
      return res.status(403).json({ error: "Video uploads are disabled for this training section." });
    }
  } else {
    const section = await getProgramSectionContentById(contentId);
    if (!section || !section.allowVideoUpload) {
      return res.status(403).json({ error: "Video uploads are disabled for this training section." });
    }
  }

  const item = await createVideoUpload({
    athleteId: athlete.id,
    videoUrl: input.videoUrl,
    notes: input.notes,
    programSectionContentId: sessionItem ? null : contentId,
    trainingSessionItemId: sessionItem ? contentId : null,
  });
  return res.status(201).json({ item });
}

export async function listVideos(req: Request, res: Response) {
  const athlete = await getAthleteForUser(req.user!.id);
  if (!athlete) {
    return res.status(200).json({ items: [] });
  }
  const sectionContentId = req.query.sectionContentId ? Number(req.query.sectionContentId) : null;
  const items = await listVideoUploadsByAthlete(athlete.id, {
    contentId: Number.isFinite(sectionContentId ?? NaN) ? (sectionContentId as number) : null,
  });
  return res.status(200).json({ items });
}

export async function reviewVideo(req: Request, res: Response) {
  const input = reviewSchema.parse(req.body);
  const item = await reviewVideoUpload({ uploadId: input.uploadId, coachId: req.user!.id, feedback: input.feedback });
  if (!item) {
    return res.status(404).json({ error: "Not found" });
  }
  return res.status(200).json({ item });
}
