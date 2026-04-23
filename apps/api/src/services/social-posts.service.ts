import { and, desc, eq, lt, sql } from "drizzle-orm";
import { db } from "../db";
import {
  socialPostTable,
  socialPostCommentTable,
  socialPostLikeTable,
  userTable,
  athleteTable,
  socialPrivacySettingsTable,
} from "../db/schema";
import { normalizeStoredMediaUrl } from "./s3.service";
import { getPrivacySettings } from "./social-privacy.service";
import { SocialAccessError } from "./social.service";

export async function createSocialPost(input: {
  userId: number;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  visibility?: string;
}) {
  const inserted = await db
    .insert(socialPostTable)
    .values({
      userId: input.userId,
      content: input.content,
      mediaUrl: input.mediaUrl,
      mediaType: input.mediaType,
      visibility: input.visibility ?? "public",
    })
    .returning({ id: socialPostTable.id });

  const postId = inserted[0]?.id;
  if (!postId) throw new Error("Failed to create post");

  return getSocialPostDetail(postId, input.userId);
}

export async function getSocialPostDetail(postId: number, viewerUserId?: number) {
  const rows = await db
    .select({
      id: socialPostTable.id,
      userId: socialPostTable.userId,
      content: socialPostTable.content,
      mediaUrl: socialPostTable.mediaUrl,
      mediaType: socialPostTable.mediaType,
      visibility: socialPostTable.visibility,
      createdAt: socialPostTable.createdAt,
      name: userTable.name,
      profilePicture: userTable.profilePicture,
    })
    .from(socialPostTable)
    .innerJoin(userTable, eq(userTable.id, socialPostTable.userId))
    .where(eq(socialPostTable.id, postId))
    .limit(1);

  const post = rows[0];
  if (!post) throw new SocialAccessError("NOT_FOUND", "Post not found");

  const [likes, comments] = await Promise.all([
    db
      .select({ count: sql<string>`count(*)` })
      .from(socialPostLikeTable)
      .where(eq(socialPostLikeTable.postId, postId)),
    db
      .select({ count: sql<string>`count(*)` })
      .from(socialPostCommentTable)
      .where(eq(socialPostCommentTable.postId, postId)),
  ]);

  let userLiked = false;
  if (viewerUserId) {
    const like = await db
      .select({ id: socialPostLikeTable.id })
      .from(socialPostLikeTable)
      .where(
        and(
          eq(socialPostLikeTable.postId, postId),
          eq(socialPostLikeTable.userId, viewerUserId)
        )
      )
      .limit(1);
    userLiked = like.length > 0;
  }

  return {
    id: post.id,
    userId: post.userId,
    name: post.name,
    avatarUrl: normalizeStoredMediaUrl(post.profilePicture ?? null),
    content: post.content,
    mediaUrl: normalizeStoredMediaUrl(post.mediaUrl ?? null),
    mediaType: post.mediaType,
    date: post.createdAt.toISOString(),
    likeCount: Number(likes[0]?.count ?? 0),
    commentCount: Number(comments[0]?.count ?? 0),
    userLiked,
  };
}

