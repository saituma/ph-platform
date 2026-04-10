import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withSequence, 
  withTiming, 
  Easing 
} from "react-native-reanimated";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

export function TypingIndicator() {
  const { colors } = useAppTheme();
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const animate = (sv: any, delay: number) => {
      sv.value = withRepeat(
        withSequence(
          withTiming(0, { duration: delay }),
          withTiming(1, { duration: 400, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
          withTiming(0, { duration: 400, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        ),
        -1,
        true
      );
    };
    animate(dot1, 0);
    animate(dot2, 200);
    animate(dot3, 400);
  }, []);

  const s1 = useAnimatedStyle(() => ({ transform: [{ translateY: -dot1.value * 4 }], opacity: 0.3 + dot1.value * 0.7 }));
  const s2 = useAnimatedStyle(() => ({ transform: [{ translateY: -dot2.value * 4 }], opacity: 0.3 + dot2.value * 0.7 }));
  const s3 = useAnimatedStyle(() => ({ transform: [{ translateY: -dot3.value * 4 }], opacity: 0.3 + dot3.value * 0.7 }));

  return (
    <View className="flex-row items-center gap-1.5 px-4 py-2 bg-card rounded-full self-start">
      <Animated.View style={[s1, { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }]} />
      <Animated.View style={[s2, { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }]} />
      <Animated.View style={[s3, { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }]} />
    </View>
  );
}
