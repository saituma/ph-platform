jest.mock("@/store/hooks", () => ({
  useAppSelector: jest.fn().mockReturnValue(null),
  useAppDispatch: jest.fn().mockReturnValue(jest.fn()),
}));
jest.mock("@/hooks/useActingUser", () => ({
  useActingUser: () => ({
    actingUserId: null,
    actingHeaders: undefined,
    effectiveProfileId: 1,
    effectiveProfileName: "Test",
    isStaff: false,
  }),
}));
jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
}));
jest.mock("@/components/ui/toast", () => ({
  useToast: () => ({ toast: jest.fn(), success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn(), dismissAll: jest.fn() }),
}));
jest.mock("@/hooks/useAppToast", () => ({
  useAppToast: () => ({ show: jest.fn(), success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn(), hide: jest.fn() }),
}));

describe("useThreadsQuery", () => {
  it("module exports exist", () => {
    const mod = require("@/hooks/messages/useThreadsQuery");
    expect(mod).toBeDefined();
  });
});
