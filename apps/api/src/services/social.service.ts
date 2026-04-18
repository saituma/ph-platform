import { and, asc, desc, eq, gt, gte, inArray, lt, sql } from "drizzle-orm";

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

const ALLOWED_REACTION_EMOJIS = new Set([
  "👍",
  "❤️",
  "🔥",
  "👏",
  "😂",
  "😮",
  "😢",
  "😡",
]);

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

export async function ensurePublicAdultRun(runLogId: number): Promise<{ ownerUserId: number }> {
  const row = await db
    .select({
      id: runLogTable.id,
      ownerUserId: runLogTable.userId,
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
  return { ownerUserId: r.ownerUserId };
}

export async function getLeaderboard(input: {
  windowDays: number;
  limit: number;
  sort?: "distance_desc" | "distance_asc" | "duration_desc" | "duration_asc";
}) {
  const windowDays =
    Number.isFinite(input.windowDays) && input.windowDays > 0
      ? Math.min(365, Math.floor(input.windowDays))
      : 7;
  const limit =
    Number.isFinite(input.limit) && input.limit > 0
      ? Math.min(100, Math.floor(input.limit))
      : 50;

  const since =
    windowDays > 0 ? new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000) : null;
  const totalMetersSql = sql<number>`sum(${runLogTable.distanceMeters})`;
  const totalDurationSql = sql<number>`sum(${runLogTable.durationSeconds})`;

  const sort = input.sort ?? "distance_desc";
  const orderBy =
    sort === "distance_asc"
      ? asc(totalMetersSql)
      : sort === "duration_desc"
        ? desc(totalDurationSql)
        : sort === "duration_asc"
          ? asc(totalDurationSql)
          : desc(totalMetersSql);

  const rows = await db
    .select({
      userId: runLogTable.userId,
      name: userTable.name,
      profilePicture: userTable.profilePicture,
      totalMeters: totalMetersSql,
      totalDurationSeconds: totalDurationSql,
    })
    .from(runLogTable)
    .innerJoin(userTable, eq(userTable.id, runLogTable.userId))
    .innerJoin(athleteTable, eq(athleteTable.userId, runLogTable.userId))
    .where(
      and(
        eq(athleteTable.athleteType, "adult"),
        eq(runLogTable.visibility, "public"),
        since ? gte(runLogTable.date, since) : sql`true`,
      ),
    )
    .groupBy(runLogTable.userId, userTable.name, userTable.profilePicture)
    .orderBy(orderBy)
    .limit(limit);

  return rows.map((r, idx) => ({
    userId: r.userId,
    name: r.name,
    avatarUrl: normalizeStoredMediaUrl(r.profilePicture ?? null),
    kmTotal: Math.max(0, Number(r.totalMeters ?? 0) / 1000),
    durationMinutesTotal: Math.max(0, Math.round(Number(r.totalDurationSeconds ?? 0) / 60)),
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

export async function listPublicRuns(input: {
  limit: number;
  cursor?: number;
  windowDays?: number;
  sort?: string;
}) {
  const limit =
    Number.isFinite(input.limit) && input.limit > 0
      ? Math.min(50, Math.floor(input.limit))
      : 20;
  const cursor =
    typeof input.cursor === "number" && Number.isFinite(input.cursor)
      ? Math.floor(input.cursor)
      : undefined;

  const windowDays =
    typeof input.windowDays === "number" && Number.isFinite(input.windowDays) && input.windowDays > 0
      ? Math.min(365, Math.floor(input.windowDays))
      : 0;
  const since = windowDays > 0 ? new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000) : null;

  const sort = typeof input.sort === "string" ? input.sort : "date_desc";

  const commentCountSql = (runIdCol: typeof runLogTable.id) =>
    sql<number>`(select count(*) from ${runCommentTable} where ${runCommentTable.runLogId} = ${runIdCol})`;

  const commentsExpr = commentCountSql(runLogTable.id);
  const sortOrderBy =
    sort === "distance_asc"
      ? asc(runLogTable.distanceMeters)
      : sort === "distance_desc"
        ? desc(runLogTable.distanceMeters)
        : sort === "duration_asc"
          ? asc(runLogTable.durationSeconds)
          : sort === "duration_desc"
            ? desc(runLogTable.durationSeconds)
            : sort === "comments_desc"
              ? desc(commentsExpr)
              : sort === "date_asc"
                ? asc(runLogTable.date)
                : desc(runLogTable.date);

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
      commentCount: commentsExpr,
    })
    .from(runLogTable)
    .innerJoin(userTable, eq(userTable.id, runLogTable.userId))
    .innerJoin(athleteTable, eq(athleteTable.userId, runLogTable.userId))
    .where(
      and(
        eq(athleteTable.athleteType, "adult"),
        eq(runLogTable.visibility, "public"),
        since ? gte(runLogTable.date, since) : sql`true`,
        cursor != null ? lt(runLogTable.id, cursor) : sql`true`,
      ),
    )
    .orderBy(sortOrderBy, desc(runLogTable.id))
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

async function ensureRunCommentReactionTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "run_comment_reactions" (
      "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      "commentId" integer NOT NULL REFERENCES "run_comments"("id") ON DELETE CASCADE,
      "userId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "emoji" varchar(16) NOT NULL,
      "createdAt" timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "run_comment_reactions_unique_idx"
    ON "run_comment_reactions" ("commentId", "userId")
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "run_comment_reactions_comment_idx"
    ON "run_comment_reactions" ("commentId")
  `);
}

type ReactionRow = { commentId: number; userId: number; emoji: string };

async function getReactionSummary(viewerUserId: number, commentIds: number[]) {
  await ensureRunCommentReactionTable();
  if (!commentIds.length) return new Map<number, { counts: Record<string, number>; myReaction: string | null }>();

  // Use raw SQL because this table is created dynamically (not in drizzle schema).
  const rows = await db.execute(sql`
    SELECT "commentId", "userId", "emoji"
    FROM "run_comment_reactions"
    WHERE "commentId" = ANY(${commentIds})
  `);

  const mapped = new Map<number, { counts: Record<string, number>; myReaction: string | null }>();
  const data = (rows as any).rows as ReactionRow[] | undefined;
  for (const row of data ?? []) {
    if (!mapped.has(row.commentId)) {
      mapped.set(row.commentId, { counts: {}, myReaction: null });
    }
    const entry = mapped.get(row.commentId)!;
    entry.counts[row.emoji] = (entry.counts[row.emoji] ?? 0) + 1;
    if (row.userId === viewerUserId) {
      entry.myReaction = row.emoji;
    }
  }
  return mapped;
}

export async function listRunComments(viewerUserId: number, runLogId: number) {
  const { ownerUserId } = await ensurePublicAdultRun(runLogId);

  const rows = await db
    .select({
      commentId: runCommentTable.id,
      runLogId: runCommentTable.runLogId,
      userId: runCommentTable.userId,
      content: runCommentTable.content,
      parentId: runCommentTable.parentId,
      createdAt: runCommentTable.createdAt,
      updatedAt: runCommentTable.updatedAt,
      name: userTable.name,
      profilePicture: userTable.profilePicture,
    })
    .from(runCommentTable)
    .innerJoin(userTable, eq(userTable.id, runCommentTable.userId))
    .where(eq(runCommentTable.runLogId, runLogId))
    .orderBy(runCommentTable.createdAt);

  const commentIds = rows.map((r) => r.commentId);
  const reactions = await getReactionSummary(viewerUserId, commentIds);

  return rows.map((r) => {
    const react = reactions.get(r.commentId) ?? { counts: {}, myReaction: null };
    const isMine = r.userId === viewerUserId;
    const canDelete = isMine || viewerUserId === ownerUserId;
    return ({
    commentId: r.commentId,
    runLogId: r.runLogId,
    userId: r.userId,
    name: r.name,
    avatarUrl: normalizeStoredMediaUrl(r.profilePicture ?? null),
    content: r.content,
    parentId: r.parentId ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    isMine,
    canDelete,
    reactionCounts: react.counts,
    myReaction: react.myReaction,
  });
  });
}

export async function createRunComment(input: {
  userId: number;
  runLogId: number;
  content: string;
  parentId?: number | null;
}) {
  await ensurePublicAdultRun(input.runLogId);

  const parentId =
    typeof input.parentId === "number" && Number.isFinite(input.parentId)
      ? Math.floor(input.parentId)
      : null;
  if (parentId != null) {
    const parent = await db
      .select({ id: runCommentTable.id, runLogId: runCommentTable.runLogId })
      .from(runCommentTable)
      .where(eq(runCommentTable.id, parentId))
      .limit(1);
    if (!parent.length || parent[0]!.runLogId !== input.runLogId) {
      throw new SocialAccessError("FORBIDDEN", "Invalid parent comment");
    }
  }

  const inserted = await db
    .insert(runCommentTable)
    .values({
      runLogId: input.runLogId,
      userId: input.userId,
      content: input.content,
      ...(parentId != null ? { parentId } : {}),
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
      parentId: runCommentTable.parentId,
      createdAt: runCommentTable.createdAt,
      updatedAt: runCommentTable.updatedAt,
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
    parentId: r.parentId ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    isMine: true,
    canDelete: true,
    reactionCounts: {},
    myReaction: null,
  };
}

export async function editComment(input: { userId: number; commentId: number; content: string }) {
  const rows = await db
    .select({
      id: runCommentTable.id,
      userId: runCommentTable.userId,
      runLogId: runCommentTable.runLogId,
    })
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

  await db
    .update(runCommentTable)
    .set({ content: input.content, updatedAt: new Date() })
    .where(eq(runCommentTable.id, input.commentId));

  const items = await listRunComments(input.userId, existing.runLogId);
  const updated = items.find((c) => c.commentId === input.commentId);
  if (!updated) throw new Error("Failed to load edited comment");
  return updated;
}

export async function deleteComment(input: { userId: number; commentId: number }) {
  const rows = await db
    .select({
      id: runCommentTable.id,
      userId: runCommentTable.userId,
      runLogId: runCommentTable.runLogId,
    })
    .from(runCommentTable)
    .where(eq(runCommentTable.id, input.commentId))
    .limit(1);

  const existing = rows[0];
  if (!existing) {
    throw new SocialAccessError("NOT_FOUND", "Comment not found");
  }

  const { ownerUserId } = await ensurePublicAdultRun(existing.runLogId);
  const canDelete = existing.userId === input.userId || ownerUserId === input.userId;
  if (!canDelete) {
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

export async function listCommentReactions(commentId: number) {
  await ensureRunCommentReactionTable();
  const rows = await db.execute(sql`
    SELECT r."userId" as "userId", u."name" as "name", u."profilePicture" as "profilePicture", r."emoji" as "emoji"
    FROM "run_comment_reactions" r
    JOIN "users" u ON u."id" = r."userId"
    WHERE r."commentId" = ${commentId}
    ORDER BY r."createdAt" ASC
  `);

  const data = (rows as any).rows as { userId: number; name: string; profilePicture: string | null; emoji: string }[] | undefined;
  return (data ?? []).map((r) => ({
    userId: Number(r.userId),
    name: r.name,
    avatarUrl: normalizeStoredMediaUrl(r.profilePicture ?? null),
    emoji: r.emoji,
  }));
}

export async function setCommentReaction(input: {
  userId: number;
  commentId: number;
  emoji: string;
}) {
  await ensureRunCommentReactionTable();
  if (!ALLOWED_REACTION_EMOJIS.has(input.emoji)) {
    throw new SocialAccessError("FORBIDDEN", "Invalid emoji");
  }

  // Replace existing reaction (1 user -> 1 reaction per comment).
  await db.execute(sql`
    DELETE FROM "run_comment_reactions"
    WHERE "commentId" = ${input.commentId} AND "userId" = ${input.userId}
  `);
  await db.execute(sql`
    INSERT INTO "run_comment_reactions" ("commentId","userId","emoji")
    VALUES (${input.commentId}, ${input.userId}, ${input.emoji})
  `);

  return { ok: true as const };
}

export async function clearCommentReaction(input: { userId: number; commentId: number }) {
  await ensureRunCommentReactionTable();
  await db.execute(sql`
    DELETE FROM "run_comment_reactions"
    WHERE "commentId" = ${input.commentId} AND "userId" = ${input.userId}
  `);
  return { ok: true as const };
}
