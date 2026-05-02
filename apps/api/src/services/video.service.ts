import { and, desc, eq, or } from "drizzle-orm";

import { db } from "../db";
import {
  athleteTable,
  guardianTable,
  notificationTable,
  programSectionContentTable,
  trainingModuleSessionTable,
  trainingSessionItemTable,
  videoUploadTable,
} from "../db/schema";
import { getSocketServer } from "../socket-hub";
import { pushQueue } from "../jobs";
import { cleanupOriginalVideoObject, optimizeUploadedVideoUrl } from "./video-optimization.service";

export async function notifyCoachResponseVideo(input: { videoUploadId: number }) {
  try {
    const [upload] = await db
      .select({
        id: videoUploadTable.id,
        athleteId: videoUploadTable.athleteId,
        programSectionContentId: videoUploadTable.programSectionContentId,
        trainingSessionItemId: videoUploadTable.trainingSessionItemId,
      })
      .from(videoUploadTable)
      .where(eq(videoUploadTable.id, input.videoUploadId))
      .limit(1);

    if (!upload) return;

    const [athlete] = await db
      .select({
        athleteUserId: athleteTable.userId,
        guardianUserId: guardianTable.userId,
      })
      .from(athleteTable)
      .leftJoin(guardianTable, eq(guardianTable.id, athleteTable.guardianId))
      .where(eq(athleteTable.id, upload.athleteId))
      .limit(1);

    const recipients = new Set<number>();
    if (athlete?.athleteUserId) recipients.add(athlete.athleteUserId);
    if (athlete?.guardianUserId) recipients.add(athlete.guardianUserId);
    if (!recipients.size) return;

    let resolvedSessionId: number | null = null;
    let resolvedSessionTitle: string | null = null;

    if (upload.trainingSessionItemId != null) {
      const [item] = await db
        .select({ sessionId: trainingSessionItemTable.sessionId })
        .from(trainingSessionItemTable)
        .where(eq(trainingSessionItemTable.id, upload.trainingSessionItemId))
        .limit(1);

      resolvedSessionId = item?.sessionId ?? null;

      if (resolvedSessionId != null) {
        const [session] = await db
          .select({ title: trainingModuleSessionTable.title })
          .from(trainingModuleSessionTable)
          .where(eq(trainingModuleSessionTable.id, resolvedSessionId))
          .limit(1);
        resolvedSessionTitle = session?.title ?? null;
      }
    } else if (upload.programSectionContentId != null) {
      const [legacy] = await db
        .select({ title: programSectionContentTable.title })
        .from(programSectionContentTable)
        .where(eq(programSectionContentTable.id, upload.programSectionContentId))
        .limit(1);
      resolvedSessionTitle = legacy?.title ?? null;
    }

    const sessionTitle = (resolvedSessionTitle ?? "").trim() || "your session";
    const messageBody = `Coach sent a response to ${sessionTitle}`;
    const contentId = upload.trainingSessionItemId ?? upload.programSectionContentId;
    const deepLinkUrl =
      resolvedSessionId != null
        ? `/programs/session/${resolvedSessionId}`
        : contentId != null
          ? `/video-upload?sectionContentId=${contentId}`
          : "/video-upload";

    try {
      await db.insert(notificationTable).values(
        Array.from(recipients).map((userId) => ({
          userId,
          type: "video_response",
          content: messageBody,
          link: deepLinkUrl,
        })),
      );
    } catch (err) {
      console.error("[Video Service] Failed to store response video notification", err);
    }

    for (const userId of recipients) {
      await pushQueue.enqueue({
        userId,
        title: "Coach response",
        body: messageBody,
        data: {
          type: "video_response",
          videoUploadId: upload.id,
          url: deepLinkUrl,
        },
      });
    }
  } catch (err) {
    console.error("[Video Service] Failed to send response video push", err);
  }
}

