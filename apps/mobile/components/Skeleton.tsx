import React, { useEffect } from "react";
import { ViewStyle } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from "react-native-reanimated";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
  circle?: boolean;
}

export function Skeleton({
  width,
  height,
  borderRadius = 8,
  style,
  circle,
}: SkeletonProps) {
  const { colors, isDark } = useAppTheme();
  const opacity = useSharedValue(isDark ? 0.24 : 0.35);

  useEffect(() => {
    // UI polish: gentler pulse range for less visual noise while loading.
    opacity.value = withRepeat(withTiming(isDark ? 0.48 : 0.7, { duration: 900 }), -1, true);
  }, [isDark, opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius: circle ? 999 : borderRadius,
          backgroundColor: isDark ? colors.backgroundSecondary : colors.cardElevated,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}
