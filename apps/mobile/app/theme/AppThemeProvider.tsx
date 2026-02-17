import { Colors } from "@/constants/theme";
import { useAppSelector } from "@/store/hooks";
import * as SecureStore from "expo-secure-store";
import { useColorScheme } from "nativewind";
import React, { createContext, useContext, useEffect } from "react";

type ColorSchemeName = "light" | "dark" | "system";

type AppTheme = {
  colorScheme: ColorSchemeName;
  colors: typeof Colors.light;
  toggleColorScheme: () => void;
  isDark: boolean;
};

const defaultTheme: AppTheme = {
  colorScheme: "light",
  colors: Colors.light,
  toggleColorScheme: () => {},
  isDark: false,
};

export const AppThemeContext = createContext<AppTheme>(defaultTheme);

export function useAppTheme() {
  return useContext(AppThemeContext);
}

export default function AppThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const { isAuthenticated, profile } = useAppSelector((state) => state.user);
  const THEME_MODE_KEY = "themeMode";
  const themeKey = isAuthenticated && profile.id ? `${THEME_MODE_KEY}:user:${profile.id}` : null;
  const guestKey = `${THEME_MODE_KEY}:guest`;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = themeKey
          ? await SecureStore.getItemAsync(themeKey)
          : await SecureStore.getItemAsync(guestKey);
        if (!mounted || !stored) return;
        if (stored === "light" || stored === "dark" || stored === "system") {
          setColorScheme(stored);
        }
      } catch {
        // ignore secure store failures
      }
    })();
    return () => {
      mounted = false;
    };
  }, [setColorScheme, themeKey]);

  // NativeWind 4 handle system scheme, but for our usage we imply dark if 'dark'.
  // If 'system', we might rely on system preference?
  // NativeWind usually resolves it in CSS.
  // For 'isDark', let's just check strict equality or system?
  // Actually, standard NativeWind usage:
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <AppThemeContext.Provider
      value={{
        colorScheme: colorScheme ?? "light",
        colors,
        toggleColorScheme: () => {
          const next = colorScheme === "dark" ? "light" : "dark";
          setColorScheme(next);
          const key = themeKey ?? guestKey;
          SecureStore.setItemAsync(key, next);
        },
        isDark,
      }}
    >
      {children}
    </AppThemeContext.Provider>
  );
}