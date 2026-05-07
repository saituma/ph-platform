jest.mock("@/lib/notifications", () => ({
  getNotifications: jest.fn().mockResolvedValue(null),
}));

import { cancelNutritionReminderLocal, scheduleNutritionReminderLocal } from "@/lib/nutritionReminder";

describe("cancelNutritionReminderLocal", () => {
  it("does not throw when notifications unavailable", async () => {
    await expect(cancelNutritionReminderLocal()).resolves.toBeUndefined();
  });
});

describe("scheduleNutritionReminderLocal", () => {
  it("does not throw when notifications unavailable", async () => {
    await expect(scheduleNutritionReminderLocal({ hour: 9, minute: 0 })).resolves.toBeUndefined();
  });
});
