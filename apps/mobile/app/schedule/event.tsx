import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@/components/ui/theme-icons";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { SafeMaskedView, Transition } from "@/components/navigation/TransitionStack";
import { Shadows } from "@/constants/theme";

type ScheduleEvent = {
  id: string;
  dateKey: string;
  startsAt: string;
  title: string;
  timeStart: string;
  timeEnd: string;
  location: string;
  meetingLink?: string | null;
  type: "training" | "call" | "recovery";
  tag: string;
  athlete: string;
  coach: string;
  notes: string;
  status?: string;
};

export default function ScheduleEventScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const { event: eventParam, sharedBoundTag } = useLocalSearchParams<{
    event?: string;
    sharedBoundTag?: string;
  }>();

  const event = useMemo<ScheduleEvent | null>(() => {
    if (!eventParam) return null;
    try {
      return JSON.parse(String(eventParam)) as ScheduleEvent;
    } catch {
      return null;
    }
  }, [eventParam]);

  const overlayColor = isDark ? "rgba(15,23,42,0.45)" : "rgba(15,23,42,0.28)";
  const surfaceColor = isDark ? colors.cardElevated : "#F7FFF9";
  const mutedSurface = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.84)";
  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: overlayColor }}>
      <SafeMaskedView style={{ flex: 1 }}>
        <View className="flex-1 justify-end">
          <Transition.View
            sharedBoundTag={sharedBoundTag}
            className="rounded-t-[32px] border px-6 pt-6 pb-8"
            style={{
              backgroundColor: surfaceColor,
              borderColor: borderSoft,
              ...(isDark ? Shadows.none : Shadows.lg),
            }}
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-clash text-app">Booking details</Text>
              <Pressable
                onPress={() => router.back()}
                className="h-10 w-10 rounded-full items-center justify-center"
                style={{ backgroundColor: mutedSurface }}
              >
                <Feather name="x" size={18} color={colors.text} />
              </Pressable>
            </View>

            {event ? (
              <>
                <View className="rounded-[22px] p-4" style={{ backgroundColor: mutedSurface }}>
                  <Text className="text-base font-outfit text-app">
                    {event.title}
                  </Text>
                  <Text className="text-xs font-outfit text-secondary mt-1">
                    {event.timeStart} - {event.timeEnd}
                  </Text>
                  <Text className="text-xs font-outfit text-secondary mt-1">
                    Status: {event.status ?? "confirmed"}
                  </Text>
                  <Text className="text-xs font-outfit text-secondary mt-1">
                    Location: {event.location ?? "TBD"}
                  </Text>
                  {event.meetingLink ? (
                    <Text className="text-xs font-outfit text-secondary mt-1">
                      Meeting: {event.meetingLink}
                    </Text>
                  ) : null}
                  <Text className="text-xs font-outfit text-secondary mt-1">
                    Athlete: {event.athlete ?? "Athlete"}
                  </Text>
                </View>

                <View className="mt-4 rounded-[22px] p-4" style={{ backgroundColor: mutedSurface, ...(isDark ? Shadows.none : Shadows.sm) }}>
                  <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                    Notes
                  </Text>
                  <Text className="text-sm font-outfit text-app mt-2">
                    {event.notes || "No notes yet."}
                  </Text>
                </View>
              </>
            ) : (
              <Text className="text-sm font-outfit text-secondary">
                Event details are unavailable.
              </Text>
            )}

            <View className="mt-5 flex-row items-center gap-3">
              <Pressable
                className="flex-1 px-4 py-3 rounded-full"
                style={{ backgroundColor: mutedSurface, borderWidth: 1, borderColor: borderSoft }}
                onPress={() => router.back()}
              >
                <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px] text-center">
                  Back
                </Text>
              </Pressable>
              <Pressable
                className="flex-1 px-4 py-3 rounded-full bg-accent"
                onPress={() => router.back()}
              >
                <Text className="text-xs font-outfit text-white uppercase tracking-[1.2px] text-center">
                  Done
                </Text>
              </Pressable>
            </View>
          </Transition.View>
        </View>
      </SafeMaskedView>
    </SafeAreaView>
  );
}
