import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { Feather } from "@/components/ui/theme-icons";
import { Text, TextInput } from "@/components/ScaledText";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ServiceType } from "./types";
import { normalizeBookingCalendarDay } from "./utils";
import { apiRequest } from "@/lib/api";
import { useRouter } from "expo-router";

interface BookingModalProps {
  visible: boolean;
  onClose: () => void;
  token: string | null;
  services: ServiceType[];
  servicesLoading: boolean;
  servicesError: string | null;
  canCreateBookings: boolean;
  onSuccess: (startsAt: Date) => void;
}

export function BookingModal({
  visible,
  onClose,
  token,
  services,
  servicesLoading,
  servicesError,
  canCreateBookings,
  onSuccess,
}: BookingModalProps) {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);

  const [bookingLocation, setBookingLocation] = useState("");
  const [bookingMeetingLink, setBookingMeetingLink] = useState("");
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [confirmedStartsAt, setConfirmedStartsAt] = useState<Date | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasUserSelectedService = useRef(false);

  const activeServices = services.filter((s) => s.isActive !== false);
  const selectedService = activeServices.find((s) => s.id === selectedServiceId) ?? null;

  const overlayColor = isDark ? "rgba(34,197,94,0.16)" : "rgba(15,23,42,0.18)";
  const surfaceColor = isDark ? colors.cardElevated : "#F7FFF9";
  const mutedSurface = isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.82)";
  const accentSurface = isDark ? "rgba(34,197,94,0.16)" : "rgba(34,197,94,0.10)";
  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  const errorColor = isDark ? "#FCA5A5" : colors.danger;

  useEffect(() => {
    if (!visible) {
      setBookingConfirmed(false);
      setBookingError(null);
      setConfirmedStartsAt(null);
      hasUserSelectedService.current = false;
      return;
    }
    if (!activeServices.length) {
      setSelectedServiceId(null);
      return;
    }
    if (hasUserSelectedService.current && selectedServiceId) return;
    if (!selectedServiceId || !activeServices.some((s) => s.id === selectedServiceId)) {
      const next = activeServices[0];
      setSelectedServiceId(next.id);
    }
  }, [visible, activeServices, selectedServiceId]);

  const notifyBookingConfirmed = useCallback(async (startsAt?: Date | null) => {
    try {
      const { getNotifications } = await import("@/lib/notifications");
      const Notifications = await getNotifications();
      if (!Notifications) return;

      const dateLabel = startsAt
        ? startsAt.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
        : "your selected date";
      const timeLabel = startsAt
        ? startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "";

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Booking request sent",
          body: timeLabel
            ? `Your session on ${dateLabel} at ${timeLabel} is awaiting coach approval.`
            : `Your session request for ${dateLabel} is awaiting coach approval.`,
          data: { type: "booking", screen: "schedule" },
          sound: "default",
        },
        trigger: null,
      });
    } catch {
      // best-effort
    }
  }, []);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!selectedService) {
      setBookingError("Pick a session type first.");
      return;
    }
    setBookingError(null);
    setIsSubmitting(true);
    try {
      let startsAt = new Date();
      if (selectedService.oneTimeDate) {
        startsAt = new Date(`${selectedService.oneTimeDate}T${selectedService.oneTimeTime || "09:00:00"}`);
      } else {
        startsAt = new Date();
        startsAt.setHours(12, 0, 0, 0);
      }
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
        suppressStatusCodes: [400, 403],
      });
      setConfirmedStartsAt(startsAt);
      setBookingConfirmed(true);
      await notifyBookingConfirmed(startsAt);
      onSuccess(startsAt);
    } catch (err: any) {
      const rawMessage = err?.message ?? "Failed to submit booking";
      const cleanedMessage = String(rawMessage).replace(/^\d+\s+/, "");
      setBookingError(cleanedMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 justify-end" style={{ backgroundColor: overlayColor }} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="rounded-t-[30px] p-6"
          style={{ backgroundColor: surfaceColor, maxHeight: "85%" }}
        >
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-clash text-app">
                {bookingConfirmed ? "Request sent" : "Request a session"}
              </Text>
              <Pressable onPress={onClose}>
                <Feather name="x" size={20} className="text-secondary" />
              </Pressable>
            </View>

            {!bookingConfirmed && !canCreateBookings ? (
              <View
                className="mt-3 rounded-[22px] border px-4 py-3 gap-2"
                style={{ borderColor: borderSoft, backgroundColor: accentSurface }}
              >
                <Text className="text-xs font-outfit text-app leading-5">
                  Pick a service, date, and time below. Sending a request needs an approved paid plan (PHP, Plus, or Premium).
                </Text>
                <Pressable
                  onPress={() => {
                    onClose();
                    router.push("/(tabs)/programs");
                  }}
                  className="self-start"
                >
                  <Text className="text-xs font-outfit font-semibold" style={{ color: colors.accent }}>
                    View programs & plans →
                  </Text>
                </Pressable>
              </View>
            ) : null}

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
                <View
                  className="mt-4 rounded-[22px] border p-4"
                  style={{ backgroundColor: mutedSurface, borderColor: borderSoft }}
                >
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
                <Pressable onPress={onClose} className="mt-4 px-4 py-3 rounded-full bg-accent">
                  <Text className="text-xs font-outfit text-white uppercase tracking-[1.2px] text-center">
                    Done
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text className="text-sm font-outfit text-secondary mt-2">
                  Choose the session type, then pick any day and time that works for you. Nothing is final until the coach approves.
                </Text>

                {servicesLoading && (
                  <Text className="text-xs font-outfit text-secondary mt-3">Loading services...</Text>
                )}
                {servicesError && (
                  <Text className="text-xs font-outfit mt-3" style={{ color: errorColor }}>
                    {servicesError}
                  </Text>
                )}

                {activeServices.length === 0 ? (
                  <View
                    className="mt-4 rounded-[22px] border border-dashed p-4"
                    style={{ borderColor: borderSoft, backgroundColor: mutedSurface }}
                  >
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
                            {item.capacity ? ` (${item.capacity} max)` : ""}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                  {selectedService && (
                    <Text className="text-xs font-outfit text-secondary mt-3">
                      Capacity: {selectedService.capacity ?? "Unlimited"} total
                    </Text>
                  )}
                  {selectedService && selectedService.oneTimeDate ? (
                    <View
                      className="mt-4 rounded-2xl border px-3 py-3"
                      style={{ borderColor: colors.accent, backgroundColor: accentSurface }}
                    >
                      <Text
                        className="text-[10px] font-outfit font-bold uppercase tracking-[1.2px]"
                        style={{ color: colors.accent }}
                      >
                        Scheduled for
                      </Text>
                      <Text className="text-sm font-outfit text-app font-semibold mt-1">
                        {new Date(`${selectedService.oneTimeDate}T12:00:00`).toLocaleDateString([], {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        · {selectedService.oneTimeTime}
                      </Text>
                    </View>
                  ) : null}

                <View
                  className="mt-4 rounded-[22px] border p-4"
                  style={{ backgroundColor: mutedSurface, borderColor: borderSoft }}
                >
                  <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                    Location & link (optional)
                  </Text>
                  <View className="mt-3 gap-2">
                    <View
                      className="rounded-2xl border px-3 py-2"
                      style={{ backgroundColor: surfaceColor, borderColor: borderSoft }}
                    >
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
                    <View
                      className="rounded-2xl border px-3 py-2"
                      style={{ backgroundColor: surfaceColor, borderColor: borderSoft }}
                    >
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
                  onPress={handleSubmit}
                  disabled={!selectedService || isSubmitting || !canCreateBookings}
                  className={`mt-4 px-4 py-3 flex-row items-center justify-center gap-2 rounded-full ${
                    selectedService && canCreateBookings ? "bg-accent" : "bg-secondary/20"
                  }`}
                >
                  {isSubmitting && <ActivityIndicator size="small" color="#ffffff" />}
                  <Text
                    className={`text-xs font-outfit uppercase tracking-[1.2px] text-center ${
                      selectedService && canCreateBookings ? "text-white" : "text-secondary"
                    }`}
                  >
                    {isSubmitting
                      ? "Sending..."
                      : !canCreateBookings
                        ? "Plan required to book"
                        : "Send request"}
                  </Text>
                </Pressable>
                {bookingError && (
                  <Text className="text-xs font-outfit mt-3" style={{ color: errorColor }}>
                    {bookingError}
                  </Text>
                )}


              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
