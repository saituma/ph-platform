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
  const { colors } = useAppTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.7, { duration: 800 }), -1, true);
  }, []);

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
          backgroundColor: colors.backgroundSecondary,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}
