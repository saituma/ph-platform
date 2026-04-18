import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { radius, fonts } from "@/constants/theme";

type ActiveTab = "running" | "social";

export function TrackingHeaderTabs({
  active,
  colors,
  isDark,
  topInset = 0,
}: {
  active: ActiveTab;
  colors: Record<string, string>;
  isDark: boolean;
  topInset?: number;
}) {
  const router = useRouter();

  const containerBg = useMemo(
    () => (isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)"),
    [isDark],
  );
  const borderColor = useMemo(
    () => (isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)"),
    [isDark],
  );

  const go = (next: ActiveTab) => {
    if (next === active) return;
    router.replace(
      (next === "running" ? "/(tabs)/tracking" : "/(tabs)/tracking/social") as any,
    );
  };

  return (
    <View
      style={{
        paddingTop: topInset,
        paddingHorizontal: 16,
        paddingBottom: 10,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          backgroundColor: containerBg,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor,
          overflow: "hidden",
        }}
      >
        <TabPill
          label="Running"
          active={active === "running"}
          onPress={() => go("running")}
          colors={colors}
        />
        <TabPill
          label="Social"
          active={active === "social"}
          onPress={() => go("social")}
          colors={colors}
        />
      </View>
    </View>
  );
}

function TabPill({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: Record<string, string>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? colors.accent : "transparent",
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <Text
        style={{
          fontFamily: active ? fonts.heading2 : fonts.bodyMedium,
          fontSize: 13,
          letterSpacing: active ? 0.4 : 0.2,
          color: active ? "#FFFFFF" : colors.textSecondary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
