import React from "react";
import { View, Modal, Pressable, SafeAreaView, useWindowDimensions } from "react-native";
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

export function FullScreenMediaModal({ visible, onClose, uri, contentType }: Props) {
  const { width, height } = useWindowDimensions();

  if (!uri) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.98)" }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View className="px-6 py-4 flex-row justify-end">
            <Pressable onPress={onClose} className="h-10 w-10 rounded-full bg-white/10 items-center justify-center">
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            {contentType === "image" ? (
              <ExpoImage source={uri} contentFit="contain" style={{ width, height: height - 150 }} />
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

function InternalVideo({ uri, height, width }: { uri: string; height: number; width: number }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
    instance.muted = false;
  });
  return <VideoView player={player} style={{ width, height }} contentFit="contain" nativeControls />;
}
