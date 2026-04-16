import { Platform } from "react-native";
import { SchedulableTriggerInputTypes } from "expo-notifications";
import { getNotifications } from "@/lib/notifications";
import {
  getProgressReminderPrefs,
  type ProgressReminderPrefs,
} from "@/lib/progressPreferences";
import { NOTIFICATION_CHANNELS } from "@/lib/notificationSetup";

const NOTIF_ID = "ph-progress-daily";

export async function syncProgressWeeklyReminder(prefs?: ProgressReminderPrefs) {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;

  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID);
  } catch {
    /* noop */
  }

  const p = prefs ?? (await getProgressReminderPrefs());
  if (!p.enabled) return;

  const content: any = {
    title: "Progress check-in",
    body: "Log a lift, your weight, or a measurement — consistency wins.",
    sound: "default",
    data: {
      type: "progress_reminder",
      screen: "progress",
      url: "/progress",
    },
  };
  if (Platform.OS === "android") {
    content.channelId = NOTIFICATION_CHANNELS.progress;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIF_ID,
    content,
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour: p.hour,
      minute: p.minute,
    },
  });
}

export async function requestProgressNotificationPermission(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}
