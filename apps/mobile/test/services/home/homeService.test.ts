jest.mock("@/lib/api", () => ({ apiRequest: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getAccessToken: jest.fn() }));

describe("services/homeService", () => {
  it("module exports exist", () => {
    const mod = require("@/services/home/homeService");
    expect(mod).toBeDefined();
  });
});
