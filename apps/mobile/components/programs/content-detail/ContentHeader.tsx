import React from "react";
import { View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { Transition } from "@/components/navigation/TransitionStack";
import { Shadows } from "@/constants/theme";

interface ContentHeaderProps {
  title: string;
  isExerciseDetail: boolean;
  athleteName?: string | null;
  athleteAge?: number | null;
  category?: string | null;
  sharedBoundTag?: string;
  onBack: () => void;
  colors: any;
  isDark: boolean;
  surfaceColor: string;
  mutedSurface: string;
  accentSurface: string;
  borderSoft: string;
}

export function ContentHeader({
  title,
  isExerciseDetail,
  athleteName,
  athleteAge,
  category,
  sharedBoundTag,
  onBack,
  colors,
  isDark,
  surfaceColor,
  mutedSurface,
  accentSurface,
  borderSoft,
}: ContentHeaderProps) {
  return (
    <Transition.View
      sharedBoundTag={sharedBoundTag}
      className="overflow-hidden rounded-[30px] border px-5 py-5 mb-6"
      style={{
        backgroundColor: surfaceColor,
        borderColor: borderSoft,
        ...(isDark ? Shadows.none : Shadows.md),
      }}
    >
      <View
        className="absolute -right-10 -top-8 h-28 w-28 rounded-full"
        style={{ backgroundColor: accentSurface }}
      />
      <View className="flex-row items-center justify-between mb-4">
        <Pressable
          onPress={onBack}
          className="h-11 w-11 items-center justify-center rounded-[18px]"
          style={{ backgroundColor: mutedSurface }}
        >
          <Feather name="arrow-left" size={20} color={colors.accent} />
        </Pressable>
        <View
          className="rounded-full px-3 py-1.5"
          style={{ backgroundColor: mutedSurface }}
        >
          <Text
            className="text-[10px] font-outfit font-bold uppercase tracking-[1.3px]"
            style={{ color: colors.accent }}
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
            style={{ backgroundColor: accentSurface }}
          >
            <Text
              className="text-[11px] font-outfit font-semibold uppercase tracking-[1.2px]"
              style={{ color: colors.accent }}
            >
              Athlete: {athleteName}
            </Text>
          </View>
        ) : null}
        {athleteAge ? (
          <View
            className="rounded-full px-3 py-2"
            style={{ backgroundColor: mutedSurface }}
          >
            <Text
              className="text-[11px] font-outfit font-semibold"
              style={{ color: colors.text }}
            >
              {athleteAge} yrs
            </Text>
          </View>
        ) : null}
        {category ? (
          <View
            className="rounded-full px-3 py-2"
            style={{ backgroundColor: mutedSurface }}
          >
            <Text
              className="text-[11px] font-outfit font-semibold"
              style={{ color: colors.text }}
            >
              {category}
            </Text>
          </View>
        ) : null}
      </View>
    </Transition.View>
  );
}
