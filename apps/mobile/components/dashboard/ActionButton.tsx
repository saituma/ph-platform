import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

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
  if (fullWidth) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        className={`w-full flex-row items-center justify-center p-5 rounded-[24px] ${color} ${disabled ? "opacity-50" : ""}`}
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
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`flex-1 items-center gap-2 ${disabled ? "opacity-50" : ""}`}
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
    </TouchableOpacity>
  );
}
