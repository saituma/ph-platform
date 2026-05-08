jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useSegments: () => [],
  usePathname: () => "/",
}), { virtual: true });
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
  useIsFocused: () => true,
}), { virtual: true });
jest.mock("@/store/hooks", () => ({
  useAppSelector: jest.fn().mockReturnValue(null),
  useAppDispatch: jest.fn().mockReturnValue(jest.fn()),
}));
jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(),
}));
jest.mock("@/lib/notifications", () => ({
  getNotifications: jest.fn().mockResolvedValue(null),
}));

describe("useSafeExpoRouter", () => {
  it("module exports exist", () => {
    const mod = require("@/hooks/navigation/useSafeExpoRouter");
    expect(mod).toBeDefined();
  });
});
