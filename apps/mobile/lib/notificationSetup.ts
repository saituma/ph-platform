import { Platform } from "react-native";
import { getNotifications } from "./notifications";
import { configureInteractiveNotificationCategories } from "./localNotifications";
import type { NotificationCategory } from "./notificationPresentation";

/** Channel IDs must match backend push data.category when used for Android. */
export const NOTIFICATION_CHANNELS: Record<NotificationCategory, string> = {
  message: "messages",
  schedule: "schedule",
  account: "account",
  progress: "progress",
  system: "system",
  general: "default",
};

const CHANNEL_NAMES: Record<string, string> = {
  default: "General",
  messages: "Messages",
  schedule: "Schedule & bookings",
  account: "Account",
  progress: "Progress & programs",
  system: "System",
};

/**
 * Creates Android notification channels so notifications look correct and
 * users can control them in system settings. Call once on app start.
 */
export async function setupNotificationChannels(): Promise<void> {
  await configureInteractiveNotificationCategories();

  const Notifications = await getNotifications();
  if (!Notifications || Platform.OS !== "android") return;

  const { AndroidImportance } = Notifications;
  const importance = AndroidImportance?.HIGH ?? 4;

  for (const [channelId, name] of Object.entries(CHANNEL_NAMES)) {
    try {
      await Notifications.setNotificationChannelAsync(channelId, {
        name,
        importance,
        enableVibrate: true,
        showBadge: true,
        // Avoid vibrationPattern if it causes issues on some devices
      });
    } catch (e) {
      console.warn("[Notifications] Failed to create channel:", channelId, e);
    }
  }
}

