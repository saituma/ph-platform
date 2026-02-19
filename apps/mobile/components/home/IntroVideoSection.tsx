import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { isYoutubeUrl, VideoPlayer, YouTubeEmbed } from "@/components/media/VideoPlayer";
import React from "react";
import { Linking, Pressable, View } from "react-native";
import { Text } from "@/components/ScaledText";

type IntroVideoSectionProps = {
  introVideoUrl?: string | null;
};

export function IntroVideoSection({ introVideoUrl }: IntroVideoSectionProps) {
  const { colors, isDark } = useAppTheme();
  if (!introVideoUrl) return null;
  const isYoutube = isYoutubeUrl(introVideoUrl);

  return (
    <View className="py-2">
      <View className="flex-row justify-between items-end mb-6 px-6">
        <View>
          <Text className="text-2xl font-bold font-clash text-app tracking-tight">
            Intro Video
          </Text>
          <Text className="text-secondary font-outfit text-sm mt-1">
            A quick welcome from the coach
          </Text>
        </View>
      </View>

      <View className="items-center px-6">
        <View
          className="w-full overflow-hidden rounded-[32px] border border-app/10 bg-input"
          style={{
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: isDark ? 0 : 0.06,
            shadowRadius: 20,
            elevation: isDark ? 0 : 5,
          }}
        >
          {isYoutube ? (
            <View className="p-4">
              <YouTubeEmbed url={introVideoUrl} />
              <Pressable
                onPress={() => Linking.openURL(introVideoUrl).catch(() => null)}
                className="mt-3 rounded-full bg-accent px-4 py-3 items-center"
              >
                <Text className="text-white text-sm font-outfit">Open YouTube</Text>
              </Pressable>
            </View>
          ) : (
            <VideoPlayer uri={introVideoUrl} title="Intro Video" autoPlay initialMuted />
          )}
        </View>
      </View>
    </View>
  );
}
