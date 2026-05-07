import React from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { UIButton } from "@/components/ui/hero";
import { useAdminPastel } from "@/components/admin/AdminUI";

interface Props {
  onPick: (source: "camera" | "library") => void;
  disabled: boolean;
}

export function VideoPickerControls({ onPick, disabled }: Props) {
  const p = useAdminPastel();

  return (
    <View className="flex-row gap-4 px-5">
      <UIButton
        onPress={() => onPick("camera")}
        isDisabled={disabled}
        className="flex-1 items-center rounded-3xl py-5"
        style={{
          backgroundColor: p.accentSoft,
        }}
      >
        <View className="h-12 w-12 items-center justify-center rounded-[20px]" style={{ backgroundColor: p.accent }}>
          <Feather name="video" size={22} color="#ffffff" />
        </View>
        <Text className="mt-3 text-sm font-outfit font-bold uppercase tracking-[1.6px]" style={{ color: p.accent }}>
          Record
        </Text>
      </UIButton>

      <UIButton
        onPress={() => onPick("library")}
        variant="secondary"
        isDisabled={disabled}
        className="flex-1 items-center rounded-3xl py-5"
      >
        <View className="h-12 w-12 items-center justify-center rounded-[20px]" style={{ backgroundColor: p.accentSoft }}>
          <Feather name="upload" size={22} color={p.accent} />
        </View>
        <Text className="mt-3 text-sm font-outfit font-semibold uppercase tracking-[1.6px]" style={{ color: p.textPrimary }}>
          Upload
        </Text>
      </UIButton>
    </View>
  );
}
