jest.mock("@/lib/api", () => ({ apiRequest: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getAccessToken: jest.fn(), clearCredentials: jest.fn() }));

describe("apiClient/training", () => {
  it("module exports exist", () => {
    const mod = require("@/lib/apiClient/training");
    expect(mod).toBeDefined();
  });
});
