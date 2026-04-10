import React from "react";
import { Pressable, View, Image, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

const absoluteFillObject = StyleSheet.absoluteFillObject;

interface VideoPosterProps {
  posterUri?: string | null;
  onPress: () => void;
  previewOnly?: boolean;
  onPreviewPress?: () => void;
}

export function VideoPoster({
  posterUri,
  onPress,
  previewOnly,
  onPreviewPress,
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
          resizeMode="cover"
        />
      )}
      <View
        style={[absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.4)" }]}
      />
      <View
        style={{
          backgroundColor: "rgba(255,255,255,0.25)",
          borderRadius: 50,
          padding: 20,
        }}
      >
        <Feather name="play" size={48} color="white" />
      </View>
    </Pressable>
  );
}
