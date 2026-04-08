import React, { useEffect, useMemo } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { radius } from "@/constants/theme";

interface PulsingDotProps {
  color?: string;
  /**
   * Inner dot diameter in px.
   * Outer/mid rings scale proportionally.
   */
  size?: number;
}

export const PulsingDot = ({ color = "#00E5FF", size = 8 }: PulsingDotProps) => {
  const dimensions = useMemo(() => {
    const safeSize = Math.max(4, Math.round(size));
    return {
      container: safeSize * 5,
      outer: safeSize * 5,
      mid: safeSize * 3,
      inner: safeSize,
    };
  }, [size]);

  // 3 rings: outer, mid, inner
  const scaleOuter = useSharedValue(1);
  const opacityOuter = useSharedValue(0.15);
  
  const scaleMid = useSharedValue(1);
  const opacityMid = useSharedValue(0.3);

  useEffect(() => {
    // Outer ring scale 1->1.8, opacity 0.15->0, 0ms delay
    scaleOuter.value = withRepeat(
      withTiming(1.8, { duration: 1500, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    opacityOuter.value = withRepeat(
      withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );

    // Mid ring
    scaleMid.value = withDelay(
      300,
      withRepeat(
        withTiming(1.8, { duration: 1500, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );
    opacityMid.value = withDelay(
      300,
      withRepeat(
        withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );
  }, []);

  const animatedStyleOuter = useAnimatedStyle(() => ({
    transform: [{ scale: scaleOuter.value }],
    opacity: opacityOuter.value,
  }));

  const animatedStyleMid = useAnimatedStyle(() => ({
    transform: [{ scale: scaleMid.value }],
    opacity: opacityMid.value,
  }));

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        width: dimensions.container,
        height: dimensions.container,
      }}
    >
      {/* Outer Ring */}
      <Animated.View style={[animatedStyleOuter, {
        position: "absolute",
        width: dimensions.outer,
        height: dimensions.outer,
        borderRadius: radius.pill,
        backgroundColor: color,
      }]} />
      
      {/* Mid Ring */}
      <Animated.View style={[animatedStyleMid, {
        position: "absolute",
        width: dimensions.mid,
        height: dimensions.mid,
        borderRadius: radius.pill,
        backgroundColor: color,
      }]} />
      
      {/* Inner Solid Dot */}
      <View style={{
        width: dimensions.inner,
        height: dimensions.inner,
        borderRadius: radius.pill,
        backgroundColor: color,
        zIndex: 10,
      }} />
    </View>
  );
};
