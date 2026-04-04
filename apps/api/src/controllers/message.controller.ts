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

const sendSchema = z
  .object({
    content: z.string().trim().optional().default(""),
    contentType: z.enum(["text", "image", "video"]).default("text"),
    mediaUrl: z.string().url().optional(),
    videoUploadId: z.number().int().min(1).optional(),
    replyToMessageId: z.number().int().min(1).optional(),
    replyPreview: z.string().trim().max(160).optional(),
    clientId: z.string().trim().min(1).optional(),
    receiverId: z.number().int().optional(),
  })
  .refine((value) => Boolean(value.content) || Boolean(value.mediaUrl), {
    message: "Message content or mediaUrl is required",
  });

const reactionSchema = z.object({
  emoji: z.string().min(1).max(16),
});

export async function listMessages(req: Request, res: Response) {
  const userId = req.user!.id;
  const messages = await listThread(userId);
  const lastCoach = await getLastAdminContact(userId);
  const coach = lastCoach ?? (await getCoachUser());
  
  const { isUserPremium } = await import("../services/message.service");
  const premium = await isUserPremium(userId);

  const coaches = [];
  if (coach) coaches.push(coach);
  
  if (premium) {
    const { ensureAiCoachUser } = await import("../services/ai.service");
    const aiCoachId = await ensureAiCoachUser();
    // Only add AI coach if it's not already the same as the regular coach
    if (!coach || coach.id !== aiCoachId) {
      coaches.push({
        id: aiCoachId,
        name: "AI Coach",
        role: "AI Assistant",
        profilePicture: null,
        isAi: true
      });
    }
  }

  return res.status(200).json({ messages, coaches, coach: coaches[0] ?? null });
}

export async function sendMessageToCoach(req: Request, res: Response) {
  const input = sendSchema.parse(req.body);
  const userId = req.user!.id;
  
  let receiverId = input.receiverId;
  if (!receiverId) {
    const lastCoach = await getLastAdminContact(userId);
    const coach = lastCoach ?? (await getCoachUser());
    if (!coach) {
      return res.status(400).json({ error: "Coach not available" });
    }
    receiverId = coach.id;
  }

  try {
    const message = await sendMessage({
      senderId: userId,
      receiverId: receiverId,
      content: input.content,
      contentType: input.contentType,
      mediaUrl: input.mediaUrl,
      videoUploadId: input.videoUploadId,
      replyToMessageId: input.replyToMessageId,
      replyPreview: input.replyPreview,
      clientId: input.clientId,
    });
    return res.status(201).json({ message });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "MESSAGING_DISABLED_FOR_TIER") {
      return res.status(403).json({ error: "Messaging is not enabled for your plan." });
    }
    if (msg === "AI_COACH_REQUIRES_PREMIUM") {
      return res.status(403).json({ error: "AI coach chat requires PHP Premium." });
    }
    throw err;
  }
}

export async function markRead(req: Request, res: Response) {
  const userId = req.user!.id;
  const count = await markThreadRead(userId);
  return res.status(200).json({ updated: count });
}

export async function toggleReaction(req: Request, res: Response) {
  const messageId = z.coerce.number().int().min(1).parse(req.params.messageId);
  const { emoji } = reactionSchema.parse(req.body);
  const actingUserId = req.user!.id;
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
  const actingUserId = req.user!.id;
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
