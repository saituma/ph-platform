import { and, desc, eq, gt, gte, lt, sql } from "drizzle-orm";

import { db } from "../db";
import {
  athleteTable,
  auditLogsTable,
  runCommentTable,
  runLogTable,
  userTable,
} from "../db/schema";
import { normalizeStoredMediaUrl } from "./s3.service";

export class SocialAccessError extends Error {
  code: "NOT_ADULT" | "NOT_FOUND" | "FORBIDDEN";
  constructor(code: SocialAccessError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export async function assertAdultAthlete(userId: number): Promise<void> {
  const athlete = await db
    .select({
      athleteType: athleteTable.athleteType,
    })
    .from(athleteTable)
    .where(eq(athleteTable.userId, userId))
    .limit(1);

  if (!athlete.length || athlete[0]?.athleteType !== "adult") {
    throw new SocialAccessError("NOT_ADULT", "Adult athlete access required");
  }
}

export async function ensurePublicAdultRun(runLogId: number): Promise<void> {
  const row = await db
    .select({
      id: runLogTable.id,
      visibility: runLogTable.visibility,
      athleteType: athleteTable.athleteType,
    })
    .from(runLogTable)
    .innerJoin(athleteTable, eq(athleteTable.userId, runLogTable.userId))
    .where(eq(runLogTable.id, runLogId))
    .limit(1);

  if (!row.length) {
    throw new SocialAccessError("NOT_FOUND", "Run not found");
  }
  const r = row[0]!;
  if (r.athleteType !== "adult" || r.visibility !== "public") {
    throw new SocialAccessError("FORBIDDEN", "Run not available");
  }
}

export async function getLeaderboard(input: {
  windowDays: number;
  limit: number;
}) {
  const windowDays =
    Number.isFinite(input.windowDays) && input.windowDays > 0
      ? Math.min(90, Math.floor(input.windowDays))
      : 7;
  const limit =
    Number.isFinite(input.limit) && input.limit > 0
      ? Math.min(100, Math.floor(input.limit))
      : 50;

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const totalMetersSql = sql<number>`sum(${runLogTable.distanceMeters})`;

  const rows = await db
    .select({
      userId: runLogTable.userId,
      name: userTable.name,
      profilePicture: userTable.profilePicture,
      totalMeters: totalMetersSql,
    })
    .from(runLogTable)
    .innerJoin(userTable, eq(userTable.id, runLogTable.userId))
    .innerJoin(athleteTable, eq(athleteTable.userId, runLogTable.userId))
    .where(
      and(
        eq(athleteTable.athleteType, "adult"),
        eq(runLogTable.visibility, "public"),
        gte(runLogTable.date, since),
      ),
    )
    .groupBy(runLogTable.userId, userTable.name, userTable.profilePicture)
    .orderBy(desc(totalMetersSql))
    .limit(limit);

  return rows.map((r, idx) => ({
    userId: r.userId,
    name: r.name,
    avatarUrl: normalizeStoredMediaUrl(r.profilePicture ?? null),
    kmTotal: Math.max(0, Number(r.totalMeters ?? 0) / 1000),
    rank: idx + 1,
  }));
}

export async function listAdults(input: { limit: number; cursor?: number }) {
  const limit =
    Number.isFinite(input.limit) && input.limit > 0
      ? Math.min(100, Math.floor(input.limit))
      : 50;
  const cursor =
    typeof input.cursor === "number" && Number.isFinite(input.cursor)
      ? Math.floor(input.cursor)
      : undefined;

  const filters = [
    eq(athleteTable.athleteType, "adult"),
    eq(athleteTable.userId, userTable.id),
  ];

  const rows = await db
    .select({
      userId: userTable.id,
      name: userTable.name,
      profilePicture: userTable.profilePicture,
    })
    .from(athleteTable)
    .innerJoin(userTable, eq(userTable.id, athleteTable.userId))
    .where(cursor != null ? and(...filters, gt(userTable.id, cursor)) : and(...filters))
    .orderBy(userTable.id)
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const nextCursor = rows.length > limit ? page[page.length - 1]!.userId : null;

  return {
    items: page.map((r) => ({
      userId: r.userId,
      name: r.name,
      avatarUrl: normalizeStoredMediaUrl(r.profilePicture ?? null),
    })),
    nextCursor,
  };
}

export async function listPublicRuns(input: { limit: number; cursor?: number }) {
  const limit =
    Number.isFinite(input.limit) && input.limit > 0
      ? Math.min(50, Math.floor(input.limit))
      : 20;
  const cursor =
    typeof input.cursor === "number" && Number.isFinite(input.cursor)
      ? Math.floor(input.cursor)
      : undefined;

  const commentCountSql = (runIdCol: typeof runLogTable.id) =>
    sql<number>`(select count(*) from ${runCommentTable} where ${runCommentTable.runLogId} = ${runIdCol})`;

  const rows = await db
    .select({
      runLogId: runLogTable.id,
      userId: runLogTable.userId,
      name: userTable.name,
      profilePicture: userTable.profilePicture,
      date: runLogTable.date,
      distanceMeters: runLogTable.distanceMeters,
      durationSeconds: runLogTable.durationSeconds,
      avgPace: runLogTable.avgPace,
      commentCount: commentCountSql(runLogTable.id),
    })
    .from(runLogTable)
    .innerJoin(userTable, eq(userTable.id, runLogTable.userId))
    .innerJoin(athleteTable, eq(athleteTable.userId, runLogTable.userId))
    .where(
      and(
        eq(athleteTable.athleteType, "adult"),
        eq(runLogTable.visibility, "public"),
        cursor != null ? lt(runLogTable.id, cursor) : sql`true`,
      ),
    )
    .orderBy(desc(runLogTable.date), desc(runLogTable.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const nextCursor = rows.length > limit ? page[page.length - 1]!.runLogId : null;

  return {
    items: page.map((r) => ({
      runLogId: r.runLogId,
      userId: r.userId,
      name: r.name,
      avatarUrl: normalizeStoredMediaUrl(r.profilePicture ?? null),
      date: r.date.toISOString(),
      distanceMeters: r.distanceMeters,
      durationSeconds: r.durationSeconds,
      avgPace: r.avgPace ?? null,
      commentCount: Number(r.commentCount ?? 0),
    })),
    nextCursor,
  };
}

export async function listRunComments(viewerUserId: number, runLogId: number) {
  await ensurePublicAdultRun(runLogId);

  const rows = await db
    .select({
      commentId: runCommentTable.id,
      runLogId: runCommentTable.runLogId,
      userId: runCommentTable.userId,
      content: runCommentTable.content,
      createdAt: runCommentTable.createdAt,
      name: userTable.name,
      profilePicture: userTable.profilePicture,
    })
    .from(runCommentTable)
    .innerJoin(userTable, eq(userTable.id, runCommentTable.userId))
    .where(eq(runCommentTable.runLogId, runLogId))
    .orderBy(runCommentTable.createdAt);

  return rows.map((r) => ({
    commentId: r.commentId,
    runLogId: r.runLogId,
    userId: r.userId,
    name: r.name,
    avatarUrl: normalizeStoredMediaUrl(r.profilePicture ?? null),
    content: r.content,
    createdAt: r.createdAt.toISOString(),
    isMine: r.userId === viewerUserId,
  }));
}

export async function createRunComment(input: {
  userId: number;
  runLogId: number;
  content: string;
}) {
  await ensurePublicAdultRun(input.runLogId);

  const inserted = await db
    .insert(runCommentTable)
    .values({
      runLogId: input.runLogId,
      userId: input.userId,
      content: input.content,
    })
    .returning({ id: runCommentTable.id });

  const commentId = inserted[0]?.id;
  if (!commentId) {
    throw new Error("Failed to create comment");
  }

  const rows = await db
    .select({
      commentId: runCommentTable.id,
      runLogId: runCommentTable.runLogId,
      userId: runCommentTable.userId,
      content: runCommentTable.content,
      createdAt: runCommentTable.createdAt,
      name: userTable.name,
      profilePicture: userTable.profilePicture,
    })
    .from(runCommentTable)
    .innerJoin(userTable, eq(userTable.id, runCommentTable.userId))
    .where(eq(runCommentTable.id, commentId))
    .limit(1);

  const r = rows[0];
  if (!r) {
    throw new Error("Failed to load created comment");
  }

  return {
    commentId: r.commentId,
    runLogId: r.runLogId,
    userId: r.userId,
    name: r.name,
    avatarUrl: normalizeStoredMediaUrl(r.profilePicture ?? null),
    content: r.content,
    createdAt: r.createdAt.toISOString(),
    isMine: true,
  };
}

export async function deleteComment(input: { userId: number; commentId: number }) {
  const rows = await db
    .select({ id: runCommentTable.id, userId: runCommentTable.userId })
    .from(runCommentTable)
    .where(eq(runCommentTable.id, input.commentId))
    .limit(1);

  const existing = rows[0];
  if (!existing) {
    throw new SocialAccessError("NOT_FOUND", "Comment not found");
  }
  if (existing.userId !== input.userId) {
    throw new SocialAccessError("FORBIDDEN", "Not allowed");
  }

  await db.delete(runCommentTable).where(eq(runCommentTable.id, input.commentId));
  return { ok: true as const };
}

export async function reportComment(input: {
  performedBy: number;
  commentId: number;
  reason?: string;
}) {
  const rows = await db
    .select({ id: runCommentTable.id })
    .from(runCommentTable)
    .where(eq(runCommentTable.id, input.commentId))
    .limit(1);

  if (!rows.length) {
    throw new SocialAccessError("NOT_FOUND", "Comment not found");
  }

  const reason = (input.reason ?? "").trim();
  const action = reason
    ? `run_comment_reported:${reason}`.slice(0, 500)
    : "run_comment_reported";

  await db.insert(auditLogsTable).values({
    performedBy: input.performedBy,
    action,
    targetTable: "run_comments",
    targetId: input.commentId,
  });

  return { ok: true as const };
}

