jest.mock("@/lib/api", () => ({ apiRequest: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getAccessToken: jest.fn() }));

describe("services/locationService", () => {
  it("module exports exist", () => {
    const mod = require("@/services/tracking/locationService");
    expect(mod).toBeDefined();
  });
});
