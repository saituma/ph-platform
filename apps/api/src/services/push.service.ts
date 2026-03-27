import { Expo } from "expo-server-sdk";
import { env } from "../config/env";
import { db } from "../db";
import { userTable } from "../db/schema";
import { eq } from "drizzle-orm";

const expo = new Expo({ accessToken: env.expoAccessToken });

function getChannelId(type?: string) {
  const value = String(type ?? "").toLowerCase();
  if (/(message|chat|group-message)/.test(value)) return "messages";
  if (/(schedule|booking|calendar)/.test(value)) return "schedule";
  if (/(payment|billing|plan)/.test(value)) return "payment";
  if (/(account|security|profile)/.test(value)) return "account";
  if (/(progress|video|birthday|program)/.test(value)) return "progress";
  if (/(system|alert|warning)/.test(value)) return "system";
  return "default";
}

export async function sendPushNotification(userId: number, title: string, body: string, data?: Record<string, any>) {
  try {
    // 1. Log to history if needed (optional, we already have notificationTable)
    
    // 2. Send via webhook if configured
    if (env.pushWebhookUrl) {
      await fetch(env.pushWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title,
          body,
          link: data?.url || "/notifications",
        }),
      }).catch(err => console.error("[Push Service] Webhook failed:", err));
    }

    // 3. Send via Expo
    const [user] = await db
      .select({ expoPushToken: userTable.expoPushToken })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);

    const token = user?.expoPushToken;
    if (!token) {
      console.warn(`[Push Service] No Expo push token saved for user ${userId}`);
      return;
    }

    if (!Expo.isExpoPushToken(token)) {
      console.warn(`[Push Service] Invalid Expo push token for user ${userId}`);
      await db
        .update(userTable)
        .set({ expoPushToken: null, updatedAt: new Date() })
        .where(eq(userTable.id, userId));
      return;
    }

    if (token && Expo.isExpoPushToken(token)) {
      await expo.sendPushNotificationsAsync([{
        to: token,
        title,
        body,
        data,
        sound: "default",
        channelId: getChannelId(data?.type),
      }]);
      console.log(`[Push Service] Notification sent to user ${userId}`);
    }
  } catch (err) {
    console.error(`[Push Service] Failed to send push to user ${userId}:`, err);
  }
}
