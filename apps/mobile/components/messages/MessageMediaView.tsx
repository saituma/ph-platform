import React, { useEffect, useState } from "react";
import { View, Pressable, Linking } from "react-native";
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

function inferMediaKind(uri: string): "image" | "video" | "file" {
  const lower = uri.toLowerCase();
  if (lower.includes("/messages/images/")) return "image";
  if (lower.includes("/messages/videos/")) return "video";
  const cleaned = lower.split("?")[0].split("#")[0];
  if (/\.(jpg|jpeg|png|gif|webp|bmp|heic|heif|avif)$/.test(cleaned)) return "image";
  if (/\.(mp4|mov|webm|m4v|avi|mkv)$/.test(cleaned)) return "video";
  return "file";
}

export function MessageMediaView({ uri, contentType, width, height, onPress }: Props) {
  const normalizedType = String(contentType ?? "").toLowerCase().trim();
  const inferred = inferMediaKind(uri);
  const isImage =
    normalizedType === "image" ||
    normalizedType.startsWith("image/") ||
    inferred === "image";
  const isVideo =
    normalizedType === "video" ||
    normalizedType.startsWith("video/") ||
    inferred === "video";

  if (isImage) {
    return (
      <Pressable onPress={onPress}>
        <ExpoImage
          source={{ uri }}
          style={{ width, height, borderRadius: 14 }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={120}
        />
      </Pressable>
    );
  }

  if (isVideo) {
    const isYT = isYoutubeUrl(uri);
    return (
      <View style={{ width, height, borderRadius: 18, overflow: "hidden" }}>
        {isYT ? (
          <>
            <YouTubeEmbed url={uri} shouldPlay={false} initialMuted />
            <Pressable
              onPress={onPress}
              className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/60"
            >
              <Text className="text-[10px] font-bold text-white">Fullscreen</Text>
            </Pressable>
          </>
        ) : (
          <InlineVideoPreview
            uri={uri}
            width={width}
            height={height}
            onOpenFullscreen={onPress}
          />
        )}
      </View>
    );
  }

  return (
    <Pressable onPress={() => void Linking.openURL(uri)}>
      <View className="rounded-xl bg-black/5 px-3 py-3 flex-row items-center gap-2">
        <Ionicons name="document-attach-outline" size={18} color="#6B7280" />
        <Text className="text-xs text-slate-600">Open attachment</Text>
      </View>
    </Pressable>
  );
}

function InlineVideoPreview({
  uri,
  width,
  height,
  onOpenFullscreen,
}: {
  uri: string;
  width: number;
  height: number;
  onOpenFullscreen: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
    instance.muted = false;
  });

  useEffect(() => {
    const sub = player.addListener("playingChange", (payload: { isPlaying?: boolean }) => {
      setIsPlaying(Boolean(payload?.isPlaying));
    });
    return () => sub.remove();
  }, [player]);

  return (
    <View style={{ width, height }}>
      <VideoView
        player={player}
        style={{ width, height }}
        contentFit="cover"
        nativeControls
      />
      {!isPlaying ? (
        <Pressable
          className="absolute inset-0 items-center justify-center bg-black/20"
          onPress={() => player.play()}
        >
          <View className="h-12 w-12 rounded-full bg-black/40 items-center justify-center">
            <Ionicons name="play" size={24} color="#FFFFFF" style={{ marginLeft: 4 }} />
          </View>
        </Pressable>
      ) : null}
      <Pressable
        onPress={onOpenFullscreen}
        className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/60"
      >
        <Text className="text-[10px] font-bold text-white">Fullscreen</Text>
      </Pressable>
    </View>
  );
}
