import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Pressable } from "react-native";
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

export function ThemeToggle() {
  const { isDark, toggleColorScheme, colors } = useAppTheme();
  const transition = useSharedValue(isDark ? 1 : 0);

  useEffect(() => {
    transition.value = withSpring(isDark ? 1 : 0, {
      damping: 15,
      stiffness: 150,
    });
  }, [isDark]);

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
      className="w-12 h-12 items-center justify-center bg-secondary rounded-full border border-app shadow-sm relative overflow-hidden"
    >
      <Animated.View style={[sunStyle, { position: "absolute" }]}>
        <Feather name="sun" size={24} color={colors.themeToggleIcon} />
      </Animated.View>
      <Animated.View style={[moonStyle, { position: "absolute" }]}>
        <Feather name="moon" size={24} color={colors.accent} />
      </Animated.View>
    </Pressable>
  );
}
