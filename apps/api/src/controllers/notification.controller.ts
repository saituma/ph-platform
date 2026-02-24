import type { Request, Response } from "express";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";

import { db } from "../db";
import { notificationTable, userTable } from "../db/schema";

export async function listNotifications(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const items = await db
    .select()
    .from(notificationTable)
    .where(eq(notificationTable.userId, req.user.id))
    .orderBy(desc(notificationTable.createdAt));
  return res.status(200).json({ items });
}

const markReadSchema = z.object({
  notificationId: z.number().int().positive(),
});

export async function markNotificationRead(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const input = markReadSchema.parse(req.body);
  const updated = await db
    .update(notificationTable)
    .set({ read: true })
    .where(eq(notificationTable.id, input.notificationId))
    .returning();
  if (!updated[0]) {
    return res.status(404).json({ error: "Notification not found" });
  }
  return res.status(200).json({ item: updated[0] });
}

const pushTokenSchema = z.object({
  token: z.string().min(1),
});

export async function savePushToken(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { token } = pushTokenSchema.parse(req.body);
  await db
    .update(userTable)
    .set({ expoPushToken: token, updatedAt: new Date() })
    .where(eq(userTable.id, req.user.id));
  return res.status(200).json({ success: true });
}
