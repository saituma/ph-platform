import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";

import { tokens } from "@/src/theme/tokens";

const DEFAULT_BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";
const VIDEO_WIDTH = tokens.fontSize.large * 11;
const VIDEO_HEIGHT = tokens.fontSize.large * 8;
const PLAY_BUTTON_SIZE = tokens.spacing.xxl + tokens.spacing.sm;
const PLAY_ICON_SIZE = tokens.fontSize.large;
const TAIL_SIZE = tokens.spacing.sm - tokens.spacing.xs / 2;
const BADGE_ALPHA = 0.62;
const PLAY_BG_ALPHA = 0.52;

export interface VideoBubbleProps {
  thumbnailUri: string;
  duration: number;
  isOwn: boolean;
  hideTail?: boolean;
  onPress: () => void;
}

const hexToRgba = (hexColor: string, alpha: number): string => {
  const hex = hexColor.replace("#", "");
  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : hex;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const formatDuration = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
};

const playOverlayColor = hexToRgba(tokens.colors.primaryText, PLAY_BG_ALPHA);
const durationBadgeColor = hexToRgba(tokens.colors.primaryText, BADGE_ALPHA);
const dynamicStyles = StyleSheet.create({
  playOverlay: { backgroundColor: playOverlayColor },
  durationOverlay: { backgroundColor: durationBadgeColor },
});

export const VideoBubble = ({
  thumbnailUri,
  duration,
  isOwn,
  hideTail = false,
  onPress,
}: VideoBubbleProps) => {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Play video message"
      onPress={onPress}
      style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}
    >
      <View
        style={[
          styles.bubble,
          isOwn ? styles.ownBubble : styles.otherBubble,
          isOwn ? styles.alignEnd : styles.alignStart,
        ]}
      >
        <Image
          source={{ uri: thumbnailUri }}
          placeholder={{ blurhash: DEFAULT_BLURHASH }}
          contentFit="cover"
          style={styles.thumbnail}
          transition={tokens.timing.fast}
        />
        <View style={[styles.playButton, dynamicStyles.playOverlay]}>
          <Ionicons name="play" size={PLAY_ICON_SIZE} color={tokens.colors.bubbleSentText} />
        </View>
        <View style={[styles.durationBadge, dynamicStyles.durationOverlay]}>
          <Text allowFontScaling={true} style={styles.durationText}>
            {formatDuration(duration)}
          </Text>
        </View>
      </View>
      {hideTail ? null : (
        <View
          style={[
            styles.tailBase,
            isOwn ? styles.ownTail : styles.otherTail,
            isOwn ? styles.ownTailPosition : styles.otherTailPosition,
          ]}
        />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: "75%",
    position: "relative",
  },
  ownContainer: {
    alignSelf: "flex-end",
  },
  otherContainer: {
    alignSelf: "flex-start",
  },
  bubble: {
    borderRadius: tokens.radii.bubble,
    overflow: "hidden",
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  ownBubble: {
    backgroundColor: tokens.colors.bubbleSent,
  },
  otherBubble: {
    backgroundColor: tokens.colors.bubbleReceived,
  },
  alignEnd: {
    alignSelf: "flex-end",
  },
  alignStart: {
    alignSelf: "flex-start",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: tokens.radii.bubble,
  },
  playButton: {
    width: PLAY_BUTTON_SIZE,
    height: PLAY_BUTTON_SIZE,
    borderRadius: tokens.radii.avatar,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
  },
  durationBadge: {
    borderRadius: tokens.radii.pill,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    position: "absolute",
    right: tokens.spacing.sm,
    bottom: tokens.spacing.sm,
  },
  durationText: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.bubbleSentText,
  },
  tailBase: {
    width: 0,
    height: 0,
    borderTopWidth: TAIL_SIZE,
    borderBottomWidth: 0,
    borderLeftWidth: TAIL_SIZE,
    borderRightWidth: TAIL_SIZE,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    position: "absolute",
    bottom: 0,
  },
  ownTail: {
    borderLeftColor: "transparent",
    borderRightColor: tokens.colors.bubbleSent,
  },
  otherTail: {
    borderRightColor: "transparent",
    borderLeftColor: tokens.colors.bubbleReceived,
  },
  ownTailPosition: {
    right: tokens.spacing.xs,
  },
  otherTailPosition: {
    left: tokens.spacing.xs,
  },
});
