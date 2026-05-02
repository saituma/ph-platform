import type { Request, Response } from "express";
import { z } from "zod";
import { and, desc, eq, ne } from "drizzle-orm";
import { Expo } from "expo-server-sdk";
import { logger } from "../lib/logger";

import { db } from "../db";
import { notificationTable, userDeviceTokensTable, userTable } from "../db/schema";
import { sendPushNotification } from "../services/push.service";
import { parsePagination } from "../lib/pagination";

export async function listNotifications(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { limit, offset } = parsePagination(req, { defaultLimit: 50, maxLimit: 200 });
  const items = await db
    .select()
    .from(notificationTable)
    .where(eq(notificationTable.userId, req.user.id))
    .orderBy(desc(notificationTable.createdAt))
    .limit(limit)
    .offset(offset);
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
  // Backwards-compatible: mobile previously sent `{ token: <expoPushToken> }`.
  token: z.string().min(1).optional(),
  expoPushToken: z.string().min(1).optional(),
  devicePushToken: z.string().min(1).optional(),
  devicePushTokenType: z.enum(["fcm", "apns", "unknown"]).optional(),
  // Device identifier for multi-device support. If provided, tokens are stored
  // per-device so all a user's devices receive push notifications.
  deviceId: z.string().min(1).max(255).optional(),
});

export async function savePushToken(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const parsed = pushTokenSchema.parse(req.body);

  const expoPushToken = parsed.expoPushToken ?? parsed.token ?? undefined;
  const devicePushToken = parsed.devicePushToken ?? undefined;
  const devicePushTokenType = parsed.devicePushTokenType ?? undefined;
  const deviceId = parsed.deviceId ?? undefined;

  if (!expoPushToken && !devicePushToken) {
    return res.status(400).json({ error: "Missing push token" });
  }

  if (expoPushToken && !Expo.isExpoPushToken(expoPushToken)) {
    return res.status(400).json({ error: "Invalid Expo push token" });
  }

  logger.info(
    { userId: req.user.id, deviceId: deviceId ?? "none", expoToken: expoPushToken ? expoPushToken.slice(0, 10) + "…" : "none", deviceToken: devicePushToken ? devicePushToken.slice(0, 10) + "…" : "none" },
    "[PushToken] Saving push token(s)",
  );

  // Evict this device's tokens from any other user so a logout→login switch stops
  // delivering old-user notifications to this device.
  if (devicePushToken) {
    await db
      .update(userTable)
      .set({ devicePushToken: null, devicePushTokenType: null, updatedAt: new Date() })
      .where(and(eq(userTable.devicePushToken, devicePushToken), ne(userTable.id, req.user.id)));
    await db
      .delete(userDeviceTokensTable)
      .where(
        and(eq(userDeviceTokensTable.devicePushToken, devicePushToken), ne(userDeviceTokensTable.userId, req.user.id)),
      );
  }
  if (deviceId) {
    await db
      .delete(userDeviceTokensTable)
      .where(and(eq(userDeviceTokensTable.deviceId, deviceId), ne(userDeviceTokensTable.userId, req.user.id)));
  }

  // Always update the legacy single-token column for backwards compatibility.
  await db
    .update(userTable)
    .set({
      ...(expoPushToken ? { expoPushToken } : {}),
      ...(devicePushToken ? { devicePushToken, devicePushTokenType: devicePushTokenType ?? "unknown" } : {}),
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, req.user.id));

  // When a deviceId is provided, also upsert into the per-device table so all
  // registered devices receive push notifications for this user.
  if (deviceId) {
    await db
      .insert(userDeviceTokensTable)
      .values({
        userId: req.user.id,
        deviceId,
        ...(expoPushToken ? { expoPushToken } : {}),
        ...(devicePushToken ? { devicePushToken, devicePushTokenType: devicePushTokenType ?? "unknown" } : {}),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userDeviceTokensTable.userId, userDeviceTokensTable.deviceId],
        set: {
          ...(expoPushToken ? { expoPushToken } : {}),
          ...(devicePushToken ? { devicePushToken, devicePushTokenType: devicePushTokenType ?? "unknown" } : {}),
          updatedAt: new Date(),
        },
      });
    logger.info({ userId: req.user.id, deviceId }, "[PushToken] Device token upserted");
  }

  return res.status(200).json({ success: true });
}

const clearPushTokenSchema = z.object({
  deviceId: z.string().min(1).max(255).optional(),
  devicePushToken: z.string().min(1).optional(),
});

export async function clearPushToken(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { deviceId, devicePushToken } = clearPushTokenSchema.parse(req.body ?? {});

  // Clear legacy single-token columns.
  await db
    .update(userTable)
    .set({ expoPushToken: null, devicePushToken: null, devicePushTokenType: null, updatedAt: new Date() })
    .where(eq(userTable.id, req.user.id));

  // Remove from per-device table — scope to a specific device if identifiers are provided.
  if (deviceId) {
    await db
      .delete(userDeviceTokensTable)
      .where(and(eq(userDeviceTokensTable.userId, req.user.id), eq(userDeviceTokensTable.deviceId, deviceId)));
  } else if (devicePushToken) {
    await db
      .delete(userDeviceTokensTable)
      .where(
        and(eq(userDeviceTokensTable.userId, req.user.id), eq(userDeviceTokensTable.devicePushToken, devicePushToken)),
      );
  } else {
    await db.delete(userDeviceTokensTable).where(eq(userDeviceTokensTable.userId, req.user.id));
  }

  logger.info({ userId: req.user.id, deviceId: deviceId ?? "none" }, "[PushToken] Cleared push tokens");
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
    { type: "system", test: true, url: "/notifications" },
  );

  return res.status(200).json({ success: true, message: "Test notification sent" });
}
