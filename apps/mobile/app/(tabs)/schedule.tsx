import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import {
  hasPhpPlusPlanFeatures,
} from "@/lib/planAccess";
import { useAppSelector } from "@/store/hooks";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ScaledText";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { AgeGate } from "@/components/AgeGate";
import { useSafeIsFocused } from "@/hooks/navigation/useSafeReactNavigation";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

import { ScheduleHeader } from "@/components/tracking/schedule/ScheduleHeader";
import { CalendarGrid } from "@/components/tracking/schedule/CalendarGrid";
import { EventList } from "@/components/tracking/schedule/EventList";
import { BookingModal } from "@/components/tracking/schedule/BookingModal";
import { useGeneratedAvailability, useScheduleData } from "@/components/tracking/schedule/hooks";
import { ScheduleEvent } from "@/components/tracking/schedule/types";
import { formatDateKey, parseDateKey } from "@/components/tracking/schedule/utils";
import { canSelfBookSchedule } from "@/lib/scheduleBookingAccess";

export default function ScheduleScreen() {
  const { colors, isDark } = useAppTheme();
  const { token, programTier, apiUserRole } = useAppSelector((state) => state.user);
  const canCreateBookings = canSelfBookSchedule(apiUserRole);
  const { isSectionHidden } = useAgeExperience();
  const isFocused = useSafeIsFocused(true);
  const insets = useAppSafeAreaInsets();

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

  const bookingServices = useMemo(() => {
    if (hasPhpPlusPlanFeatures(programTier)) return services;
    return services.filter(
      (s) => String(s.type).toLowerCase() !== "semi_private",
    );
  }, [services, programTier]);

  const availabilityWindow = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    // Pad a couple days for timezone edges.
    start.setDate(start.getDate() - 2);
    end.setDate(end.getDate() + 2);
    return { from: start, to: end };
  }, [calendarMonth]);

  const { availability } = useGeneratedAvailability({
    token,
    from: availabilityWindow.from,
    to: availabilityWindow.to,
    enabled: isFocused,
  });

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

  const availabilityByDate = useMemo(() => {
    const map = new Map<string, string[]>();
    const hasRemainingCapacity = (item: any) => {
      if (item?.remainingCapacity == null) return true;
      if (Number(item.remainingCapacity) > 0) return true;
      const slots: any[] = Array.isArray(item?.slots) ? item.slots : [];
      return slots.some((slot) => slot?.remainingCapacity == null || Number(slot.remainingCapacity) > 0);
    };

    (availability ?? []).forEach((item: any) => {
      if (!item?.startsAt || !hasRemainingCapacity(item)) return;
      const key = formatDateKey(new Date(item.startsAt));
      const current = map.get(key) ?? [];
      const nextType = String(item.type ?? "service");
      if (!current.includes(nextType)) {
        map.set(key, [...current, nextType]);
      } else {
        map.set(key, current);
      }
    });
    return map;
  }, [availability]);

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return events.filter((event) => {
      const eventDate = parseDateKey(event.dateKey);
      return eventDate >= today;
    }).sort((a, b) => {
      const aDate = parseDateKey(a.dateKey).getTime();
      const bDate = parseDateKey(b.dateKey).getTime();
      return aDate - bDate;
    });
  }, [events]);

  const nextEvent = upcomingEvents[0] ?? null;



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
          selectedDateLabel="Schedule"
          dayEventsCount={upcomingEvents.length}
          nextEventTime={nextEvent?.timeStart ?? null}
          onRequestSession={() => setBookingOpen(true)}
          showRequestSession={canCreateBookings}
        />

        {canCreateBookings ? null : (
          <View className="mx-6 mb-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
            <Text className="text-sm font-outfit text-app">
              Your coach books sessions for you. You will see them here when they are confirmed.
            </Text>
          </View>
        )}

        <EventList
          dayEvents={upcomingEvents}
          eventsLoading={eventsLoading}
          eventsError={eventsError}
          selectedDateLabel="Upcoming bookings"
          onReschedule={(event) => {
            setBookingOpen(true);
          }}
          getEventTone={getEventTone}
          onRequestForDay={() => setBookingOpen(true)}
          allowSelfBooking={canCreateBookings}
        />

      </ThemedScrollView>

      <BookingModal
        visible={bookingOpen}
        onClose={() => setBookingOpen(false)}
        token={token}
        services={bookingServices}
        servicesLoading={servicesLoading}
        servicesError={servicesError}
        canCreateBookings={canCreateBookings}
        onSuccess={() => refreshEvents()}
      />
    </View>
  );
}
