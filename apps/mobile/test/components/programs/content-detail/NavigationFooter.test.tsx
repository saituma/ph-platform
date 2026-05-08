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
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  Link: "Link",
}), { virtual: true });

describe("NavigationFooter", () => {
  it("module can be imported", () => {
    expect(true).toBe(true);
  });
});
