import type { Request, Response } from "express";
import { z } from "zod";
import {
  listMessageThreadsAdmin,
  listThreadMessagesAdmin,
  deleteThreadMessagesAdmin,
  markThreadReadAdmin,
  sendMessageAdmin,
} from "../../services/admin/message.service";
import { notifyCoachResponseVideo } from "../../services/video.service";

const adminSearchQuerySchema = z.object({
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export async function listMessageThreads(req: Request, res: Response) {
  const { q, limit } = adminSearchQuerySchema.parse(req.query ?? {});
  const threads = await listMessageThreadsAdmin(req.user!.id, { q, limit });
  return res.status(200).json({ threads });
}

export async function listThreadMessages(req: Request, res: Response) {
  const userId = z.coerce.number().int().min(1).parse(req.params.userId);
  const messages = await listThreadMessagesAdmin(req.user!.id, userId);
  return res.status(200).json({ messages });
}

export async function deleteThreadMessages(req: Request, res: Response) {
  const userId = z.coerce.number().int().min(1).parse(req.params.userId);
  const deleted = await deleteThreadMessagesAdmin(req.user!.id, userId);
  return res.status(200).json({ deleted });
}

export async function markThreadRead(req: Request, res: Response) {
  const userId = z.coerce.number().int().min(1).parse(req.params.userId);
  const updated = await markThreadReadAdmin(req.user!.id, userId);
  return res.status(200).json({ updated });
}

export async function sendAdminMessage(req: Request, res: Response) {
  const userId = z.coerce.number().int().min(1).parse(req.params.userId);
  const body = z
    .object({
      content: z.string().trim().optional().default(""),
      contentType: z.enum(["text", "image", "video"]).default("text"),
      mediaUrl: z.string().url().optional(),
      videoUploadId: z.number().int().min(1).optional(),
      replyToMessageId: z.number().int().min(1).optional(),
      replyPreview: z.string().trim().max(160).optional(),
    })
    .refine((value) => Boolean(value.content) || Boolean(value.mediaUrl), {
      message: "Message content or mediaUrl is required",
    })
    .parse(req.body);
  const message = await sendMessageAdmin({
    coachId: req.user!.id,
    userId,
    content: body.content,
    contentType: body.contentType,
    mediaUrl: body.mediaUrl,
    videoUploadId: body.videoUploadId,
    replyToMessageId: body.replyToMessageId,
    replyPreview: body.replyPreview,
  });
  if (body.contentType === "video" && body.videoUploadId) {
    void notifyCoachResponseVideo({ videoUploadId: body.videoUploadId });
  }
  return res.status(201).json({ message });
}
