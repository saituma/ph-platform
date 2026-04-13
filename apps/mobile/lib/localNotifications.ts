import { Platform } from "react-native";

import { getNotifications } from "@/lib/notifications";

export const CHAT_NOTIFICATION_CATEGORY_ID = "chat-message";
export const CHAT_ACTION_REPLY_ID = "reply";
export const CHAT_ACTION_MARK_READ_ID = "mark-read";

let categoriesConfigured = false;

export async function configureInteractiveNotificationCategories(): Promise<void> {
  if (categoriesConfigured) return;
  const Notifications = await getNotifications();
  if (!Notifications) return;
  if (typeof Notifications.setNotificationCategoryAsync !== "function") return;

  try {
    await Notifications.setNotificationCategoryAsync(CHAT_NOTIFICATION_CATEGORY_ID, [
      {
        identifier: CHAT_ACTION_REPLY_ID,
        buttonTitle: "Reply",
        options: {
          opensAppToForeground: false,
        },
        textInput: {
          submitButtonTitle: "Send",
          placeholder: "Type a reply...",
        },
      },
      {
        identifier: CHAT_ACTION_MARK_READ_ID,
        buttonTitle: "Mark Read",
        options: {
          isDestructive: false,
          opensAppToForeground: false,
        },
      },
    ]);
    categoriesConfigured = true;
  } catch (error) {
    if (__DEV__) {
      console.warn("[Notifications] Failed to configure chat categories", error);
    }
  }
}

export async function scheduleLocalNotification(params: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  categoryId?: string;
  channelId?: string;
}): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        data: params.data ?? {},
        sound: "default",
        categoryIdentifier: params.categoryId,
        ...(Platform.OS === "android" && params.channelId
          ? { channelId: params.channelId }
          : {}),
      },
      trigger: null,
    });
  } catch (error) {
    if (__DEV__) {
      console.warn("[Notifications] Failed to schedule local notification", error);
    }
  }
}

export function isDefaultNotificationAction(actionIdentifier: string): boolean {
  return actionIdentifier === "expo.modules.notifications.actions.DEFAULT";
}
