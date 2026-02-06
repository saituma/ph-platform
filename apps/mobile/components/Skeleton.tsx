import React, { useEffect } from "react";
import { ViewStyle } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from "react-native-reanimated";

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
          backgroundColor: "#E2E8F0", // Base color (will be overridden by theme classes if applied)
        },
        animatedStyle,
        style,
      ]}
      className="bg-secondary opacity-20" // Uses theme class for colors
    />
  );
}
