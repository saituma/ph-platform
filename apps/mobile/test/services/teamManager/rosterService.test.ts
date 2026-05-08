jest.mock("@/lib/api", () => ({ apiRequest: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getAccessToken: jest.fn() }));

describe("services/rosterService", () => {
  it("module exports exist", () => {
    const mod = require("@/services/teamManager/rosterService");
    expect(mod).toBeDefined();
  });
});
