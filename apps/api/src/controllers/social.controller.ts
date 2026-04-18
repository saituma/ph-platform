import type { Request, Response } from "express";
import { z } from "zod";

import {
  SocialAccessError,
  assertAdultAthlete,
  createRunComment,
  editComment,
  clearCommentReaction,
  deleteComment,
  getLeaderboard,
  listCommentReactions,
  listAdults,
  listPublicRuns,
  listRunComments,
  reportComment,
  setCommentReaction,
} from "../services/social.service";

function handleSocialError(res: Response, err: unknown) {
  if (err instanceof SocialAccessError) {
    if (err.code === "NOT_ADULT") return res.status(403).json({ error: "Forbidden" });
    if (err.code === "FORBIDDEN") return res.status(403).json({ error: "Forbidden" });
    if (err.code === "NOT_FOUND") return res.status(404).json({ error: "Not found" });
  }
  return res.status(500).json({ error: "Internal error" });
}

export async function leaderboard(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  try {
    await assertAdultAthlete(req.user.id);
    const windowDays = req.query.windowDays ? Number(req.query.windowDays) : 7;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const sort = typeof req.query.sort === "string" ? req.query.sort : undefined;
    const items = await getLeaderboard({
      windowDays,
      limit,
      sort:
        sort === "distance_asc" || sort === "duration_desc" || sort === "duration_asc"
          ? sort
          : "distance_desc",
    });
    return res.status(200).json({ items });
  } catch (err) {
    return handleSocialError(res, err);
  }
}

export async function adults(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  try {
    await assertAdultAthlete(req.user.id);
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
    const out = await listAdults({ limit, cursor });
    return res.status(200).json(out);
  } catch (err) {
    return handleSocialError(res, err);
  }
}

export async function runs(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  try {
    await assertAdultAthlete(req.user.id);
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
    // windowDays <= 0 means "All".
    const windowDays = req.query.windowDays ? Number(req.query.windowDays) : 0;
    const sort = typeof req.query.sort === "string" ? req.query.sort : undefined;
    const out = await listPublicRuns({
      limit,
      cursor,
      windowDays,
      sort,
    } as any);
    return res.status(200).json(out);
  } catch (err) {
    return handleSocialError(res, err);
  }
}

export async function commentsList(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  try {
    await assertAdultAthlete(req.user.id);
    const runLogId = Number(req.params.runLogId);
    if (!Number.isFinite(runLogId)) {
      return res.status(400).json({ error: "Invalid runLogId" });
    }
    const items = await listRunComments(req.user.id, Math.floor(runLogId));
    return res.status(200).json({ items });
  } catch (err) {
    return handleSocialError(res, err);
  }
}

const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(500),
  parentId: z.number().int().positive().optional().nullable(),
});

export async function commentsCreate(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  try {
    await assertAdultAthlete(req.user.id);
    const runLogId = Number(req.params.runLogId);
    if (!Number.isFinite(runLogId)) {
      return res.status(400).json({ error: "Invalid runLogId" });
    }
    const parsed = createCommentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }
    const item = await createRunComment({
      userId: req.user.id,
      runLogId: Math.floor(runLogId),
      content: parsed.data.content,
      parentId: parsed.data.parentId ?? null,
    });
    return res.status(200).json({ item });
  } catch (err) {
    return handleSocialError(res, err);
  }
}

export async function commentDelete(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  try {
    await assertAdultAthlete(req.user.id);
    const commentId = Number(req.params.commentId);
    if (!Number.isFinite(commentId)) {
      return res.status(400).json({ error: "Invalid commentId" });
    }
    const out = await deleteComment({ userId: req.user.id, commentId: Math.floor(commentId) });
    return res.status(200).json(out);
  } catch (err) {
    return handleSocialError(res, err);
  }
}

const editSchema = z.object({
  content: z.string().trim().min(1).max(500),
});

export async function commentEdit(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  try {
    await assertAdultAthlete(req.user.id);
    const commentId = Number(req.params.commentId);
    if (!Number.isFinite(commentId)) {
      return res.status(400).json({ error: "Invalid commentId" });
    }
    const parsed = editSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }
    const item = await editComment({
      userId: req.user.id,
      commentId: Math.floor(commentId),
      content: parsed.data.content,
    });
    return res.status(200).json({ item });
  } catch (err) {
    return handleSocialError(res, err);
  }
}

const reportSchema = z.object({
  reason: z.string().trim().max(200).optional(),
});

export async function commentReport(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  try {
    await assertAdultAthlete(req.user.id);
    const commentId = Number(req.params.commentId);
    if (!Number.isFinite(commentId)) {
      return res.status(400).json({ error: "Invalid commentId" });
    }
    const parsed = reportSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }
    const out = await reportComment({
      performedBy: req.user.id,
      commentId: Math.floor(commentId),
      reason: parsed.data.reason,
    });
    return res.status(200).json(out);
  } catch (err) {
    return handleSocialError(res, err);
  }
}

export async function commentReactionsList(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  try {
    await assertAdultAthlete(req.user.id);
    const commentId = Number(req.params.commentId);
    if (!Number.isFinite(commentId)) {
      return res.status(400).json({ error: "Invalid commentId" });
    }
    const items = await listCommentReactions(Math.floor(commentId));
    return res.status(200).json({ items });
  } catch (err) {
    return handleSocialError(res, err);
  }
}

const reactionSchema = z.object({
  emoji: z.string().trim().min(1).max(16),
});

export async function commentReactionSet(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  try {
    await assertAdultAthlete(req.user.id);
    const commentId = Number(req.params.commentId);
    if (!Number.isFinite(commentId)) {
      return res.status(400).json({ error: "Invalid commentId" });
    }
    const parsed = reactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }
    const out = await setCommentReaction({
      userId: req.user.id,
      commentId: Math.floor(commentId),
      emoji: parsed.data.emoji,
    });
    return res.status(200).json(out);
  } catch (err) {
    return handleSocialError(res, err);
  }
}

export async function commentReactionClear(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  try {
    await assertAdultAthlete(req.user.id);
    const commentId = Number(req.params.commentId);
    if (!Number.isFinite(commentId)) {
      return res.status(400).json({ error: "Invalid commentId" });
    }
    const out = await clearCommentReaction({
      userId: req.user.id,
      commentId: Math.floor(commentId),
    });
    return res.status(200).json(out);
  } catch (err) {
    return handleSocialError(res, err);
  }
}
