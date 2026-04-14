import React from "react";
import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { View } from "react-native";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";

type AdminCardProps = PropsWithChildren<{
  className?: string;
  style?: StyleProp<ViewStyle>;
}>;

export function AdminCard({ children, className, style }: AdminCardProps) {
  const { isDark } = useAppTheme();

  return (
    <View
      className={className ?? "rounded-card-lg border border-app bg-card-elevated p-6"}
      style={[isDark ? Shadows.none : Shadows.md, style]}
    >
      {children}
    </View>
  );
}

