import React from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { UIButton } from "@/components/ui/hero";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

interface Props {
  onPick: (source: "camera" | "library") => void;
  disabled: boolean;
}

export function VideoPickerControls({ onPick, disabled }: Props) {
  const { colors, isDark } = useAppTheme();

  return (
    <View className="flex-row gap-4 px-5">
      <UIButton
        onPress={() => onPick("camera")}
        isDisabled={disabled}
        className="flex-1 items-center rounded-3xl py-5"
        style={{
          backgroundColor: isDark ? colors.accent : "#f0fdf4",
        }}
      >
        <View className="h-12 w-12 items-center justify-center rounded-[20px]" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "#166534" }}>
          <Feather name="video" size={22} color="#ffffff" />
        </View>
        <Text className="mt-3 text-sm font-outfit font-bold uppercase tracking-[1.6px]" style={{ color: isDark ? "#ffffff" : "#14532d" }}>
          Record
        </Text>
      </UIButton>

      <UIButton
        onPress={() => onPick("library")}
        variant="secondary"
        isDisabled={disabled}
        className="flex-1 items-center rounded-3xl py-5"
      >
        <View className="h-12 w-12 items-center justify-center rounded-[20px]" style={{ backgroundColor: colors.accentLight }}>
          <Feather name="upload" size={22} color={colors.accent} />
        </View>
        <Text className="mt-3 text-sm font-outfit font-semibold uppercase tracking-[1.6px]" style={{ color: colors.text }}>
          Upload
        </Text>
      </UIButton>
    </View>
  );
}
