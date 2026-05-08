jest.mock("@/lib/api", () => ({ apiRequest: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getAccessToken: jest.fn() }));

describe("services/socialService", () => {
  it("module exports exist", () => {
    const mod = require("@/services/tracking/socialService");
    expect(mod).toBeDefined();
  });
});
