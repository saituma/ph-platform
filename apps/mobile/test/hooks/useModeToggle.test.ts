jest.mock("@/app/theme/AppThemeProvider", () => ({
  useAppTheme: () => ({
    toggleColorScheme: jest.fn(),
    isDark: false,
  }),
}));

import { renderHook } from "@testing-library/react-native";
import { useModeToggle } from "@/hooks/useModeToggle";

describe("useModeToggle", () => {
  it("returns toggleMode and isDark", () => {
    const { result } = renderHook(() => useModeToggle());
    expect(result.current.toggleMode).toBeDefined();
    expect(result.current.isDark).toBe(false);
  });
});
