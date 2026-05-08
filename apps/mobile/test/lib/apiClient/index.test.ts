jest.mock("@/lib/api", () => ({ apiRequest: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getAccessToken: jest.fn(), clearCredentials: jest.fn() }));

describe("apiClient/index", () => {
  it("module exports exist", () => {
    const mod = require("@/lib/apiClient/index");
    expect(mod).toBeDefined();
  });
});
