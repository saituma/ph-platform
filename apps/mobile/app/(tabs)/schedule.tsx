import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Feather } from "@/components/ui/theme-icons";
import { useRole } from "@/context/RoleContext";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { canAccessTier, normalizeProgramTier } from "@/lib/planAccess";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

type ScheduleEvent = {
  id: string;
  dayId: string;
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

const DAYS = [
  { id: "mon", day: "Mon", date: 12, month: "Feb" },
  { id: "tue", day: "Tue", date: 13, month: "Feb" },
  { id: "wed", day: "Wed", date: 14, month: "Feb" },
  { id: "thu", day: "Thu", date: 15, month: "Feb" },
  { id: "fri", day: "Fri", date: 16, month: "Feb" },
  { id: "sat", day: "Sat", date: 17, month: "Feb" },
  { id: "sun", day: "Sun", date: 18, month: "Feb" },
];

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
  const [selectedDayId, setSelectedDayId] = useState(DAYS[2].id);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(
    null,
  );
  const [bookingOpen, setBookingOpen] = useState(false);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [availabilitySlots, setAvailabilitySlots] = useState<string[]>([]);
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

  const mapBookingsToEvents = (items: any[]) => {
    return (items ?? []).map((item) => {
      const startsAt = new Date(item.startsAt);
      const endTime = item.endTime ? new Date(item.endTime) : new Date(startsAt.getTime() + 30 * 60000);
      const dayIndex = startsAt.getDay();
      const dayId = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][dayIndex] ?? "mon";
      return {
        id: String(item.id),
        dayId,
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
  };

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

  const activeDay = DAYS.find((day) => day.id === selectedDayId) ?? DAYS[2];
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
      value: service.type,
      id: service.id,
    }));
  }, [visibleServices]);
  const fixedSlot =
    selectedService?.fixedStartTime || (bookingType === "role_model" ? "13:00" : null);
  const availableSlots = fixedSlot
    ? [fixedSlot]
    : availabilitySlots.length
      ? availabilitySlots
      : DEFAULT_SLOTS;

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
    if (!visibleServices.length) {
      setSelectedServiceId(null);
      return;
    }
    if (!selectedServiceId || !visibleServices.some((service) => service.id === selectedServiceId)) {
      const next = visibleServices[0];
      setSelectedServiceId(next.id);
      setBookingType(next.type as any);
      setBookingLocation(next.defaultLocation ?? "");
    }
  }, [visibleServices, selectedServiceId]);

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
          data.items?.map((item) =>
            new Date(item.startsAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }),
          ) ?? [];
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
    loadEvents();
    return () => {
      active = false;
    };
  }, [token, role]);

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
                <Text className="text-[11px] font-outfit text-secondary uppercase tracking-[1.2px]">
                  Next: 13:00 call
                </Text>
              </View>
              <View className="px-3 py-1 rounded-full bg-secondary/10 border border-app/10">
                <Text className="text-[11px] font-outfit text-secondary uppercase tracking-[1.2px]">
                  Wed strength
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-6 pb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-clash text-app">Week View</Text>
            <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.6px]">
              February
            </Text>
          </View>
          <View className="flex-row justify-between">
            {DAYS.map((day) => {
              const active = day.id === selectedDayId;
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
                    className={`text-[10px] font-outfit uppercase tracking-[1.4px] ${
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
              <Text className="text-[11px] font-outfit text-secondary uppercase tracking-[1.4px]">
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
                    <Text className="text-[10px] font-outfit text-secondary mt-2">
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
                        <Text className="text-[11px] font-outfit text-secondary uppercase tracking-[1.2px]">
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
                  Your booking is locked in for {bookingSlot ?? "13:00"}.
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
                      const active = bookingType === item.value;
                      return (
                        <Pressable
                          key={item.id ?? item.value}
                          onPress={() => {
                            setBookingType(item.value as any);
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
                          const active = bookingSlot === slot;
                          return (
                            <Pressable
                              key={slot}
                              onPress={() => setBookingSlot(slot)}
                              className={`px-3 py-2 rounded-full border ${
                                active ? "bg-accent" : "bg-input"
                              }`}
                            >
                              <Text
                                className={`text-xs font-outfit ${
                                  active ? "text-white" : "text-app"
                                }`}
                              >
                                {slot}
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
                          <Text className="text-[11px] font-outfit text-secondary uppercase tracking-[1.2px]">
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
                        if (!bookingSlot || !selectedService) return;
                        setBookingError(null);
                        try {
                          const [hour, minute] = bookingSlot.split(":").map((part) => Number(part));
                          const startsAt = new Date();
                          startsAt.setHours(hour, minute, 0, 0);
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
                      className={`mt-4 px-4 py-3 rounded-full ${
                        bookingSlot && selectedService ? "bg-accent" : "bg-secondary/20"
                      }`}
                    >
                      <Text className="text-xs font-outfit text-white uppercase tracking-[1.2px] text-center">
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
