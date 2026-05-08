jest.mock("@/lib/api", () => ({ apiRequest: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getAccessToken: jest.fn() }));

describe("services/chatService", () => {
  it("module exports exist", () => {
    const mod = require("@/services/messages/chatService");
    expect(mod).toBeDefined();
  });
});
