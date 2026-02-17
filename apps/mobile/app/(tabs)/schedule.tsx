import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Feather } from "@/components/ui/theme-icons";
import { useRole } from "@/context/RoleContext";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { canAccessTier, normalizeProgramTier } from "@/lib/planAccess";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, InteractionManager, Modal, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text, TextInput } from "@/components/ScaledText";

type ScheduleEvent = {
  id: string;
  dayId: string;
  dateKey: string;
  startsAt: string;
  title: string;
  timeStart: string;
  timeEnd: string;
  location: string;
  type: "training" | "call" | "recovery";
  tag: string;
  athlete: string;
  coach: string;
  notes: string;
};

const FILTERS = ["All", "Training", "Calls", "Recovery"] as const;

const DEFAULT_SLOTS = ["09:00", "10:00", "13:00", "16:30", "18:00", "19:30"];

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

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const EVENT_TITLE_BY_TYPE: Record<string, string> = {
  call: "Call",
  group_call: "Group Call",
  individual_call: "Individual Call",
  one_on_one: "Individual Call",
  lift_lab_1on1: "Lift Lab 1:1",
  role_model: "Role Model Call",
};

export default function ScheduleScreen() {
  const { role } = useRole();
  const { colors } = useAppTheme();
  const router = useRouter();
  const { token, programTier } = useAppSelector((state) => state.user);
  const [selectedFilter, setSelectedFilter] = useState<
    (typeof FILTERS)[number]
  >("All");
  const today = new Date();
  const todayId = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][today.getDay()] ?? "mon";
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;
  const [selectedDayId, setSelectedDayId] = useState(todayId);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(
    null,
  );
  const [bookingOpen, setBookingOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [availabilitySlots, setAvailabilitySlots] = useState<{ label: string; startsAt: string }[]>([]);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [bookingType, setBookingType] = useState("call");
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);
  const [bookingLocation, setBookingLocation] = useState("");
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const hasUserSelectedService = useRef(false);

  const mapBookingsToEvents = useCallback((items: any[]) => {
    return (items ?? []).map((item) => {
      const startsAt = new Date(item.startsAt);
      const endTime = item.endTime ? new Date(item.endTime) : new Date(startsAt.getTime() + 30 * 60000);
      const dayIndex = startsAt.getDay();
      const dayId = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][dayIndex] ?? "mon";
      const dateKey = `${startsAt.getFullYear()}-${String(startsAt.getMonth() + 1).padStart(2, "0")}-${String(
        startsAt.getDate()
      ).padStart(2, "0")}`;
      return {
        id: String(item.id),
        dayId,
        dateKey,
        startsAt: startsAt.toISOString(),
        title: EVENT_TITLE_BY_TYPE[item.type] ?? "Session",
        timeStart: startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
        timeEnd: endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
        location: item.location || item.meetingLink || "TBD",
        type: item.type?.includes("call") ? "call" : "training",
        tag: role === "Guardian" ? "Parent" : "Athlete",
        athlete: item.athleteName ?? "Athlete",
        coach: "Coach",
        notes: item.notes ?? "",
      } as ScheduleEvent;
    });
  }, [role]);

  const weekStats = useMemo(() => {
    const training = events.filter((event) => event.type === "training").length;
    const calls = events.filter((event) => event.type === "call").length;
    const recovery = events.filter((event) => event.type === "recovery").length;
    return {
      total: events.length,
      training,
      calls,
      recovery,
    };
  }, [events]);

  const dayEvents = useMemo(() => {
    const eventsForDay = events.filter((event) => event.dayId === selectedDayId);
    if (selectedFilter === "All") return eventsForDay;
    if (selectedFilter === "Training") {
      return eventsForDay.filter((event) => event.type === "training");
    }
    if (selectedFilter === "Calls") {
      return eventsForDay.filter((event) => event.type === "call");
    }
    return eventsForDay.filter((event) => event.type === "recovery");
  }, [events, selectedDayId, selectedFilter]);

  const weekDays = useMemo(() => {
    const now = new Date();
    const dayIndex = (now.getDay() + 6) % 7; // Monday = 0
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayIndex);
    return Array.from({ length: 7 }).map((_, idx) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + idx);
      const id = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][date.getDay()] ?? "mon";
      return {
        id,
        day: DAY_LABELS[date.getDay()],
        date: date.getDate(),
        month: MONTH_LABELS[date.getMonth()],
        dateKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
          date.getDate()
        ).padStart(2, "0")}`,
      };
    });
  }, []);

  useEffect(() => {
    if (!weekDays.some((day) => day.id === selectedDayId)) {
      setSelectedDayId(weekDays[0]?.id ?? todayId);
    }
  }, [selectedDayId, todayId, weekDays]);

  const daysWithEvents = useMemo(() => {
    const set = new Set<string>();
    events.forEach((event) => {
      if (event.dayId) set.add(event.dayId);
    });
    return set;
  }, [events]);

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
    const cells: ({ date: Date; key: string } | null)[] = [];
    for (let i = 0; i < startOffset; i += 1) cells.push(null);
    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      const date = new Date(year, month, day);
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      cells.push({ date, key });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calendarMonth]);

  const activeDay = weekDays.find((day) => day.id === selectedDayId) ?? weekDays[0];
  const normalizedTier = normalizeProgramTier(programTier);
  const activeServices = useMemo(
    () => services.filter((service) => service.isActive !== false),
    [services],
  );
  const visibleServices = useMemo(
    () => activeServices.filter((service) => canAccessTier(programTier, service.programTier ?? null)),
    [activeServices, programTier],
  );
  const selectedService = useMemo(
    () => visibleServices.find((service) => service.id === selectedServiceId) ?? null,
    [visibleServices, selectedServiceId],
  );
  const derivedBookingTypes = useMemo(() => {
    if (visibleServices.length === 0) return [];
    return visibleServices.map((service) => ({
      label: service.name,
      id: service.id,
      type: service.type,
    }));
  }, [visibleServices]);
  const formatSlotLabel = useCallback((value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  }, []);

  const buildSlotDate = useCallback((time: string) => {
    const [hour, minute] = time.split(":").map((part) => Number(part));
    const now = new Date();
    const startsAt = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        hour,
        minute,
        0,
        0,
      ),
    );
    if (startsAt.getTime() <= now.getTime()) {
      startsAt.setUTCDate(startsAt.getUTCDate() + 1);
    }
    return startsAt.toISOString();
  }, []);

  const fixedSlot =
    selectedService?.fixedStartTime || (bookingType === "role_model" ? "13:00" : null);
  const availableSlots = fixedSlot
    ? [{ label: fixedSlot, startsAt: buildSlotDate(fixedSlot) }]
    : availabilitySlots.length
      ? availabilitySlots
      : DEFAULT_SLOTS.map((slot) => ({ label: slot, startsAt: buildSlotDate(slot) }));

  useEffect(() => {
    if (!bookingOpen) return;
    if (fixedSlot) {
      setBookingSlot(buildSlotDate(fixedSlot));
      return;
    }
    if (bookingSlot && !availableSlots.some((slot) => slot.startsAt === bookingSlot)) {
      setBookingSlot(null);
    }
  }, [bookingOpen, fixedSlot, bookingSlot, availableSlots, buildSlotDate]);

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
  }, [bookingOpen, token, selectedServiceId]);

  useEffect(() => {
    if (!bookingOpen) {
      hasUserSelectedService.current = false;
      return;
    }
    if (!visibleServices.length) {
      setSelectedServiceId(null);
      return;
    }
    if (hasUserSelectedService.current && selectedServiceId) return;
    if (!selectedServiceId || !visibleServices.some((service) => service.id === selectedServiceId)) {
      const next = visibleServices[0];
      setSelectedServiceId(next.id);
      setBookingType(next.type as any);
      setBookingLocation(next.defaultLocation ?? "");
    }
  }, [bookingOpen, visibleServices, selectedServiceId]);

  useEffect(() => {
    if (!bookingOpen || !token || !selectedServiceId) return;
    let active = true;
    setAvailabilityLoading(true);
    setAvailabilityError(null);
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 7);
    apiRequest<{ items: { startsAt: string }[] }>(
      `/bookings/availability?serviceTypeId=${selectedServiceId}&from=${from.toISOString()}&to=${to.toISOString()}`,
      { token },
    )
      .then((data) => {
        if (!active) return;
        const slots =
          data.items?.map((item) => ({
            label: new Date(item.startsAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }),
            startsAt: item.startsAt,
          })) ?? [];
        setAvailabilitySlots(slots);
      })
      .catch((err) => {
        if (!active) return;
        setAvailabilityError(err.message ?? "Failed to load availability");
      })
      .finally(() => {
        if (!active) return;
        setAvailabilityLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bookingOpen, token, selectedServiceId]);

  useEffect(() => {
    if (!token) return;
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
  }, [token, role, mapBookingsToEvents]);

  return (
    <SafeAreaView className="flex-1 bg-app">
      <ThemedScrollView
        onRefresh={async () => {
          if (!token) return;
          setEventsLoading(true);
          setEventsError(null);
          try {
            const data = await apiRequest<{ items: any[] }>("/bookings", { token });
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
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-3xl font-clash text-app">
                {role === "Guardian" ? "Family Schedule" : "My Training"}
              </Text>
              <Text className="text-secondary font-outfit text-sm mt-1">
                {role === "Guardian"
                  ? "Manage sessions, games, and calls for your athletes."
                  : "Track sessions, bookings, and recovery windows."}
              </Text>
            </View>
            <Pressable
              className="h-11 w-11 rounded-2xl bg-secondary/10 items-center justify-center border border-app/10"
              onPress={() => {
                if (!normalizedTier) {
                  Alert.alert(
                    "Choose a plan",
                    "Complete onboarding and select a plan to book sessions.",
                    [
                      { text: "View Plans", onPress: () => router.push("/plans") },
                      { text: "Not now", style: "cancel" },
                    ]
                  );
                  return;
                }
                setBookingOpen(true);
                setBookingConfirmed(false);
                setBookingSlot(null);
                setBookingError(null);
              }}
            >
              <Feather name="plus" size={18} className="text-secondary" />
            </Pressable>
          </View>

          <View className="mt-5 flex-row gap-2">
            {FILTERS.map((label) => {
              const active = selectedFilter === label;
              return (
                <Pressable
                  key={label}
                  onPress={() => setSelectedFilter(label)}
                  className={`px-4 py-2 rounded-full border ${
                    active ? "bg-accent" : "bg-secondary/10"
                  }`}
                  style={{ borderColor: colors.border }}
                >
                  <Text
                    className={`text-xs font-outfit uppercase tracking-[1.4px] ${
                      active ? "text-white" : "text-secondary"
                    }`}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="px-6 pb-4">
          <View
            className="rounded-3xl border p-5"
            style={{
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-outfit text-secondary uppercase tracking-[1.6px]">
                  This Week
                </Text>
                <Text className="text-2xl font-clash text-app mt-1">
                  {weekStats.total} bookings
                </Text>
                <Text className="text-sm font-outfit text-secondary mt-1">
                  {weekStats.training} training · {weekStats.calls} call · {weekStats.recovery} recovery
                </Text>
              </View>
              <View className="h-12 w-12 rounded-2xl bg-secondary/10 items-center justify-center border border-app/10">
                <Feather name="activity" size={18} className="text-secondary" />
              </View>
            </View>
            <View className="mt-4 flex-row items-center gap-3">
              <View className="px-3 py-1 rounded-full bg-secondary/10 border border-app/10">
                <Text className="text-[0.6875rem] font-outfit text-secondary uppercase tracking-[1.2px]">
                  Next: 13:00 call
                </Text>
              </View>
              <View className="px-3 py-1 rounded-full bg-secondary/10 border border-app/10">
                <Text className="text-[0.6875rem] font-outfit text-secondary uppercase tracking-[1.2px]">
                  Wed strength
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-6 pb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-clash text-app">Week View</Text>
            <View className="flex-row items-center gap-2">
              <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.6px]">
                {activeDay.month}
              </Text>
              <Pressable
                onPress={() => {
                  setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                  setSelectedCalendarDate(todayKey);
                  setCalendarOpen(true);
                }}
                className="px-3 py-1 rounded-full bg-secondary/10 border border-app/10"
              >
                <Text className="text-[0.6875rem] font-outfit text-secondary uppercase tracking-[1.4px]">
                  Full Calendar
                </Text>
              </Pressable>
            </View>
          </View>
          <View className="flex-row justify-between">
            {weekDays.map((day) => {
              const active = day.id === selectedDayId;
              const hasEvents = daysWithEvents.has(day.id);
              return (
                <Pressable
                  key={day.id}
                  onPress={() => setSelectedDayId(day.id)}
                  className={`items-center rounded-2xl border px-3 py-2 ${
                    active ? "bg-accent" : "bg-secondary/10"
                  }`}
                  style={{ borderColor: colors.border }}
                >
                  <Text
                    className={`text-[0.625rem] font-outfit uppercase tracking-[1.4px] ${
                      active ? "text-white" : "text-secondary"
                    }`}
                  >
                    {day.day}
                  </Text>
                  <Text
                    className={`text-sm font-clash mt-1 ${
                      active ? "text-white" : "text-app"
                    }`}
                  >
                    {day.date}
                  </Text>
                  {hasEvents ? (
                    <View
                      className={`mt-1 h-1.5 w-1.5 rounded-full ${
                        active ? "bg-white" : "bg-accent"
                      }`}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="px-6 pb-6">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-lg font-clash text-app">Timeline</Text>
              <Text className="text-xs font-outfit text-secondary mt-1">
                {activeDay.day}, {activeDay.month} {activeDay.date}
              </Text>
            </View>
            <View className="px-3 py-1 rounded-full bg-secondary/10 border border-app/10">
              <Text className="text-[0.6875rem] font-outfit text-secondary uppercase tracking-[1.4px]">
                {dayEvents.length} events
              </Text>
            </View>
          </View>

          {eventsLoading ? (
            <View className="rounded-3xl border p-6 bg-input items-center">
              <Feather name="loader" size={20} className="text-secondary" />
              <Text className="text-base font-clash text-app mt-3">
                Loading schedule
              </Text>
            </View>
          ) : dayEvents.length === 0 ? (
            <View className="rounded-3xl border p-6 bg-input items-center">
              <Feather name="calendar" size={20} className="text-secondary" />
              <Text className="text-base font-clash text-app mt-3">
                No events scheduled
              </Text>
              <Text className="text-sm font-outfit text-secondary mt-2 text-center">
                Use the plus button to add a call or training session.
              </Text>
              {eventsError ? (
                <Text className="text-xs font-outfit text-red-400 mt-2">
                  {eventsError}
                </Text>
              ) : null}
            </View>
          ) : (
            <View className="gap-4">
              {dayEvents.map((event, index) => (
                <Pressable
                  key={event.id}
                  onPress={() => setSelectedEvent(event)}
                  className="flex-row gap-4"
                >
                  <View className="w-16 items-center">
                    <Text className="text-xs font-outfit text-secondary">
                      {event.timeStart}
                    </Text>
                    <View className="w-2 h-2 rounded-full bg-accent mt-2" />
                    {index < dayEvents.length - 1 ? (
                      <View
                        className="w-px flex-1 mt-2"
                        style={{ backgroundColor: colors.border }}
                      />
                    ) : null}
                    <Text className="text-[0.625rem] font-outfit text-secondary mt-2">
                      {event.timeEnd}
                    </Text>
                  </View>

                  <View
                    className="flex-1 rounded-3xl border p-4"
                    style={{
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: colors.border,
                    }}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-base font-clash text-app">
                        {event.title}
                      </Text>
                      <View className="px-3 py-1 rounded-full bg-secondary/10 border border-app/10">
                        <Text className="text-[0.6875rem] font-outfit text-secondary uppercase tracking-[1.2px]">
                          {event.tag}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-sm font-outfit text-secondary mt-1">
                      {event.timeStart} - {event.timeEnd}
                    </Text>
                    <View className="flex-row items-center gap-2 mt-3">
                      <Feather
                        name="map-pin"
                        size={12}
                        className="text-secondary"
                      />
                      <Text className="text-xs font-outfit text-secondary">
                        {event.location}
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-between mt-4">
                      <Text className="text-xs font-outfit text-secondary">
                        Athlete: {event.athlete}
                      </Text>
                      <Feather
                        name="chevron-right"
                        size={16}
                        className="text-secondary"
                      />
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View className="px-6 pb-10">
          <Pressable
            onPress={() => {
              if (!normalizedTier) {
                  Alert.alert(
                    "Choose a plan",
                    "Complete onboarding and select a plan to book sessions.",
                    [
                    { text: "View Plans", onPress: () => router.push("/plans") },
                    { text: "Not now", style: "cancel" },
                    ]
                  );
                return;
              }
              setBookingOpen(true);
              setBookingConfirmed(false);
              setBookingSlot(null);
              setBookingError(null);
            }}
            className="rounded-3xl border p-5 bg-input"
          >
            <Text className="text-base font-clash text-app">
              Book something new
            </Text>
            <Text className="text-sm font-outfit text-secondary mt-2">
              Calls, Lift Lab 1:1s, and premium meetings.
            </Text>
            <View className="mt-4 flex-row items-center gap-2">
              <View className="h-9 w-9 rounded-2xl bg-secondary/10 items-center justify-center border border-app/10">
                <Feather name="plus" size={16} className="text-secondary" />
              </View>
              <Text className="text-sm font-outfit text-app">
                Add booking in Schedule
              </Text>
            </View>
          </Pressable>
        </View>
      </ThemedScrollView>

      <Modal
        visible={!!selectedEvent}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedEvent(null)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setSelectedEvent(null)}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            className="rounded-t-[28px] p-6"
            style={{ backgroundColor: colors.background }}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-clash text-app">
                {selectedEvent?.title}
              </Text>
              <Pressable onPress={() => setSelectedEvent(null)}>
                <Feather name="x" size={20} className="text-secondary" />
              </Pressable>
            </View>
            <Text className="text-sm font-outfit text-secondary mt-2">
              {selectedEvent?.timeStart} - {selectedEvent?.timeEnd} · {selectedEvent?.location}
            </Text>

            <View className="mt-4 rounded-2xl border p-4 bg-secondary/10 border-app/10">
              <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                Notes
              </Text>
              <Text className="text-sm font-outfit text-app mt-2">
                {selectedEvent?.notes}
              </Text>
            </View>

            <View className="mt-4 flex-row items-center gap-3">
              <Pressable className="flex-1 px-4 py-3 rounded-full bg-accent">
                <Text className="text-xs font-outfit text-white uppercase tracking-[1.2px] text-center">
                  View Plan
                </Text>
              </Pressable>
              <Pressable className="flex-1 px-4 py-3 rounded-full border border-app/10 bg-secondary/10">
                <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px] text-center">
                  Reschedule
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={calendarOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCalendarOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setCalendarOpen(false)}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            className="rounded-t-[28px] p-6"
            style={{ backgroundColor: colors.background }}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-clash text-app">Full Calendar</Text>
              <Pressable onPress={() => setCalendarOpen(false)}>
                <Feather name="x" size={20} className="text-secondary" />
              </Pressable>
            </View>

            <View className="mt-4 flex-row items-center justify-between">
              <Pressable
                onPress={() => {
                  setCalendarMonth(
                    new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1),
                  );
                }}
                className="h-9 w-9 items-center justify-center rounded-full bg-secondary/10 border border-app/10"
              >
                <Feather name="chevron-left" size={18} className="text-secondary" />
              </Pressable>
              <Text className="text-base font-outfit text-app">
                {MONTH_LABELS[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
              </Text>
              <Pressable
                onPress={() => {
                  setCalendarMonth(
                    new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1),
                  );
                }}
                className="h-9 w-9 items-center justify-center rounded-full bg-secondary/10 border border-app/10"
              >
                <Feather name="chevron-right" size={18} className="text-secondary" />
              </Pressable>
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

            <View className="mt-2 flex-row flex-wrap">
              {calendarGrid.map((cell, index) => {
                if (!cell) {
                  return (
                    <View
                      key={`empty-${index}`}
                      className="h-12"
                      style={{ width: `${100 / 7}%` }}
                    />
                  );
                }
                const isToday =
                  cell.date.getDate() === today.getDate() &&
                  cell.date.getMonth() === today.getMonth() &&
                  cell.date.getFullYear() === today.getFullYear();
                const hasEvents = eventsByDate.has(cell.key);
                const isSelected = selectedCalendarDate === cell.key;
                return (
                  <Pressable
                    key={cell.key}
                    onPress={() => setSelectedCalendarDate(cell.key)}
                    className={`h-12 items-center justify-center rounded-2xl ${
                      isSelected ? "bg-accent/20" : ""
                    }`}
                    style={{ width: `${100 / 7}%` }}
                  >
                    <Text
                      className={`text-sm font-outfit ${
                        isToday ? "text-accent" : "text-app"
                      }`}
                    >
                      {cell.date.getDate()}
                    </Text>
                    {hasEvents ? (
                      <View className="mt-1 h-1.5 w-1.5 rounded-full bg-accent" />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {selectedCalendarDate ? (
              <View className="mt-4 rounded-2xl border border-app/10 bg-secondary/10 p-4">
                <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                  Bookings
                </Text>
                {(eventsByDate.get(selectedCalendarDate) ?? []).length === 0 ? (
                  <Text className="text-sm font-outfit text-secondary mt-2">
                    No bookings for this date.
                  </Text>
                ) : (
                  <View className="mt-2 gap-2">
                    {(eventsByDate.get(selectedCalendarDate) ?? []).map((event) => (
                      <View key={event.id} className="rounded-xl border border-app/10 bg-input px-3 py-2">
                        <Text className="text-sm font-outfit text-app">
                          {event.title}
                        </Text>
                        <Text className="text-xs font-outfit text-secondary mt-1">
                          {event.timeStart} - {event.timeEnd}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : null}
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
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setBookingOpen(false)}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            className="rounded-t-[28px] p-6"
            style={{ backgroundColor: colors.background }}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-clash text-app">
                {bookingConfirmed ? "Booking Confirmed" : "New Booking"}
              </Text>
              <Pressable onPress={() => setBookingOpen(false)}>
                <Feather name="x" size={20} className="text-secondary" />
              </Pressable>
            </View>

            {bookingConfirmed ? (
              <>
                <Text className="text-sm font-outfit text-secondary mt-2">
                  Your booking is locked in for {bookingSlot ? formatSlotLabel(bookingSlot) : "13:00"}.
                </Text>
                <View className="mt-4 rounded-2xl border p-4 bg-secondary/10 border-app/10">
                  <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                    Confirmation sent
                  </Text>
                  <Text className="text-sm font-outfit text-app mt-2">
                    Email + push notification delivered.
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
                  Choose a service and time window.
                </Text>

                {servicesLoading ? (
                  <Text className="text-xs font-outfit text-secondary mt-3">
                    Loading services...
                  </Text>
                ) : null}
                {servicesError ? (
                  <Text className="text-xs font-outfit text-red-400 mt-3">
                    {servicesError}
                  </Text>
                ) : null}

                {derivedBookingTypes.length === 0 ? (
                  <View className="mt-4 rounded-2xl border border-dashed border-app/20 p-4">
                    <Text className="text-sm font-outfit text-secondary">
                      No booking options are available for your current plan.
                    </Text>
                    <Pressable
                      onPress={() => router.push("/plans")}
                      className="mt-3 rounded-full bg-accent px-4 py-2"
                    >
                      <Text className="text-white text-xs font-outfit text-center">View Plans</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View className="mt-4 flex-row flex-wrap gap-2">
                    {derivedBookingTypes.map((item) => {
                      const active = selectedServiceId === item.id;
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => {
                            hasUserSelectedService.current = true;
                            setBookingType(item.type as any);
                            if (item.id) {
                              setSelectedServiceId(item.id);
                              const match = visibleServices.find((service) => service.id === item.id);
                              setBookingLocation(match?.defaultLocation ?? "");
                            }
                            setBookingSlot(null);
                          }}
                          className={`px-4 py-2 rounded-full border ${
                            active ? "bg-accent" : "bg-secondary/10"
                          }`}
                          style={{ borderColor: colors.border }}
                        >
                          <Text
                            className={`text-xs font-outfit uppercase tracking-[1.4px] ${
                              active ? "text-white" : "text-secondary"
                            }`}
                          >
                            {item.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {selectedService ? (
                  <>
                    <View className="mt-4 rounded-2xl border p-4 bg-secondary/10 border-app/10">
                      <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                        Available Times
                      </Text>
                      {availabilityLoading ? (
                        <Text className="text-xs font-outfit text-secondary mt-3">
                          Loading availability...
                        </Text>
                      ) : null}
                      {availabilityError ? (
                        <Text className="text-xs font-outfit text-red-400 mt-3">
                          {availabilityError}
                        </Text>
                      ) : null}
                      <View className="flex-row flex-wrap gap-2 mt-3">
                        {availableSlots.map((slot) => {
                          const active = bookingSlot === slot.startsAt;
                          return (
                            <Pressable
                              key={slot.startsAt}
                              onPress={() => setBookingSlot(slot.startsAt)}
                              className={`px-3 py-2 rounded-full border ${
                                active ? "bg-accent" : "bg-input"
                              }`}
                            >
                              <Text
                                className={`text-xs font-outfit ${
                                  active ? "text-white" : "text-app"
                                }`}
                              >
                                {slot.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      {bookingType === "role_model" ? (
                        <Text className="text-xs font-outfit text-secondary mt-3">
                          Premium calls are fixed at 13:00.
                        </Text>
                      ) : null}
                    </View>

                    <View className="mt-4 rounded-2xl border p-4 bg-secondary/10 border-app/10">
                      <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                        Booking Details (optional)
                      </Text>
                      <View className="mt-3 gap-2">
                        <View className="rounded-2xl border border-app/10 bg-input px-3 py-2">
                          <Text className="text-[0.6875rem] font-outfit text-secondary uppercase tracking-[1.2px]">
                            Location
                          </Text>
                          <TextInput
                            value={bookingLocation}
                            onChangeText={setBookingLocation}
                            placeholder="Add location"
                            placeholderTextColor={colors.mutedForeground}
                            className="text-sm font-outfit text-app mt-1"
                          />
                        </View>
                      </View>
                    </View>

                    <Pressable
                      onPress={async () => {
                        if (!bookingSlot || !selectedService) {
                          setBookingError("Please select a time slot.");
                          return;
                        }
                        setBookingError(null);
                        try {
                          const startsAt = new Date(bookingSlot);
                          const endsAt = new Date(startsAt.getTime() + selectedService.durationMinutes * 60000);
                          await apiRequest("/bookings", {
                            method: "POST",
                            token,
                            body: {
                              serviceTypeId: selectedService.id,
                              startsAt: startsAt.toISOString(),
                              endsAt: endsAt.toISOString(),
                              location: bookingLocation || undefined,
                            },
                          });
                          const refreshed = await apiRequest<{ items: any[] }>("/bookings", { token });
                          setEvents(mapBookingsToEvents(refreshed.items ?? []));
                          setBookingConfirmed(true);
                        } catch (err: any) {
                          setBookingError(err.message ?? "Failed to confirm booking");
                        }
                      }}
                      disabled={!bookingSlot || !selectedService}
                      className={`mt-4 px-4 py-3 rounded-full ${
                        bookingSlot && selectedService ? "bg-accent" : "bg-secondary/20"
                      }`}
                    >
                      <Text
                        className={`text-xs font-outfit uppercase tracking-[1.2px] text-center ${
                          bookingSlot && selectedService ? "text-white" : "text-secondary"
                        }`}
                      >
                        Confirm Booking
                      </Text>
                    </Pressable>
                    {bookingError ? (
                      <Text className="text-xs font-outfit text-red-400 mt-3">
                        {bookingError}
                      </Text>
                    ) : null}
                  </>
                ) : null}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
