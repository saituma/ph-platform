import { isYoutubeUrl, VideoPlayer, YouTubeEmbed } from "@/components/media/VideoPlayer";
import React from "react";
import { View } from "react-native";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";

type IntroVideoSectionProps = {
  introVideoUrl?: string | null;
  posterUrl?: string | null;
};

export function IntroVideoSection({ introVideoUrl, posterUrl }: IntroVideoSectionProps) {
  const { colors, isDark } = useAppTheme();
  
  if (!introVideoUrl) return null;
  const isYoutube = isYoutubeUrl(introVideoUrl);

  return (
    <View 
      className="overflow-hidden bg-black"
    >
      {isYoutube ? (
        <YouTubeEmbed url={introVideoUrl} immersive={false} />
      ) : (
        <VideoPlayer
          uri={introVideoUrl}
          posterUri={posterUrl ?? null}
          autoPlay={true}
          initialMuted={false}
          isLooping
          useVideoResolution={true}
          immersive={false}
          cinematic={true}
        />
      )}
    </View>
  );
}
