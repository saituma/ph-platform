import { useAppTheme } from "@/app/theme/AppThemeProvider";

export function useModeToggle() {
  const { toggleColorScheme, isDark } = useAppTheme();
  return { toggleMode: toggleColorScheme, isDark };
}
