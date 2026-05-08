jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));
jest.mock("@/constants/theme", () => ({
  Colors: { light: { text: "#000", background: "#fff" }, dark: { text: "#fff", background: "#000" } },
}));
jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));
jest.mock("@/components/ui/toast", () => ({
  useToast: () => ({ toast: jest.fn(), success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn(), dismissAll: jest.fn() }),
}));
jest.mock("@/app/theme/AppThemeProvider", () => ({
  useAppTheme: () => ({ toggleColorScheme: jest.fn(), isDark: false }),
}));
jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "/mock/",
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
  downloadAsync: jest.fn().mockResolvedValue({ uri: "/mock/cached.mp4" }),
}), { virtual: true });
jest.mock("@/store/hooks", () => ({
  useAppSelector: jest.fn().mockReturnValue(null),
  useAppDispatch: jest.fn().mockReturnValue(jest.fn()),
}));

describe("use-theme-color", () => {
  it("module exports exist", () => {
    const mod = require("@/hooks/use-theme-color");
    expect(mod).toBeDefined();
  });
});
