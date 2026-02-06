import { Colors } from "@/constants/theme";
import { useColorScheme } from "nativewind";
import React, { createContext, useContext } from "react";

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
  const { colorScheme, toggleColorScheme } = useColorScheme();

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
        toggleColorScheme,
        isDark,
      }}
    >
      {children}
    </AppThemeContext.Provider>
  );
}
