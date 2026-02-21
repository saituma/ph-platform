import type { Request, Response } from "express";
import { z } from "zod";

import {
  listThread,
  markThreadRead,
  sendMessage,
  getCoachUser,
  getLastAdminContact,
  deleteDirectMessage,
} from "../services/message.service";
import { toggleDirectMessageReaction } from "../services/reaction.service";
import { resolveActingUserId } from "../lib/acting-user";

const sendSchema = z
  .object({
    content: z.string().trim().optional().default(""),
    contentType: z.enum(["text", "image", "video"]).default("text"),
    mediaUrl: z.string().url().optional(),
    videoUploadId: z.number().int().min(1).optional(),
  })
  .refine((value) => Boolean(value.content) || Boolean(value.mediaUrl), {
    message: "Message content or mediaUrl is required",
  });

const reactionSchema = z.object({
  emoji: z.string().min(1).max(16),
});

export async function listMessages(req: Request, res: Response) {
  let actingUserId = req.user!.id;
  try {
    actingUserId = await resolveActingUserId(req.user!.id, req.headers["x-acting-user-id"]);
  } catch {
    return res.status(403).json({ error: "Forbidden" });
  }
  const messages = await listThread(actingUserId);
  const lastCoach = await getLastAdminContact(actingUserId);
  const coach = lastCoach ?? (await getCoachUser());
  return res.status(200).json({ messages, coach });
}

export async function sendMessageToCoach(req: Request, res: Response) {
  const input = sendSchema.parse(req.body);
  let actingUserId = req.user!.id;
  try {
    actingUserId = await resolveActingUserId(req.user!.id, req.headers["x-acting-user-id"]);
  } catch {
    return res.status(403).json({ error: "Forbidden" });
  }
  const lastCoach = await getLastAdminContact(actingUserId);
  const coach = lastCoach ?? (await getCoachUser());
  if (!coach) {
    return res.status(400).json({ error: "Coach not available" });
  }
  const message = await sendMessage({
    senderId: actingUserId,
    receiverId: coach.id,
    content: input.content,
    contentType: input.contentType,
    mediaUrl: input.mediaUrl,
    videoUploadId: input.videoUploadId,
  });
  return res.status(201).json({ message });
}

export async function markRead(req: Request, res: Response) {
  let actingUserId = req.user!.id;
  try {
    actingUserId = await resolveActingUserId(req.user!.id, req.headers["x-acting-user-id"]);
  } catch {
    return res.status(403).json({ error: "Forbidden" });
  }
  const count = await markThreadRead(actingUserId);
  return res.status(200).json({ updated: count });
}

export async function toggleReaction(req: Request, res: Response) {
  const messageId = z.coerce.number().int().min(1).parse(req.params.messageId);
  const { emoji } = reactionSchema.parse(req.body);
  let actingUserId = req.user!.id;
  try {
    actingUserId = await resolveActingUserId(req.user!.id, req.headers["x-acting-user-id"]);
  } catch {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    const result = await toggleDirectMessageReaction({ messageId, userId: actingUserId, emoji });
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    if (message === "Forbidden") {
      return res.status(403).json({ error: message });
    }
    if (message === "Message not found") {
      return res.status(404).json({ error: message });
    }
    throw error;
  }
}

export async function deleteMessage(req: Request, res: Response) {
  const messageId = z.coerce.number().int().min(1).parse(req.params.messageId);
  let actingUserId = req.user!.id;
  try {
    actingUserId = await resolveActingUserId(req.user!.id, req.headers["x-acting-user-id"]);
  } catch {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    const result = await deleteDirectMessage({ messageId, userId: actingUserId });
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    if (message === "Forbidden") {
      return res.status(403).json({ error: message });
    }
    if (message === "Message not found") {
      return res.status(404).json({ error: message });
    }
    throw error;
  }
}
