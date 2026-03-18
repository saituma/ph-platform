import type { Request, Response } from "express";
import { z } from "zod";

import { getPresignedUploadUrl } from "../services/s3.service";
import { env } from "../config/env";
import { createVideoUpload, listVideoUploadsByAthlete, reviewVideoUpload } from "../services/video.service";
import { getAthleteForUser } from "../services/user.service";
import { getProgramSectionContentById } from "../services/program-section.service";

const presignSchema = z.object({
  key: z.string().min(1),
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

export async function createUploadUrl(req: Request, res: Response) {
  const input = presignSchema.parse(req.body);
  const maxBytes = Math.max(1, env.videoMaxMb) * 1024 * 1024;
  if (input.sizeBytes > maxBytes) {
    return res.status(413).json({ error: `File exceeds ${env.videoMaxMb}MB limit.` });
  }
  const url = await getPresignedUploadUrl({ key: input.key, contentType: input.contentType });
  return res.status(200).json({ url });
}

export async function createVideo(req: Request, res: Response) {
  const input = createSchema.parse(req.body);
  const athlete = await getAthleteForUser(req.user!.id);
  if (!athlete) {
    return res.status(400).json({ error: "Onboarding incomplete" });
  }
  if (athlete.currentProgramTier !== "PHP_Premium") {
    return res.status(403).json({ error: "Video uploads are available for PHP Premium members only." });
  }
  if (!input.programSectionContentId) {
    return res.status(400).json({ error: "Training section is required for video uploads." });
  }
  const section = await getProgramSectionContentById(input.programSectionContentId);
  if (!section || !section.allowVideoUpload) {
    return res.status(403).json({ error: "Video uploads are disabled for this training section." });
  }
  const item = await createVideoUpload({
    athleteId: athlete.id,
    videoUrl: input.videoUrl,
    notes: input.notes,
    programSectionContentId: input.programSectionContentId,
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
    programSectionContentId: Number.isFinite(sectionContentId ?? NaN)
      ? (sectionContentId as number)
      : null,
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
