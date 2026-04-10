import React, { useState } from "react";
import { View, Pressable, Image as RNImage } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { isYoutubeUrl, YouTubeEmbed } from "@/components/media/VideoPlayer";

interface Props {
  uri: string;
  contentType: string;
  width: number;
  height: number;
  onPress: () => void;
}

export function MessageMediaView({ uri, contentType, width, height, onPress }: Props) {
  const [duration, setDuration] = useState<string | null>(null);

  if (contentType === "image") {
    return (
      <Pressable onPress={onPress}>
        <ExpoImage
          source={uri}
          style={{ width, height, borderRadius: 14 }}
          contentFit="cover"
          transition={180}
        />
      </Pressable>
    );
  }

  if (contentType === "video") {
    const isYT = isYoutubeUrl(uri);
    return (
      <Pressable onPress={onPress}>
        <View style={{ width, height, borderRadius: 18, overflow: "hidden" }}>
          {isYT ? (
            <YouTubeEmbed url={uri} shouldPlay={false} initialMuted />
          ) : (
            <>
              <VideoSurface uri={uri} height={height} onDuration={(d) => setDuration(d)} />
              <View className="absolute inset-0 items-center justify-center">
                <View className="h-12 w-12 rounded-full bg-black/40 items-center justify-center border border-white/20">
                  <Ionicons name="play" size={24} color="#FFFFFF" style={{ marginLeft: 4 }} />
                </View>
              </View>
              {duration && (
                <View className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/60">
                  <Text className="text-[10px] font-bold text-white">{duration}</Text>
                </View>
              )}
            </>
          )}
        </View>
      </Pressable>
    );
  }

  return null;
}

function VideoSurface({ uri, height, onDuration }: { uri: string; height: number; onDuration: (d: string) => void }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
    instance.muted = true;
  });

  React.useEffect(() => {
    const interval = setInterval(() => {
      const d = Number((player as any)?.duration ?? 0);
      if (d > 0) {
        const mins = Math.floor(d / 60);
        const secs = Math.floor(d % 60);
        onDuration(`${mins}:${secs.toString().padStart(2, "0")}`);
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [player]);

  return <VideoView player={player} style={{ width: "100%", height }} contentFit="cover" />;
}
