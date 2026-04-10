import React from "react";
import { Platform, StyleSheet, View, type ViewProps } from "react-native";
import {
  GlassContainer as ExpoGlassContainer,
  GlassView,
  type GlassColorScheme,
  type GlassStyle,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";

const CAN_USE_LIQUID_GLASS =
  Platform.OS === "ios" &&
  isLiquidGlassAvailable() &&
  isGlassEffectAPIAvailable();

function normalizeTintColor(tintColor?: string): string | undefined {
  if (!tintColor) return undefined;
  const trimmed = tintColor.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

export interface LiquidGlassProps extends ViewProps {
  /**
   * The style of the glass effect.
   * @default 'regular'
   */
  glassStyle?: GlassStyle;
  /**
   * Whether the glass effect should be interactive.
   * @default false
   */
  isInteractive?: boolean;
  /**
   * Tint color to apply to the glass effect.
   */
  tintColor?: string;
  /**
   * Color scheme for the glass effect.
   * @default 'auto'
   */
  colorScheme?: GlassColorScheme;
  /**
   * Intensity of the fallback blur on Android/unsupported platforms.
   * @deprecated Fallback is now a solid color.
   */
  blurIntensity?: number;
  /**
   * Tint color for the fallback blur.
   * @deprecated Fallback is now a solid color.
   */
  blurTint?: "light" | "dark" | "default";
}

export const LiquidGlass: React.FC<LiquidGlassProps> = ({
  children,
  style,
  glassStyle = "regular",
  isInteractive = false,
  tintColor,
  colorScheme = "auto",

  blurIntensity: _blurIntensity,
  blurTint: _blurTint,
  ...props
}) => {
  const systemColorScheme = useColorScheme();

  const normalizedTintColor = normalizeTintColor(tintColor);

  if (CAN_USE_LIQUID_GLASS) {
    return (
      <GlassView
        style={style}
        glassEffectStyle={glassStyle}
        isInteractive={isInteractive}
        tintColor={normalizedTintColor}
        colorScheme={colorScheme}
        {...props}
      >
        {children}
      </GlassView>
    );
  }

  const effectiveScheme =
    colorScheme === "auto"
      ? systemColorScheme === "light"
        ? "light"
        : "dark"
      : colorScheme;

  const fallbackColor =
    normalizedTintColor ??
    (effectiveScheme === "dark" ? Colors.dark.cardElevated : Colors.light.card);

  return (
    <View
      style={[
        styles.fallbackContainer,
        { backgroundColor: fallbackColor },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

export interface LiquidGlassContainerProps extends ViewProps {
  spacing?: number;
}

export const LiquidGlassContainer: React.FC<LiquidGlassContainerProps> = ({
  children,
  spacing,
  style,
  ...props
}) => {
  if (CAN_USE_LIQUID_GLASS) {
    return (
      <ExpoGlassContainer spacing={spacing} style={style} {...props}>
        {children}
      </ExpoGlassContainer>
    );
  }

  return (
    <View style={style} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  fallbackContainer: {
    overflow: "hidden",
  },
});
