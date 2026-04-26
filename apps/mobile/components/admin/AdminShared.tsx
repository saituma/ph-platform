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
          paddingVertical: 10,
          borderRadius: 20,
          borderWidth: 1.5,
          opacity: pressed ? 0.78 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
          backgroundColor: selected
            ? isDark
              ? `${colors.accent}20`
              : `${colors.accent}14`
            : isDark
              ? "rgba(255,255,255,0.04)"
              : "rgba(15,23,42,0.04)",
          borderColor: selected
            ? colors.accent
            : isDark
              ? "rgba(255,255,255,0.10)"
              : "rgba(15,23,42,0.09)",
        },
      ]}
    >
      <Text
        style={{
          fontFamily: "Outfit-Bold",
          fontSize: 12,
          letterSpacing: 1.0,
          textTransform: "uppercase",
          color: selected ? colors.accent : colors.textSecondary,
        }}
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

  const tintColor =
    tone === "success"
      ? colors.accent
      : tone === "danger"
        ? colors.danger
        : colors.textPrimary;

  const bgColor =
    tone === "success"
      ? isDark
        ? `${colors.accent}16`
        : `${colors.accent}10`
      : tone === "danger"
        ? isDark
          ? `${colors.danger}16`
          : `${colors.danger}10`
        : isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(15,23,42,0.05)";

  const borderColor =
    tone === "success"
      ? isDark
        ? `${colors.accent}28`
        : `${colors.accent}20`
      : tone === "danger"
        ? isDark
          ? `${colors.danger}28`
          : `${colors.danger}20`
        : isDark
          ? "rgba(255,255,255,0.10)"
          : "rgba(15,23,42,0.09)";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        backgroundColor: bgColor,
        borderColor: borderColor,
        opacity: disabled ? 0.4 : pressed ? 0.78 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
      })}
    >
      <Text
        style={{
          fontFamily: "Outfit-SemiBold",
          fontSize: 13,
          color: tintColor,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}
