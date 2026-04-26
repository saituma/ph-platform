import React from "react";
import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { View } from "react-native";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";

type AdminCardProps = PropsWithChildren<{
  className?: string;
  style?: StyleProp<ViewStyle>;
  accentColor?: string;
  accentBar?: boolean;
}>;

export function AdminCard({ children, className, style, accentColor, accentBar }: AdminCardProps) {
  const { isDark, colors } = useAppTheme();

  if (className) {
    // Legacy className-based usage: keep original behaviour but add light shadow
    return (
      <View
        className={className}
        style={[isDark ? Shadows.none : Shadows.md, style]}
      >
        {children}
      </View>
    );
  }

  const barColor = accentColor ?? colors.accent;

  return (
    <View
      style={[
        {
          borderRadius: 22,
          borderWidth: 1,
          backgroundColor: isDark ? colors.cardElevated : colors.card,
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)",
          padding: 20,
          overflow: "hidden",
        },
        isDark ? Shadows.none : Shadows.md,
        style,
      ]}
    >
      {accentBar !== false && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            backgroundColor: barColor,
            opacity: 0.65,
          }}
        />
      )}
      {children}
    </View>
  );
}
