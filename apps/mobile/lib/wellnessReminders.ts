import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getNotifications } from "@/lib/notifications";
import { NOTIFICATION_CHANNELS } from "@/lib/notificationSetup";

/**
 * Local (on-device) daily reminders for wellbeing & sleep check-ins, mirroring the
 * meal-reminder pattern (expo-notifications DAILY trigger). Fires even when the app
 * is closed; no server/push dependency. The server-side "you haven't logged" sweep
 * (with guardian fan-out) is a separate, heavier follow-up.
 */
export type WellnessReminderKind = "wellbeing" | "sleep";

export type WellnessReminderPrefs = {
  enabled: boolean;
  hour: number;
  minute: number;
};

const DEFAULTS: Record<WellnessReminderKind, WellnessReminderPrefs> = {
  wellbeing: { enabled: false, hour: 20, minute: 0 },
  sleep: { enabled: false, hour: 22, minute: 0 },
};

const NOTIF_IDS: Record<WellnessReminderKind, string> = {
  wellbeing: "ph-wellbeing-daily",
  sleep: "ph-sleep-daily",
};

const COPY: Record<WellnessReminderKind, { title: string; body: string; url: string }> = {
  wellbeing: { title: "Wellbeing check-in", body: "How are you feeling today? Log your mood, energy, and pain.", url: "/wellbeing" },
  sleep: { title: "Sleep check-in", body: "Log last night's sleep to keep your trends accurate.", url: "/sleep" },
};

function storageKey(kind: WellnessReminderKind) {
  return `@ph/wellnessReminder_${kind}`;
}

export async function getWellnessReminderPrefs(kind: WellnessReminderKind): Promise<WellnessReminderPrefs> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(kind));
    if (!raw) return { ...DEFAULTS[kind] };
    return JSON.parse(raw) as WellnessReminderPrefs;
  } catch {
    return { ...DEFAULTS[kind] };
  }
}

export async function setWellnessReminderPrefs(kind: WellnessReminderKind, prefs: WellnessReminderPrefs): Promise<void> {
  await AsyncStorage.setItem(storageKey(kind), JSON.stringify(prefs));
}

export async function cancelWellnessReminder(kind: WellnessReminderKind): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_IDS[kind]);
  } catch {
    // noop — may not be scheduled
  }
}

/** Persist prefs and (re)schedule or cancel the device notification. Returns false if permission denied. */
export async function applyWellnessReminder(kind: WellnessReminderKind, prefs: WellnessReminderPrefs): Promise<boolean> {
  await setWellnessReminderPrefs(kind, prefs);

  const Notifications = await getNotifications();
  if (!Notifications) return false;

  await cancelWellnessReminder(kind);
  if (!prefs.enabled) return true;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    if (req.status !== "granted") return false;
  }

  const { SchedulableTriggerInputTypes } = Notifications as any;
  const copy = COPY[kind];
  const content: any = {
    title: copy.title,
    body: copy.body,
    sound: "default",
    data: { type: `${kind}_reminder`, url: copy.url },
  };
  if (Platform.OS === "android") {
    content.channelId = NOTIFICATION_CHANNELS.general;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIF_IDS[kind],
    content,
    trigger: {
      type: SchedulableTriggerInputTypes?.DAILY ?? "daily",
      hour: prefs.hour,
      minute: prefs.minute,
    },
  });
  return true;
}
