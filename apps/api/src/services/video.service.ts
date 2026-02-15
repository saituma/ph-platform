import { eq } from "drizzle-orm";

import { db } from "../db";
import { videoUploadTable } from "../db/schema";

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

  return result[0];
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
