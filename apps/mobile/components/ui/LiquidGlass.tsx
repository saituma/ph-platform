import React from "react";
import { Platform, StyleSheet, View, type ViewProps } from "react-native";
import { BlurView } from "expo-blur";
import {
  GlassContainer as ExpoGlassContainer,
  GlassView,
  type GlassColorScheme,
  type GlassStyle,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { useColorScheme } from "@/hooks/use-color-scheme";

function normalizeTintColor(tintColor?: string) {
  if (!tintColor) return undefined;
  const trimmed = tintColor.trim().toLowerCase();
  if (!trimmed || trimmed === "transparent") return undefined;
  return tintColor;
}

function getDefaultOverlayColor(colorScheme: "light" | "dark") {
  return colorScheme === "dark" ? "rgba(10, 10, 10, 0.18)" : "rgba(255, 255, 255, 0.14)";
}

/**
 * Props for the LiquidGlass component.
 */
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
   * @default 80
   */
  blurIntensity?: number;

  /**
   * Tint color for the fallback blur.
   */
  blurTint?: 'light' | 'dark' | 'default';
}

/**
 * A reusable Liquid Glass component that provides native iOS liquid glass effects
 * with an elegant fallback for Android and older iOS versions.
 * 
 * @example
 * <LiquidGlass style={{ width: 200, height: 100, borderRadius: 12 }}>
 *   <Text>Glass Content</Text>
 * </LiquidGlass>
 */
export const LiquidGlass: React.FC<LiquidGlassProps> = ({
  children,
  style,
  glassStyle = 'regular',
  isInteractive = false,
  tintColor,
  colorScheme = 'auto',
  blurIntensity = 80,
  blurTint,
  ...props
}) => {
  const systemColorScheme = useColorScheme();
  const resolvedColorScheme = systemColorScheme === "light" ? "light" : "dark";
  const resolvedBlurTint = blurTint || (resolvedColorScheme === "dark" ? "dark" : "light");
  const normalizedTintColor = normalizeTintColor(tintColor);

  // Check if liquid glass is available on this device
  const canUseLiquidGlass = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

  if (canUseLiquidGlass) {
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

  // Fallback for Android and unsupported iOS versions
  const overlayColor = normalizedTintColor ?? getDefaultOverlayColor(resolvedColorScheme);
  return (
    <View 
      style={[
        styles.fallbackContainer, 
        style,
      ]} 
      {...props}
    >
      <BlurView
        intensity={blurIntensity}
        tint={resolvedBlurTint}
        style={[
          StyleSheet.absoluteFill,
        ]}
        pointerEvents="none"
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: overlayColor },
        ]}
      />
      {children}
    </View>
  );
};

/**
 * Props for the LiquidGlassContainer component.
 */
export interface LiquidGlassContainerProps extends ViewProps {
  /**
   * The distance at which glass elements start affecting each other.
   */
  spacing?: number;
}

/**
 * A container for multiple LiquidGlass components that allows them to interact/merge.
 */
export const LiquidGlassContainer: React.FC<LiquidGlassContainerProps> = ({
  children,
  spacing,
  style,
  ...props
}) => {
  const canUseLiquidGlass = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

  if (canUseLiquidGlass) {
    return (
      <ExpoGlassContainer spacing={spacing} style={style} {...props}>
        {children}
      </ExpoGlassContainer>
    );
  }

  // Simple View fallback for container
  return (
    <View style={style} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  fallbackContainer: {
    overflow: 'hidden',
  },
});
