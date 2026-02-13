import type { Request, Response } from "express";
import { z } from "zod";

import { listThread, markThreadRead, sendMessage, getCoachUser, getLastAdminContact } from "../services/message.service";
import { resolveActingUserId } from "../lib/acting-user";

const sendSchema = z.object({
  content: z.string().min(1),
  contentType: z.enum(["text", "image", "video"]).default("text"),
  mediaUrl: z.string().url().optional(),
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
