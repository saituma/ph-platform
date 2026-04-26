import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { tokens } from "@/src/theme/tokens";

export interface DeliveryStatusProps {
  status: "sending" | "sent" | "delivered" | "read";
}

const ICON_SIZE = tokens.fontSize.body;
const ROTATION_DURATION_MS = tokens.timing.slow * 4;

export const DeliveryStatus = ({ status }: DeliveryStatusProps) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (status !== "sending") {
      cancelAnimation(rotation);
      rotation.value = 0;
      return;
    }

    rotation.value = withRepeat(
      withTiming(360, {
        duration: ROTATION_DURATION_MS,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(rotation);
      rotation.value = 0;
    };
  }, [rotation, status]);

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  if (status === "sending") {
    return (
      <Animated.View style={[styles.iconWrap, spinnerStyle]}>
        <Ionicons
          name="time-outline"
          size={ICON_SIZE}
          color={tokens.colors.tertiaryText}
        />
      </Animated.View>
    );
  }

  if (status === "sent") {
    return (
      <View style={styles.iconWrap}>
        <Ionicons
          name="checkmark-outline"
          size={ICON_SIZE}
          color={tokens.colors.tertiaryText}
        />
      </View>
    );
  }

  if (status === "delivered") {
    return (
      <View style={styles.iconWrap}>
        <Ionicons
          name="checkmark-done-outline"
          size={ICON_SIZE}
          color={tokens.colors.tertiaryText}
        />
      </View>
    );
  }

  return (
    <View style={styles.iconWrap}>
      <Ionicons
        name="checkmark-done"
        size={ICON_SIZE}
        color={tokens.colors.primary}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  iconWrap: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
});
