import type { Request, Response } from "express";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";

import { db } from "../db";
import { notificationTable, userTable } from "../db/schema";
import { sendPushNotification } from "../services/push.service";

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
  console.log(`[PushToken] Attempting to save token for user ${req.user.id}: ${token.slice(0, 10)}...`);
  
  const result = await db
    .update(userTable)
    .set({ expoPushToken: token, updatedAt: new Date() })
    .where(eq(userTable.id, req.user.id))
    .returning();

  console.log(`[PushToken] Update successful for user ${req.user.id}. Rows updated: ${result.length}`);
  
  return res.status(200).json({ success: true });
}

export async function testPushNotification(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  await sendPushNotification(
    req.user.id,
    "Test Notification",
    "If you see this, push notifications are working correctly!",
    { type: "system", test: true }
  );
  
  return res.status(200).json({ success: true, message: "Test notification sent" });
}
