import { isYoutubeUrl, VideoPlayer, YouTubeEmbed } from "@/components/media/VideoPlayer";
import React from "react";
import { View, useWindowDimensions } from "react-native";

type IntroVideoSectionProps = {
  introVideoUrl?: string | null;
  posterUrl?: string | null;
};

export function IntroVideoSection({ introVideoUrl, posterUrl }: IntroVideoSectionProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  if (!introVideoUrl) return null;
  const isYoutube = isYoutubeUrl(introVideoUrl);
  const playerHeight = Math.max(560, Math.min(760, Math.round(screenHeight * 0.82)));

  return (
    <View className="items-center">
      <View
        className="overflow-hidden"
        style={{
          width: screenWidth,
          minHeight: playerHeight,
        }}
      >
        {isYoutube ? (
          <YouTubeEmbed url={introVideoUrl} immersive />
        ) : (
          <VideoPlayer
            uri={introVideoUrl}
            posterUri={posterUrl ?? null}
            autoPlay={false}
            initialMuted={false}
            isLooping
            height={playerHeight}
            useVideoResolution={false}
            immersive
          />
        )}
      </View>
    </View>
  );
}
