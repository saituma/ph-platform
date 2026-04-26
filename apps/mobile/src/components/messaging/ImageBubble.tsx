import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";

import { tokens } from "@/src/theme/tokens";

const DEFAULT_BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";
const IMAGE_WIDTH = tokens.fontSize.large * 11;
const IMAGE_HEIGHT = tokens.fontSize.large * 8;
const TAIL_SIZE = tokens.spacing.sm - tokens.spacing.xs / 2;

export interface ImageBubbleProps {
  uri: string;
  isOwn: boolean;
  blurhash?: string;
  hideTail?: boolean;
  onPress: () => void;
}

export const ImageBubble = ({
  uri,
  isOwn,
  blurhash,
  hideTail = false,
  onPress,
}: ImageBubbleProps) => {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open image message"
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
          source={{ uri }}
          placeholder={{ blurhash: blurhash ?? DEFAULT_BLURHASH }}
          contentFit="cover"
          cachePolicy="memory-disk"
          style={styles.image}
          transition={tokens.timing.fast}
        />
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
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
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
  image: {
    width: "100%",
    height: "100%",
    borderRadius: tokens.radii.bubble,
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
