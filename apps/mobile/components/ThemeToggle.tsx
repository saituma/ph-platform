import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

export function ThemeToggle() {
  const { isDark, toggleColorScheme, colors, isSwitching } = useAppTheme();
  const transition = useSharedValue(isDark ? 1 : 0);

  useEffect(() => {
    transition.value = withSpring(isDark ? 1 : 0, {
      damping: 15,
      stiffness: 150,
    });
  }, [isDark, transition]);

  const sunStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(transition.value, [0, 1], [1, 0]),
      transform: [
        { scale: interpolate(transition.value, [0, 1], [1, 0]) },
        { rotate: `${interpolate(transition.value, [0, 1], [0, 180])}deg` },
      ],
    };
  });

  const moonStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(transition.value, [0, 1], [0, 1]),
      transform: [
        { scale: interpolate(transition.value, [0, 1], [0, 1]) },
        { rotate: `${interpolate(transition.value, [0, 1], [-180, 0])}deg` },
      ],
    };
  });

  return (
    <Pressable
      onPress={toggleColorScheme}
      disabled={isSwitching}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isDark ? colors.card : colors.backgroundSecondary,
        overflow: "hidden",
        transform: [{ scale: pressed ? 0.93 : 1 }],
        ...(isDark ? Shadows.none : Shadows.sm),
      })}
    >
      {isSwitching ? (
        <View style={{ position: "absolute" }}>
          <ActivityIndicator size="small" color={colors.themeToggleIcon} />
        </View>
      ) : null}
      <Animated.View style={[sunStyle, { position: "absolute" }]}>
        <Feather name="sun" size={22} color={colors.themeToggleIcon} />
      </Animated.View>
      <Animated.View style={[moonStyle, { position: "absolute" }]}>
        <Feather name="moon" size={22} color={colors.accent} />
      </Animated.View>
    </Pressable>
  );
}
