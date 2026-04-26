import React, { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { fonts, radius } from "@/constants/theme";
import { useRunStore } from "@/store/useRunStore";
import { formatDistanceKm, formatDurationClock } from "@/lib/tracking/runUtils";

export function ActiveRunBanner() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const { status, distanceMeters, elapsedSeconds, resumeRun } = useRunStore();

  const dotScale = useSharedValue(1);

  useEffect(() => {
    if (status === "running") {
      dotScale.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 600 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
        false,
      );
    } else {
      dotScale.value = 1;
    }
  }, [status, dotScale]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
  }));

  if (status !== "running" && status !== "paused") return null;

  const isPaused = status === "paused";

  return (
    <Pressable
      onPress={() => router.push("/(tabs)/tracking/active-run" as any)}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: isDark ? colors.cardElevated : colors.card,
        borderRadius: radius.xl,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
        borderLeftWidth: 4,
        borderLeftColor: isPaused ? colors.amber : colors.accent,
        opacity: pressed ? 0.9 : 1,
        marginTop: 12,
      })}
    >
      {isPaused ? (
        <View style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: colors.amber,
        }} />
      ) : (
        <Animated.View style={[dotStyle, {
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: colors.accent,
        }]} />
      )}

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <Text style={{ fontFamily: fonts.accentBold, fontSize: 20, color: colors.textPrimary, fontVariant: ["tabular-nums"] }}>
            {formatDistanceKm(distanceMeters, 2)}
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary }}>{" "}km</Text>
          </Text>
          <View style={{
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: radius.pill,
            backgroundColor: isPaused ? colors.amber : "#ef4444",
          }}>
            <Text style={{ fontFamily: fonts.labelCaps, fontSize: 9, color: "#fff", letterSpacing: 0.5 }}>
              {isPaused ? "PAUSED" : "LIVE"}
            </Text>
          </View>
        </View>
        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary, fontVariant: ["tabular-nums"] }}>
          {formatDurationClock(elapsedSeconds)} · Tap to return
        </Text>
      </View>

      {isPaused ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            resumeRun();
            router.push("/(tabs)/tracking/active-run" as any);
          }}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: colors.accent,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: radius.pill,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Ionicons name="play" size={14} color="#fff" />
          <Text style={{ fontFamily: fonts.accentBold, fontSize: 13, color: "#fff" }}>
            Resume
          </Text>
        </Pressable>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
      )}
    </Pressable>
  );
}
