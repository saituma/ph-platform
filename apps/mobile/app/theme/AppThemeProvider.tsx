import { Colors } from "@/constants/theme";
import { vars } from "nativewind";
import React, { createContext, useCallback, useContext, useState } from "react";
import { Platform, StatusBar, View } from "react-native";

type ColorSchemeName = "light" | "dark";

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

const lightVars = vars({
  "--color-bg": Colors.light.background,
  "--color-bg-secondary": Colors.light.backgroundSecondary,
  "--color-bg-input": Colors.light.inputBackground,
  "--color-text": Colors.light.text,
  "--color-text-secondary": Colors.light.textSecondary,
  "--color-text-muted": Colors.light.placeholder,
  "--color-accent": Colors.light.accent,
  "--color-accent-light": Colors.light.accentLight,
  "--color-border": Colors.light.border,
  "--color-icon": Colors.light.icon,
});

const darkVars = vars({
  "--color-bg": Colors.dark.background,
  "--color-bg-secondary": Colors.dark.backgroundSecondary,
  "--color-bg-input": Colors.dark.inputBackground,
  "--color-text": Colors.dark.text,
  "--color-text-secondary": Colors.dark.textSecondary,
  "--color-text-muted": Colors.dark.placeholder,
  "--color-accent": Colors.dark.accent,
  "--color-accent-light": Colors.dark.accentLight,
  "--color-border": Colors.dark.border,
  "--color-icon": Colors.dark.icon,
});

export default function AppThemeProvider({
  children,
  colorScheme: initialColorScheme,
}: {
  children: React.ReactNode;
  colorScheme: ColorSchemeName;
}) {
  const [colorScheme, setColorScheme] =
    useState<ColorSchemeName>(initialColorScheme);

  const toggleColorScheme = useCallback(() => {
    setColorScheme((s) => (s === "light" ? "dark" : "light"));
  }, []);

  const colors = colorScheme === "light" ? Colors.light : Colors.dark;
  const isDark = colorScheme === "dark";
  const themeVars = isDark ? darkVars : lightVars;

  React.useEffect(() => {
    if (Platform.OS === "web") {
      const root = document.documentElement;
      if (isDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }, [isDark]);

  return (
    <AppThemeContext.Provider
      value={{ colorScheme, colors, toggleColorScheme, isDark }}
    >
      <View
        style={[{ flex: 1, backgroundColor: colors.background }, themeVars]}
        className={isDark ? "dark" : ""}
      >
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={colors.background}
        />
        {children}
      </View>
    </AppThemeContext.Provider>
  );
}
