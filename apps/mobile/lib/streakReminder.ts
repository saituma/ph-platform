import { Platform } from "react-native";
import { getNotifications } from "@/lib/notifications";
import { NOTIFICATION_CHANNELS } from "@/lib/notificationSetup";

const NOTIF_ID = "ph-streak-daily";

export async function scheduleStreakReminder(currentStreak: number): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;

  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID);
  } catch {
    // noop
  }

  if (currentStreak === 0) return;

  const body =
    currentStreak >= 30
      ? `Your ${currentStreak}-day streak is legendary. Don't let it slip today.`
      : currentStreak >= 7
        ? `${currentStreak} days strong — keep the fire alive!`
        : `Keep your ${currentStreak}-day streak going. One activity is all it takes.`;

  const content: Record<string, unknown> = {
    title: "Don't break your streak",
    body,
    sound: "default",
    data: { type: "streak_reminder", screen: "home", url: "/" },
  };

  if (Platform.OS === "android") {
    content.channelId = NOTIFICATION_CHANNELS.progress ?? "progress";
  }

  const { SchedulableTriggerInputTypes } = Notifications;

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIF_ID,
    content,
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour: 19,
      minute: 0,
    },
  });
}

export async function cancelStreakReminder(): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID);
  } catch {
    // noop
  }
}
