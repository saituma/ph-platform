import React from "react";
import { View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { Transition } from "@/components/navigation/TransitionStack";
import { Shadows } from "@/constants/theme";
import { useAdminPastel } from "@/components/admin/AdminUI";

interface ContentHeaderProps {
  title: string;
  isExerciseDetail: boolean;
  athleteName?: string | null;
  athleteAge?: number | null;
  category?: string | null;
  sharedBoundTag?: string;
  onBack: () => void;
}

export function ContentHeader({
  title,
  isExerciseDetail,
  athleteName,
  athleteAge,
  category,
  sharedBoundTag,
  onBack,
}: ContentHeaderProps) {
  const p = useAdminPastel();

  return (
    <Transition.View
      sharedBoundTag={sharedBoundTag}
      className="overflow-hidden rounded-[30px] border px-5 py-5 mb-6"
      style={{
        backgroundColor: p.cardWhite,
        borderColor: p.divider,
        ...Shadows.md,
      }}
    >
      <View
        className="absolute -right-10 -top-8 h-28 w-28 rounded-full"
        style={{ backgroundColor: p.accentSoft }}
      />
      <View className="flex-row items-center justify-between mb-4">
        <Pressable
          onPress={onBack}
          className="h-11 w-11 items-center justify-center rounded-[18px]"
          style={{ backgroundColor: p.inputBg }}
        >
          <Feather name="arrow-left" size={20} color={p.accent} />
        </Pressable>
        <View
          className="rounded-full px-3 py-1.5"
          style={{ backgroundColor: p.inputBg }}
        >
          <Text
            className="text-[10px] font-outfit font-bold uppercase tracking-[1.3px]"
            style={{ color: p.accent }}
          >
            {isExerciseDetail ? "Exercise detail" : "Content detail"}
          </Text>
        </View>
      </View>

      <Text className="text-3xl font-telma-bold text-app font-bold">
        {title}
      </Text>
      <View className="mt-4 flex-row flex-wrap gap-2">
        {athleteName ? (
          <View
            className="rounded-full px-3 py-2"
            style={{ backgroundColor: p.accentSoft }}
          >
            <Text
              className="text-[11px] font-outfit font-semibold uppercase tracking-[1.2px]"
              style={{ color: p.accent }}
            >
              Athlete: {athleteName}
            </Text>
          </View>
        ) : null}
        {athleteAge ? (
          <View
            className="rounded-full px-3 py-2"
            style={{ backgroundColor: p.inputBg }}
          >
            <Text
              className="text-[11px] font-outfit font-semibold"
              style={{ color: p.textPrimary }}
            >
              {athleteAge} yrs
            </Text>
          </View>
        ) : null}
        {category ? (
          <View
            className="rounded-full px-3 py-2"
            style={{ backgroundColor: p.inputBg }}
          >
            <Text
              className="text-[11px] font-outfit font-semibold"
              style={{ color: p.textPrimary }}
            >
              {category}
            </Text>
          </View>
        ) : null}
      </View>
    </Transition.View>
  );
}
