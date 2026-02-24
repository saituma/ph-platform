import { Expo } from "expo-server-sdk";
import { env } from "../config/env";
import { db } from "../db";
import { userTable } from "../db/schema";
import { eq } from "drizzle-orm";

const expo = new Expo({ accessToken: env.expoAccessToken });

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
    if (token && Expo.isExpoPushToken(token)) {
      await expo.sendPushNotificationsAsync([{
        to: token,
        title,
        body,
        data,
        sound: "default",
      }]);
      console.log(`[Push Service] Notification sent to user ${userId}`);
    }
  } catch (err) {
    console.error(`[Push Service] Failed to send push to user ${userId}:`, err);
  }
}
