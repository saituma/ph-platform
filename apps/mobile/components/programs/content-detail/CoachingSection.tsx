import React from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { Shadows } from "@/constants/theme";
import { ExerciseMetadata } from "../../../hooks/programs/useContentDetail";

interface CoachingSectionProps {
  meta: ExerciseMetadata;
  isDark: boolean;
}

export function CoachingSection({ meta, isDark }: CoachingSectionProps) {
  return (
    <>
      {meta.cues ? (
        <View
          className="rounded-3xl bg-[#2F8F57] px-6 py-5 gap-3"
          style={isDark ? Shadows.none : Shadows.sm}
        >
          <View className="flex-row items-center gap-2">
            <View className="h-8 w-8 rounded-full bg-white/20 items-center justify-center">
              <Feather name="message-circle" size={14} color="#FFFFFF" />
            </View>
            <Text className="text-[12px] font-outfit text-white uppercase tracking-[2px] font-bold">
              Coaching Cues
            </Text>
          </View>
          <Text className="text-[15px] font-outfit text-white leading-[24px]">
            {meta.cues}
          </Text>
        </View>
      ) : null}

      {meta.steps ? (
        <View
          className="rounded-3xl bg-[#0F766E] px-6 py-5 gap-3"
          style={isDark ? Shadows.none : Shadows.sm}
        >
          <View className="flex-row items-center gap-2">
            <View className="h-8 w-8 rounded-full bg-white/20 items-center justify-center">
              <Feather name="list" size={14} color="#FFFFFF" />
            </View>
            <Text className="text-[12px] font-outfit text-white uppercase tracking-[2px] font-bold">
              Steps
            </Text>
          </View>
          <Text className="text-[15px] font-outfit text-white leading-[24px]">
            {meta.steps}
          </Text>
        </View>
      ) : null}

      {(meta.progression || meta.regression) && (
        <View className="flex-row gap-4">
          {meta.progression ? (
            <View
              className="flex-1 rounded-3xl bg-[#22C55E] px-5 py-5 gap-3"
              style={isDark ? Shadows.none : Shadows.sm}
            >
              <View className="flex-row items-center gap-2">
                <View className="h-8 w-8 rounded-full bg-white/30 items-center justify-center">
                  <Feather name="trending-up" size={14} color="#FFFFFF" />
                </View>
                <Text className="text-[11px] font-outfit text-white uppercase tracking-[1.5px] font-bold">
                  Progression
                </Text>
              </View>
              <Text className="text-[14px] font-outfit text-white leading-relaxed">
                {meta.progression}
              </Text>
            </View>
          ) : null}
          {meta.regression ? (
            <View
              className="flex-1 rounded-3xl bg-[#F97316] px-5 py-5 gap-3"
              style={isDark ? Shadows.none : Shadows.sm}
            >
              <View className="flex-row items-center gap-2">
                <View className="h-8 w-8 rounded-full bg-white/30 items-center justify-center">
                  <Feather name="trending-down" size={14} color="#FFFFFF" />
                </View>
                <Text className="text-[11px] font-outfit text-white uppercase tracking-[1.5px] font-bold">
                  Regression
                </Text>
              </View>
              <Text className="text-[14px] font-outfit text-white leading-relaxed">
                {meta.regression}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </>
  );
}
