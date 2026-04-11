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
  size?: "sm" | "md" | "lg" | "xl";
}

export function ActionButton({
  icon,
  label,
  color,
  iconColor = "text-white",
  onPress,
  disabled = false,
  fullWidth = false,
  size = "lg",
}: ActionButtonProps) {
  if (fullWidth) {
    const resolvedIconColor = iconColor.startsWith("#") ? iconColor : "#FFFFFF";

    return (
      <Button
        label={label}
        onPress={onPress}
        disabled={disabled}
        icon={icon}
        size={size}
        variant="none"
        centerLabel
        iconColor={resolvedIconColor}
        iconGap={10}
        className={`border border-app/10 ${color}`}
        textStyle={{ color: "white", fontFamily: "ClashDisplay-Bold" }}
        iconSize={20}
      />
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-1 items-center gap-3 ${disabled ? "opacity-40" : ""}`}
      style={({ pressed }) => ({
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      <View
        className={`w-16 h-16 ${color} rounded-[22px] border border-white/10 items-center justify-center`}
        style={{
          boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
        }}
      >
        <Feather
          name={icon}
          size={28}
          color={iconColor.startsWith("#") ? iconColor : undefined}
          className={!iconColor.startsWith("#") ? iconColor : undefined}
        />
      </View>
      <Text className="text-[13px] font-outfit-bold font-bold text-app text-center tracking-tight">
        {label}
      </Text>
    </Pressable>
  );
}
