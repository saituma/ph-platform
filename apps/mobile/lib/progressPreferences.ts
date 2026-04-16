import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_REMINDER = "@ph/progressWeeklyReminder";
const KEY_HOUR = "@ph/progressReminderHour";
const KEY_MINUTE = "@ph/progressReminderMinute";

export type ProgressReminderPrefs = {
  enabled: boolean;
  hour: number;
  minute: number;
};

const defaults: ProgressReminderPrefs = {
  enabled: true,
  hour: 9,
  minute: 0,
};

export async function getProgressReminderPrefs(): Promise<ProgressReminderPrefs> {
  try {
    const [en, h, m] = await Promise.all([
      AsyncStorage.getItem(KEY_REMINDER),
      AsyncStorage.getItem(KEY_HOUR),
      AsyncStorage.getItem(KEY_MINUTE),
    ]);
    return {
      enabled: en === "1",
      hour: h != null ? Number(h) : defaults.hour,
      minute: m != null ? Number(m) : defaults.minute,
    };
  } catch {
    return defaults;
  }
}

export async function setProgressReminderPrefs(p: Partial<ProgressReminderPrefs>) {
  const cur = await getProgressReminderPrefs();
  const next = { ...cur, ...p };
  await AsyncStorage.multiSet([
    [KEY_REMINDER, next.enabled ? "1" : "0"],
    [KEY_HOUR, String(next.hour)],
    [KEY_MINUTE, String(next.minute)],
  ]);
  return next;
}
