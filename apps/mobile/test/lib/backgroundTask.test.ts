jest.mock("expo-task-manager", () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn().mockResolvedValue(false),
  unregisterTaskAsync: jest.fn(),
}));
jest.mock("expo-location", () => ({
  startLocationUpdatesAsync: jest.fn(),
  stopLocationUpdatesAsync: jest.fn(),
  Accuracy: { High: 5 },
  ActivityType: { Fitness: 3 },
}));

describe("backgroundTask", () => {
  it("module exports exist", () => {
    const mod = require("@/lib/backgroundTask");
    expect(mod).toBeDefined();
  });
});
