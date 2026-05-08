jest.mock("@/lib/messages/prefetchChatMedia", () => ({
  prefetchMediaForMessages: jest.fn(),
}));
jest.mock("@/store/hooks", () => ({
  useAppSelector: jest.fn().mockReturnValue(null),
  useAppDispatch: jest.fn().mockReturnValue(jest.fn()),
}));
jest.mock("@/lib/api", () => ({ apiRequest: jest.fn() }));
jest.mock("@/hooks/useActingUser", () => ({
  useActingUser: () => ({ actingUserId: null, actingHeaders: undefined, effectiveProfileId: 1, effectiveProfileName: "Test", isStaff: false }),
}));
jest.mock("@/hooks/useAppToast", () => ({
  useAppToast: () => ({ show: jest.fn(), success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn(), hide: jest.fn() }),
}));

describe("useChatActions", () => {
  it("module exports exist", () => {
    const mod = require("@/hooks/messages/useChatActions");
    expect(mod).toBeDefined();
  });
});
