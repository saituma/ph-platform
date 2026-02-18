import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { useFontScale } from "@/context/FontScaleContext";

type AgeExperienceConfig = {
  id?: number;
  title?: string | null;
  uiPreset?: "playful" | "standard" | "performance";
  fontSizeOption?: "small" | "default" | "large" | "extraLarge";
  density?: "compact" | "default" | "spacious";
  hiddenSections?: string[] | null;
};

type AgeExperienceContextValue = {
  isLoading: boolean;
  config: AgeExperienceConfig;
  hiddenSections: string[];
  isSectionHidden: (sectionId: string) => boolean;
};

const defaultConfig: AgeExperienceConfig = {
  uiPreset: "standard",
  fontSizeOption: "default",
  density: "default",
  hiddenSections: [],
};

const AgeExperienceContext = createContext<AgeExperienceContextValue | null>(null);

export function AgeExperienceProvider({ children }: { children: React.ReactNode }) {
  const token = useAppSelector((state) => state.user.token);
  const athleteUserId = useAppSelector((state) => state.user.athleteUserId);
  const onboardingCompleted = useAppSelector((state) => state.user.onboardingCompleted);
  const { setFontSizeOption } = useFontScale();
  const [config, setConfig] = useState<AgeExperienceConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadConfig = async () => {
      if (!token || onboardingCompleted === false) {
        setConfig(defaultConfig);
        return;
      }
      setIsLoading(true);
      try {
        const response = await apiRequest<{ item?: AgeExperienceConfig | null }>("/experience/age", { token });
        if (!mounted) return;
        const nextConfig = response.item ?? defaultConfig;
        setConfig({
          ...defaultConfig,
          ...nextConfig,
          hiddenSections: Array.isArray(nextConfig.hiddenSections) ? nextConfig.hiddenSections : [],
        });
      } catch {
        if (mounted) {
          setConfig(defaultConfig);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadConfig();
    return () => {
      mounted = false;
    };
  }, [token, athleteUserId, onboardingCompleted]);

  useEffect(() => {
    if (config.fontSizeOption) {
      setFontSizeOption(config.fontSizeOption);
    }
  }, [config.fontSizeOption, setFontSizeOption]);

  const hiddenSections = useMemo(
    () => (Array.isArray(config.hiddenSections) ? config.hiddenSections : []),
    [config.hiddenSections]
  );

  const value = useMemo(
    () => ({
      isLoading,
      config,
      hiddenSections,
      isSectionHidden: (sectionId: string) => hiddenSections.includes(sectionId),
    }),
    [config, hiddenSections, isLoading]
  );

  return <AgeExperienceContext.Provider value={value}>{children}</AgeExperienceContext.Provider>;
}

export function useAgeExperience() {
  const context = useContext(AgeExperienceContext);
  if (!context) {
    throw new Error("useAgeExperience must be used within AgeExperienceProvider");
  }
  return context;
}

