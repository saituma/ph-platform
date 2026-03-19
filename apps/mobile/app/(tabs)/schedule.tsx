import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Feather } from "@/components/ui/theme-icons";
import { Shadows } from "@/constants/theme";
import { useRole } from "@/context/RoleContext";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, InteractionManager, Modal, Platform, Pressable, ScrollView, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, TextInput } from "@/components/ScaledText";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { AgeGate } from "@/components/AgeGate";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useIsFocused } from "@react-navigation/native";

type ScheduleEvent = {
  id: string;
  dayId: string;
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

type ServiceType = {
  id: number;
  name: string;
  type: string;
  durationMinutes: number;
  capacity?: number | null;
  fixedStartTime?: string | null;
  attendeeVisibility?: boolean | null;
  defaultLocation?: string | null;
  defaultMeetingLink?: string | null;
  programTier?: string | null;
  isActive?: boolean | null;
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const EVENT_TITLE_BY_TYPE: Record<string, string> = {
  call: "Call",
  group_call: "Group Call",
  individual_call: "Individual Call",
  one_on_one: "Individual Call",
  lift_lab_1on1: "Lift Lab 1:1",
  role_model: "Role Model Call",
};

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

export default function ScheduleScreen() {
  const { role } = useRole();
  const { colors, isDark } = useAppTheme();
  const { token } = useAppSelector((state) => state.user);
  const { isSectionHidden } = useAgeExperience();
  const isFocused = useIsFocused();
  const [todayKey, setTodayKey] = useState(() => formatDateKey(new Date()));
  const hasUserSelectedDate = useRef(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(
    null,
  );
  const [showDetails, setShowDetails] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [bookingDate, setBookingDate] = useState<Date>(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [availabilityData, setAvailabilityData] = useState<{ items: any[]; bookings?: any[] } | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [confirmedStartsAt, setConfirmedStartsAt] = useState<Date | null>(null);
  const [bookingLocation, setBookingLocation] = useState("");
  const [bookingMeetingLink, setBookingMeetingLink] = useState("");
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasUserSelectedService = useRef(false);
  const [calendarMonth, setCalendarMonth] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(
    () => formatDateKey(new Date()),
  );

  const notifyBookingConfirmed = useCallback(async () => {}, []);

  const resetBookingDraft = useCallback(() => {
    setBookingConfirmed(false);
    setBookingError(null);
    setConfirmedStartsAt(null);
    setSelectedSlot(null);
    setAvailabilityData(null);
    setAvailabilityError(null);
  }, []);

  const mapBookingsToEvents = useCallback((items: any[]) => {
    return (items ?? [])
      .map((item) => {
        const startsAt = new Date(item.startsAt);
        const endTime = item.endTime ? new Date(item.endTime) : new Date(startsAt.getTime() + 30 * 60000);
        const dayIndex = startsAt.getDay();
        const dayId = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][dayIndex] ?? "mon";
        const dateKey = formatDateKey(startsAt);
        return {
          id: String(item.id),
          dayId,
          dateKey,
          startsAt: startsAt.toISOString(),
          title: EVENT_TITLE_BY_TYPE[item.type] ?? "Session",
          timeStart: startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
          timeEnd: endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
          location: item.location || "TBD",
          meetingLink: item.meetingLink ?? null,
          type: item.type?.includes("call") ? "call" : "training",
          status: item.status ?? undefined,
          tag: role === "Guardian" ? "Parent" : "Athlete",
          athlete: item.athleteName ?? "Athlete",
          coach: "Coach",
          notes: item.notes ?? "",
        } as ScheduleEvent;
      })
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [role]);

  const parseDateKey = useCallback((value: string) => {
    const [year, month, day] = value.split("-").map((part) => Number(part));
    if (!year || !month || !day) return new Date();
    return new Date(year, month - 1, day);
  }, []);

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

  const calendarGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
    const cells: { date: Date; key: string; isOutside: boolean }[] = [];

    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startOffset - 1; i >= 0; i -= 1) {
      const day = prevMonthDays - i;
      const date = new Date(year, month - 1, day);
      cells.push({ date, key: formatDateKey(date), isOutside: true });
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      const date = new Date(year, month, day);
      const key = formatDateKey(date);
      cells.push({ date, key, isOutside: false });
    }

    const totalCells = Math.ceil(cells.length / 7) * 7;
    const trailing = totalCells - cells.length;
    for (let i = 1; i <= trailing; i += 1) {
      const date = new Date(year, month + 1, i);
      cells.push({ date, key: formatDateKey(date), isOutside: true });
    }

    return cells;
  }, [calendarMonth]);

  const selectedDate = useMemo(() => parseDateKey(selectedCalendarDate), [parseDateKey, selectedCalendarDate]);
  const activeServices = useMemo(
    () => services.filter((service) => service.isActive !== false),
    [services],
  );
  const selectedService = useMemo(
    () => activeServices.find((service) => service.id === selectedServiceId) ?? null,
    [activeServices, selectedServiceId],
  );
  const fixedTimeLabel = useMemo(() => {
    if (selectedService?.fixedStartTime) return selectedService.fixedStartTime;
    if (selectedService?.type === "role_model") return "13:00";
    return null;
  }, [selectedService]);

  const bookingCounts = useMemo(() => {
    const map = new Map<string, number>();
    (availabilityData?.bookings ?? []).forEach((booking: any) => {
      if (!booking?.startsAt) return;
      const key = new Date(booking.startsAt).toISOString();
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [availabilityData]);

  const availableSlots = useMemo(() => {
    if (!selectedService || !availabilityData?.items?.length) return [] as Date[];
    const durationMs = selectedService.durationMinutes * 60 * 1000;
    const slotMap = new Map<string, Date>();
    for (const block of availabilityData.items) {
      const start = new Date(block.startsAt);
      const end = new Date(block.endsAt);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
      for (
        let cursor = new Date(start.getTime());
        cursor.getTime() + durationMs <= end.getTime();
        cursor = new Date(cursor.getTime() + durationMs)
      ) {
        const timeLabel = `${String(cursor.getHours()).padStart(2, "0")}:${String(cursor.getMinutes()).padStart(2, "0")}`;
        if (fixedTimeLabel && timeLabel !== fixedTimeLabel) continue;
        slotMap.set(cursor.toISOString(), cursor);
      }
    }
    return Array.from(slotMap.values()).sort((a, b) => a.getTime() - b.getTime());
  }, [availabilityData, selectedService, fixedTimeLabel]);

  const selectedDateLabel = useMemo(
    () => selectedDate.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }),
    [selectedDate],
  );
  const monthLabel = `${MONTH_LABELS[calendarMonth.getMonth()]} ${calendarMonth.getFullYear()}`;
  const nextEvent = dayEvents[0] ?? null;
  const overlayColor = isDark ? "rgba(34,197,94,0.16)" : "rgba(15,23,42,0.18)";
  const surfaceColor = isDark ? colors.cardElevated : "#F7FFF9";
  const mutedSurface = isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.82)";
  const accentSurface = isDark ? "rgba(34,197,94,0.16)" : "rgba(34,197,94,0.10)";
  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  const errorColor = isDark ? "#FCA5A5" : colors.danger;

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
    [isDark],
  );


  const changeCalendarMonth = useCallback(
    (offset: number) => {
      setCalendarMonth((current) => {
        const nextMonth = new Date(current.getFullYear(), current.getMonth() + offset, 1);
        const preferredDay = selectedDate.getDate();
        const maxDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
        const nextSelectedDate = new Date(
          nextMonth.getFullYear(),
          nextMonth.getMonth(),
          Math.min(preferredDay, maxDay),
        );
        const nextKey = formatDateKey(nextSelectedDate);
        hasUserSelectedDate.current = true;
        setSelectedCalendarDate(nextKey);
        return nextMonth;
      });
    },
    [selectedDate],
  );

  const handleSelectCalendarDate = useCallback((dateKey: string) => {
    hasUserSelectedDate.current = true;
    setSelectedCalendarDate(dateKey);
    const nextDate = parseDateKey(dateKey);
    setCalendarMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
  }, [parseDateKey]);

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
    if (!bookingOpen || !token) return;
    let active = true;
    setServicesLoading(true);
    setServicesError(null);
    apiRequest<{ items: ServiceType[] }>("/bookings/services", { token })
      .then((data) => {
        if (!active) return;
        setServices(data.items ?? []);
      })
      .catch((err) => {
        if (!active) return;
        setServicesError(err.message ?? "Failed to load services");
      })
      .finally(() => {
        if (!active) return;
        setServicesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bookingOpen, token]);

  useEffect(() => {
    if (!bookingOpen) {
      hasUserSelectedService.current = false;
      return;
    }
    setBookingDate(selectedDate);
    if (!activeServices.length) {
      setSelectedServiceId(null);
      return;
    }
    if (hasUserSelectedService.current && selectedServiceId) return;
    if (!selectedServiceId || !activeServices.some((service) => service.id === selectedServiceId)) {
      const next = activeServices[0];
      setSelectedServiceId(next.id);
      setBookingLocation(next.defaultLocation ?? "");
      setBookingMeetingLink(next.defaultMeetingLink ?? "");
    }
  }, [bookingOpen, activeServices, selectedServiceId, selectedDate]);

  useEffect(() => {
    if (!bookingOpen || !token || !selectedServiceId) {
      return;
    }
    let active = true;
    setAvailabilityLoading(true);
    setAvailabilityError(null);
    const start = new Date(bookingDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(bookingDate);
    end.setHours(23, 59, 59, 999);
    const params = new URLSearchParams({
      serviceTypeId: String(selectedServiceId),
      from: start.toISOString(),
      to: end.toISOString(),
    });
    apiRequest<{ items: any[]; bookings?: any[] }>(`/bookings/availability?${params.toString()}`, {
      token,
      skipCache: true,
    })
      .then((data) => {
        if (!active) return;
        setAvailabilityData(data);
      })
      .catch((err: any) => {
        if (!active) return;
        setAvailabilityData(null);
        setAvailabilityError(err.message ?? "Could not load available times.");
      })
      .finally(() => {
        if (!active) return;
        setAvailabilityLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bookingOpen, token, selectedServiceId, bookingDate]);

  useEffect(() => {
    if (!availableSlots.length) {
      setSelectedSlot(null);
      return;
    }
    setSelectedSlot((prev) => {
      const capacity = selectedService?.capacity ?? null;
      const isPrevValid =
        prev != null && availableSlots.some((slot) => slot.toISOString() === prev.toISOString());
      if (isPrevValid && prev != null) {
        if (!capacity) return prev;
        const prevCount = bookingCounts.get(prev.toISOString()) ?? 0;
        if (prevCount < capacity) return prev;
      }
      const firstAvailable = availableSlots.find((slot) => {
        if (!capacity) return true;
        const count = bookingCounts.get(slot.toISOString()) ?? 0;
        return count < capacity;
      });
      return firstAvailable ?? null;
    });
  }, [availableSlots, bookingCounts, selectedService]);

  useEffect(() => {
    if (!token || !isFocused) return;
    let active = true;
    const loadEvents = async () => {
      setEventsLoading(true);
      setEventsError(null);
      try {
        const data = await apiRequest<{ items: any[] }>("/bookings", { token });
        if (!active) return;
        setEvents(mapBookingsToEvents(data.items ?? []));
      } catch (err: any) {
        if (!active) return;
        setEventsError(err.message ?? "Failed to load schedule");
      } finally {
        if (!active) return;
        setEventsLoading(false);
      }
    };
    const task = InteractionManager.runAfterInteractions(() => {
      if (!active) return;
      loadEvents();
    });
    return () => {
      active = false;
      task?.cancel?.();
    };
  }, [token, role, mapBookingsToEvents, isFocused]);

  // Age gate check — placed after all hooks to avoid rules-of-hooks violation
  if (isSectionHidden("schedule")) {
    return <AgeGate title="Schedule locked" message="Scheduling is restricted for this age." />;
  }
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1" style={{ paddingTop: insets.top }}>
      <ThemedScrollView
        onRefresh={async () => {
          if (!token) return;
          setEventsLoading(true);
          setEventsError(null);
          try {
            const data = await apiRequest<{ items: any[] }>("/bookings", { token, forceRefresh: true });
            setEvents(mapBookingsToEvents(data.items ?? []));
          } catch (err: any) {
            setEventsError(err.message ?? "Failed to load schedule");
          } finally {
            setEventsLoading(false);
          }
        }}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
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
                  <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.4px]" style={{ color: colors.accent }}>
                    {role === "Guardian" ? "Family planner" : "Training planner"}
                  </Text>
                </View>
                <Text className="mt-3 text-3xl font-telma-bold text-app">
                  {role === "Guardian" ? "Family Schedule" : "My Schedule"}
                </Text>
                <Text className="text-secondary font-outfit text-sm mt-2">
                  {selectedDateLabel}
                </Text>
              </View>

              <Pressable
                className="rounded-[20px] bg-accent px-4 py-3 justify-center"
                onPress={() => {
                  resetBookingDraft();
                  setBookingOpen(true);
                }}
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
                  {dayEvents.length} planned
                </Text>
              </View>
              <View className="flex-1 rounded-[22px] px-4 py-4" style={{ backgroundColor: mutedSurface }}>
                <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.3px] text-secondary">
                  Next up
                </Text>
                <Text className="mt-2 text-lg font-clash text-app" numberOfLines={1}>
                  {nextEvent ? nextEvent.timeStart : "Open day"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-6 pb-4">
          <View className="mb-3 flex-row items-center justify-between gap-3">
            <View className="flex-row items-center gap-3">
              <View className="h-5 w-1.5 rounded-full bg-accent" />
              <Text className="text-xl font-clash text-app">Calendar</Text>
            </View>
            <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: accentSurface }}>
              <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.3px]" style={{ color: colors.accent }}>
                {events.length} bookings
              </Text>
            </View>
          </View>

          <View
            className="rounded-[28px] border px-4 py-4"
            style={{ backgroundColor: surfaceColor, borderColor: borderSoft, ...(isDark ? Shadows.none : Shadows.sm) }}
          >
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => changeCalendarMonth(-1)}
                activeOpacity={0.8}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                className="h-10 w-10 items-center justify-center rounded-[14px]"
                style={{ backgroundColor: mutedSurface, borderWidth: 1, borderColor: borderSoft }}
              >
                <Feather name="chevron-left" size={18} color={colors.accent} />
              </TouchableOpacity>
              <View className="items-center gap-1">
                <Text className="text-lg font-clash text-app">{monthLabel}</Text>
                <Pressable
                  onPress={() => handleSelectCalendarDate(todayKey)}
                  className="rounded-full px-3 py-1"
                  style={{ backgroundColor: mutedSurface, borderWidth: 1, borderColor: borderSoft }}
                >
                  <Text className="text-[10px] font-outfit uppercase tracking-[1.2px] text-secondary">
                    Today
                  </Text>
                </Pressable>
              </View>
              <TouchableOpacity
                onPress={() => changeCalendarMonth(1)}
                activeOpacity={0.8}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                className="h-10 w-10 items-center justify-center rounded-[14px]"
                style={{ backgroundColor: mutedSurface, borderWidth: 1, borderColor: borderSoft }}
              >
                <Feather name="chevron-right" size={18} color={colors.accent} />
              </TouchableOpacity>
            </View>

            <View className="mt-4 flex-row justify-between px-1">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
                <Text
                  key={label}
                  className="text-[0.625rem] font-outfit text-secondary uppercase tracking-[1.4px] w-9 text-center"
                >
                  {label}
                </Text>
              ))}
            </View>

            <View
              className="mt-3 overflow-hidden rounded-2xl border"
              style={{ borderColor: borderSoft }}
            >
              <View className="flex-row flex-wrap">
                {calendarGrid.map((cell, index) => {
                  const isToday = cell.key === todayKey;
                  const isSelected = selectedCalendarDate === cell.key;
                  const hasEvents = eventsByDate.has(cell.key);
                  const eventsForDay = eventsByDate.get(cell.key) ?? [];
                  return (
                    <Pressable
                      key={`${cell.key}-${index}`}
                      onPress={() => handleSelectCalendarDate(cell.key)}
                      className="h-20"
                      style={{
                        width: `${100 / 7}%`,
                        borderRightWidth: 1,
                        borderBottomWidth: 1,
                        borderColor: borderSoft,
                        backgroundColor: isSelected
                          ? accentSurface
                          : cell.isOutside
                            ? mutedSurface
                            : "transparent",
                      }}
                    >
                      <View className="flex-1 px-2 pt-2">
                        <View className="flex-row items-center justify-between">
                          <View
                            className="h-6 w-6 items-center justify-center rounded-full"
                            style={{
                              backgroundColor: isSelected
                                ? colors.accent
                                : isToday
                                  ? accentSurface
                                  : "transparent",
                            }}
                          >
                            <Text
                              className={`text-[11px] font-outfit ${
                                isSelected ? "text-white font-bold" : "text-app"
                              }`}
                              style={
                                !isSelected && isToday
                                  ? { color: colors.accent, fontWeight: "700" }
                                  : cell.isOutside
                                    ? { color: colors.textSecondary, opacity: 0.5 }
                                    : undefined
                              }
                            >
                              {cell.date.getDate()}
                            </Text>
                          </View>
                          {hasEvents ? (
                            <View
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: colors.accent }}
                            />
                          ) : null}
                        </View>

                        {eventsForDay.slice(0, 2).map((event) => {
                          const tone = getEventTone(event.type);
                          return (
                            <View
                              key={`${cell.key}-${event.id}`}
                              className="mt-1 rounded-full px-2 py-0.5"
                              style={{
                                backgroundColor: isSelected ? "rgba(255,255,255,0.22)" : tone.pillBg,
                              }}
                            >
                              <Text
                                className="text-[10px] font-outfit"
                                style={{
                                  color: isSelected ? "#FFFFFF" : colors.text,
                                }}
                                numberOfLines={1}
                              >
                                {event.timeStart} {event.title}
                              </Text>
                            </View>
                          );
                        })}
                        {eventsForDay.length > 2 ? (
                          <Text
                            className="mt-1 text-[10px] font-outfit"
                            style={{ color: colors.textSecondary }}
                          >
                            +{eventsForDay.length - 2} more
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Text className="mt-3 text-[11px] font-outfit text-secondary">
              Tap a day to view details below.
            </Text>
          </View>
        </View>

        <View className="px-6 pb-6">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-lg font-clash text-app">Schedule</Text>
              <Text className="text-xs font-outfit text-secondary mt-1">
                {selectedDateLabel}
              </Text>
            </View>
            <View className="px-3 py-1.5 rounded-full" style={{ backgroundColor: mutedSurface, borderWidth: 1, borderColor: borderSoft }}>
              <Text className="text-[0.6875rem] font-outfit text-secondary uppercase tracking-[1.4px]">
                {dayEvents.length} events
              </Text>
            </View>
          </View>

          {eventsLoading ? (
            <View className="rounded-[28px] p-6" style={{ backgroundColor: surfaceColor, ...(isDark ? Shadows.none : Shadows.sm) }}>
              <View className="h-12 w-12 rounded-[18px] items-center justify-center" style={{ backgroundColor: accentSurface }}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
              <Text className="text-base font-clash text-app mt-3">
                Loading schedule
              </Text>
            </View>
          ) : dayEvents.length === 0 ? (
            <View className="rounded-[28px] p-6 items-center" style={{ backgroundColor: surfaceColor, ...(isDark ? Shadows.none : Shadows.sm) }}>
              <View className="h-16 w-16 rounded-[22px] items-center justify-center" style={{ backgroundColor: accentSurface }}>
                <Feather name="calendar" size={24} color={colors.accent} />
              </View>
              <Text className="text-base font-clash text-app mt-3">
                No events scheduled
              </Text>
              <Text className="text-sm font-outfit text-secondary mt-2 text-center">
                Request a call or session — the coach confirms before it&apos;s final.
              </Text>
              <Pressable
                className="mt-4 rounded-full bg-accent px-5 py-2"
                onPress={() => {
                  resetBookingDraft();
                  setBookingOpen(true);
                }}
              >
                <Text className="text-xs font-outfit text-white uppercase tracking-[1.2px]">
                  Request for this day
                </Text>
              </Pressable>
              {eventsError ? (
                <Text className="text-xs font-outfit text-red-400 mt-2">
                  {eventsError}
                </Text>
              ) : null}
            </View>
          ) : (
            <View className="gap-3">
              {dayEvents.map((event) => {
                const tone = getEventTone(event.type);
                const sharedBoundTag = `schedule-event-${event.id}`;
                return (
                  <Transition.Pressable
                    key={event.id}
                    sharedBoundTag={sharedBoundTag}
                    onPress={() => {
                      router.push({
                        pathname: "/schedule/event",
                        params: {
                          event: JSON.stringify(event),
                          sharedBoundTag,
                        },
                      } as any);
                    }}
                    className="rounded-[24px] p-4"
                    style={{ backgroundColor: surfaceColor, ...(isDark ? Shadows.none : Shadows.sm) }}
                  >
                    <View className="flex-row items-start gap-3">
                      <View className="h-12 w-12 rounded-[18px] items-center justify-center" style={{ backgroundColor: tone.iconBg }}>
                        <Feather name={tone.icon as any} size={18} color={colors.accent} />
                      </View>

                      <View className="flex-1">
                        <View className="flex-row items-center justify-between gap-3">
                          <Text className="text-base font-clash text-app flex-1">
                            {event.title}
                          </Text>
                          <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: tone.pillBg }}>
                            <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.2px]" style={{ color: colors.accent }}>
                              {tone.label}
                            </Text>
                          </View>
                        </View>

                        <Text className="text-sm font-outfit text-secondary mt-1">
                          {event.timeStart} - {event.timeEnd}
                        </Text>

                        <View className="mt-3 flex-row flex-wrap gap-2">
                          <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: mutedSurface }}>
                            <Text className="text-[11px] font-outfit" style={{ color: colors.text }}>
                              {event.location}
                            </Text>
                          </View>
                          <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: mutedSurface }}>
                            <Text className="text-[11px] font-outfit" style={{ color: colors.text }}>
                              {event.athlete}
                            </Text>
                          </View>
                          {event.status === "pending" ? (
                            <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: accentSurface }}>
                              <Text className="text-[11px] font-outfit font-semibold" style={{ color: colors.accent }}>
                                Pending approval
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  </Transition.Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ThemedScrollView>

      <Modal
        visible={!!selectedEvent}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setSelectedEvent(null);
          setShowDetails(false);
        }}
      >
        <Pressable
          className="flex-1 justify-end"
          style={{ backgroundColor: overlayColor }}
          onPress={() => {
            setSelectedEvent(null);
            setShowDetails(false);
          }}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            className="rounded-t-[30px] p-6"
            style={{ backgroundColor: surfaceColor }}
          >
            {!showDetails ? (
              <>
                <View className="flex-row items-center justify-between">
                  <Text className="text-lg font-clash text-app">
                    {selectedEvent?.title}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setSelectedEvent(null);
                      setShowDetails(false);
                    }}
                  >
                    <Feather name="x" size={20} className="text-secondary" />
                  </Pressable>
                </View>
                <Text className="text-sm font-outfit text-secondary mt-2">
                  {selectedEvent?.timeStart} - {selectedEvent?.timeEnd} · {selectedEvent?.location}
                </Text>
                {selectedEvent?.meetingLink ? (
                  <Text className="text-xs font-outfit text-secondary mt-1">
                    Meeting link available
                  </Text>
                ) : null}
                {selectedEvent?.status === "pending" ? (
                  <Text className="text-xs font-outfit text-secondary mt-1">
                    Pending approval
                  </Text>
                ) : null}

                <View className="mt-4 rounded-[22px] p-4" style={{ backgroundColor: mutedSurface, ...(isDark ? Shadows.none : Shadows.sm) }}>
                  <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                    Notes
                  </Text>
                  <Text className="text-sm font-outfit text-app mt-2">
                    {selectedEvent?.notes || "No notes yet."}
                  </Text>
                </View>

                <View className="mt-4 flex-row items-center gap-3">
                  <Pressable
                    className="flex-1 px-4 py-3 rounded-full bg-accent"
                    onPress={() => setShowDetails(true)}
                  >
                    <Text className="text-xs font-outfit text-white uppercase tracking-[1.2px] text-center">
                      View Plan
                    </Text>
                  </Pressable>
                  <Pressable
                    className="flex-1 px-4 py-3 rounded-full"
                    style={{ backgroundColor: mutedSurface, borderWidth: 1, borderColor: borderSoft }}
                    onPress={() => {
                      if (selectedEvent) {
                        const eventDate = new Date(selectedEvent.startsAt);
                        handleSelectCalendarDate(formatDateKey(eventDate));
                      }
                      setSelectedEvent(null);
                      setShowDetails(false);
                      resetBookingDraft();
                      setBookingOpen(true);
                    }}
                  >
                    <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px] text-center">
                      Reschedule
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <View className="flex-row items-center justify-between">
                  <Text className="text-lg font-clash text-app">
                    Booking details
                  </Text>
                  <Pressable onPress={() => setShowDetails(false)}>
                    <Feather name="x" size={20} className="text-secondary" />
                  </Pressable>
                </View>
                <View className="mt-4 rounded-[22px] p-4 gap-2" style={{ backgroundColor: mutedSurface, ...(isDark ? Shadows.none : Shadows.sm) }}>
                  <Text className="text-sm font-outfit text-app">{selectedEvent?.title}</Text>
                  <Text className="text-xs font-outfit text-secondary">
                    {selectedEvent?.timeStart} - {selectedEvent?.timeEnd}
                  </Text>
                  <Text className="text-xs font-outfit text-secondary">
                    Status: {selectedEvent?.status ?? "confirmed"}
                  </Text>
                  <Text className="text-xs font-outfit text-secondary">
                    Location: {selectedEvent?.location ?? "TBD"}
                  </Text>
                  {selectedEvent?.meetingLink ? (
                    <Text className="text-xs font-outfit text-secondary">
                      Meeting: {selectedEvent.meetingLink}
                    </Text>
                  ) : null}
                  <Text className="text-xs font-outfit text-secondary">
                    Athlete: {selectedEvent?.athlete ?? "Athlete"}
                  </Text>
                </View>
                <View className="mt-4 flex-row items-center gap-3">
                  <Pressable
                    className="flex-1 px-4 py-3 rounded-full"
                    style={{ backgroundColor: mutedSurface, borderWidth: 1, borderColor: borderSoft }}
                    onPress={() => setShowDetails(false)}
                  >
                    <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px] text-center">
                      Back
                    </Text>
                  </Pressable>
                  <Pressable
                    className="flex-1 px-4 py-3 rounded-full bg-accent"
                    onPress={() => {
                      setSelectedEvent(null);
                      setShowDetails(false);
                    }}
                  >
                    <Text className="text-xs font-outfit text-white uppercase tracking-[1.2px] text-center">
                      Done
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={bookingOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setBookingOpen(false)}
      >
        <Pressable
          className="flex-1 justify-end"
          style={{ backgroundColor: overlayColor }}
          onPress={() => setBookingOpen(false)}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            className="rounded-t-[30px] p-6"
            style={{ backgroundColor: surfaceColor, maxHeight: "85%" }}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-clash text-app">
                  {bookingConfirmed ? "Request sent" : "Request a session"}
                </Text>
                <Pressable onPress={() => setBookingOpen(false)}>
                  <Feather name="x" size={20} className="text-secondary" />
                </Pressable>
              </View>

              {bookingConfirmed ? (
                <>
                  <Text className="text-sm font-outfit text-secondary mt-2">
                    {confirmedStartsAt
                      ? `We sent your request for ${confirmedStartsAt.toLocaleDateString([], {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })} at ${confirmedStartsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`
                      : "Your session request was sent."}
                  </Text>
                  <View className="mt-4 rounded-[22px] border p-4" style={{ backgroundColor: mutedSurface, borderColor: borderSoft }}>
                    <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                      Awaiting coach approval
                    </Text>
                    <Text className="text-sm font-outfit text-app mt-2">
                      You&apos;ll see it on the calendar when it&apos;s confirmed. Check your email for a copy.
                    </Text>
                    {bookingLocation ? (
                      <Text className="text-xs font-outfit text-secondary mt-3">
                        Location: {bookingLocation}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => setBookingOpen(false)}
                    className="mt-4 px-4 py-3 rounded-full bg-accent"
                  >
                    <Text className="text-xs font-outfit text-white uppercase tracking-[1.2px] text-center">
                      Done
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text className="text-sm font-outfit text-secondary mt-2">
                    Choose the session type, then pick a day and a time the coach has open. Nothing is final until they approve.
                  </Text>

                  {servicesLoading ? (
                    <Text className="text-xs font-outfit text-secondary mt-3">
                      Loading services...
                    </Text>
                  ) : null}
                  {servicesError ? (
                    <Text className="text-xs font-outfit mt-3" style={{ color: errorColor }}>
                      {servicesError}
                    </Text>
                  ) : null}

                  {activeServices.length === 0 ? (
                    <View className="mt-4 rounded-[22px] border border-dashed p-4" style={{ borderColor: borderSoft, backgroundColor: mutedSurface }}>
                      <Text className="text-sm font-outfit text-secondary">
                        No booking types are available right now.
                      </Text>
                    </View>
                  ) : (
                    <View className="mt-4 flex-row flex-wrap gap-2">
                      {activeServices.map((item) => {
                        const active = selectedServiceId === item.id;
                        return (
                          <Pressable
                            key={item.id}
                            onPress={() => {
                              hasUserSelectedService.current = true;
                              if (item.id) {
                                setSelectedServiceId(item.id);
                                setSelectedSlot(null);
                                setBookingLocation(item.defaultLocation ?? "");
                                setBookingMeetingLink(item.defaultMeetingLink ?? "");
                              }
                            }}
                            className="px-4 py-2 rounded-full border"
                            style={{
                              backgroundColor: active ? colors.accent : mutedSurface,
                              borderColor: active ? colors.accent : borderSoft,
                            }}
                          >
                            <Text
                              className={`text-xs font-outfit uppercase tracking-[1.4px] ${
                                active ? "text-white" : "text-secondary"
                              }`}
                            >
                              {item.name}
                              {item.capacity ? ` (${item.capacity} slots)` : ""}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}

                  <View className="mt-4 rounded-[22px] border p-4" style={{ backgroundColor: mutedSurface, borderColor: borderSoft }}>
                    <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                      Date
                    </Text>
                    <Pressable
                      onPress={() => setShowDatePicker(true)}
                      className="mt-3 rounded-2xl border px-3 py-3"
                      style={{ backgroundColor: surfaceColor, borderColor: borderSoft }}
                    >
                      <Text className="text-sm font-outfit text-app">
                        {bookingDate.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                      </Text>
                    </Pressable>
                    {fixedTimeLabel ? (
                      <Text className="text-xs font-outfit text-secondary mt-3">
                        This type always starts at {fixedTimeLabel} (coach local time).
                      </Text>
                    ) : null}
                    <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px] mt-4">
                      Available start times
                    </Text>
                    {availabilityLoading ? (
                      <View className="mt-3 py-4 items-center">
                        <ActivityIndicator color={colors.accent} />
                      </View>
                    ) : null}
                    {availabilityError ? (
                      <Text className="text-xs font-outfit mt-3" style={{ color: errorColor }}>
                        {availabilityError}
                      </Text>
                    ) : null}
                    {!availabilityLoading && !availabilityError && selectedService && !availableSlots.length ? (
                      <Text className="text-sm font-outfit text-secondary mt-3">
                        No open times on this day. Pick another date or ask the coach to add availability.
                      </Text>
                    ) : null}
                    {!availabilityLoading && availableSlots.length > 0 ? (
                      <View className="mt-3 flex-row flex-wrap gap-2">
                        {availableSlots.map((slot) => {
                          const cap = selectedService?.capacity ?? null;
                          const taken = bookingCounts.get(slot.toISOString()) ?? 0;
                          const atCap = cap != null && taken >= cap;
                          const active =
                            selectedSlot != null && selectedSlot.toISOString() === slot.toISOString();
                          return (
                            <Pressable
                              key={slot.toISOString()}
                              disabled={atCap}
                              onPress={() => setSelectedSlot(slot)}
                              className="px-4 py-2 rounded-full border"
                              style={{
                                backgroundColor: atCap
                                  ? mutedSurface
                                  : active
                                    ? colors.accent
                                    : surfaceColor,
                                borderColor: atCap ? borderSoft : active ? colors.accent : borderSoft,
                                opacity: atCap ? 0.45 : 1,
                              }}
                            >
                              <Text
                                className={`text-xs font-outfit uppercase tracking-[1.2px] ${
                                  atCap ? "text-secondary" : active ? "text-white" : "text-app"
                                }`}
                              >
                                {slot.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                {cap != null ? ` (${Math.max(cap - taken, 0)} left)` : ""}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>



                  <View className="mt-4 rounded-[22px] border p-4" style={{ backgroundColor: mutedSurface, borderColor: borderSoft }}>
                    <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                      Location & link (optional)
                    </Text>
                    <View className="mt-3 gap-2">
                      <View className="rounded-2xl border px-3 py-2" style={{ backgroundColor: surfaceColor, borderColor: borderSoft }}>
                        <Text className="text-[0.6875rem] font-outfit text-secondary uppercase tracking-[1.2px]">
                          Location
                        </Text>
                        <TextInput
                          value={bookingLocation}
                          onChangeText={setBookingLocation}
                          placeholder="Add location"
                          placeholderTextColor={colors.textSecondary}
                          className="text-sm font-outfit text-app mt-1"
                        />
                      </View>
                      <View className="rounded-2xl border px-3 py-2" style={{ backgroundColor: surfaceColor, borderColor: borderSoft }}>
                        <Text className="text-[0.6875rem] font-outfit text-secondary uppercase tracking-[1.2px]">
                          Meeting link
                        </Text>
                        <TextInput
                          value={bookingMeetingLink}
                          onChangeText={setBookingMeetingLink}
                          placeholder="Add link (Zoom, Meet, etc.)"
                          placeholderTextColor={colors.textSecondary}
                          className="text-sm font-outfit text-app mt-1"
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>
                    </View>
                  </View>

                  <Pressable
                    onPress={async () => {
                      if (isSubmitting) return;
                      if (!selectedService) {
                        setBookingError("Pick a session type first.");
                        return;
                      }
                      if (!selectedSlot) {
                        setBookingError("Pick a time from the available slots.");
                        return;
                      }
                      setBookingError(null);
                      setIsSubmitting(true);
                      try {
                        const startsAt = new Date(selectedSlot);
                        const endsAt = new Date(startsAt.getTime() + selectedService.durationMinutes * 60000);
                        await apiRequest("/bookings", {
                          method: "POST",
                          token,
                          body: {
                            serviceTypeId: selectedService.id,
                            startsAt: startsAt.toISOString(),
                            endsAt: endsAt.toISOString(),
                            timezoneOffsetMinutes: startsAt.getTimezoneOffset(),
                            location: bookingLocation || undefined,
                            meetingLink: bookingMeetingLink || undefined,
                          },
                          suppressStatusCodes: [400],
                        });
                        const refreshed = await apiRequest<{ items: any[] }>("/bookings", {
                          token,
                          forceRefresh: true,
                        });
                        setEvents(mapBookingsToEvents(refreshed.items ?? []));
                        setConfirmedStartsAt(startsAt);
                        setBookingConfirmed(true);
                        await notifyBookingConfirmed();
                      } catch (err: any) {
                        const rawMessage = err?.message ?? "Failed to submit booking";
                        const cleanedMessage = String(rawMessage).replace(/^\d+\s+/, "");
                        setBookingError(cleanedMessage);
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={!selectedService || !selectedSlot || isSubmitting}
                    className={`mt-4 px-4 py-3 flex-row items-center justify-center gap-2 rounded-full ${
                      selectedService && selectedSlot ? "bg-accent" : "bg-secondary/20"
                    }`}
                  >
                    {isSubmitting ? <ActivityIndicator size="small" color="#ffffff" /> : null}
                    <Text
                      className={`text-xs font-outfit uppercase tracking-[1.2px] text-center ${
                        selectedService && selectedSlot ? "text-white" : "text-secondary"
                      }`}
                    >
                      {isSubmitting ? "Sending..." : "Send request"}
                    </Text>
                  </Pressable>
                  {bookingError ? (
                    <Text className="text-xs font-outfit mt-3" style={{ color: errorColor }}>
                      {bookingError}
                    </Text>
                  ) : null}

                  {showDatePicker ? (
                    <View className="mt-3">
                      <DateTimePicker
                        value={bookingDate}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={(event, date) => {
                          if (Platform.OS !== "ios") {
                            setShowDatePicker(false);
                          }
                          if (event.type === "dismissed") return;
                          if (!date) return;
                          setBookingDate(date);
                        }}
                      />
                      {Platform.OS === "ios" ? (
                        <Pressable
                          onPress={() => setShowDatePicker(false)}
                          className="mt-2 self-end rounded-full border border-app px-4 py-2"
                        >
                          <Text className="text-app font-outfit text-xs">Done</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}

                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
