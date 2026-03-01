import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { isYoutubeUrl, VideoPlayer, YouTubeEmbed } from "@/components/media/VideoPlayer";
import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ScaledText";

type IntroVideoSectionProps = {
  introVideoUrl?: string | null;
  posterUrl?: string | null;
};

export function IntroVideoSection({ introVideoUrl, posterUrl }: IntroVideoSectionProps) {
  const { isDark } = useAppTheme();
  if (!introVideoUrl) return null;
  const isYoutube = isYoutubeUrl(introVideoUrl);

  return (
    <View className="py-2">
      <View className="flex-row justify-between items-end mb-6">
        <View>
          <Text className="text-2xl font-bold font-clash text-app tracking-tight">
            Intro Video
          </Text>
          <Text className="text-secondary font-outfit text-sm mt-1">
            A quick welcome from the coach
          </Text>
        </View>
      </View>

      <View className="items-center w-full">
        <View
          className="w-full overflow-hidden rounded-[32px] bg-input"
          style={isDark ? Shadows.none : Shadows.md}
        >
          {isYoutube ? (
            <YouTubeEmbed url={introVideoUrl} />
          ) : (
            // UI polish: poster-first playback with custom controls for a more professional intro experience.
            <VideoPlayer
              uri={introVideoUrl}
              title="Intro Video"
              posterUri={posterUrl ?? null}
              autoPlay={false}
              initialMuted={false}
              isLooping
              useVideoResolution
            />
          )}
        </View>
      </View>
    </View>
  );
}
