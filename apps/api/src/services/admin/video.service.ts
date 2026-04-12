import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  athleteTable,
  guardianTable,
  programSectionContentTable,
  trainingModuleSessionTable,
  trainingSessionItemTable,
  videoUploadTable,
} from "../../db/schema";

export async function listVideoUploadsAdmin(options?: { q?: string; limit?: number }) {
  const q = options?.q?.trim() ?? "";
  const requestedLimit = options?.limit;
  const limit =
    typeof requestedLimit === "number" && Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(100, Math.floor(requestedLimit)))
      : 50;
  const filters = [];
  if (q) {
    const pattern = `%${q}%`;
    filters.push(
      or(
        ilike(athleteTable.name, pattern),
        ilike(videoUploadTable.notes, pattern),
        ilike(videoUploadTable.feedback, pattern),
        sql`${videoUploadTable.id}::text ILIKE ${pattern}`,
      ),
    );
  }

  return db
    .select({
      id: videoUploadTable.id,
      athleteId: videoUploadTable.athleteId,
      athleteUserId: athleteTable.userId,
      guardianUserId: guardianTable.userId,
      athleteName: athleteTable.name,
      videoUrl: videoUploadTable.videoUrl,
      notes: videoUploadTable.notes,
      feedback: videoUploadTable.feedback,
      reviewedAt: videoUploadTable.reviewedAt,
      createdAt: videoUploadTable.createdAt,
      programSectionContentId: videoUploadTable.programSectionContentId,
      trainingSessionItemId: videoUploadTable.trainingSessionItemId,
      programSectionTitle: programSectionContentTable.title,
      programSectionType: programSectionContentTable.sectionType,
      trainingSessionTitle: trainingModuleSessionTable.title,
      sectionTitle: sql<string | null>`COALESCE(${trainingModuleSessionTable.title}, ${programSectionContentTable.title})`,
    })
    .from(videoUploadTable)
    .leftJoin(athleteTable, eq(videoUploadTable.athleteId, athleteTable.id))
    .leftJoin(guardianTable, eq(athleteTable.guardianId, guardianTable.id))
    .leftJoin(programSectionContentTable, eq(videoUploadTable.programSectionContentId, programSectionContentTable.id))
    .leftJoin(trainingSessionItemTable, eq(videoUploadTable.trainingSessionItemId, trainingSessionItemTable.id))
    .leftJoin(trainingModuleSessionTable, eq(trainingSessionItemTable.sessionId, trainingModuleSessionTable.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(videoUploadTable.createdAt))
    .limit(limit);
}
