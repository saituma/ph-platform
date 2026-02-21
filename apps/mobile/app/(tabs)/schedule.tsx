import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Feather } from "@/components/ui/theme-icons";
import { useRole } from "@/context/RoleContext";
import { apiRequest } from "@/lib/api";
import { getNotifications } from "@/lib/notifications";
import { useAppSelector } from "@/store/hooks";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InteractionManager, Modal, Platform, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, TextInput } from "@/components/ScaledText";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { AgeGate } from "@/components/AgeGate";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";

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

type AvailabilityBlock = {
  id: number;
  serviceTypeId: number;
  startsAt: string;
  endsAt: string;
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

export default function ScheduleScreen() {
  const router = useRouter();
  const { role } = useRole();
  const { colors } = useAppTheme();
  const { token } = useAppSelector((state) => state.user);
  const { isSectionHidden } = useAgeExperience();
  if (isSectionHidden("schedule")) {
    return <AgeGate title="Schedule locked" message="Scheduling is restricted for this age." />;
  }
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(
    null,
  );
  const [showDetails, setShowDetails] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [bookingDate, setBookingDate] = useState<Date>(today);
  const [bookingTime, setBookingTime] = useState<Date>(today);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [bookingLocation, setBookingLocation] = useState("");
  const [bookingMeetingLink, setBookingMeetingLink] = useState("");
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [availabilityBookings, setAvailabilityBookings] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<Date[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [hasAvailabilityBlocks, setHasAvailabilityBlocks] = useState(false);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const hasUserSelectedService = useRef(false);
  const [calendarMonth, setCalendarMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(todayKey);

  const notifyBookingConfirmed = useCallback(
    async (serviceName: string, startsAt: Date) => {
      const Notifications = await getNotifications();
      if (!Notifications || typeof Notifications.scheduleNotificationAsync !== "function") return;
      const dateLabel = startsAt.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
      const timeLabel = startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Booking requested",
          body: `${serviceName} • ${dateLabel} at ${timeLabel}`,
          sound: "default",
          channelId: "bookings",
          data: { type: "booking", startsAt: startsAt.toISOString(), serviceName },
        },
        trigger: null,
      });
    },
    [],
  );

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
        location: item.location || "TBD",
        meetingLink: item.meetingLink ?? null,
        type: item.type?.includes("call") ? "call" : "training",
        status: item.status ?? undefined,
        tag: role === "Guardian" ? "Parent" : "Athlete",
        athlete: item.athleteName ?? "Athlete",
        coach: "Coach",
        notes: item.notes ?? "",
      } as ScheduleEvent;
    });
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

  const slotCounts = useMemo(() => {
    const map = new Map<string, number>();
    availabilityBookings.forEach((booking) => {
      if (!booking?.startsAt) return;
      const key = new Date(booking.startsAt).toISOString();
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [availabilityBookings]);

  const toTimeLabel = useCallback((date: Date) => {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }, []);

  const mergeDateAndTime = useCallback((date: Date, time: Date) => {
    const next = new Date(date);
    next.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return next;
  }, []);

  const buildSlots = useCallback(
    (blocks: AvailabilityBlock[], durationMinutes: number, fixedTime?: string | null) => {
      const durationMs = durationMinutes * 60 * 1000;
      const slotMap = new Map<string, Date>();
      blocks.forEach((block) => {
        const start = new Date(block.startsAt);
        const end = new Date(block.endsAt);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
        for (let cursor = new Date(start.getTime()); cursor.getTime() + durationMs <= end.getTime(); cursor = new Date(cursor.getTime() + durationMs)) {
          if (fixedTime && toTimeLabel(cursor) !== fixedTime) continue;
          slotMap.set(cursor.toISOString(), cursor);
        }
      });
      return Array.from(slotMap.values()).sort((a, b) => a.getTime() - b.getTime());
    },
    [toTimeLabel],
  );

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
    if (!fixedTimeLabel) return;
    const [hours, minutes] = fixedTimeLabel.split(":").map((value) => Number(value));
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return;
    const next = new Date(bookingTime);
    next.setHours(hours, minutes, 0, 0);
    setBookingTime(next);
  }, [fixedTimeLabel]);

  useEffect(() => {
    const next = mergeDateAndTime(bookingDate, bookingTime);
    setBookingTime(next);
  }, [bookingDate, mergeDateAndTime]);

  useEffect(() => {
    if (!bookingOpen || !token || !selectedService) return;
    let active = true;
    const start = new Date(bookingDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(bookingDate);
    end.setHours(23, 59, 59, 999);
    setAvailabilityLoading(true);
    setAvailabilityError(null);
    apiRequest<{ items: AvailabilityBlock[]; bookings?: any[] }>(
      `/bookings/availability?serviceTypeId=${selectedService.id}&from=${encodeURIComponent(start.toISOString())}&to=${encodeURIComponent(end.toISOString())}`,
      { token },
    )
      .then((data) => {
        if (!active) return;
        const blocks = data.items ?? [];
        setHasAvailabilityBlocks(blocks.length > 0);
        const bookingItems = data.bookings ?? [];
        setAvailabilityBookings(bookingItems);
        const slots = buildSlots(blocks, selectedService.durationMinutes, fixedTimeLabel);
        setAvailableSlots(slots);
        const capacity = selectedService.capacity ?? null;
        const counts = new Map<string, number>();
        bookingItems.forEach((booking) => {
          if (!booking?.startsAt) return;
          const key = new Date(booking.startsAt).toISOString();
          counts.set(key, (counts.get(key) ?? 0) + 1);
        });
        setSelectedSlot((prev) => {
          const isPrevValid = prev && slots.some((slot) => slot.toISOString() === prev.toISOString());
          if (isPrevValid) {
            if (!capacity) return prev;
            const prevCount = counts.get(prev.toISOString()) ?? 0;
            if (prevCount < capacity) return prev;
          }
          const firstAvailable = slots.find((slot) => {
            if (!capacity) return true;
            const count = counts.get(slot.toISOString()) ?? 0;
            return count < capacity;
          });
          if (firstAvailable) return firstAvailable;
          if (capacity) {
            return mergeDateAndTime(bookingDate, bookingTime);
          }
          return null;
        });
      })
      .catch((err) => {
        if (!active) return;
        setAvailabilityError(err.message ?? "Failed to load availability");
        setAvailabilityBookings([]);
        setAvailableSlots([]);
        setSelectedSlot(null);
        setHasAvailabilityBlocks(false);
      })
      .finally(() => {
        if (!active) return;
        setAvailabilityLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bookingOpen, token, selectedService, bookingDate, fixedTimeLabel, buildSlots]);

  useEffect(() => {
    if (!selectedSlot) return;
    setBookingTime(selectedSlot);
  }, [selectedSlot]);

  useEffect(() => {
    if (!bookingOpen || !selectedService?.capacity || hasAvailabilityBlocks) return;
    setSelectedSlot(mergeDateAndTime(bookingDate, bookingTime));
  }, [bookingOpen, selectedService, bookingDate, bookingTime, hasAvailabilityBlocks, mergeDateAndTime]);

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
                {role === "Guardian" ? "Family Schedule" : "My Schedule"}
              </Text>
              <Text className="text-secondary font-outfit text-sm mt-1">
                {selectedDate.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
              </Text>
            </View>
            <Pressable
              className="rounded-full bg-secondary/10 border border-app/10 px-4 py-2"
              onPress={() => {
                setBookingOpen(true);
                setBookingConfirmed(false);
                setBookingError(null);
              }}
            >
              <View className="flex-row items-center gap-2">
                <Feather name="plus" size={16} className="text-secondary" />
                <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                  Add booking
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        <View className="px-6 pb-4">
          <View className="flex-row items-center justify-between">
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
              const isToday = cell.key === todayKey;
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
        </View>

        <View className="px-6 pb-6">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-lg font-clash text-app">Schedule</Text>
              <Text className="text-xs font-outfit text-secondary mt-1">
                {selectedDate.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
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
              <Pressable
                className="mt-4 rounded-full bg-accent px-5 py-2"
                onPress={() => {
                  setBookingOpen(true);
                  setBookingConfirmed(false);
                  setBookingError(null);
                }}
              >
                <Text className="text-xs font-outfit text-white uppercase tracking-[1.2px]">
                  Book this day
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
              {dayEvents.map((event) => (
                <Pressable
                  key={event.id}
                  onPress={() => setSelectedEvent(event)}
                  className="rounded-2xl border p-4 bg-input"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-clash text-app">
                      {event.title}
                    </Text>
                    <Text className="text-xs font-outfit text-secondary">
                      {event.timeStart}
                    </Text>
                  </View>
                  <Text className="text-sm font-outfit text-secondary mt-1">
                    {event.timeStart} - {event.timeEnd}
                  </Text>
                  <View className="flex-row items-center gap-2 mt-3">
                    <Feather name="map-pin" size={12} className="text-secondary" />
                    <Text className="text-xs font-outfit text-secondary">
                      {event.location}
                    </Text>
                  </View>
                  {event.status === "pending" ? (
                    <Text className="text-xs font-outfit text-secondary mt-2">
                      Pending approval
                    </Text>
                  ) : null}
                  <Text className="text-xs font-outfit text-secondary mt-3">
                    Athlete: {event.athlete}
                  </Text>
                </Pressable>
              ))}
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
          className="flex-1 bg-black/40 justify-end"
          onPress={() => {
            setSelectedEvent(null);
            setShowDetails(false);
          }}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            className="rounded-t-[28px] p-6"
            style={{ backgroundColor: colors.background }}
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

                <View className="mt-4 rounded-2xl border p-4 bg-secondary/10 border-app/10">
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
                    className="flex-1 px-4 py-3 rounded-full border border-app/10 bg-secondary/10"
                    onPress={() => {
                      if (selectedEvent) {
                        const eventDate = new Date(selectedEvent.startsAt);
                        setBookingDate(eventDate);
                        setBookingTime(eventDate);
                      }
                      setSelectedEvent(null);
                      setShowDetails(false);
                      setBookingConfirmed(false);
                      setBookingError(null);
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
                <View className="mt-4 rounded-2xl border p-4 bg-secondary/10 border-app/10 gap-2">
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
                    className="flex-1 px-4 py-3 rounded-full border border-app/10 bg-secondary/10"
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
                {bookingConfirmed ? "Booking Requested" : "New Booking"}
              </Text>
              <Pressable onPress={() => setBookingOpen(false)}>
                <Feather name="x" size={20} className="text-secondary" />
              </Pressable>
            </View>

            {bookingConfirmed ? (
              <>
                <Text className="text-sm font-outfit text-secondary mt-2">
                  Booking request sent for {bookingDate.toLocaleDateString([], { month: "short", day: "numeric" })} at{" "}
                  {bookingTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.
                </Text>
                <View className="mt-4 rounded-2xl border p-4 bg-secondary/10 border-app/10">
                  <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                    Pending approval
                  </Text>
                  <Text className="text-sm font-outfit text-app mt-2">
                    Your request is awaiting approval.
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
                  Fill this out so the admin understands the request clearly.
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

                {activeServices.length === 0 ? (
                  <View className="mt-4 rounded-2xl border border-dashed border-app/20 p-4">
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
                              setBookingLocation(item.defaultLocation ?? "");
                              setBookingMeetingLink(item.defaultMeetingLink ?? "");
                            }
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
                            {item.name}
                            {item.capacity ? ` (${item.capacity} slots)` : ""}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                <View className="mt-4 rounded-2xl border p-4 bg-secondary/10 border-app/10">
                  <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                    Date & Time
                  </Text>
                  <View className="mt-3 gap-2">
                    <Pressable
                      onPress={() => setShowDatePicker(true)}
                      className="rounded-2xl border border-app/10 bg-input px-3 py-3"
                    >
                      <Text className="text-[0.6875rem] font-outfit text-secondary uppercase tracking-[1.2px]">
                        Date
                      </Text>
                      <Text className="text-sm font-outfit text-app mt-1">
                        {bookingDate.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        if (fixedTimeLabel) return;
                        setShowTimePicker(true);
                      }}
                      className={`rounded-2xl border border-app/10 bg-input px-3 py-3 ${
                        fixedTimeLabel ? "opacity-70" : ""
                      }`}
                    >
                      <Text className="text-[0.6875rem] font-outfit text-secondary uppercase tracking-[1.2px]">
                        Time
                      </Text>
                      <Text className="text-sm font-outfit text-app mt-1">
                        {fixedTimeLabel
                          ? `${fixedTimeLabel} (Fixed)`
                          : bookingTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View className="mt-4 rounded-2xl border p-4 bg-secondary/10 border-app/10">
                  <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                    Available slots
                  </Text>
                  {availabilityLoading ? (
                    <Text className="text-xs font-outfit text-secondary mt-3">
                      Loading availability...
                    </Text>
                  ) : availabilityError ? (
                    <Text className="text-xs font-outfit text-red-400 mt-3">
                      {availabilityError}
                    </Text>
                  ) : fixedTimeLabel ? (
                    availableSlots.length === 0 ? (
                      selectedService?.capacity && !hasAvailabilityBlocks ? (
                        <Text className="text-sm font-outfit text-secondary mt-3">
                          No availability blocks set. You can still pick a time above.
                        </Text>
                      ) : (
                        <Text className="text-sm font-outfit text-secondary mt-3">
                          No slots available at {fixedTimeLabel} on this date.
                        </Text>
                      )
                    ) : (
                      <Text className="text-sm font-outfit text-secondary mt-3">
                        Fixed time at {fixedTimeLabel}. You don’t need to pick a time.
                      </Text>
                    )
                  ) : availableSlots.length === 0 ? (
                    selectedService?.capacity && !hasAvailabilityBlocks ? (
                      <Text className="text-sm font-outfit text-secondary mt-3">
                        No availability blocks set. Pick a time above to request a slot.
                      </Text>
                    ) : (
                      <Text className="text-sm font-outfit text-secondary mt-3">
                        No slots available for this date.
                      </Text>
                    )
                  ) : (
                    <View className="mt-3 flex-row flex-wrap gap-2">
                      {availableSlots.map((slot) => {
                        const active = selectedSlot?.toISOString() === slot.toISOString();
                        const capacity = selectedService?.capacity ?? null;
                        const count = slotCounts.get(slot.toISOString()) ?? 0;
                        const isFull = capacity ? count >= capacity : false;
                        return (
                          <Pressable
                            key={slot.toISOString()}
                            onPress={() => {
                              if (isFull) return;
                              setSelectedSlot(slot);
                            }}
                            className={`px-4 py-2 rounded-full border ${
                              active ? "bg-accent" : "bg-secondary/10"
                            } ${isFull ? "opacity-50" : ""}`}
                            style={{ borderColor: colors.border }}
                          >
                            <Text
                              className={`text-xs font-outfit uppercase tracking-[1.4px] ${
                                active ? "text-white" : "text-secondary"
                              }`}
                            >
                              {capacity
                                ? `${Math.max(capacity - count, 0)} slots left`
                                : "Available"}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>

                <View className="mt-4 rounded-2xl border p-4 bg-secondary/10 border-app/10">
                  <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                    Details (optional)
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
                    <View className="rounded-2xl border border-app/10 bg-input px-3 py-2">
                      <Text className="text-[0.6875rem] font-outfit text-secondary uppercase tracking-[1.2px]">
                        Meeting link
                      </Text>
                      <TextInput
                        value={bookingMeetingLink}
                        onChangeText={setBookingMeetingLink}
                        placeholder="Add link (Zoom, Meet, etc.)"
                        placeholderTextColor={colors.mutedForeground}
                        className="text-sm font-outfit text-app mt-1"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  </View>
                </View>

                <Pressable
                  onPress={async () => {
                    if (!selectedService) {
                      setBookingError("Please select a booking type.");
                      return;
                    }
                    if (!selectedSlot) {
                      setBookingError("Please select a time slot.");
                      return;
                    }
                    setBookingError(null);
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
                      });
                      const refreshed = await apiRequest<{ items: any[] }>("/bookings", { token });
                      setEvents(mapBookingsToEvents(refreshed.items ?? []));
                      setBookingConfirmed(true);
                      await notifyBookingConfirmed(selectedService.name ?? "Booking", startsAt);
                    } catch (err: any) {
                      setBookingError(err.message ?? "Failed to submit booking");
                    }
                  }}
                  disabled={!selectedService || !selectedSlot}
                  className={`mt-4 px-4 py-3 rounded-full ${
                    selectedService && selectedSlot ? "bg-accent" : "bg-secondary/20"
                  }`}
                >
                  <Text
                    className={`text-xs font-outfit uppercase tracking-[1.2px] text-center ${
                      selectedService && selectedSlot ? "text-white" : "text-secondary"
                    }`}
                  >
                    Submit Booking
                  </Text>
                </Pressable>
                {bookingError ? (
                  <Text className="text-xs font-outfit text-red-400 mt-3">
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
                {showTimePicker ? (
                  <View className="mt-3">
                    <DateTimePicker
                      value={bookingTime}
                      mode="time"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={(event, date) => {
                        if (Platform.OS !== "ios") {
                          setShowTimePicker(false);
                        }
                        if (event.type === "dismissed") return;
                        if (!date) return;
                        setBookingTime(date);
                      }}
                    />
                    {Platform.OS === "ios" ? (
                      <Pressable
                        onPress={() => setShowTimePicker(false)}
                        className="mt-2 self-end rounded-full border border-app px-4 py-2"
                      >
                        <Text className="text-app font-outfit text-xs">Done</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
