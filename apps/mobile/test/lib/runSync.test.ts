const mockDb = {
  execSync: jest.fn(),
  getAllSync: jest.fn().mockReturnValue([]),
  runSync: jest.fn(),
  getFirstSync: jest.fn().mockReturnValue(null),
};
jest.mock("expo-sqlite", () => ({
  openDatabaseSync: jest.fn().mockReturnValue(mockDb),
}));
jest.mock("@/lib/api", () => ({ apiRequest: jest.fn() }));

describe("runSync", () => {
  it("module exports exist", () => {
    const mod = require("@/lib/runSync");
    expect(mod).toBeDefined();
  });
});
