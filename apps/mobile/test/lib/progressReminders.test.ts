jest.mock("@/lib/notifications", () => ({
  getNotifications: jest.fn().mockResolvedValue(null),
}));
jest.mock("@/lib/progressPreferences", () => ({
  getProgressReminderPrefs: jest.fn().mockResolvedValue({ enabled: false, hour: 9, minute: 0 }),
}));
jest.mock("@/lib/notificationSetup", () => ({
  NOTIFICATION_CHANNELS: { progress: "progress" },
}));

import { syncProgressWeeklyReminder, requestProgressNotificationPermission } from "@/lib/progressReminders";

describe("syncProgressWeeklyReminder", () => {
  it("returns early when Notifications is null", async () => {
    await expect(syncProgressWeeklyReminder()).resolves.toBeUndefined();
  });
});

describe("requestProgressNotificationPermission", () => {
  it("returns false when Notifications unavailable", async () => {
    expect(await requestProgressNotificationPermission()).toBe(false);
  });
});
