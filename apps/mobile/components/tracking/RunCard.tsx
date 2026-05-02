import React, { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { fonts, radius } from "@/constants/theme";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";

// Feel tag pill type for passing in data
export type FeelTagDetails = {
  icon: any;
  label: string;
};

interface RunCardProps {
  distance: string;
  date: string;
  time: string;
  pace: string;
  effortLevel?: number;
  feelTags?: FeelTagDetails[];
  onPress?: () => void;
  /** Index for staggered entering animation */
  index?: number;
}

/** Animate a numeric value from 0 to its parsed target when the card mounts. */
function AnimatedNumericText({
  text,
  style,
}: {
  text: string;
  style: any;
}) {
  // Extract leading number (e.g. "5.2 km" -> 5.2, "32:04" -> pass-through)
  const match = text.match(/^(\d+\.?\d*)/);
  const numericValue = match ? parseFloat(match[1]) : null;
  const suffix = match ? text.slice(match[0].length) : "";
  const hasDecimal = match ? match[1].includes(".") : false;
  const decimals = hasDecimal ? (match![1].split(".")[1]?.length ?? 1) : 0;

  const animValue = useSharedValue(0);
  const [display, setDisplay] = useState(numericValue != null ? "0" : text);

  useEffect(() => {
    if (numericValue == null) return;
    animValue.value = 0;
    animValue.value = withTiming(numericValue, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [numericValue]);

  useAnimatedReaction(
    () => animValue.value,
    (current) => {
      if (numericValue == null) return;
      const formatted =
        decimals > 0 ? current.toFixed(decimals) : String(Math.round(current));
      runOnJS(setDisplay)(formatted + suffix);
    },
  );

  if (numericValue == null) {
    return <Text style={style}>{text}</Text>;
  }

  return <Text style={style}>{display}</Text>;
}

export const RunCard = ({
  distance,
  date,
  time,
  pace,
  effortLevel,
  feelTags,
  onPress,
  index = 0,
}: RunCardProps) => {
  const { colors } = useAppTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressHandler = onPress ?? (() => {});

  const tap = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.96, { damping: 15, stiffness: 400, mass: 0.3 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSpring(1, { damping: 20, stiffness: 300, mass: 0.4 });
    })
    .onEnd(() => {
      'worklet';
      runOnJS(onPressHandler)();
    });

  // Resolve accent color based on effort mapping:
  // RPE: <=4 (Lime), 5-6 (Purple), >=7 (Coral)
  const getEffortColor = () => {
    if (effortLevel === undefined) return colors.accent;
    if (effortLevel <= 4) return colors.accent;
    if (effortLevel <= 6) return colors.purple;
    return colors.danger;
  };

  const effortColor = getEffortColor();
  const getEffortBorderColor = () => {
    if (effortLevel === undefined) return colors.border;
    return colors.border;
  };

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 50).springify().damping(15)}>
    <GestureDetector gesture={tap}>
      <Animated.View
        style={[
          animatedStyle,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radius.xl,
            padding: 16,
            overflow: "hidden",
          },
        ]}
      >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: radius.md,
            backgroundColor: colors.cardElevated,
            borderColor: getEffortBorderColor(),
            borderWidth: 1,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 16,
          }}
        >
          <MaterialCommunityIcons
            name="shoe-print"
            size={22}
            color={effortColor}
          />
        </View>

        <View style={{ flex: 1, justifyContent: "center" }}>
          <AnimatedNumericText
            text={distance}
            style={{
              fontFamily: fonts.heading2,
              fontSize: 18,
              color: colors.text,
            }}
          />
          <Text
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 13,
              color: colors.textSecondary,
              marginTop: 4,
            }}
          >
            {date}
          </Text>
        </View>

        <View
          style={{
            alignItems: "flex-end",
            justifyContent: "center",
            marginRight: 16,
          }}
        >
          <AnimatedNumericText
            text={time}
            style={{
              fontFamily: fonts.statNumber,
              fontSize: 16,
              color: colors.text,
              fontVariant: ["tabular-nums"],
            }}
          />
          <AnimatedNumericText
            text={pace}
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 12,
              color: colors.textSecondary,
              marginTop: 4,
            }}
          />
        </View>

        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.tabIconDefault}
        />
      </View>

      {/* Bottom Row tags */}
      {feelTags && feelTags.length > 0 && (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 6,
            marginTop: 16,
          }}
        >
          {feelTags.map((tag, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.cardElevated,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radius.pill,
                paddingHorizontal: 10,
                paddingVertical: 4,
                gap: 4,
              }}
            >
              {/* Note: tag.icon comes from constants mapping */}
              <Text
                style={{
                  color: colors.textSecondary,
                  fontFamily: fonts.accent,
                  fontSize: 11,
                }}
              >
                {tag.label}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Gradient overlay at bottom for subtle effect */}
      <LinearGradient
        colors={[`${colors.card}00`, colors.card]}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 12, // subtle height
        }}
        pointerEvents="none"
      />
      </Animated.View>
    </GestureDetector>
    </Animated.View>
  );
};
