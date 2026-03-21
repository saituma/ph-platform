import type { Request, Response } from "express";
import { z } from "zod";

import { getCoachUser, sendMessage } from "../services/message.service";

const feedbackSchema = z.object({
  category: z.string().trim().min(1).max(80),
  message: z.string().trim().min(1).max(8000),
});

export async function submitAppFeedback(req: Request, res: Response) {
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }

  const coach = await getCoachUser();
  if (!coach) {
    return res.status(503).json({ error: "Support is temporarily unavailable." });
  }

  const content = `[App feedback — ${parsed.data.category}]\n\n${parsed.data.message}`;

  await sendMessage({
    senderId: req.user!.id,
    receiverId: coach.id,
    content,
    contentType: "text",
    bypassMessagingTierForCoach: true,
  });

  return res.status(201).json({ ok: true });
}
