import { Feather } from "@/components/ui/theme-icons";
import React from "react";
import { Pressable, View } from "react-native";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { Button } from "@/components/ui/Button";

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
      <Button
        label={label}
        onPress={onPress}
        disabled={disabled}
        icon={icon}
        variant="none"
        className={`h-14 border border-app/10 ${color}`}
        textStyle={{ color: "white", fontFamily: "ClashDisplay-Bold" }}
        iconSize={20}
      />
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
