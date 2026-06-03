import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { CHAT_ACTION_MARK_READ_ID, CHAT_ACTION_REPLY_ID } from "@/lib/localNotifications";

export const BACKGROUND_NOTIFICATION_TASK = "ph-chat-reply-background";

// Mirrors SESSION_KEYS in lib/auth/session.ts. Inlined so this task stays free of
// the Redux store that session.ts imports — it runs in a headless JS context with
// no app state when the notification action is tapped while the app is killed.
const TOKEN_KEY = "authToken";
const REFRESH_KEY = "authRefreshToken";

function isValid(value: string | null): value is string {
  return typeof value === "string" && value.trim().length > 0 && value !== "null" && value !== "undefined";
}

async function refreshToken(): Promise<string | null> {
  const stored = await SecureStore.getItemAsync(REFRESH_KEY);
  if (!isValid(stored)) return null;
  const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: stored.trim() }),
  });
  if (!res.ok) return null;
  const payload = await res.json().catch(() => null);
  const next =
    typeof payload?.idToken === "string"
      ? payload.idToken
      : typeof payload?.accessToken === "string"
        ? payload.accessToken
        : null;
  if (next) await SecureStore.setItemAsync(TOKEN_KEY, next);
  return next;
}

async function post(path: string, body: Record<string, unknown>): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!isValid(stored)) return false;
  const url = `${getApiBaseUrl()}${path}`;
  const send = (t: string) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify(body),
    });
  let res = await send(stored.trim());
  if (res.status === 401) {
    const next = await refreshToken();
    if (!next) return false;
    res = await send(next);
  }
  return res.ok;
}

// Reply/read routing mirrors usePushNotificationResponses.ts: a `group:<id>` thread
// hits the group endpoints, anything else is a 1:1 DM keyed by the peer user id.
function reply(threadId: string, content: string): Promise<boolean> {
  if (threadId.startsWith("group:")) {
    const id = Number(threadId.slice("group:".length));
    if (!Number.isFinite(id) || id <= 0) return Promise.resolve(false);
    return post(`/chat/groups/${id}/messages`, { content });
  }
  const receiverId = Number(threadId);
  if (!Number.isFinite(receiverId) || receiverId <= 0) return Promise.resolve(false);
  return post("/messages", { content, receiverId });
}

function markRead(threadId: string): Promise<boolean> {
  if (threadId.startsWith("group:")) {
    const id = Number(threadId.slice("group:".length));
    if (!Number.isFinite(id) || id <= 0) return Promise.resolve(false);
    return post(`/chat/groups/${id}/read`, {});
  }
  const peerUserId = Number(threadId);
  if (!Number.isFinite(peerUserId) || peerUserId <= 0) return Promise.resolve(false);
  return post("/messages/read", { peerUserId });
}

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
  if (error || !data) return;
  const payload = data as {
    actionIdentifier?: string;
    userText?: string;
    notification?: { request?: { content?: { data?: { threadId?: string } } } };
  };

  const actionId = String(payload.actionIdentifier ?? "");
  if (actionId !== CHAT_ACTION_REPLY_ID && actionId !== CHAT_ACTION_MARK_READ_ID) return;

  const threadId = payload.notification?.request?.content?.data?.threadId;
  if (typeof threadId !== "string" || !threadId) return;

  if (actionId === CHAT_ACTION_REPLY_ID) {
    const text = String(payload.userText ?? "").trim();
    if (!text) return;
    await reply(threadId, text);
    await markRead(threadId);
    return;
  }

  await markRead(threadId);
});

export async function registerBackgroundNotificationTask(): Promise<void> {
  if (Platform.OS === "web") return;
  if (typeof Notifications.registerTaskAsync !== "function") return;
  try {
    await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
  } catch {
    // Best-effort: if registration fails, the foreground response listener still
    // handles replies while the app is alive, and getLastNotificationResponseAsync
    // catches them on next launch.
  }
}