export async function createVideoUpload(input: {
  athleteId: number;
  videoUrl: string;
  notes?: string | null;
  programSectionContentId?: number | null;
  trainingSessionItemId?: number | null;
}) {
  const result = await db
    .insert(videoUploadTable)
    .values({
      athleteId: input.athleteId,
      programSectionContentId: input.programSectionContentId ?? null,
      trainingSessionItemId: input.trainingSessionItemId ?? null,
      videoUrl: input.videoUrl,
      notes: input.notes ?? null,
    })
    .returning();

  const upload = result[0];

  // Emit socket event to admins so they can update counters live
  const io = getSocketServer();
  if (io) {
    io.to("admin:all").emit("video:new", upload);
  }

  // Post-upload AI feedback trigger (asynchronous)
  (async () => {
    try {
      const athlete = await db.select().from(athleteTable).where(eq(athleteTable.id, input.athleteId)).limit(1);

      if (athlete[0]?.currentProgramTier === "PHP_Premium" && input.notes) {
        const { generateVideoFeedback, ensureAiCoachUser } = await import("./ai.service");
        const aiCoachId = await ensureAiCoachUser();
        const feedback = await generateVideoFeedback(input.notes);
        if (feedback) {
          await db
            .update(videoUploadTable)
            .set({ reviewedByCoach: aiCoachId, feedback, reviewedAt: new Date() })
            .where(eq(videoUploadTable.id, upload.id));
        }
      }
    } catch (err) {
      console.error("[Video Service] AI feedback failed:", err);
    }
  })();

  // Async storage optimization pass (transcode + replace URL + delete original)
  (async () => {
    try {
      const optimized = await optimizeUploadedVideoUrl(upload.videoUrl);
      if (!optimized) return;

      await db
        .update(videoUploadTable)
        .set({
          videoUrl: optimized.optimizedUrl,
          updatedAt: new Date(),
        })
        .where(eq(videoUploadTable.id, upload.id));

      await cleanupOriginalVideoObject(optimized.originalKey).catch((err) => {
        console.warn("[VideoOptimization] Failed to delete original object:", err);
      });

      console.info(
        `[VideoOptimization] upload=${upload.id} saved ${
          optimized.bytesBefore - optimized.bytesAfter
        } bytes (${optimized.bytesBefore} -> ${optimized.bytesAfter})`,
      );
    } catch (err) {
      console.warn("[VideoOptimization] Optimization skipped/failed:", err);
    }
  })();

  return upload;
}

export async function listVideoUploadsByAthlete(
  athleteId: number,
  options?: { contentId?: number | null; limit?: number },
) {
  const effectiveLimit =
    typeof options?.limit === "number" && Number.isFinite(options.limit)
      ? Math.max(1, Math.min(200, Math.floor(options.limit)))
      : 100;

  const filters = [eq(videoUploadTable.athleteId, athleteId)];
  if (options?.contentId) {
    const contentFilter = or(
      eq(videoUploadTable.programSectionContentId, options.contentId),
      eq(videoUploadTable.trainingSessionItemId, options.contentId),
    );
    if (contentFilter) filters.push(contentFilter);
  }
  return db
    .select()
    .from(videoUploadTable)
    .where(and(...filters))
    .orderBy(desc(videoUploadTable.createdAt))
    .limit(effectiveLimit);
}

export async function reviewVideoUpload(input: { uploadId: number; coachId: number; feedback: string }) {
  const result = await db
    .update(videoUploadTable)
    .set({ reviewedByCoach: input.coachId, reviewedAt: new Date(), feedback: input.feedback })
    .where(eq(videoUploadTable.id, input.uploadId))
    .returning();

  const upload = result[0];
  if (!upload) return null;

  // Send push notification to user
  try {
    const [athlete] = await db
      .select({
        athleteUserId: athleteTable.userId,
        guardianUserId: guardianTable.userId,
      })
      .from(athleteTable)
      .leftJoin(guardianTable, eq(guardianTable.id, athleteTable.guardianId))
      .where(eq(athleteTable.id, upload.athleteId))
      .limit(1);

    if (athlete) {
      const recipients = new Set<number>();
      if (athlete.athleteUserId) recipients.add(athlete.athleteUserId);
      if (athlete.guardianUserId) recipients.add(athlete.guardianUserId);
      const contentId = upload.trainingSessionItemId ?? upload.programSectionContentId;
      const payload = {
        type: "video_reviewed",
        videoUploadId: upload.id,
        url: contentId ? `/video-upload?sectionContentId=${contentId}` : "/video-upload",
      };

      for (const userId of recipients) {
        await pushQueue.enqueue({
          userId,
          title: "Video Reviewed",
          body: "Your coach has provided feedback on your training video.",
          data: payload,
        });
      }

      // Emit socket event for live update in the app
      const io = getSocketServer();
      if (io) {
        for (const userId of recipients) {
          io.to(`user:${userId}`).emit("video:reviewed", upload);
        }
      }
    }
  } catch (err) {
    console.error("[Video Service] Failed to send feedback notification:", err);
  }

  return upload;
}
