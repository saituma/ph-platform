import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import { tokens } from "@/src/theme/tokens";

const AVATAR_BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";
const INITIALS_TEXT_SCALE = 0.38;
const ONLINE_DOT_SIZE = tokens.spacing.md - tokens.spacing.xs / 2;
const ONLINE_DOT_BORDER =
  tokens.spacing.sm - tokens.spacing.xs - tokens.spacing.xs / 2;

const AVATAR_COLOR_PALETTE = [
  tokens.colors.primary,
  tokens.colors.success,
  tokens.colors.warning,
  tokens.colors.danger,
  tokens.colors.bubbleSent,
  tokens.colors.bubbleReceived,
  tokens.colors.separator,
  tokens.colors.border,
] as const;

export interface AvatarProps {
  name: string;
  uri?: string;
  size: number;
  online?: boolean;
}

const getInitials = (name: string): string => {
  const cleaned = name.trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0).toUpperCase() ?? "";
  const last = (parts.length > 1 ? parts[parts.length - 1] : parts[0])
    ?.charAt(0)
    .toUpperCase();
  return `${first}${last ?? ""}`;
};

const getNameHash = (name: string): number => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getAvatarColor = (name: string): string => {
  const index = getNameHash(name) % AVATAR_COLOR_PALETTE.length;
  return AVATAR_COLOR_PALETTE[index];
};

const createDynamicStyles = (size: number, backgroundColor: string) =>
  StyleSheet.create({
    avatarBase: {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
    initialsText: {
      fontSize: Math.max(tokens.fontSize.xs, Math.floor(size * INITIALS_TEXT_SCALE)),
      fontWeight: tokens.fontWeight.bold,
      color: tokens.colors.primaryText,
    },
    fallbackBackground: {
      backgroundColor,
    },
    onlineDot: {
      width: ONLINE_DOT_SIZE,
      height: ONLINE_DOT_SIZE,
      borderRadius: tokens.radii.badge,
      borderWidth: ONLINE_DOT_BORDER,
      borderColor: tokens.colors.bubbleSentText,
      backgroundColor: tokens.colors.success,
      position: "absolute",
      right: tokens.spacing.xs,
      bottom: tokens.spacing.xs,
    },
  });

export const Avatar = ({ name, uri, size, online = false }: AvatarProps) => {
  const initials = useMemo(() => getInitials(name), [name]);
  const backgroundColor = useMemo(() => getAvatarColor(name), [name]);
  const dynamicStyles = useMemo(
    () => createDynamicStyles(size, backgroundColor),
    [backgroundColor, size],
  );

  return (
    <View style={styles.container}>
      {uri ? (
        <Image
          source={{ uri }}
          placeholder={{ blurhash: AVATAR_BLURHASH }}
          contentFit="cover"
          style={[styles.avatar, dynamicStyles.avatarBase]}
          accessibilityLabel={`${name} avatar`}
          accessibilityRole="image"
        />
      ) : (
        <View
          style={[
            styles.avatar,
            styles.fallbackAvatar,
            dynamicStyles.avatarBase,
            dynamicStyles.fallbackBackground,
          ]}
          accessibilityLabel={`${name} avatar`}
          accessibilityRole="image"
        >
          <Text allowFontScaling={true} style={dynamicStyles.initialsText}>
            {initials}
          </Text>
        </View>
      )}
      {online ? <View style={dynamicStyles.onlineDot} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignSelf: "flex-start",
  },
  avatar: {
    overflow: "hidden",
  },
  fallbackAvatar: {
    alignItems: "center",
    justifyContent: "center",
  },
});
