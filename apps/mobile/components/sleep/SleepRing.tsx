import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
  useDerivedValue,
  useAnimatedStyle,
  interpolate,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { Text } from "@/components/ScaledText";
import { fonts } from "@/constants/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface RingLayer {
  progress: number;
  color: string;
  radius: number;
}

interface SleepRingProps {
  size: number;
  strokeWidth: number;
  layers: RingLayer[];
  centerText: string;
  centerSubtext?: string;
  centerTextColor: string;
  centerSubtextColor?: string;
  trackColor: string;
  animate?: boolean;
}

function AnimatedRingLayer({
  cx,
  cy,
  radius,
  strokeWidth,
  color,
  trackColor,
  progress,
  index,
  animate,
}: {
  cx: number;
  cy: number;
  radius: number;
  strokeWidth: number;
  color: string;
  trackColor: string;
  progress: number;
  index: number;
  animate: boolean;
}) {
  const circumference = 2 * Math.PI * radius;
  const animProgress = useSharedValue(0);

  useEffect(() => {
    if (animate) {
      animProgress.value = 0;
      animProgress.value = withDelay(
        300 + index * 200,
        withTiming(Math.min(1, Math.max(0, progress)), {
          duration: 1200,
          easing: Easing.out(Easing.cubic),
        }),
      );
    } else {
      animProgress.value = Math.min(1, Math.max(0, progress));
    }
  }, [progress, animate]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animProgress.value),
  }));

  return (
    <>
      <Circle
        cx={cx}
        cy={cy}
        r={radius}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <AnimatedCircle
        cx={cx}
        cy={cy}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        animatedProps={animatedProps}
        strokeLinecap="round"
        rotation={-90}
        origin={`${cx}, ${cy}`}
      />
    </>
  );
}

export const SleepRing = React.memo(function SleepRing({
  size,
  strokeWidth,
  layers,
  centerText,
  centerSubtext,
  centerTextColor,
  centerSubtextColor,
  trackColor,
  animate = true,
}: SleepRingProps) {
  const center = size / 2;

  const scale = useSharedValue(animate ? 0.85 : 1);
  const opacity = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (animate) {
      scale.value = withDelay(200, withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.2)) }));
      opacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    }
  }, [animate]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, containerStyle]}>
      <Svg width={size} height={size}>
        {layers.map((layer, i) => (
          <AnimatedRingLayer
            key={i}
            cx={center}
            cy={center}
            radius={layer.radius}
            strokeWidth={strokeWidth}
            color={layer.color}
            trackColor={trackColor}
            progress={layer.progress}
            index={i}
            animate={animate}
          />
        ))}
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.centerText, { color: centerTextColor }]}>
          {centerText}
        </Text>
        {centerSubtext ? (
          <Text style={[styles.centerSubtext, { color: centerSubtextColor ?? centerTextColor }]}>
            {centerSubtext}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: {
    fontFamily: fonts.heroNumber,
    fontSize: 42,
    letterSpacing: -1.5,
  },
  centerSubtext: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    marginTop: -4,
  },
});
