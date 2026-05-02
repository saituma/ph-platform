import { Expo, type ExpoPushMessage, type ExpoPushTicket } from "expo-server-sdk";
import { eq } from "drizzle-orm";

import { env } from "../config/env";
import { db } from "../db";
import { userDeviceTokensTable, userTable } from "../db/schema";
import { isFcmEnabled, isFcmTokenError, sendFcmPush } from "./fcm.service";
import { createLogger } from "../lib/logger";

const log = createLogger({ component: "push-service" });

// Only pass accessToken when it is actually set — passing an empty string
// causes the Expo Push API to reject every request with UNAUTHORIZED since
// push security enforcement (March 2026).
const hasExpoToken = Boolean(env.expoAccessToken?.trim());
const expo = new Expo(hasExpoToken ? { accessToken: env.expoAccessToken } : {});

let warnedMissingExpoAccessToken = false;

function warnMissingExpoAccessTokenOnce() {
  if (warnedMissingExpoAccessToken) return;
  warnedMissingExpoAccessToken = true;
  if (!hasExpoToken) {
    const suffix =
      env.nodeEnv === "production"
        ? " Push delivery depends on whether Expo enhanced push security is enabled. If pushes fail with UNAUTHORIZED, set EXPO_ACCESS_TOKEN (Expo Dashboard → Access Tokens)."
        : " Set EXPO_ACCESS_TOKEN if your Expo project has enhanced push security enabled.";
    log.warn({ detail: suffix }, "EXPO_ACCESS_TOKEN is empty or missing");
  }
}

function getChannelId(type?: string) {
  const value = String(type ?? "").toLowerCase();
  if (/(message|chat|group-message)/.test(value)) return "messages";
  if (/(schedule|booking|calendar)/.test(value)) return "schedule";
  // Mobile should not expose payment-specific surfaces; plan/billing events use
  // the account channel, which the app creates on Android.
  if (/(payment|billing|plan)/.test(value)) return "account";
  if (/(account|security|profile)/.test(value)) return "account";
  if (/(progress|video|birthday|program)/.test(value)) return "progress";
  if (/(system|alert|warning|announcement)/.test(value)) return "system";
  return "default";
}

function getCategoryId(type?: string) {
  const value = String(type ?? "").toLowerCase();
  if (/(message|chat|group-message)/.test(value)) return "chat-message";
  return undefined;
}

/** Structured logs for push delivery debugging; grep host logs for `PH_PUSH_DEBUG`. */
function logDebugPush(payload: Record<string, unknown>) {
  console.info(`[PH_PUSH_DEBUG] ${JSON.stringify({ timestamp: Date.now(), ...payload })}`);
}

/** Expo/FCM expect string values in `data`; non-strings can break Android delivery. */
function stringifyPushData(data?: Record<string, any>): Record<string, string> {
  if (!data) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string") out[k] = v;
    else if (typeof v === "boolean") out[k] = v ? "true" : "false";
    else if (typeof v === "number") out[k] = String(v);
    else out[k] = JSON.stringify(v);
  }
  return out;
}

async function applyPushTickets(userId: number, tickets: ExpoPushTicket[]) {
  for (const ticket of tickets) {
    if (ticket.status === "ok") {
      log.debug({ userId, receiptId: ticket.id }, "Expo accepted push");
      logDebugPush({
        location: "push.service.ts:applyPushTickets",
        message: "expo_ticket_ok",
        data: { userId, receiptId: ticket.id },
      });
      continue;
    }

    const code = ticket.details?.error;
    log.error({ userId, ticketMessage: ticket.message, errorCode: code ?? null }, "Expo push ticket error");
    logDebugPush({
      location: "push.service.ts:applyPushTickets",
      message: "expo_ticket_error",
      data: {
        userId,
        ticketMessage: ticket.message,
        errorCode: code ?? null,
        details: ticket.details ?? null,
      },
    });

    if (code === "DeviceNotRegistered") {
      await db.update(userTable).set({ expoPushToken: null, updatedAt: new Date() }).where(eq(userTable.id, userId));
      log.warn({ userId }, "Cleared expo push token (device not registered)");
    }
  }
}

/** Send to any extra device tokens not already targeted by the primary send. */
async function sendToAdditionalDevices(
  userId: number,
  alreadySentToken: string,
  payload: { title: string; body: string; data: Record<string, string>; channelId: string; categoryId: string | undefined },
) {
  try {
    const deviceRows = await db
      .select({ expoPushToken: userDeviceTokensTable.expoPushToken })
      .from(userDeviceTokensTable)
      .where(eq(userDeviceTokensTable.userId, userId));

    const extraTokens = deviceRows
      .map((r) => r.expoPushToken)
      .filter((t): t is string => !!t && t !== alreadySentToken && Expo.isExpoPushToken(t));

    if (extraTokens.length === 0) return;

    const messages: ExpoPushMessage[] = extraTokens.map((to) => ({
      to,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: "default",
      channelId: payload.channelId,
      categoryId: payload.categoryId,
      priority: "high",
      mutableContent: true,
    }));

    const tickets = await expo.sendPushNotificationsAsync(messages);
    logDebugPush({
      location: "push.service.ts:sendToAdditionalDevices",
      message: "multi_device_push_sent",
      data: { userId, extraDeviceCount: extraTokens.length, ticketCount: tickets.length },
    });
  } catch (err) {
    log.error({ userId, err }, "Multi-device push send failed");
  }
}

