import { Feather } from "@/components/ui/theme-icons";
import React from "react";
import { Pressable, View } from "react-native";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { Text } from "@/components/ScaledText";

interface ActionButtonProps {
  icon: any;
  label: string;
  color: string;
  iconColor?: string;
  onPress?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function ActionButton({
  icon,
  label,
  color,
  iconColor = "text-white",
  onPress,
  disabled = false,
  fullWidth = false,
}: ActionButtonProps) {
  const { isDark } = useAppTheme();

  if (fullWidth) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        // UI polish: fixed 56px target, softer edges, and subtle border for clearer button hierarchy.
        className={`w-full h-14 flex-row items-center justify-center px-5 rounded-2xl border border-app/10 ${color} ${disabled ? "opacity-55" : ""}`}
        style={({ pressed }) => ({
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: pressed ? 0.95 : 1,
          ...(isDark || disabled ? Shadows.none : Shadows.md),
        })}
      >
        <Feather
          name={icon}
          size={20}
          color={iconColor.startsWith("#") ? iconColor : undefined}
          className={!iconColor.startsWith("#") ? iconColor : undefined}
        />
        <Text className="ml-3 text-base font-bold font-clash text-white">
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-1 items-center gap-2 ${disabled ? "opacity-55" : ""}`}
      style={({ pressed }) => ({
        transform: [{ scale: pressed ? 0.98 : 1 }],
        opacity: pressed ? 0.95 : 1,
      })}
    >
      <View
        // UI polish: preserve 44+ tap target and avoid hard-edged icon tiles.
        className={`w-14 h-14 ${color} rounded-2xl border border-app/10 items-center justify-center`}
      >
        <Feather
          name={icon}
          size={24}
          color={iconColor.startsWith("#") ? iconColor : undefined}
          className={!iconColor.startsWith("#") ? iconColor : undefined}
        />
      </View>
      <Text className="text-xs font-medium font-outfit text-secondary text-center">
        {label}
      </Text>
    </Pressable>
  );
}
