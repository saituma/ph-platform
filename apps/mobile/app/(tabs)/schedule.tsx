import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { hasPaidProgramTier } from "@/lib/planAccess";
import { useAppSelector } from "@/store/hooks";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ScaledText";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { AgeGate } from "@/components/AgeGate";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";

import { ScheduleHeader } from "@/components/tracking/schedule/ScheduleHeader";
import { CalendarGrid } from "@/components/tracking/schedule/CalendarGrid";
import { EventList } from "@/components/tracking/schedule/EventList";
import { BookingModal } from "@/components/tracking/schedule/BookingModal";
import { useScheduleData } from "@/components/tracking/schedule/hooks";
import { ScheduleEvent } from "@/components/tracking/schedule/types";
import { formatDateKey, parseDateKey } from "@/components/tracking/schedule/utils";

export default function ScheduleScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const { token, programTier } = useAppSelector((state) => state.user);
  const canCreateBookings = hasPaidProgramTier(programTier);
  const { isSectionHidden } = useAgeExperience();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();

  const [todayKey, setTodayKey] = useState(() => formatDateKey(new Date()));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(() => formatDateKey(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [bookingOpen, setBookingOpen] = useState(false);
  const hasUserSelectedDate = useRef(false);

  const {
    events,
    eventsLoading,
    eventsError,
    services,
    servicesLoading,
    servicesError,
    refreshEvents,
    refreshServices,
  } = useScheduleData(token, isFocused);

  const dayEvents = useMemo(() => {
    return events.filter((event) => event.dateKey === selectedCalendarDate);
  }, [events, selectedCalendarDate]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    events.forEach((event) => {
      if (!map.has(event.dateKey)) map.set(event.dateKey, []);
      map.get(event.dateKey)!.push(event);
    });
    return map;
  }, [events]);

  const selectedDate = useMemo(() => parseDateKey(selectedCalendarDate), [selectedCalendarDate]);
  const selectedDateLabel = useMemo(
    () => selectedDate.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }),
    [selectedDate]
  );

  const nextEvent = dayEvents[0] ?? null;

  const handleSelectDate = useCallback((dateKey: string) => {
    hasUserSelectedDate.current = true;
    setSelectedCalendarDate(dateKey);
    const nextDate = parseDateKey(dateKey);
    setCalendarMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
  }, []);

  const handleChangeMonth = useCallback(
    (offset: number) => {
      setCalendarMonth((current) => {
        const nextMonth = new Date(current.getFullYear(), current.getMonth() + offset, 1);
        const preferredDay = selectedDate.getDate();
        const maxDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
        const nextSelectedDate = new Date(
          nextMonth.getFullYear(),
          nextMonth.getMonth(),
          Math.min(preferredDay, maxDay)
        );
        const nextKey = formatDateKey(nextSelectedDate);
        hasUserSelectedDate.current = true;
        setSelectedCalendarDate(nextKey);
        return nextMonth;
      });
    },
    [selectedDate]
  );

  const getEventTone = useCallback(
    (type: ScheduleEvent["type"]) => {
      if (type === "call") {
        return {
          icon: "phone",
          label: "Call",
          pillBg: isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.85)",
          iconBg: isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.05)",
        };
      }
      if (type === "recovery") {
        return {
          icon: "heart",
          label: "Recovery",
          pillBg: isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.85)",
          iconBg: isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.05)",
        };
      }
      return {
        icon: "activity",
        label: "Training",
        pillBg: isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.85)",
        iconBg: isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.05)",
      };
    },
    [isDark]
  );

  useEffect(() => {
    if (!isFocused) return;
    const now = new Date();
    const nowKey = formatDateKey(now);
    setTodayKey(nowKey);
    if (!hasUserSelectedDate.current) {
      setSelectedCalendarDate(nowKey);
      setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    }
  }, [isFocused]);

  useEffect(() => {
    if (bookingOpen && services.length === 0) {
      refreshServices();
    }
  }, [bookingOpen, services.length, refreshServices]);

  if (isSectionHidden("schedule")) {
    return <AgeGate title="Schedule locked" message="Scheduling is restricted for this age." />;
  }

  if (!hasPaidProgramTier(programTier)) {
    return (
      <SafeAreaView className="flex-1" edges={["top"]} style={{ backgroundColor: colors.background }}>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-2xl font-clash font-bold text-app text-center mb-3">Schedule</Text>
          <Text className="text-base font-outfit text-secondary text-center max-w-[280px]">
            Choose a training plan in the Programs tab to book sessions and manage your schedule.
          </Text>
          <Pressable onPress={() => router.push("/(tabs)/programs")} className="mt-8 rounded-full px-8 py-3 bg-accent">
            <Text className="text-sm font-outfit font-semibold text-white">Open Programs</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1" style={{ paddingTop: insets.top }}>
      <ThemedScrollView
        onRefresh={async () => {
          await refreshEvents();
          if (bookingOpen) await refreshServices();
        }}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        <ScheduleHeader
          selectedDateLabel={selectedDateLabel}
          dayEventsCount={dayEvents.length}
          nextEventTime={nextEvent?.timeStart ?? null}
          onRequestSession={() => setBookingOpen(true)}
        />

        <CalendarGrid
          calendarMonth={calendarMonth}
          todayKey={todayKey}
          selectedCalendarDate={selectedCalendarDate}
          eventsByDate={eventsByDate}
          eventsTotalCount={events.length}
          onSelectDate={handleSelectDate}
          onChangeMonth={handleChangeMonth}
          getEventTone={getEventTone}
        />

        <EventList
          dayEvents={dayEvents}
          eventsLoading={eventsLoading}
          eventsError={eventsError}
          selectedDateLabel={selectedDateLabel}
          onReschedule={(event) => {
            handleSelectDate(event.dateKey);
            setBookingOpen(true);
          }}
          getEventTone={getEventTone}
          onRequestForDay={() => setBookingOpen(true)}
        />
      </ThemedScrollView>

      <BookingModal
        visible={bookingOpen}
        onClose={() => setBookingOpen(false)}
        token={token}
        services={services}
        servicesLoading={servicesLoading}
        servicesError={servicesError}
        selectedDate={selectedDate}
        canCreateBookings={canCreateBookings}
        onSuccess={() => refreshEvents()}
      />
    </View>
  );
}
