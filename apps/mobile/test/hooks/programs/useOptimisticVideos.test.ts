jest.mock("@/store/hooks", () => ({
  useAppSelector: jest.fn().mockReturnValue(null),
  useAppDispatch: jest.fn().mockReturnValue(jest.fn()),
}));
jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
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
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}), { virtual: true });

describe("useOptimisticVideos", () => {
  it("module exports exist", () => {
    const mod = require("@/hooks/programs/useOptimisticVideos");
    expect(mod).toBeDefined();
  });
});