export async function listSocialPosts(input: {
  limit: number;
  cursor?: number | null;
  teamId?: number | null;
  viewerUserId?: number;
}) {
  const limit = Math.min(50, input.limit || 20);
  const cursor = input.cursor;

  const scopeFilter =
    input.teamId != null
      ? eq(athleteTable.teamId, input.teamId)
      : eq(athleteTable.athleteType, "adult");

  const rows = await db
    .select({
      id: socialPostTable.id,
      userId: socialPostTable.userId,
      content: socialPostTable.content,
      mediaUrl: socialPostTable.mediaUrl,
      mediaType: socialPostTable.mediaType,
      createdAt: socialPostTable.createdAt,
      name: userTable.name,
      profilePicture: userTable.profilePicture,
    })
    .from(socialPostTable)
    .innerJoin(userTable, eq(userTable.id, socialPostTable.userId))
    .innerJoin(athleteTable, eq(athleteTable.userId, socialPostTable.userId))
    .innerJoin(
      socialPrivacySettingsTable,
      eq(socialPrivacySettingsTable.userId, socialPostTable.userId)
    )
    .where(
      and(
        scopeFilter,
        eq(socialPostTable.visibility, "public"),
        eq(socialPrivacySettingsTable.socialEnabled, true),
        cursor ? lt(socialPostTable.id, cursor) : sql`true`
      )
    )
    .orderBy(desc(socialPostTable.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const nextCursor = rows.length > limit ? page[page.length - 1]!.id : null;

  const items = await Promise.all(
    page.map(async (p) => {
      const [likes, comments] = await Promise.all([
        db
          .select({ count: sql<string>`count(*)` })
          .from(socialPostLikeTable)
          .where(eq(socialPostLikeTable.postId, p.id)),
        db
          .select({ count: sql<string>`count(*)` })
          .from(socialPostCommentTable)
          .where(eq(socialPostCommentTable.postId, p.id)),
      ]);

      let userLiked = false;
      if (input.viewerUserId) {
        const like = await db
          .select({ id: socialPostLikeTable.id })
          .from(socialPostLikeTable)
          .where(
            and(
              eq(socialPostLikeTable.postId, p.id),
              eq(socialPostLikeTable.userId, input.viewerUserId)
            )
          )
          .limit(1);
        userLiked = like.length > 0;
      }

      return {
        id: p.id,
        userId: p.userId,
        name: p.name,
        avatarUrl: normalizeStoredMediaUrl(p.profilePicture ?? null),
        content: p.content,
        mediaUrl: normalizeStoredMediaUrl(p.mediaUrl ?? null),
        mediaType: p.mediaType,
        date: p.createdAt.toISOString(),
        likeCount: Number(likes[0]?.count ?? 0),
        commentCount: Number(comments[0]?.count ?? 0),
        userLiked,
      };
    })
  );

  return { items, nextCursor };
}

export async function likeSocialPost(userId: number, postId: number) {
  await db
    .insert(socialPostLikeTable)
    .values({ userId, postId })
    .onConflictDoNothing();
  return { ok: true };
}

export async function unlikeSocialPost(userId: number, postId: number) {
  await db
    .delete(socialPostLikeTable)
    .where(
      and(
        eq(socialPostLikeTable.userId, userId),
        eq(socialPostLikeTable.postId, postId)
      )
    );
  return { ok: true };
}

export async function createPostComment(input: {
  userId: number;
  postId: number;
  content: string;
  parentId?: number | null;
}) {
  const inserted = await db
    .insert(socialPostCommentTable)
    .values({
      userId: input.userId,
      postId: input.postId,
      content: input.content,
      parentId: input.parentId,
    })
    .returning({ id: socialPostCommentTable.id });

  const commentId = inserted[0]?.id;
  if (!commentId) throw new Error("Failed to create post comment");

  return getPostCommentDetail(commentId, input.userId);
}

export async function listPostComments(postId: number) {
  const rows = await db
    .select({
      commentId: socialPostCommentTable.id,
      postId: socialPostCommentTable.postId,
      userId: socialPostCommentTable.userId,
      content: socialPostCommentTable.content,
      parentId: socialPostCommentTable.parentId,
      createdAt: socialPostCommentTable.createdAt,
      updatedAt: socialPostCommentTable.updatedAt,
      name: userTable.name,
      avatarUrl: userTable.profilePicture,
    })
    .from(socialPostCommentTable)
    .innerJoin(userTable, eq(userTable.id, socialPostCommentTable.userId))
    .where(eq(socialPostCommentTable.postId, postId))
    .orderBy(desc(socialPostCommentTable.id));

  return {
    items: rows.map((r) => ({
      commentId: r.commentId,
      postId: r.postId,
      userId: r.userId,
      content: r.content,
      parentId: r.parentId,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      name: r.name,
      avatarUrl: normalizeStoredMediaUrl(r.avatarUrl ?? null),
      isMine: false, // Will be handled by controller/frontend
      canDelete: false,
    })),
  };
}

async function getPostCommentDetail(commentId: number, viewerUserId?: number) {
  const rows = await db
    .select({
      commentId: socialPostCommentTable.id,
      postId: socialPostCommentTable.postId,
      userId: socialPostCommentTable.userId,
      content: socialPostCommentTable.content,
      parentId: socialPostCommentTable.parentId,
      createdAt: socialPostCommentTable.createdAt,
      updatedAt: socialPostCommentTable.updatedAt,
      name: userTable.name,
      avatarUrl: userTable.profilePicture,
    })
    .from(socialPostCommentTable)
    .innerJoin(userTable, eq(userTable.id, socialPostCommentTable.userId))
    .where(eq(socialPostCommentTable.id, commentId))
    .limit(1);

  const row = rows[0];
  if (!row) throw new SocialAccessError("NOT_FOUND", "Comment not found");

  return {
    commentId: row.commentId,
    postId: row.postId,
    userId: row.userId,
    content: row.content,
    parentId: row.parentId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    name: row.name,
    avatarUrl: normalizeStoredMediaUrl(row.avatarUrl ?? null),
    isMine: viewerUserId === row.userId,
    canDelete: viewerUserId === row.userId,
  };
}

export async function deletePostComment(userId: number, commentId: number) {
  await db
    .delete(socialPostCommentTable)
    .where(
      and(
        eq(socialPostCommentTable.id, commentId),
        eq(socialPostCommentTable.userId, userId)
      )
    );
  return { ok: true };
}
