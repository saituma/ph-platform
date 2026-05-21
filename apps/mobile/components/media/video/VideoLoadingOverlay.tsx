import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Text } from "@/components/ScaledText";

const absoluteFillObject = StyleSheet.absoluteFillObject;

interface VideoLoadingOverlayProps {
  isLoading: boolean;
  isBuffering: boolean;
  accentColor: string;
}

export function VideoLoadingOverlay({
  isLoading,
  isBuffering,
  accentColor,
}: VideoLoadingOverlayProps) {
  if (!isLoading && !isBuffering) return null;

  // Show a small corner spinner — don't block the video frame with a full overlay.
  // The video plays behind this as soon as the first frame arrives.
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        bottom: 10,
        right: 10,
        zIndex: 20,
        backgroundColor: "rgba(0,0,0,0.45)",
        borderRadius: 20,
        padding: 6,
      }}
    >
      <ActivityIndicator size="small" color={accentColor} />
    </View>
  );
}
