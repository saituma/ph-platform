import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { tokens } from "@/src/theme/tokens";

export interface UnreadBadgeProps {
  count: number;
}

const getDisplayCount = (count: number): string => {
  if (count > 99) return "99+";
  return String(count);
};

export const UnreadBadge = ({ count }: UnreadBadgeProps) => {
  if (count <= 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text allowFontScaling={true} style={styles.text}>
        {getDisplayCount(count)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minWidth: tokens.fontSize.large,
    paddingHorizontal: tokens.spacing.sm,
    height: tokens.fontSize.large,
    borderRadius: tokens.radii.badge,
    backgroundColor: tokens.colors.unreadBadge,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.bubbleSentText,
  },
});
