import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Feather } from "@/components/ui/theme-icons";
import { useRole } from "@/context/RoleContext";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

const DAYS = [
  { id: "mon", day: "Mon", date: 12, month: "Feb" },
  { id: "tue", day: "Tue", date: 13, month: "Feb" },
  { id: "wed", day: "Wed", date: 14, month: "Feb" },
  { id: "thu", day: "Thu", date: 15, month: "Feb" },
  { id: "fri", day: "Fri", date: 16, month: "Feb" },
  { id: "sat", day: "Sat", date: 17, month: "Feb" },
  { id: "sun", day: "Sun", date: 18, month: "Feb" },
];

const EVENTS: ScheduleEvent[] = [
  {
    id: "evt-1",
    dayId: "wed",
    title: "Strength Session",
    timeStart: "08:00",
    timeEnd: "09:00",
    location: "Lift Lab · Turf",
    type: "training",
    tag: "Athlete",
    athlete: "Marcus",
    coach: "Coach Oliver",
    notes: "Lower body focus + acceleration mechanics.",
  },
  {
    id: "evt-2",
    dayId: "wed",
    title: "Premium Call",
    timeStart: "13:00",
    timeEnd: "13:30",
    location: "Zoom · Coach Oliver",
    type: "call",
    tag: "Parent",
    athlete: "Marcus",
    coach: "Coach Oliver",
    notes: "Progress review + next block planning.",
  },
  {
    id: "evt-3",
    dayId: "wed",
    title: "Recovery & Mobility",
    timeStart: "18:00",
    timeEnd: "18:30",
    location: "Home plan",
    type: "recovery",
    tag: "Athlete",
    athlete: "Marcus",
    coach: "Coach Oliver",
    notes: "15 min mobility flow + foam rolling.",
  },
  {
    id: "evt-4",
    dayId: "thu",
    title: "Speed Mechanics",
    timeStart: "07:30",
    timeEnd: "08:15",
    location: "Lift Lab · Field",
    type: "training",
    tag: "Athlete",
    athlete: "Marcus",
    coach: "Coach Oliver",
    notes: "Starts, shin angles, and marching drills.",
  },
  {
    id: "evt-5",
    dayId: "fri",
    title: "Team Practice",
    timeStart: "17:30",
    timeEnd: "19:00",
    location: "West High Stadium",
    type: "training",
    tag: "Team",
    athlete: "Marcus",
    coach: "Team Staff",
    notes: "Pads on. Bring water and cleats.",
  },
  {
    id: "evt-6",
    dayId: "sat",
    title: "Group Call",
    timeStart: "10:00",
    timeEnd: "10:45",
    location: "Zoom · Parent Hub",
    type: "call",
    tag: "Parent",
    athlete: "Marcus",
    coach: "Coach Oliver",
    notes: "Q&A for growth and recovery.",
  },
];

export default function ScheduleScreen() {
  const { role } = useRole();
  const { colors } = useAppTheme();
  const [selectedFilter, setSelectedFilter] = useState<
    (typeof FILTERS)[number]
  >("All");
  const [selectedDayId, setSelectedDayId] = useState(DAYS[2].id);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(
    null,
  );
  const [bookingOpen, setBookingOpen] = useState(false);

  const weekStats = useMemo(() => {
    const training = EVENTS.filter((event) => event.type === "training").length;
    const calls = EVENTS.filter((event) => event.type === "call").length;
    const recovery = EVENTS.filter((event) => event.type === "recovery").length;
    return {
      total: EVENTS.length,
      training,
      calls,
      recovery,
    };
  }, []);

  const dayEvents = useMemo(() => {
    const eventsForDay = EVENTS.filter((event) => event.dayId === selectedDayId);
    if (selectedFilter === "All") return eventsForDay;
    if (selectedFilter === "Training") {
      return eventsForDay.filter((event) => event.type === "training");
    }
    if (selectedFilter === "Calls") {
      return eventsForDay.filter((event) => event.type === "call");
    }
    return eventsForDay.filter((event) => event.type === "recovery");
  }, [selectedDayId, selectedFilter]);

  const activeDay = DAYS.find((day) => day.id === selectedDayId) ?? DAYS[2];

  return (
    <SafeAreaView className="flex-1 bg-app">
      <ThemedScrollView
        onRefresh={async () => {
          await new Promise((resolve) => setTimeout(resolve, 2000));
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
              onPress={() => setBookingOpen(true)}
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

          {dayEvents.length === 0 ? (
            <View className="rounded-3xl border p-6 bg-input items-center">
              <Feather name="calendar" size={20} className="text-secondary" />
              <Text className="text-base font-clash text-app mt-3">
                No events scheduled
              </Text>
              <Text className="text-sm font-outfit text-secondary mt-2 text-center">
                Use the plus button to add a call or training session.
              </Text>
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
            onPress={() => setBookingOpen(true)}
            className="rounded-3xl border p-5 bg-input"
          >
            <Text className="text-base font-clash text-app">
              Book something new
            </Text>
            <Text className="text-sm font-outfit text-secondary mt-2">
              Calls, group sessions, and private training.
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
              <Text className="text-lg font-clash text-app">New Booking</Text>
              <Pressable onPress={() => setBookingOpen(false)}>
                <Feather name="x" size={20} className="text-secondary" />
              </Pressable>
            </View>

            <Text className="text-sm font-outfit text-secondary mt-2">
              Choose a service and time window.
            </Text>

            <View className="mt-4 flex-row gap-2">
              {["Call", "Group", "1:1"].map((item, index) => (
                <View
                  key={item}
                  className={`px-4 py-2 rounded-full border ${
                    index === 0 ? "bg-accent" : "bg-secondary/10"
                  }`}
                  style={{ borderColor: colors.border }}
                >
                  <Text
                    className={`text-xs font-outfit uppercase tracking-[1.4px] ${
                      index === 0 ? "text-white" : "text-secondary"
                    }`}
                  >
                    {item}
                  </Text>
                </View>
              ))}
            </View>

            <View className="mt-4 rounded-2xl border p-4 bg-secondary/10 border-app/10">
              <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                Available Times
              </Text>
              <View className="flex-row flex-wrap gap-2 mt-3">
                {[
                  "09:00",
                  "10:00",
                  "13:00",
                  "16:30",
                  "18:00",
                  "19:30",
                ].map((slot) => (
                  <View
                    key={slot}
                    className="px-3 py-2 rounded-full border border-app/10 bg-input"
                  >
                    <Text className="text-xs font-outfit text-app">{slot}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Pressable
              onPress={() => setBookingOpen(false)}
              className="mt-4 px-4 py-3 rounded-full bg-accent"
            >
              <Text className="text-xs font-outfit text-white uppercase tracking-[1.2px] text-center">
                Confirm Booking
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
