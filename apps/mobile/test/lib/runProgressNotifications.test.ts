jest.mock("@/lib/api", () => ({ apiRequest: jest.fn() }));
jest.mock("@/lib/notifications", () => ({ getNotifications: jest.fn().mockResolvedValue(null) }));
jest.mock("expo-location", () => ({}), { virtual: true });
jest.mock("expo-notifications", () => ({}), { virtual: true });
jest.mock("expo-task-manager", () => ({ defineTask: jest.fn(), isTaskRegisteredAsync: jest.fn().mockResolvedValue(false) }), { virtual: true });
jest.mock("expo-battery", () => ({}), { virtual: true });
jest.mock("@sentry/react-native", () => ({ init: jest.fn(), captureException: jest.fn() }), { virtual: true });
jest.mock("expo-sqlite", () => ({}), { virtual: true });

describe("runProgressNotifications", () => {
  it("module exports exist", () => {
    const mod = require("@/lib/runProgressNotifications");
    expect(mod).toBeDefined();
  });
});
