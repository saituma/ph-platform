jest.mock("@/lib/api", () => ({ apiRequest: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getAccessToken: jest.fn() }));

describe("services/programsService", () => {
  it("module exports exist", () => {
    const mod = require("@/services/programs/programsService");
    expect(mod).toBeDefined();
  });
});
