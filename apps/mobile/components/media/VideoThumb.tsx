/**
 * VideoThumb — a lightweight stand-in for VideoPlayer that renders a poster
 * image + play overlay WITHOUT allocating a native video decoder.
 *
 * Use this everywhere a list could mount many `<VideoPlayer>` instances
 * simultaneously. Tap → the parent swaps this thumb out for a real player
 * (or pushes a dedicated detail screen). Off-screen videos stay as thumbs.
 *
 * Cost vs VideoPlayer:
 *   - 1× expo-image (memory-disk cached) and 1× Pressable.
 *   - Zero useVideoPlayer hooks, zero native VideoView, zero decoder.
 *   - Mounting 30 of these costs roughly the same as mounting 30 Image.
 */
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";

interface VideoThumbProps {
  posterUri?: string | null;
  /** Aspect-ratio-driven height. Pass height OR style — height takes precedence. */
  height?: number;
  durationSec?: number | null;
  label?: string | null;
  onPress: () => void;
  /** Optional rounded radius for the outer frame. Defaults to 0 — caller usually
   * wraps in their own rounded container. */
  borderRadius?: number;
  testID?: string;
}

function formatDuration(sec: number | null | undefined): string | null {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideoThumb({
  posterUri,
  height,
  durationSec,
  label,
  onPress,
  borderRadius = 0,
  testID,
}: VideoThumbProps) {
  const durLabel = formatDuration(durationSec);
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label ?? "Play video"}
      style={[
        styles.frame,
        { borderRadius, height: height ?? 200 },
      ]}
    >
      {posterUri ? (
        <Image
          source={{ uri: posterUri }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={120}
        />
      ) : null}
      <View style={[StyleSheet.absoluteFillObject, styles.scrim]} />
      <View style={styles.playPill}>
        <Feather name="play" size={32} color="#fff" />
        <Text style={styles.tapLabel}>Tap to play</Text>
      </View>
      {durLabel ? (
        <View style={styles.durationChip}>
          <Text style={styles.durationText}>{durLabel}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  scrim: {
    backgroundColor: "rgba(0,0,0,0.32)",
  },
  playPill: {
    alignItems: "center",
    gap: 6,
  },
  tapLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontFamily: "Outfit-SemiBold",
  },
  durationChip: {
    position: "absolute",
    bottom: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  durationText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
});
