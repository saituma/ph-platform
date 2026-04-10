import React, { useState } from "react";
import { Pressable, View, Modal, ActivityIndicator } from "react-native";
import { Feather } from "@/components/ui/theme-icons";
import { Text } from "@/components/ScaledText";
import { Shadows } from "@/constants/theme";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ScheduleEvent } from "./types";
import { formatDateKey } from "./utils";

interface EventListProps {
  dayEvents: ScheduleEvent[];
  eventsLoading: boolean;
  eventsError: string | null;
  selectedDateLabel: string;
  onReschedule: (event: ScheduleEvent) => void;
  getEventTone: (type: ScheduleEvent["type"]) => any;
  onRequestForDay: () => void;
}

const EventCard = ({
  event,
  onPress,
  tone,
}: {
  event: ScheduleEvent;
  onPress: () => void;
  tone: any;
}) => {
  const { colors, isDark } = useAppTheme();
  const mutedSurface = isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.82)";
  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-[24px] border p-4"
      style={{
        backgroundColor: colors.card,
        borderColor: borderSoft,
        ...(isDark ? Shadows.none : Shadows.sm),
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View
            className="h-10 w-10 items-center justify-center rounded-[14px]"
            style={{ backgroundColor: tone.iconBg }}
          >
            <Feather name={tone.icon} size={18} color={colors.accent} />
          </View>
          <View>
            <Text className="text-base font-clash text-app">{event.title}</Text>
            <Text className="text-xs font-outfit text-secondary">
              {event.timeStart} - {event.timeEnd}
            </Text>
          </View>
        </View>
        <Feather name="chevron-right" size={16} color={colors.textSecondary} />
      </View>
      {event.status === "pending" && (
        <View className="mt-3 self-start rounded-full px-2.5 py-1" style={{ backgroundColor: tone.pillBg }}>
          <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1px] text-orange-500">
            Awaiting approval
          </Text>
        </View>
      )}
    </Pressable>
  );
};

export function EventList({
  dayEvents,
  eventsLoading,
  eventsError,
  selectedDateLabel,
  onReschedule,
  getEventTone,
  onRequestForDay,
}: EventListProps) {
  const { colors, isDark } = useAppTheme();
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const surfaceColor = isDark ? colors.cardElevated : "#F7FFF9";
  const mutedSurface = isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.82)";
  const accentSurface = isDark ? "rgba(34,197,94,0.16)" : "rgba(34,197,94,0.10)";
  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  const overlayColor = isDark ? "rgba(34,197,94,0.16)" : "rgba(15,23,42,0.18)";

  return (
    <View className="px-6 pb-6">
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-lg font-clash text-app">Schedule</Text>
          <Text className="text-xs font-outfit text-secondary mt-1">
            {selectedDateLabel}
          </Text>
        </View>
        <View
          className="px-3 py-1.5 rounded-full"
          style={{ backgroundColor: mutedSurface, borderWidth: 1, borderColor: borderSoft }}
        >
          <Text className="text-[0.6875rem] font-outfit text-secondary uppercase tracking-[1.4px]">
            {dayEvents.length} events
          </Text>
        </View>
      </View>

      {eventsLoading ? (
        <View
          className="rounded-[28px] p-6"
          style={{ backgroundColor: surfaceColor, ...(isDark ? Shadows.none : Shadows.sm) }}
        >
          <View
            className="h-12 w-12 rounded-[18px] items-center justify-center"
            style={{ backgroundColor: accentSurface }}
          >
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
          <Text className="text-base font-clash text-app mt-3">Loading schedule</Text>
        </View>
      ) : dayEvents.length === 0 ? (
        <View
          className="rounded-[28px] p-6 items-center"
          style={{ backgroundColor: surfaceColor, ...(isDark ? Shadows.none : Shadows.sm) }}
        >
          <View
            className="h-16 w-16 rounded-[22px] items-center justify-center"
            style={{ backgroundColor: accentSurface }}
          >
            <Feather name="calendar" size={24} color={colors.accent} />
          </View>
          <Text className="text-base font-clash text-app mt-3">No events scheduled</Text>
          <Text className="text-sm font-outfit text-secondary mt-2 text-center">
            Request a call or session — the coach confirms before it&apos;s final.
          </Text>
          <Pressable className="mt-4 rounded-full bg-accent px-5 py-2" onPress={onRequestForDay}>
            <Text className="text-xs font-outfit text-white uppercase tracking-[1.2px]">
              Book a session
            </Text>
          </Pressable>
          {eventsError ? (
            <Text className="text-xs font-outfit text-red-400 mt-2">{eventsError}</Text>
          ) : null}
        </View>
      ) : (
        dayEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            tone={getEventTone(event.type)}
            onPress={() => setSelectedEvent(event)}
          />
        ))
      )}

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
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: overlayColor }}
          onPress={() => {
            setSelectedEvent(null);
            setShowDetails(false);
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full rounded-[32px] p-6"
            style={{ backgroundColor: surfaceColor }}
          >
            {!showDetails ? (
              <>
                <View className="flex-row items-center justify-between">
                  <Text className="text-xl font-clash text-app">{selectedEvent?.title}</Text>
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
                {selectedEvent?.meetingLink && (
                  <Text className="text-xs font-outfit text-secondary mt-1">
                    Meeting link available
                  </Text>
                )}
                {selectedEvent?.status === "pending" && (
                  <Text className="text-xs font-outfit text-secondary mt-1">Pending approval</Text>
                )}

                <View
                  className="mt-4 rounded-[22px] p-4"
                  style={{ backgroundColor: mutedSurface, ...(isDark ? Shadows.none : Shadows.sm) }}
                >
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
                        onReschedule(selectedEvent);
                      }
                      setSelectedEvent(null);
                      setShowDetails(false);
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
                  <Text className="text-lg font-clash text-app">Booking details</Text>
                  <Pressable onPress={() => setShowDetails(false)}>
                    <Feather name="x" size={20} className="text-secondary" />
                  </Pressable>
                </View>
                <View
                  className="mt-4 rounded-[22px] p-4 gap-2"
                  style={{ backgroundColor: mutedSurface, ...(isDark ? Shadows.none : Shadows.sm) }}
                >
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
                  {selectedEvent?.meetingLink && (
                    <Text className="text-xs font-outfit text-secondary">
                      Meeting: {selectedEvent.meetingLink}
                    </Text>
                  )}
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
    </View>
  );
}
