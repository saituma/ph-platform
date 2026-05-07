import React, { useEffect } from "react";
import { View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { Text } from "@/components/ScaledText";
import { SkeletonBox } from "@/components/ui/legacy-skeleton";
import VideoPlayer from "@/components/ui/VideoPlayer";

type IntroVideoSectionProps = {
  introVideoUrl?: string | null;
  posterUrl?: string | null;
  isTabActive?: boolean;
  tabIndex?: number;
  loading?: boolean;
};

export const IntroVideoSection = React.memo(function IntroVideoSection({
  introVideoUrl,
  posterUrl,
  tabIndex = 0,
  loading,
}: IntroVideoSectionProps) {
  const p = useAdminPastel();
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
    <View style={{ gap: 10 }}>
      <View style={{ paddingHorizontal: 2 }}>
        <Text style={{ color: p.textPrimary, fontSize: 20, fontFamily: "Outfit-Bold" }}>
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
});
