import { and, asc, desc, eq, gt, gte, inArray, lt, sql } from "drizzle-orm";

import { db } from "../db";
import {
  athleteTable,
  auditLogsTable,
  runCommentTable,
  runLogTable,
  socialPrivacySettingsTable,
  userTable,
} from "../db/schema";
import { normalizeStoredMediaUrl } from "./s3.service";
import {
  assertSocialEnabled,
  getPrivacySettings,
  getRunLikeSummary,
} from "./social-privacy.service";

export class SocialAccessError extends Error {
  code: "NOT_ADULT" | "NOT_FOUND" | "FORBIDDEN" | "SOCIAL_DISABLED" | "NOT_TEAM";
  constructor(code: SocialAccessError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

const ALLOWED_REACTION_EMOJIS = new Set(["👍", "❤️", "🔥", "👏", "😂", "😮", "😢", "😡"]);

type LatLng = { latitude: number; longitude: number };

function parseLatLngs(raw: unknown): LatLng[] | null {
  if (!Array.isArray(raw)) return null;
  const out: LatLng[] = [];
  for (const v of raw) {
    if (!v || typeof v !== "object") continue;
    const anyV = v as any;
    const lat = typeof anyV.latitude === "number" ? anyV.latitude : anyV.lat;
    const lng = typeof anyV.longitude === "number" ? anyV.longitude : anyV.lng;
    if (typeof lat !== "number" || typeof lng !== "number") continue;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out.push({ latitude: lat, longitude: lng });
  }
  return out.length ? out : null;
}

function downsample(points: LatLng[], maxPoints: number): LatLng[] {
  if (points.length <= maxPoints) return points;
  const stride = Math.max(1, Math.ceil(points.length / maxPoints));
  const out: LatLng[] = [points[0]!];
  for (let i = stride; i < points.length - 1; i += stride) {
    out.push(points[i]!);
    if (out.length >= maxPoints - 1) break;
  }
  out.push(points[points.length - 1]!);
  return out;
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

  // Check if user has social features enabled
  const settings = await getPrivacySettings(userId);
  if (!settings.socialEnabled) {
    throw new SocialAccessError("SOCIAL_DISABLED", "Social features not enabled. Please opt-in in privacy settings.");
  }
}

/** Global `/social/*` feeds are disabled — solo adults track privately; team athletes use `/teams/social/*`. */
export async function assertGlobalSocialDeprecated(userId: number): Promise<void> {
  const row = await db
    .select({
      athleteType: athleteTable.athleteType,
      teamId: athleteTable.teamId,
    })
    .from(athleteTable)
    .where(eq(athleteTable.userId, userId))
    .limit(1);

  if (!row.length || row[0]!.athleteType !== "adult") {
    throw new SocialAccessError("NOT_ADULT", "Adult athlete access required");
  }
  if (row[0]!.teamId != null) {
    throw new SocialAccessError("FORBIDDEN", "Use /api/teams/social/* for team athletes");
  }
  throw new SocialAccessError("FORBIDDEN", "Global social feeds are not available");
}

export async function assertTeamMemberSocial(userId: number): Promise<{ teamId: number }> {
  const row = await db
    .select({
      teamId: athleteTable.teamId,
    })
    .from(athleteTable)
    .where(eq(athleteTable.userId, userId))
    .limit(1);

  const teamId = row[0]?.teamId;
  if (teamId == null) {
    throw new SocialAccessError("NOT_TEAM", "Team membership required");
  }

  const settings = await getPrivacySettings(userId);
  if (!settings.socialEnabled) {
    throw new SocialAccessError("SOCIAL_DISABLED", "Social features not enabled. Please opt-in in privacy settings.");
  }

  return { teamId };
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

  // Check owner's privacy settings
  const ownerSettings = await getPrivacySettings(r.ownerUserId);
  if (!ownerSettings.socialEnabled) {
    throw new SocialAccessError("FORBIDDEN", "User has disabled social features");
  }

  return { ownerUserId: r.ownerUserId };
}

export async function ensureTeamPublicRun(runLogId: number, viewerTeamId: number): Promise<{ ownerUserId: number }> {
  const row = await db
    .select({
      ownerUserId: runLogTable.userId,
      visibility: runLogTable.visibility,
      ownerTeamId: athleteTable.teamId,
    })
    .from(runLogTable)
    .innerJoin(athleteTable, eq(athleteTable.userId, runLogTable.userId))
    .where(eq(runLogTable.id, runLogId))
    .limit(1);

  if (!row.length) {
    throw new SocialAccessError("NOT_FOUND", "Run not found");
  }
  const r = row[0]!;
  if (r.ownerTeamId !== viewerTeamId) {
    throw new SocialAccessError("FORBIDDEN", "Run not in your team");
  }
  if (r.visibility !== "public") {
    throw new SocialAccessError("FORBIDDEN", "Run not available");
  }

  const ownerSettings = await getPrivacySettings(r.ownerUserId);
  if (!ownerSettings.socialEnabled || !ownerSettings.shareRunsPublicly) {
    throw new SocialAccessError("FORBIDDEN", "Run not available");
  }

  return { ownerUserId: r.ownerUserId };
}

export async function getLeaderboard(input: {
  windowDays: number;
  limit: number;
  sort?: "distance_desc" | "distance_asc" | "duration_desc" | "duration_asc";
  teamId?: number | null;
}) {
  const windowDays =
    Number.isFinite(input.windowDays) && input.windowDays > 0 ? Math.min(365, Math.floor(input.windowDays)) : 7;
  const limit = Number.isFinite(input.limit) && input.limit > 0 ? Math.min(100, Math.floor(input.limit)) : 50;

  const since = windowDays > 0 ? new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000) : null;
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

  const scopeFilter =
    input.teamId != null
      ? eq(athleteTable.teamId, input.teamId)
      : eq(athleteTable.athleteType, "adult");

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
    .innerJoin(socialPrivacySettingsTable, eq(socialPrivacySettingsTable.userId, runLogTable.userId))
    .where(
      and(
        scopeFilter,
        eq(runLogTable.visibility, "public"),
        eq(socialPrivacySettingsTable.socialEnabled, true),
        eq(socialPrivacySettingsTable.showInLeaderboard, true),
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

export async function listAdults(input: { limit: number; cursor?: number; teamId?: number | null }) {
  const limit = Number.isFinite(input.limit) && input.limit > 0 ? Math.min(100, Math.floor(input.limit)) : 50;
  const cursor =
    typeof input.cursor === "number" && Number.isFinite(input.cursor) ? Math.floor(input.cursor) : undefined;

  const scopeFilter =
    input.teamId != null ? eq(athleteTable.teamId, input.teamId) : eq(athleteTable.athleteType, "adult");

  const filters = [
    scopeFilter,
    eq(athleteTable.userId, userTable.id),
    eq(socialPrivacySettingsTable.userId, athleteTable.userId),
    eq(socialPrivacySettingsTable.socialEnabled, true),
    eq(socialPrivacySettingsTable.showInDirectory, true),
  ];

  const rows = await db
    .select({
      userId: userTable.id,
      name: userTable.name,
      profilePicture: userTable.profilePicture,
    })
    .from(athleteTable)
    .innerJoin(userTable, eq(userTable.id, athleteTable.userId))
    .innerJoin(socialPrivacySettingsTable, eq(socialPrivacySettingsTable.userId, athleteTable.userId))
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
  teamId?: number | null;
  /** When set, each feed item includes `likeCount` and `userLiked` for this viewer. */
  viewerUserId?: number;
}) {
  const limit = Number.isFinite(input.limit) && input.limit > 0 ? Math.min(50, Math.floor(input.limit)) : 20;
  const cursor =
    typeof input.cursor === "number" && Number.isFinite(input.cursor) ? Math.floor(input.cursor) : undefined;

  const windowDays =
    typeof input.windowDays === "number" && Number.isFinite(input.windowDays) && input.windowDays > 0
      ? Math.min(365, Math.floor(input.windowDays))
      : 0;
  const since = windowDays > 0 ? new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000) : null;

  const sort = typeof input.sort === "string" ? input.sort : "date_desc";

  const scopeFilter =
    input.teamId != null ? eq(athleteTable.teamId, input.teamId) : eq(athleteTable.athleteType, "adult");

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
      coordinates: runLogTable.coordinates,
    })
    .from(runLogTable)
    .innerJoin(userTable, eq(userTable.id, runLogTable.userId))
    .innerJoin(athleteTable, eq(athleteTable.userId, runLogTable.userId))
    .innerJoin(socialPrivacySettingsTable, eq(socialPrivacySettingsTable.userId, runLogTable.userId))
    .where(
      and(
        scopeFilter,
        eq(runLogTable.visibility, "public"),
        eq(socialPrivacySettingsTable.socialEnabled, true),
        eq(socialPrivacySettingsTable.shareRunsPublicly, true),
        since ? gte(runLogTable.date, since) : sql`true`,
        cursor != null ? lt(runLogTable.id, cursor) : sql`true`,
      ),
    )
    .orderBy(sortOrderBy, desc(runLogTable.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const nextCursor = rows.length > limit ? page[page.length - 1]!.runLogId : null;

  const runIds = page.map((r) => r.runLogId);
  const likeSummaries =
    input.viewerUserId != null && runIds.length > 0
      ? await getRunLikeSummary(input.viewerUserId, runIds)
      : null;

  return {
    items: page.map((r) => {
      const likes = likeSummaries?.get(r.runLogId) ?? { count: 0, userLiked: false };
      return {
        pathPreview: (() => {
          const pts = parseLatLngs(r.coordinates);
          return pts ? downsample(pts, 80) : null;
        })(),
        runLogId: r.runLogId,
        userId: r.userId,
        name: r.name,
        avatarUrl: normalizeStoredMediaUrl(r.profilePicture ?? null),
        date: r.date.toISOString(),
        distanceMeters: r.distanceMeters,
        durationSeconds: r.durationSeconds,
        avgPace: r.avgPace ?? null,
        commentCount: Number(r.commentCount ?? 0),
        likeCount: likes.count,
        userLiked: likes.userLiked,
      };
    }),
    nextCursor,
  };
}

export async function getPublicRunDetail(input: {
  viewerUserId: number;
  runLogId: number;
  teamId?: number | null;
}) {
  if (input.teamId != null) {
    await ensureTeamPublicRun(input.runLogId, input.teamId);
  } else {
    await ensurePublicAdultRun(input.runLogId);
  }

  const scopeFilter =
    input.teamId != null ? eq(athleteTable.teamId, input.teamId) : eq(athleteTable.athleteType, "adult");

  const row = await db
    .select({
      runLogId: runLogTable.id,
      userId: runLogTable.userId,
      name: userTable.name,
      profilePicture: userTable.profilePicture,
      date: runLogTable.date,
      distanceMeters: runLogTable.distanceMeters,
      durationSeconds: runLogTable.durationSeconds,
      avgPace: runLogTable.avgPace,
      coordinates: runLogTable.coordinates,
    })
    .from(runLogTable)
    .innerJoin(userTable, eq(userTable.id, runLogTable.userId))
    .innerJoin(athleteTable, eq(athleteTable.userId, runLogTable.userId))
    .where(
      and(
        eq(runLogTable.id, input.runLogId),
        scopeFilter,
        eq(runLogTable.visibility, "public"),
      ),
    )
    .limit(1);

  if (!row.length) {
    throw new SocialAccessError("NOT_FOUND", "Run not found");
  }

  const r = row[0]!;
  const pts = parseLatLngs(r.coordinates);
  const path = pts ? downsample(pts, 1200) : null;

  return {
    runLogId: r.runLogId,
    userId: r.userId,
    name: r.name,
    avatarUrl: normalizeStoredMediaUrl(r.profilePicture ?? null),
    date: r.date.toISOString(),
    distanceMeters: r.distanceMeters,
    durationSeconds: r.durationSeconds,
    avgPace: r.avgPace ?? null,
    path,
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
  // `ANY(${array})` does not bind JS arrays correctly with node-pg; use IN + sql.join.
  const rows = await db.execute(sql`
    SELECT "commentId", "userId", "emoji"
    FROM "run_comment_reactions"
    WHERE "commentId" IN (${sql.join(
      commentIds.map((id) => sql`${id}`),
      sql`, `,
    )})
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

export async function listRunComments(viewerUserId: number, runLogId: number, teamId?: number | null) {
  const { ownerUserId } =
    teamId != null ? await ensureTeamPublicRun(runLogId, teamId) : await ensurePublicAdultRun(runLogId);

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
      isMine,
      canDelete,
      reactionCounts: react.counts,
      myReaction: react.myReaction,
    };
  });
}

export async function createRunComment(input: {
  userId: number;
  runLogId: number;
  content: string;
  parentId?: number | null;
  teamId?: number | null;
}) {
  if (input.teamId != null) {
    await ensureTeamPublicRun(input.runLogId, input.teamId);
  } else {
    await ensurePublicAdultRun(input.runLogId);
  }

  const parentId =
    typeof input.parentId === "number" && Number.isFinite(input.parentId) ? Math.floor(input.parentId) : null;
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

export async function editComment(input: {
  userId: number;
  commentId: number;
  content: string;
  teamId?: number | null;
}) {
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

  const items = await listRunComments(input.userId, existing.runLogId, input.teamId);
  const updated = items.find((c) => c.commentId === input.commentId);
  if (!updated) throw new Error("Failed to load edited comment");
  return updated;
}

export async function deleteComment(input: { userId: number; commentId: number; teamId?: number | null }) {
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

  const { ownerUserId } =
    input.teamId != null
      ? await ensureTeamPublicRun(existing.runLogId, input.teamId)
      : await ensurePublicAdultRun(existing.runLogId);
  const canDelete = existing.userId === input.userId || ownerUserId === input.userId;
  if (!canDelete) {
    throw new SocialAccessError("FORBIDDEN", "Not allowed");
  }

  await db.delete(runCommentTable).where(eq(runCommentTable.id, input.commentId));
  return { ok: true as const };
}

export async function reportComment(input: { performedBy: number; commentId: number; reason?: string }) {
  const rows = await db
    .select({ id: runCommentTable.id })
    .from(runCommentTable)
    .where(eq(runCommentTable.id, input.commentId))
    .limit(1);

  if (!rows.length) {
    throw new SocialAccessError("NOT_FOUND", "Comment not found");
  }

  const reason = (input.reason ?? "").trim();
  const action = reason ? `run_comment_reported:${reason}`.slice(0, 500) : "run_comment_reported";

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

  const data = (rows as any).rows as
    | { userId: number; name: string; profilePicture: string | null; emoji: string }[]
    | undefined;
  return (data ?? []).map((r) => ({
    userId: Number(r.userId),
    name: r.name,
    avatarUrl: normalizeStoredMediaUrl(r.profilePicture ?? null),
    emoji: r.emoji,
  }));
}

export async function setCommentReaction(input: { userId: number; commentId: number; emoji: string }) {
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
