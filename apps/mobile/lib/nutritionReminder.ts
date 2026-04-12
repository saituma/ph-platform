import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "nutritionReminderNotificationId";

function computeTriggerDate(hour: number, minute: number, options?: { forceTomorrow?: boolean }) {
  const now = new Date();
  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setHours(hour, minute, 0, 0);

  if (options?.forceTomorrow) {
    next.setDate(next.getDate() + 1);
    return next;
  }

  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

export async function cancelNutritionReminderLocal() {
  try {
    const { getNotifications } = await import("@/lib/notifications");
    const Notifications = await getNotifications();
    if (!Notifications) return;

    const existingId = await AsyncStorage.getItem(KEY);
    if (existingId) {
      if (typeof (Notifications as any).cancelScheduledNotificationAsync === "function") {
        await (Notifications as any).cancelScheduledNotificationAsync(existingId);
      }
      await AsyncStorage.removeItem(KEY);
    }
  } catch (err) {
    if (__DEV__) console.warn("[nutritionReminder] cancel failed", err);
  }
}

export async function scheduleNutritionReminderLocal(input: {
  hour: number;
  minute: number;
  forceTomorrow?: boolean;
}) {
  try {
    const { getNotifications } = await import("@/lib/notifications");
    const Notifications = await getNotifications();
    if (!Notifications) return;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      if (req.status !== "granted") return;
    }

    await cancelNutritionReminderLocal();

    const triggerDate = computeTriggerDate(input.hour, input.minute, {
      forceTomorrow: input.forceTomorrow,
    });
    const trigger: any = {
      type: (Notifications as any).SchedulableTriggerInputTypes?.CALENDAR ?? "calendar",
      year: triggerDate.getFullYear(),
      month: triggerDate.getMonth() + 1,
      day: triggerDate.getDate(),
      hour: triggerDate.getHours(),
      minute: triggerDate.getMinutes(),
      second: triggerDate.getSeconds(),
      repeats: false,
    };

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Nutrition reminder",
        body: "Don't forget to log today's nutrition.",
        data: { type: "nutrition_reminder" },
        sound: "default",
      },
      trigger,
    });

    await AsyncStorage.setItem(KEY, id);
  } catch (err) {
    if (__DEV__) console.warn("[nutritionReminder] schedule failed", err);
  }
}
