import { Platform } from "react-native";
import { getNotifications } from "@/lib/notifications";
import { NOTIFICATION_CHANNELS } from "@/lib/notificationSetup";

export async function requestRunProgressNotificationPermission(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function sendRunProgressNotification(input: { title: string; body: string }) {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  const content: any = {
    title: input.title,
    body: input.body,
    sound: "default",
    data: { type: "run_progress" },
  };
  if (Platform.OS === "android") {
    content.channelId = NOTIFICATION_CHANNELS.system;
  }

  // Immediate local notification (works while app is backgrounded).
  await Notifications.scheduleNotificationAsync({
    content,
    trigger: null,
  });
}

