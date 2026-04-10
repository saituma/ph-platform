import React from "react";
import { View, ViewStyle, StyleSheet } from "react-native";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows, radius as radiusPresets } from "@/constants/theme";

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: "default" | "elevated" | "outline";
  padding?: number | keyof typeof import("@/constants/theme").spacing;
  radius?: keyof typeof radiusPresets | number;
  shadow?: keyof typeof Shadows;
}

export function Card({
  children,
  style,
  variant = "default",
  padding = "lg",
  radius = "lg",
  shadow = "sm",
}: CardProps) {
  const { colors, isDark } = useAppTheme();

  const resolvedPadding = typeof padding === "number" ? padding : 16; // Fallback if spacing not accessible
  const resolvedRadius = typeof radius === "number" ? radius : radiusPresets[radius];

  const baseStyle: ViewStyle = {
    backgroundColor: variant === "elevated" ? colors.cardElevated : colors.card,
    borderRadius: resolvedRadius,
    padding: resolvedPadding,
    borderWidth: variant === "outline" ? 1 : 0,
    borderColor: colors.border,
    ...(isDark ? Shadows.none : Shadows[shadow]),
  };

  return <View style={[baseStyle, style]}>{children}</View>;
}
