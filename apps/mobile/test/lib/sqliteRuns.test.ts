const mockDb = {
  execSync: jest.fn(),
  getAllSync: jest.fn().mockReturnValue([]),
  runSync: jest.fn(),
  getFirstSync: jest.fn().mockReturnValue(null),
};
jest.mock("expo-sqlite", () => ({
  openDatabaseSync: jest.fn().mockReturnValue(mockDb),
}));

describe("sqliteRuns", () => {
  it("module exports exist", () => {
    const mod = require("@/lib/sqliteRuns");
    expect(mod).toBeDefined();
  });
});
