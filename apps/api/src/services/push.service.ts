import { Expo, type ExpoPushMessage, type ExpoPushTicket } from "expo-server-sdk";
import { eq } from "drizzle-orm";

import { env } from "../config/env";
import { db } from "../db";
import { userTable } from "../db/schema";

const expo = new Expo({ accessToken: env.expoAccessToken });

let warnedMissingExpoAccessToken = false;

function warnMissingExpoAccessTokenOnce() {
  if (warnedMissingExpoAccessToken) return;
  warnedMissingExpoAccessToken = true;
  if (!env.expoAccessToken?.trim()) {
    const suffix =
      env.nodeEnv === "production"
        ? " Production sends may be rejected; set EXPO_ACCESS_TOKEN (see DEPLOY.md)."
        : " Set EXPO_ACCESS_TOKEN for reliable delivery in development.";
    console.warn(`[Push Service] EXPO_ACCESS_TOKEN is empty.${suffix}`);
  }
}

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

async function applyPushTickets(userId: number, tickets: ExpoPushTicket[]) {
  for (const ticket of tickets) {
    if (ticket.status === "ok") {
      console.log(`[Push Service] Expo accepted push for user ${userId} (receipt ${ticket.id})`);
      continue;
    }

    const code = ticket.details?.error;
    console.error(
      `[Push Service] Expo push ticket error for user ${userId}: ${ticket.message}`,
      code ? { error: code } : ticket.details,
    );

    if (code === "DeviceNotRegistered") {
      await db
        .update(userTable)
        .set({ expoPushToken: null, updatedAt: new Date() })
        .where(eq(userTable.id, userId));
      console.warn(`[Push Service] Cleared expo push token for user ${userId} (device not registered)`);
    }
  }
}

export async function sendPushNotification(userId: number, title: string, body: string, data?: Record<string, any>) {
  try {
    warnMissingExpoAccessTokenOnce();

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
      }).catch((err) => console.error("[Push Service] Webhook failed:", err));
    }

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

    const channelId = getChannelId(data?.type);
    const message: ExpoPushMessage = {
      to: token,
      title,
      body,
      data,
      sound: "default",
      channelId,
      priority: "high",
    };

    const tickets = await expo.sendPushNotificationsAsync([message]);
    await applyPushTickets(userId, tickets);
  } catch (err) {
    console.error(`[Push Service] Failed to send push to user ${userId}:`, err);
  }
}
