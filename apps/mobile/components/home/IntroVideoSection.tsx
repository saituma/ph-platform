import React, { useEffect } from "react";
import { View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { SkeletonBox } from "@/components/ui/Skeleton";
import VideoPlayer from "@/components/ui/VideoPlayer";
import { spacing } from "@/constants/theme";

type IntroVideoSectionProps = {
  introVideoUrl?: string | null;
  posterUrl?: string | null;
  isTabActive?: boolean;
  tabIndex?: number;
  loading?: boolean;
};

export function IntroVideoSection({
  introVideoUrl,
  posterUrl,
  tabIndex = 0,
  loading,
}: IntroVideoSectionProps) {
  const { isDark } = useAppTheme();
  const { width } = useWindowDimensions();

  useEffect(() => {
    if (posterUrl) {
      void Image.prefetch(posterUrl, "memory-disk");
    }
  }, [posterUrl]);

  if (!introVideoUrl && !loading) return null;

  const cardW = width - 40;
  const videoH = Math.round((cardW * 9) / 16);

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ paddingHorizontal: 2 }}>
        <Text style={{ color: isDark ? "#fff" : "#0F172A", fontSize: 20, fontWeight: "700" }}>
          Intro video
        </Text>
      </View>

      {loading ? (
        <SkeletonBox width={cardW} height={videoH} borderRadius={20} />
      ) : (
        <VideoPlayer
          source={introVideoUrl!}
          thumbnail={posterUrl ?? undefined}
          autoPlay={false}
        />
      )}
    </View>
  );
}
