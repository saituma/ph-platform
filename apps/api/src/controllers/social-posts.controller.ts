import type { Request, Response } from "express";
import { z } from "zod";

import {
  listSocialPosts,
  createSocialPost,
  likeSocialPost,
  unlikeSocialPost,
  listPostComments,
  createPostComment,
  deletePostComment,
} from "../services/social-posts.service";
import { assertTeamMemberSocial } from "../services/social.service";
import { handleSocialError } from "./social.controller";

const createPostSchema = z
  .object({
    content: z.string().trim().max(2000).default(""),
    mediaUrl: z.string().url().optional(),
    mediaType: z.enum(["image", "video"]).optional(),
    visibility: z.enum(["public", "private"]).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.content.trim() && !value.mediaUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Post content or media is required",
        path: ["content"],
      });
    }
  });

export async function teamPostsList(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  try {
    const { teamId } = await assertTeamMemberSocial(req.user.id, req.user.role);
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
    const out = await listSocialPosts({
      limit,
      cursor,
      teamId,
      viewerUserId: req.user.id,
    });
    return res.status(200).json(out);
  } catch (err) {
    return handleSocialError(res, err);
  }
}

export async function teamPostsCreate(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  try {
    await assertTeamMemberSocial(req.user.id, req.user.role);
    const parsed = createPostSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }
    const item = await createSocialPost({
      userId: req.user.id,
      ...parsed.data,
    });
    return res.status(200).json({ item });
  } catch (err) {
    return handleSocialError(res, err);
  }
}

export async function teamPostLikeCreate(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  try {
    await assertTeamMemberSocial(req.user.id, req.user.role);
    const postId = Number(req.params.postId);
    if (!Number.isFinite(postId)) return res.status(400).json({ error: "Invalid postId" });
    const out = await likeSocialPost(req.user.id, postId);
    return res.status(200).json(out);
  } catch (err) {
    return handleSocialError(res, err);
  }
}

export async function teamPostLikeDelete(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  try {
    await assertTeamMemberSocial(req.user.id, req.user.role);
    const postId = Number(req.params.postId);
    if (!Number.isFinite(postId)) return res.status(400).json({ error: "Invalid postId" });
    const out = await unlikeSocialPost(req.user.id, postId);
    return res.status(200).json(out);
  } catch (err) {
    return handleSocialError(res, err);
  }
}

export async function teamPostCommentsList(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  try {
    await assertTeamMemberSocial(req.user.id, req.user.role);
    const postId = Number(req.params.postId);
    if (!Number.isFinite(postId)) return res.status(400).json({ error: "Invalid postId" });
    const out = await listPostComments(postId);
    const items = out.items.map((c) => ({
      ...c,
      isMine: c.userId === req.user?.id,
      canDelete: c.userId === req.user?.id,
    }));
    return res.status(200).json({ items });
  } catch (err) {
    return handleSocialError(res, err);
  }
}

export async function teamPostCommentsCreate(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  try {
    await assertTeamMemberSocial(req.user.id, req.user.role);
    const postId = Number(req.params.postId);
    if (!Number.isFinite(postId)) return res.status(400).json({ error: "Invalid postId" });
    const { content, parentId } = req.body;
    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "Content is required" });
    }
    const item = await createPostComment({
      userId: req.user.id,
      postId,
      content,
      parentId: parentId ? Number(parentId) : null,
    });
    return res.status(200).json({ item });
  } catch (err) {
    return handleSocialError(res, err);
  }
}

export async function teamPostCommentDelete(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  try {
    await assertTeamMemberSocial(req.user.id, req.user.role);
    const commentId = Number(req.params.commentId);
    if (!Number.isFinite(commentId)) return res.status(400).json({ error: "Invalid commentId" });
    const out = await deletePostComment(req.user.id, commentId);
    return res.status(200).json(out);
  } catch (err) {
    return handleSocialError(res, err);
  }
}
