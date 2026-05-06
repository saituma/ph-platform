import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  athleteTable,
  guardianTable,
  programSessionCompletionTable,
  programSectionContentTable,
  sessionTable,
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

  const uploads = await db
    .select({
      id: videoUploadTable.id,
      source: sql<string>`'video_upload'`,
      programSessionCompletionId: sql<number | null>`NULL`,
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
      sectionTitle: sql<
        string | null
      >`COALESCE(${trainingModuleSessionTable.title}, ${programSectionContentTable.title})`,
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

  // Support mixed/live DB schemas without hard-referencing missing columns.
  // `to_jsonb(table)->>'key'` returns NULL when key doesn't exist (no SQL error).
  const completionVideoUrlExpr = sql<string | null>`COALESCE(
    to_jsonb("program_session_completions")->>'videoUrl',
    to_jsonb("program_session_completions")->>'video_url'
  )`;
  const completionCoachResponseExpr = sql<string | null>`COALESCE(
    to_jsonb("program_session_completions")->>'coachResponse',
    to_jsonb("program_session_completions")->>'coach_response'
  )`;
  const completionCoachResponseAtExpr = sql<Date | null>`COALESCE(
    (to_jsonb("program_session_completions")->>'coachResponseAt')::timestamp,
    (to_jsonb("program_session_completions")->>'coach_response_at')::timestamp
  )`;
  const completionFilters = [sql`${completionVideoUrlExpr} IS NOT NULL`];
  if (q) {
    const pattern = `%${q}%`;
    completionFilters.push(
      or(
        ilike(athleteTable.name, pattern),
        ilike(completionCoachResponseExpr, pattern),
        ilike(sessionTable.title, pattern),
        sql`${programSessionCompletionTable.id}::text ILIKE ${pattern}`,
      )!,
    );
  }

  const completions = await db
    .select({
      id: programSessionCompletionTable.id,
      source: sql<string>`'program_completion'`,
      programSessionCompletionId: programSessionCompletionTable.id,
      athleteId: programSessionCompletionTable.athleteId,
      athleteUserId: athleteTable.userId,
      guardianUserId: guardianTable.userId,
      athleteName: athleteTable.name,
      videoUrl: completionVideoUrlExpr,
      notes: sql<string | null>`NULL`,
      feedback: completionCoachResponseExpr,
      reviewedAt: completionCoachResponseAtExpr,
      createdAt: programSessionCompletionTable.completedAt,
      programSectionContentId: sql<number | null>`NULL`,
      trainingSessionItemId: sql<number | null>`NULL`,
      programSectionTitle: sql<string | null>`NULL`,
      programSectionType: sql<string | null>`'program'`,
      trainingSessionTitle: sessionTable.title,
      sectionTitle: sessionTable.title,
    })
    .from(programSessionCompletionTable)
    .leftJoin(athleteTable, eq(programSessionCompletionTable.athleteId, athleteTable.id))
    .leftJoin(guardianTable, eq(athleteTable.guardianId, guardianTable.id))
    .leftJoin(sessionTable, eq(programSessionCompletionTable.sessionId, sessionTable.id))
    .where(and(...completionFilters))
    .orderBy(desc(programSessionCompletionTable.completedAt))
    .limit(limit);

  return [...uploads, ...completions]
    .sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    })
    .slice(0, limit);
}
