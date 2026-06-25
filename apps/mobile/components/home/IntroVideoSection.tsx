import React, { useEffect } from "react";
import { View } from "react-native";
import { useContentWidth } from "@/lib/contentWidth";
import { Image } from "expo-image";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { Text } from "@/components/ScaledText";
import { SkeletonBox } from "@/components/ui/legacy-skeleton";
import VideoPlayer from "@/components/ui/VideoPlayer";
import { useActiveTab } from "@/context/ActiveTabContext";

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
  loading,
}: IntroVideoSectionProps) {
  const p = useAdminPastel();
  const width = useContentWidth();

  // Use the same active-tab signal the media VideoPlayer uses.
  // useFocusEffect is unreliable with the native PagerView tab layout —
  // setGlobalActiveTab fires synchronously from the native layer, so this
  // is the earliest possible signal that the home tab is no longer visible.
  const { activeTabIndex, currentTabIndex } = useActiveTab();
  const isTabActive = activeTabIndex === currentTabIndex;

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
      ) : isTabActive ? (
        <VideoPlayer
          source={introVideoUrl!}
          thumbnail={posterUrl ?? undefined}
          autoPlay={false}
          isFocused={isTabActive}
        />
      ) : (
        // Unmount VideoPlayer entirely when the tab is not active.
        // Native AVPlayer/ExoPlayer is released immediately when the
        // component tree is torn down — audio cannot continue.
        posterUrl ? (
          <Image
            source={{ uri: posterUrl }}
            style={{ width: cardW, height: videoH, borderRadius: 20 }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={{ width: cardW, height: videoH, borderRadius: 20, backgroundColor: "#111" }} />
        )
      )}
    </View>
  );
});