export async function sendPushNotification(userId: number, title: string, body: string, data?: Record<string, any>) {
  try {
    warnMissingExpoAccessTokenOnce();

    const dataType = data?.type != null ? String(data.type) : "";
    const nonStringDataKeys =
      data &&
      Object.entries(data)
        .filter(([, v]) => v != null && typeof v !== "string" && typeof v !== "boolean")
        .map(([k]) => k);

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
      }).catch((err) => log.error({ err }, "Push webhook failed"));
    }

    const [user] = await db
      .select({
        expoPushToken: userTable.expoPushToken,
        devicePushToken: userTable.devicePushToken,
        devicePushTokenType: userTable.devicePushTokenType,
      })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);

    const token = user?.expoPushToken ?? null;
    const channelId = getChannelId(data?.type);
    const dataForDevice = stringifyPushData(data);

    const devicePushToken = user?.devicePushToken ?? null;
    const devicePushTokenTypeRaw = (user?.devicePushTokenType ?? "").toLowerCase();
    const devicePushTokenType =
      devicePushTokenTypeRaw === "fcm"
        ? "fcm"
        : devicePushTokenTypeRaw === "apns"
          ? "apns"
          : devicePushTokenTypeRaw
            ? "unknown"
            : null;

    const categoryId = getCategoryId(data?.type);

    if (devicePushToken && devicePushTokenType === "fcm" && isFcmEnabled()) {
      logDebugPush({
        location: "push.service.ts:sendPushNotification",
        message: "push_send_attempt_fcm",
        data: {
          userId,
          dataType,
          channelId,
          nonStringDataKeys,
          titleLen: title.length,
          bodyLen: body.length,
          tokenPrefix: `${devicePushToken.slice(0, 12)}…`,
        },
      });
      try {
        // Include categoryIdentifier in data so expo-notifications on Android
        // can attach Reply / Mark Read action buttons to the notification.
        const fcmData = categoryId
          ? { ...dataForDevice, categoryIdentifier: categoryId }
          : dataForDevice;
        await sendFcmPush({
          token: devicePushToken,
          title,
          body,
          data: fcmData,
          android: { channelId, priority: "high" },
        });
        return;
      } catch (err) {
        log.error({ userId, err }, "FCM send failed");
        logDebugPush({
          location: "push.service.ts:sendPushNotification",
          message: "push_send_fcm_failed",
          data: {
            userId,
            dataType,
            err: err instanceof Error ? err.message : String(err),
          },
        });
        if (isFcmTokenError(err)) {
          await db
            .update(userTable)
            .set({ devicePushToken: null, devicePushTokenType: null, updatedAt: new Date() })
            .where(eq(userTable.id, userId));
          log.warn({ userId }, "Cleared device push token (FCM token invalid)");
        }
        // Fallback to Expo below if available.
      }
    }

    if (!token) {
      log.warn({ userId, devicePushTokenType: devicePushTokenType ?? "none" }, "No push token saved for user");
      logDebugPush({
        location: "push.service.ts:sendPushNotification",
        message: "no_push_token_for_user",
        data: { userId, dataType, titleLen: title.length, bodyLen: body.length },
      });
      return;
    }

    if (!Expo.isExpoPushToken(token)) {
      log.warn({ userId }, "Invalid Expo push token");
      logDebugPush({
        location: "push.service.ts:sendPushNotification",
        message: "invalid_expo_token",
        data: { userId, dataType },
      });
      await db.update(userTable).set({ expoPushToken: null, updatedAt: new Date() }).where(eq(userTable.id, userId));
      return;
    }

    logDebugPush({
      location: "push.service.ts:sendPushNotification",
      message: "push_send_attempt_expo",
      data: {
        userId,
        dataType,
        channelId,
        nonStringDataKeys,
        titleLen: title.length,
        bodyLen: body.length,
        tokenPrefix: `${token.slice(0, 12)}…`,
      },
    });

    const message: ExpoPushMessage = {
      to: token,
      title,
      body,
      data: dataForDevice,
      sound: "default",
      channelId,
      categoryId,
      priority: "high",
      mutableContent: true,
    };

    // Stacking/Grouping support
    const threadId = data?.threadId || data?.groupId;
    if (threadId) {
      // iOS: Stacks notifications by threadIdentifier
      (message as any).threadIdentifier = String(threadId);
    }

    // Media Preview Support (Images/Videos)
    if (data?.mediaUrl && typeof data.mediaUrl === "string") {
      const url = data.mediaUrl.trim();
      if (url.startsWith("http")) {
        // Expo supports basic attachments for rich notifications
        (message as any).attachments = [{ url }];
      }
    }

    const tickets = await expo.sendPushNotificationsAsync([message]);
    await applyPushTickets(userId, tickets);

    // Send to any additional devices registered via the per-device token table.
    await sendToAdditionalDevices(userId, token, { title, body, data: dataForDevice, channelId, categoryId });
  } catch (err) {
    log.error({ userId, err }, "Failed to send push notification");
    logDebugPush({
      location: "push.service.ts:sendPushNotification",
      message: "sendPushNotificationsAsync_threw",
      data: {
        userId,
        err: err instanceof Error ? err.message : String(err),
      },
    });
  }
}
