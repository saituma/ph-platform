import { eq } from "drizzle-orm";

import { db } from "../db";
import { athleteTable, guardianTable, videoUploadTable } from "../db/schema";
import { getSocketServer } from "../socket-hub";
import { sendPushNotification } from "./push.service";

export async function createVideoUpload(input: {
  athleteId: number;
  videoUrl: string;
  notes?: string | null;
}) {
  const result = await db
    .insert(videoUploadTable)
    .values({
      athleteId: input.athleteId,
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
      const athlete = await db
        .select()
        .from(athleteTable)
        .where(eq(athleteTable.id, input.athleteId))
        .limit(1);

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

  return upload;
}

export async function listVideoUploadsByAthlete(athleteId: number) {
  return db.select().from(videoUploadTable).where(eq(videoUploadTable.athleteId, athleteId));
}

export async function reviewVideoUpload(input: {
  uploadId: number;
  coachId: number;
  feedback: string;
}) {
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
      const payload = { videoUploadId: upload.id, url: "/video-upload" };

      for (const userId of recipients) {
        await sendPushNotification(
          userId,
          "Video Reviewed",
          "Your coach has provided feedback on your training video.",
          payload
        );
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
