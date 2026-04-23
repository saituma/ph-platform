import React from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { Text } from "@/components/ScaledText";
import { fonts, radius } from "@/constants/theme";

export function ActiveRunActionDock({
  status,
  colors,
  isDark,
  onPrimaryPress,
  onOpenSheet,
  onAddRoute,
}: {
  status: "idle" | "running" | "paused" | "stopped";
  colors: Record<string, string>;
  isDark: boolean;
  onPrimaryPress: () => void;
  onOpenSheet: () => void;
  onAddRoute: () => void;
}) {
  const isRunning = status === "running";
  const primaryIcon = isRunning ? "pause" : "play";

  return (
    <View
      style={{
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: "100%",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-end",
          paddingHorizontal: 16,
          gap: 10,
        }}
      >
        <DockButton
          label="Run"
          icon="walk-outline"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onOpenSheet();
          }}
          colors={colors}
          isDark={isDark}
          selected
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isRunning ? "Pause" : "Start"}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onPrimaryPress();
          }}
          style={({ pressed }) => ({
            width: 104,
            height: 104,
            borderRadius: 52,
            backgroundColor: colors.accent,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.92 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
            shadowColor: "#000",
            shadowOpacity: 0.25,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 12 },
            elevation: 14,
          })}
        >
          <Ionicons name={primaryIcon as any} size={50} color="#fff" />
        </Pressable>

        <DockButton
          label="Add Route"
          icon="options-outline"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onAddRoute();
          }}
          colors={colors}
          isDark={isDark}
        />
      </View>
    </View>
  );
}

function DockButton({
  label,
  icon,
  onPress,
  colors,
  isDark,
  selected = false,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  colors: Record<string, string>;
  isDark: boolean;
  selected?: boolean;
}) {
  const bg = selected ? "rgba(255,120,40,0.22)" : isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)";
  const fg = selected ? colors.accent : colors.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
          style={({ pressed }) => ({
            alignItems: "center",
        gap: 12,
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
            flex: 1,
      })}
    >
      <View
        style={{
          width: 84,
          height: 84,
          borderRadius: 42,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon as any} size={32} color={fg} />
        {selected ? (
          <View
            style={{
              position: "absolute",
              right: 8,
              top: 8,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: colors.accent,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
        ) : null}
      </View>
      <Text
        numberOfLines={1}
        style={{
          fontFamily: fonts.bodyMedium,
          fontSize: 16,
          color: colors.textPrimary,
          textAlign: "center",
          lineHeight: 21,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
