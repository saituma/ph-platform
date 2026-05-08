jest.mock("@/lib/api", () => ({ apiRequest: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getAccessToken: jest.fn(), clearCredentials: jest.fn() }));

describe("apiClient/auth", () => {
  it("module exports exist", () => {
    const mod = require("@/lib/apiClient/auth");
    expect(mod).toBeDefined();
  });
});
