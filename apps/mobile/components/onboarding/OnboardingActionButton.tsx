import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, ViewStyle } from "react-native";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";

type OnboardingActionButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Feather>["name"];
  minHeight?: number;
};

export function OnboardingActionButton({
  label,
  onPress,
  disabled = false,
  icon,
  minHeight = 56,
}: OnboardingActionButtonProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => {
        const buttonStyle: ViewStyle = {
          width: "100%",
          minHeight,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: icon ? 10 : 0,
          paddingHorizontal: 18,
          backgroundColor: colors.accent,
          opacity: disabled ? 0.72 : pressed ? 0.96 : 1,
        };

        if (Platform.OS === "ios") {
          buttonStyle.shadowColor = "#0F172A";
          buttonStyle.shadowOpacity = 0.12;
          buttonStyle.shadowRadius = 18;
          buttonStyle.shadowOffset = { width: 0, height: 10 };
        } else if (Platform.OS === "android") {
          buttonStyle.elevation = 4;
        }

        return buttonStyle;
      }}
    >
      {icon ? <Feather name={icon} size={18} color="#FFFFFF" /> : null}
      <Text className="font-outfit-semibold" style={{ color: "#FFFFFF", fontSize: 16 }}>
        {label}
      </Text>
    </Pressable>
  );
}
