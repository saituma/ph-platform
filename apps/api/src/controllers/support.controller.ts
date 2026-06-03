import type { Request, Response } from "express";
import { z } from "zod";
import { desc, eq, like } from "drizzle-orm";

import { db } from "../db";
import { conversationMessageTable, userTable } from "../db/schema";
import { getCoachUser } from "../services/message.service";
import { sendDirectMessage } from "../services/conversation.service";

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

  await sendDirectMessage({
    senderId: req.user!.id,
    receiverId: coach.id,
    content,
    contentType: "text",
    bypassMessagingTierForCoach: true,
  });

  return res.status(201).json({ ok: true });
}

export async function listAppFeedbackAdmin(_req: Request, res: Response) {
  const rows = await db
    .select({
      id: conversationMessageTable.id,
      senderId: conversationMessageTable.senderId,
      content: conversationMessageTable.content,
      createdAt: conversationMessageTable.createdAt,
      senderName: userTable.name,
      senderEmail: userTable.email,
    })
    .from(conversationMessageTable)
    .innerJoin(userTable, eq(userTable.id, conversationMessageTable.senderId))
    .where(like(conversationMessageTable.content, "[App feedback%"))
    .orderBy(desc(conversationMessageTable.createdAt))
    .limit(500);

  const items = rows.map((row) => {
    const match = /^\[App feedback — ([^\]]+)\]\s*\n+([\s\S]*)$/.exec(row.content);
    return {
      id: row.id,
      senderId: row.senderId,
      senderName: row.senderName,
      senderEmail: row.senderEmail,
      category: match?.[1] ?? "Unknown",
      message: match?.[2]?.trim() ?? row.content,
      createdAt: row.createdAt,
    };
  });
  return res.status(200).json({ items });
}
