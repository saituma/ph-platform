import React, { useEffect, useState } from "react";
import { View, Modal, Pressable, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
import { isYoutubeUrl, YouTubeEmbed } from "@/components/media/VideoPlayer";

interface Props {
  visible: boolean;
  onClose: () => void;
  uri: string | null;
  contentType?: string | null;
}

function inferImageFromUri(uri: string): boolean {
  const lower = uri.toLowerCase();
  if (lower.includes("/messages/images/")) return true;
  const cleaned = lower.split("?")[0].split("#")[0];
  return /\.(jpg|jpeg|png|gif|webp|bmp|heic|heif|avif)$/.test(cleaned);
}

export function FullScreenMediaModal({
  visible,
  onClose,
  uri,
  contentType,
}: Props) {
  const { width, height } = useWindowDimensions();

  if (!uri) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.98)" }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View className="px-6 py-4 flex-row justify-end">
            <Pressable
              onPress={onClose}
              className="h-10 w-10 rounded-full bg-white/10 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </Pressable>
          </View>

          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            {(() => {
              const normalizedType = String(contentType ?? "").toLowerCase().trim();
              const isImage =
                normalizedType === "image" ||
                normalizedType.startsWith("image/") ||
                inferImageFromUri(uri);
              return isImage;
            })() ? (
              <ExpoImage
                source={uri}
                contentFit="contain"
                style={{ width, height: height - 150 }}
              />
            ) : isYoutubeUrl(uri) ? (
              <View style={{ width, height: height - 160 }}>
                <YouTubeEmbed url={uri} shouldPlay initialMuted={false} />
              </View>
            ) : (
              <InternalVideo uri={uri} height={height - 150} width={width} />
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function InternalVideo({
  uri,
  height,
  width,
}: {
  uri: string;
  height: number;
  width: number;
}) {
  const [isMuted, setIsMuted] = useState(false);
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
    instance.muted = isMuted;
  });
  useEffect(() => {
    player.muted = isMuted;
  }, [isMuted, player]);

  return (
    <View style={{ width, height }}>
      <VideoView
        player={player}
        style={{ width, height }}
        contentFit="contain"
        nativeControls
      />
      <Pressable
        onPress={() => setIsMuted((prev) => !prev)}
        style={{
          position: "absolute",
          right: 20,
          bottom: 20,
          height: 44,
          width: 44,
          borderRadius: 22,
          backgroundColor: "rgba(0,0,0,0.55)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={22} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}
