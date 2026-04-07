import React from "react";
import { Pressable, View } from "react-native";
import { Feather } from "@/components/ui/theme-icons";
import { Text } from "@/components/ScaledText";
import { Shadows } from "@/constants/theme";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ScheduleEvent } from "./types";

interface ScheduleHeaderProps {
  selectedDateLabel: string;
  dayEventsCount: number;
  nextEventTime: string | null;
  onRequestSession: () => void;
}

export function ScheduleHeader({
  selectedDateLabel,
  dayEventsCount,
  nextEventTime,
  onRequestSession,
}: ScheduleHeaderProps) {
  const { colors, isDark } = useAppTheme();

  const surfaceColor = isDark ? colors.cardElevated : "#F7FFF9";
  const mutedSurface = isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.82)";
  const accentSurface = isDark ? "rgba(34,197,94,0.16)" : "rgba(34,197,94,0.10)";
  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";

  return (
    <View className="px-6 pt-6 pb-4">
      <View
        className="overflow-hidden rounded-[30px] border px-5 py-5"
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
        <View
          className="absolute -bottom-10 left-10 h-24 w-24 rounded-full"
          style={{ backgroundColor: mutedSurface }}
        />

        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <View className="self-start rounded-full px-3 py-1.5" style={{ backgroundColor: mutedSurface }}>
              <Text
                className="text-[10px] font-outfit font-bold uppercase tracking-[1.4px]"
                style={{ color: colors.accent }}
              >
                {"Family planner"}
              </Text>
            </View>
            <Text className="mt-3 text-3xl font-telma-bold text-app">
              {"Family Schedule"}
            </Text>
            <Text className="text-secondary font-outfit text-sm mt-2">
              {selectedDateLabel}
            </Text>
          </View>

          <Pressable
            className="rounded-[20px] bg-accent px-4 py-3 justify-center"
            onPress={onRequestSession}
            style={isDark ? Shadows.none : Shadows.sm}
          >
            <View className="flex-row items-center gap-2">
              <Feather name="plus" size={16} color="#FFFFFF" />
              <Text className="text-xs font-outfit text-white uppercase tracking-[1.2px]">
                Request session
              </Text>
            </View>
          </Pressable>
        </View>

        <View className="mt-4 flex-row gap-3">
          <View className="flex-1 rounded-[22px] px-4 py-4" style={{ backgroundColor: mutedSurface }}>
            <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.3px] text-secondary">
              Today
            </Text>
            <Text className="mt-2 text-lg font-clash text-app">
              {dayEventsCount} planned
            </Text>
          </View>
          <View className="flex-1 rounded-[22px] px-4 py-4" style={{ backgroundColor: mutedSurface }}>
            <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.3px] text-secondary">
              Next up
            </Text>
            <Text className="mt-2 text-lg font-clash text-app" numberOfLines={1}>
              {nextEventTime ?? "Open day"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
