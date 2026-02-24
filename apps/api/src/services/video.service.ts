import { eq } from "drizzle-orm";

import { db } from "../db";
import { athleteTable, videoUploadTable } from "../db/schema";

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

  return result[0] ?? null;
}
