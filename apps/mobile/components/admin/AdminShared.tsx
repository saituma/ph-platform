import React from "react";
import { Pressable } from "react-native";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, isDark } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        {
          paddingHorizontal: 18,
          paddingVertical: 12,
          borderRadius: 18,
          borderWidth: 1.5,
          opacity: pressed ? 0.8 : 1,
          backgroundColor: selected
            ? isDark
              ? `${colors.accent}22`
              : `${colors.accent}16`
            : isDark
              ? "rgba(255,255,255,0.05)"
              : "rgba(15,23,42,0.05)",
          borderColor: selected
            ? colors.accent
            : isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(15,23,42,0.08)",
        },
      ]}
    >
      <Text
        className="text-[13px] font-outfit-bold font-bold uppercase tracking-[1.2px]"
        style={{ color: selected ? colors.accent : colors.textSecondary }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function SmallAction({
  label,
  tone,
  onPress,
  disabled,
}: {
  label: string;
  tone: "neutral" | "success" | "danger";
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors, isDark } = useAppTheme();
  const tint =
    tone === "success"
      ? colors.accent
      : tone === "danger"
        ? "#EF4444"
        : colors.text;
  const bg =
    tone === "success"
      ? isDark
        ? "rgba(200, 241, 53, 0.12)"
        : "rgba(200, 241, 53, 0.08)"
      : tone === "danger"
        ? isDark
          ? "rgba(239, 68, 68, 0.12)"
          : "rgba(239, 68, 68, 0.08)"
        : isDark
          ? "rgba(255, 255, 255, 0.08)"
          : "rgba(15, 23, 42, 0.05)";
  const border =
    tone === "success"
      ? "rgba(200, 241, 53, 0.2)"
      : tone === "danger"
        ? "rgba(239, 68, 68, 0.2)"
        : isDark
          ? "rgba(255, 255, 255, 0.12)"
          : "rgba(15, 23, 42, 0.08)";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 16,
          borderWidth: 1.5,
          backgroundColor: bg,
          borderColor: border,
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        },
      ]}
    >
      <Text
        className="text-[12px] font-outfit-bold font-bold uppercase tracking-wider"
        style={{ color: tint }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}
