import React from "react";
import { Alert, Pressable, View } from "react-native";
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
  onFinishRun,
}: {
  status: "idle" | "running" | "paused" | "stopped";
  colors: Record<string, string>;
  isDark: boolean;
  onPrimaryPress: () => void;
  onOpenSheet: () => void;
  onFinishRun: () => void;
}) {
  const isRunning = status === "running";
  const isPaused = status === "paused";
  const isActive = isRunning || isPaused;
  const primaryIcon = isRunning ? "pause" : "play";

  const handleFinish = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "End run?",
      "This will stop tracking and save your run.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Run",
          style: "destructive",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            onFinishRun();
          },
        },
      ],
    );
  };

  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{
          width: "100%",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 8,
        }}
      >
        <DockButton
          label="Settings"
          icon="settings-outline"
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
          accessibilityLabel={isRunning ? "Pause" : isPaused ? "Resume" : "Start"}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onPrimaryPress();
          }}
          style={({ pressed }) => ({
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: colors.accent,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.92 : 1,
            transform: [{ scale: pressed ? 0.96 : 1 }],
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          })}
        >
          <Ionicons name={primaryIcon as any} size={32} color="#fff" />
        </Pressable>

        {isActive ? (
          <DockButton
            label="End Run"
            icon="stop-circle-outline"
            onPress={handleFinish}
            colors={colors}
            isDark={isDark}
            danger
          />
        ) : (
          <View style={{ width: 64 }} />
        )}
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
  danger = false,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  colors: Record<string, string>;
  isDark: boolean;
  selected?: boolean;
  danger?: boolean;
}) {
  const bg = danger
    ? (isDark ? "rgba(220,90,90,0.16)" : "rgba(220,90,90,0.12)")
    : selected
    ? (isDark ? "rgba(52,199,89,0.15)" : "rgba(22,163,74,0.10)")
    : (isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)");
  const fg = danger ? "#D45A5A" : selected ? colors.accent : colors.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        gap: 6,
        opacity: pressed ? 0.8 : 1,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: bg,
          borderWidth: danger ? 1 : 0,
          borderColor: danger ? (isDark ? "rgba(220,90,90,0.34)" : "rgba(220,90,90,0.28)") : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon as any} size={22} color={fg} />
      </View>
      <Text
        numberOfLines={1}
        style={{
          fontFamily: fonts.bodyMedium,
          fontSize: 12,
          color: danger ? "#D45A5A" : colors.textPrimary,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
