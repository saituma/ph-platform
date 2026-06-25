import React, { useState } from "react";
import { View, Pressable, Linking } from "react-native";
import { Image } from "expo-image";
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
        <Image
          source={{ uri }}
          style={{ width, height, borderRadius: 14 }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={200}
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
  const [activated, setActivated] = useState(false);

  if (!activated) {
    return (
      <View style={{ width, height }}>
        <Image
          source={{ uri: uri + "?thumb=1" }}
          style={{ width, height, position: "absolute" }}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.2)" }}
          onPress={() => setActivated(true)}
        >
          <View style={{ height: 48, width: 48, borderRadius: 24, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="play" size={24} color="#FFFFFF" style={{ marginLeft: 4 }} />
          </View>
        </Pressable>
        <Pressable
          onPress={onOpenFullscreen}
          className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/60"
        >
          <Text className="text-[10px] font-bold text-white">Fullscreen</Text>
        </Pressable>
      </View>
    );
  }

  return <ActivatedVideoPreview uri={uri} width={width} height={height} onOpenFullscreen={onOpenFullscreen} />;
}

function ActivatedVideoPreview({
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
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
    instance.muted = false;
    instance.play();
  });

  return (
    <View style={{ width, height }}>
      <VideoView
        player={player}
        style={{ width, height }}
        contentFit="cover"
        nativeControls
      />
      <Pressable
        onPress={onOpenFullscreen}
        className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/60"
      >
        <Text className="text-[10px] font-bold text-white">Fullscreen</Text>
      </Pressable>
    </View>
  );
}
