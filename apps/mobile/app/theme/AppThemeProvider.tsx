import { Colors } from "@/constants/theme";
import { useAppSelector } from "@/store/hooks";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "nativewind";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform, StatusBar, useColorScheme as useSystemColorScheme } from "react-native";

const THEME_MODE_KEY = "themeMode";

type ColorSchemeName = "light" | "dark" | "system";

type AppTheme = {
  colorScheme: ColorSchemeName;
  colors: (typeof Colors)[keyof typeof Colors];
  toggleColorScheme: () => void;
  isSwitching: boolean;
  isDark: boolean;
};

export const AppThemeContext = createContext<AppTheme | null>(null);
let warnedMissingThemeProvider = false;
const persistTheme = async (key: string, value: string) => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (err) {
    console.error("Failed to persist theme preference", err);
  }
};
export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (context === null) {
    if (!warnedMissingThemeProvider) {
      console.warn("useAppTheme must be used within an AppThemeProvider");
      warnedMissingThemeProvider = true;
    }
    return {
      colorScheme: "light" as ColorSchemeName,
      colors: Colors.light,
      toggleColorScheme: () => {},
      isSwitching: false,
      isDark: false,
    };
  }
  return context;
}

export default function AppThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setColorScheme } = useColorScheme();
  const { isAuthenticated, profile } = useAppSelector((state) => state.user);
  const [isSwitching, setIsSwitching] = useState(false);
  const [themeMode, setThemeMode] = useState<ColorSchemeName>("system");
  const themeKey =
    isAuthenticated && profile.id !== undefined && profile.id !== null
      ? `${THEME_MODE_KEY}_user_${profile.id}`
      : null;
  const guestKey = `${THEME_MODE_KEY}_guest`;

  const systemScheme = useSystemColorScheme();
  const systemResolvedScheme: "light" | "dark" =
    systemScheme === "dark" ? "dark" : "light";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = themeKey
          ? await AsyncStorage.getItem(themeKey)
          : await AsyncStorage.getItem(guestKey);
        if (cancelled || !stored) return;
        if (stored === "light" || stored === "dark" || stored === "system") {
          setThemeMode(stored);
          // Work around RN Android crash: don't send "system" to native.
          setColorScheme(stored === "system" ? systemResolvedScheme : stored);
        }
      } catch (err) {
        console.error("Failed to load theme preference", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setColorScheme, systemResolvedScheme, themeKey, guestKey]);

  useEffect(() => {
    if (themeMode !== "system") return;
    // Keep "system" mode in sync with OS changes without passing null.
    setColorScheme(systemResolvedScheme);
  }, [setColorScheme, systemResolvedScheme, themeMode]);

  const resolvedScheme = themeMode === "system" ? systemResolvedScheme : themeMode;
  const isDark = resolvedScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  useEffect(() => {
    // Keep the system status bar hidden across theme changes (some OEMs/libs re-apply defaults).
    StatusBar.setHidden(true, "fade");
    if (Platform.OS === "android") {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor("transparent", true);
    }
  }, [resolvedScheme]);

  const toggleColorScheme = React.useCallback(async () => {
    const next =
      themeMode === "light"
        ? "dark"
        : themeMode === "dark"
          ? "system"
          : "light";
    setIsSwitching(true);

    setThemeMode(next);
    setColorScheme(next === "system" ? systemResolvedScheme : next);

    const key = themeKey ?? guestKey;
    try {
      await persistTheme(key, next);
    } catch (error) {
      console.error("Failed to persist theme preference", error);
    } finally {
      setIsSwitching(false);
    }
  }, [guestKey, setColorScheme, systemResolvedScheme, themeKey, themeMode]);
  const value = React.useMemo(
    () => ({
      colorScheme: themeMode,
      colors,
      toggleColorScheme,
      isSwitching,
      isDark,
    }),
    [colors, isDark, isSwitching, themeMode, toggleColorScheme],
  );

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
}
