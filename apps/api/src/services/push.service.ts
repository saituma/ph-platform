import { appendFile } from "node:fs/promises";

import { Expo, type ExpoPushMessage, type ExpoPushTicket } from "expo-server-sdk";
import { eq } from "drizzle-orm";

import { env } from "../config/env";
import { db } from "../db";
import { userTable } from "../db/schema";

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
    console.warn(`[Push Service] EXPO_ACCESS_TOKEN is empty or missing.${suffix}`);
  }
}

function getChannelId(type?: string) {
  const value = String(type ?? "").toLowerCase();
  if (/(message|chat|group-message)/.test(value)) return "messages";
  if (/(schedule|booking|calendar)/.test(value)) return "schedule";
  if (/(payment|billing|plan)/.test(value)) return "payment";
  if (/(account|security|profile)/.test(value)) return "account";
  if (/(progress|video|birthday|program)/.test(value)) return "progress";
  if (/(system|alert|warning|announcement)/.test(value)) return "system";
  return "default";
}

const DEBUG_PUSH_LOG = "/home/dave/expo/PH-App/.cursor/debug-7dd67a.log";

function logDebugPush(payload: Record<string, unknown>) {
  const line =
    JSON.stringify({
      sessionId: "7dd67a",
      timestamp: Date.now(),
      ...payload,
    }) + "\n";
  // Deployed APIs (e.g. Render) cannot write the dev machine log path or reach localhost ingest.
  // Grep Render/host logs for `PH_PUSH_DEBUG` to analyze push delivery.
  console.info(`[PH_PUSH_DEBUG] ${line.trimEnd()}`);
  void appendFile(DEBUG_PUSH_LOG, line).catch(() => {});
  void fetch("http://127.0.0.1:7392/ingest/3e8b9f8d-6d0f-4ca7-943c-7327a18df494", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "7dd67a",
    },
    body: line.trimEnd(),
  }).catch(() => {});
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
      console.log(`[Push Service] Expo accepted push for user ${userId} (receipt ${ticket.id})`);
      // #region agent log
      logDebugPush({
        hypothesisId: "A",
        location: "push.service.ts:applyPushTickets",
        message: "expo_ticket_ok",
        data: { userId, receiptId: ticket.id },
      });
      // #endregion
      continue;
    }

    const code = ticket.details?.error;
    console.error(
      `[Push Service] Expo push ticket error for user ${userId}: ${ticket.message}`,
      code ? { error: code } : ticket.details,
    );
    // #region agent log
    logDebugPush({
      hypothesisId: "A",
      location: "push.service.ts:applyPushTickets",
      message: "expo_ticket_error",
      data: {
        userId,
        ticketMessage: ticket.message,
        errorCode: code ?? null,
        details: ticket.details ?? null,
      },
    });
    // #endregion

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

    // #region agent log
    const dataType = data?.type != null ? String(data.type) : "";
    const nonStringDataKeys =
      data &&
      Object.entries(data)
        .filter(([, v]) => v != null && typeof v !== "string" && typeof v !== "boolean")
        .map(([k]) => k);
    // #endregion

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
      // #region agent log
      logDebugPush({
        hypothesisId: "B",
        location: "push.service.ts:sendPushNotification",
        message: "no_expo_token_for_user",
        data: { userId, dataType, titleLen: title.length, bodyLen: body.length },
      });
      // #endregion
      return;
    }

    if (!Expo.isExpoPushToken(token)) {
      console.warn(`[Push Service] Invalid Expo push token for user ${userId}`);
      // #region agent log
      logDebugPush({
        hypothesisId: "C",
        location: "push.service.ts:sendPushNotification",
        message: "invalid_expo_token",
        data: { userId, dataType },
      });
      // #endregion
      await db
        .update(userTable)
        .set({ expoPushToken: null, updatedAt: new Date() })
        .where(eq(userTable.id, userId));
      return;
    }

    const channelId = getChannelId(data?.type);
    const dataForDevice = stringifyPushData(data);
    // #region agent log
    logDebugPush({
      hypothesisId: "D",
      location: "push.service.ts:sendPushNotification",
      message: "push_send_attempt",
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
    // #endregion
    const message: ExpoPushMessage = {
      to: token,
      title,
      body,
      data: dataForDevice,
      sound: "default",
      channelId,
      priority: "high",
    };

    const tickets = await expo.sendPushNotificationsAsync([message]);
    await applyPushTickets(userId, tickets);
  } catch (err) {
    console.error(`[Push Service] Failed to send push to user ${userId}:`, err);
    // #region agent log
    logDebugPush({
      hypothesisId: "A",
      location: "push.service.ts:sendPushNotification",
      message: "sendPushNotificationsAsync_threw",
      data: {
        userId,
        err: err instanceof Error ? err.message : String(err),
      },
    });
    // #endregion
  }
}
