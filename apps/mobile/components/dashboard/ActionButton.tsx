import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

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
        className={`w-full flex-row items-center justify-center p-5 rounded-[24px] ${color} ${disabled ? "opacity-50" : ""}`}
        style={({ pressed }) => ({
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: pressed ? 0.92 : 1,
          shadowColor: "#0F172A",
          shadowOpacity: isDark ? 0 : 0.12,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: isDark ? 0 : 6,
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
      className={`flex-1 items-center gap-2 ${disabled ? "opacity-50" : ""}`}
      style={({ pressed }) => ({
        transform: [{ scale: pressed ? 0.98 : 1 }],
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View
        className={`w-14 h-14 ${color} rounded-2xl items-center justify-center`}
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
