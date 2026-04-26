import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getNotifications } from "@/lib/notifications";
import { NOTIFICATION_CHANNELS } from "@/lib/notificationSetup";

export type MealSlot = "breakfast" | "lunch" | "dinner";

export type MealReminderPrefs = {
  enabled: boolean;
  hour: number;
  minute: number;
};

const DEFAULTS: Record<MealSlot, MealReminderPrefs> = {
  breakfast: { enabled: false, hour: 8, minute: 0 },
  lunch: { enabled: false, hour: 12, minute: 30 },
  dinner: { enabled: false, hour: 18, minute: 30 },
};

const NOTIF_IDS: Record<MealSlot, string> = {
  breakfast: "ph-nutrition-breakfast",
  lunch: "ph-nutrition-lunch",
  dinner: "ph-nutrition-dinner",
};

const MEAL_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

function storageKey(slot: MealSlot) {
  return `@ph/nutritionMeal_${slot}`;
}

export async function getMealReminderPrefs(slot: MealSlot): Promise<MealReminderPrefs> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(slot));
    if (!raw) return { ...DEFAULTS[slot] };
    return JSON.parse(raw) as MealReminderPrefs;
  } catch {
    return { ...DEFAULTS[slot] };
  }
}

export async function setMealReminderPrefs(slot: MealSlot, prefs: MealReminderPrefs): Promise<void> {
  await AsyncStorage.setItem(storageKey(slot), JSON.stringify(prefs));
}

export async function getAllMealReminderPrefs(): Promise<Record<MealSlot, MealReminderPrefs>> {
  const [breakfast, lunch, dinner] = await Promise.all([
    getMealReminderPrefs("breakfast"),
    getMealReminderPrefs("lunch"),
    getMealReminderPrefs("dinner"),
  ]);
  return { breakfast, lunch, dinner };
}

export async function cancelMealReminder(slot: MealSlot): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_IDS[slot]);
  } catch {
    // noop — notification may not be scheduled
  }
}

export async function scheduleMealReminder(slot: MealSlot, prefs: MealReminderPrefs): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  await cancelMealReminder(slot);
  if (!prefs.enabled) return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    if (req.status !== "granted") return;
  }

  const { SchedulableTriggerInputTypes } = Notifications as any;

  const content: any = {
    title: `${MEAL_LABELS[slot]} reminder`,
    body: `Time to log your ${MEAL_LABELS[slot].toLowerCase()}.`,
    sound: "default",
    data: { type: "nutrition_meal_reminder", slot, url: "/nutrition" },
  };
  if (Platform.OS === "android") {
    content.channelId = NOTIFICATION_CHANNELS.nutrition;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIF_IDS[slot],
    content,
    trigger: {
      type: SchedulableTriggerInputTypes?.DAILY ?? "daily",
      hour: prefs.hour,
      minute: prefs.minute,
    },
  });
}

export async function syncAllMealReminders(): Promise<void> {
  const all = await getAllMealReminderPrefs();
  await Promise.all(
    (["breakfast", "lunch", "dinner"] as MealSlot[]).map((slot) =>
      scheduleMealReminder(slot, all[slot]),
    ),
  );
}

export async function requestMealNotificationPermission(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}
