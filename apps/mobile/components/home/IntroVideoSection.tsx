import React, { useEffect } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import VideoPlayer from "@/components/ui/VideoPlayer";
import { spacing } from "@/constants/theme";

type IntroVideoSectionProps = {
  introVideoUrl?: string | null;
  posterUrl?: string | null;
  isTabActive?: boolean;
  tabIndex?: number;
};

export function IntroVideoSection({
  introVideoUrl,
  posterUrl,
  tabIndex = 0,
}: IntroVideoSectionProps) {
  const { isDark } = useAppTheme();

  useEffect(() => {
    if (posterUrl) {
      void Image.prefetch(posterUrl, "memory-disk");
    }
  }, [posterUrl]);

  if (!introVideoUrl) return null;

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ paddingHorizontal: 2 }}>
        <Text style={{ color: isDark ? "#fff" : "#0F172A", fontSize: 20, fontWeight: "700" }}>
          Intro video
        </Text>
      </View>

      <VideoPlayer
        source={introVideoUrl}
        thumbnail={posterUrl ?? undefined}
        autoPlay={false}
      />
    </View>
  );
}
