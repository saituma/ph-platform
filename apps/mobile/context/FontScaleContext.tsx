import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { rem } from "react-native-css-interop";
export type FontSizeOption = "small" | "default" | "large" | "extraLarge";

const SCALE_MAP: Record<FontSizeOption, number> = {
  small: 0.92,
  default: 1,
  large: 1.12,
  extraLarge: 1.25,
};

const BASE_REM = 16;

type FontScaleContextValue = {
  fontSizeOption: FontSizeOption;
  fontScale: number;
  setFontSizeOption: (option: FontSizeOption) => void;
  isLoaded: boolean;
};

const FontScaleContext = createContext<FontScaleContextValue | null>(null);

export function FontScaleProvider({ children }: { children: React.ReactNode }) {
  const [fontSizeOption, setFontSizeOptionState] = useState<FontSizeOption>("default");
  const [isLoaded, setIsLoaded] = useState(false);
  const persistedOption = useRef<FontSizeOption | null>(null);

  useEffect(() => {
    setFontSizeOptionState("default");
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    rem.set(BASE_REM * (SCALE_MAP[fontSizeOption] ?? 1));
  }, [fontSizeOption]);

  useEffect(() => {
    if (!isLoaded) return;
    persistedOption.current = fontSizeOption;
  }, [fontSizeOption, isLoaded]);

  const value = useMemo(
    () => ({
      fontSizeOption,
      fontScale: SCALE_MAP[fontSizeOption] ?? 1,
      setFontSizeOption: setFontSizeOptionState,
      isLoaded,
    }),
    [fontSizeOption, isLoaded]
  );

  return <FontScaleContext.Provider value={value}>{children}</FontScaleContext.Provider>;
}

export function useFontScale() {
  const context = useContext(FontScaleContext);
  if (!context) {
    throw new Error("useFontScale must be used within FontScaleProvider");
  }
  return context;
}
