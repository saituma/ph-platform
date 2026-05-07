jest.mock("@/lib/notifications", () => ({
  getNotifications: jest.fn().mockResolvedValue(null),
}));
jest.mock("@/lib/notificationSetup", () => ({
  NOTIFICATION_CHANNELS: { nutrition: "nutrition" },
}));

import { getMealReminderPrefs, setMealReminderPrefs, getAllMealReminderPrefs, cancelMealReminder, requestMealNotificationPermission } from "@/lib/nutritionMealReminders";
import AsyncStorage from "@react-native-async-storage/async-storage";

describe("getMealReminderPrefs", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns defaults when storage empty", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const prefs = await getMealReminderPrefs("breakfast");
    expect(prefs.enabled).toBe(false);
    expect(prefs.hour).toBe(8);
  });

  it("parses stored JSON", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ enabled: true, hour: 7, minute: 15 }));
    const prefs = await getMealReminderPrefs("lunch");
    expect(prefs.enabled).toBe(true);
    expect(prefs.hour).toBe(7);
  });
});

describe("setMealReminderPrefs", () => {
  it("saves to storage", async () => {
    await setMealReminderPrefs("dinner", { enabled: true, hour: 19, minute: 0 });
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});

describe("getAllMealReminderPrefs", () => {
  it("returns all three slots", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const all = await getAllMealReminderPrefs();
    expect(all.breakfast).toBeDefined();
    expect(all.lunch).toBeDefined();
    expect(all.dinner).toBeDefined();
  });
});

describe("cancelMealReminder", () => {
  it("does not throw when notifications unavailable", async () => {
    await expect(cancelMealReminder("breakfast")).resolves.toBeUndefined();
  });
});

describe("requestMealNotificationPermission", () => {
  it("returns false when unavailable", async () => {
    expect(await requestMealNotificationPermission()).toBe(false);
  });
});
