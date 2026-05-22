import React from "react";
import { Pressable, View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";

const absoluteFillObject = StyleSheet.absoluteFillObject;

interface VideoPosterProps {
  posterUri?: string | null;
  onPress: () => void;
  previewOnly?: boolean;
  onPreviewPress?: () => void;
  /** When true, the poster is overlaid on top of an already-loading player —
   * dim the scrim and hide the giant play button so it reads as a thumbnail,
   * not a tap target. */
  buffering?: boolean;
}

export function VideoPoster({
  posterUri,
  onPress,
  previewOnly,
  onPreviewPress,
  buffering = false,
}: VideoPosterProps) {
  return (
    <Pressable
      onPress={previewOnly ? onPreviewPress : onPress}
      style={[
        absoluteFillObject,
        { justifyContent: "center", alignItems: "center", zIndex: 10 },
      ]}
    >
      {posterUri && (
        <Image
          source={{ uri: posterUri }}
          style={absoluteFillObject}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={120}
        />
      )}
      <View
        style={[
          absoluteFillObject,
          { backgroundColor: buffering ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.4)" },
        ]}
      />
      {!buffering && (
        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.25)",
            borderRadius: 50,
            padding: 20,
          }}
        >
          <Feather name="play" size={48} color="white" />
        </View>
      )}
    </Pressable>
  );
}
