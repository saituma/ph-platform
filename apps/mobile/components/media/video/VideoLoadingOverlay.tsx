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

  return (
    <View
      pointerEvents="none"
      style={[
        absoluteFillObject,
        {
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.5)",
          zIndex: 20,
        },
      ]}
    >
      <ActivityIndicator size="large" color={accentColor} />
      <Text style={{ color: "white", marginTop: 12 }}>
        {isLoading ? "Loading..." : "Buffering..."}
      </Text>
    </View>
  );
}
