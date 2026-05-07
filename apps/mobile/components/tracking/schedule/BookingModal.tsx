import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { BottomSheet } from "heroui-native";
import { useQuery } from "@tanstack/react-query";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Feather } from "@/components/ui/theme-icons";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { ServiceType, GeneratedAvailabilityOccurrence } from "./types";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
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
  initialServiceId?: number | null;
}

function formatSlotTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatSlotDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
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
  initialServiceId,
}: BookingModalProps) {
  const router = useRouter();
  const insets = useAppSafeAreaInsets();
  const p = useAdminPastel();

  const snapPoints = useMemo(() => ["62%", "90%"], []);

  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedOccurrence, setSelectedOccurrence] = useState<GeneratedAvailabilityOccurrence | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [confirmedStartsAt, setConfirmedStartsAt] = useState<Date | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState("");

  const hasUserSelectedService = useRef(false);

  const activeServices = services.filter((s) => s.isActive !== false);
  const selectedService = activeServices.find((s) => s.id === selectedServiceId) ?? null;
  const isRecurring = selectedService?.schedulePattern === "weekly_recurring";

  const availFrom = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const availTo = useMemo(() => { const d = new Date(); d.setDate(d.getDate() + 30); d.setHours(23, 59, 59, 999); return d; }, []);

  const { data: availabilityData, isLoading: availabilityLoading } = useQuery({
    queryKey: queryKeys.bookings.generatedAvailability(selectedServiceId ?? 0, availFrom.toISOString(), availTo.toISOString()),
    queryFn: async () => {
      const data = await apiRequest<{ items: GeneratedAvailabilityOccurrence[] }>(
        `/bookings/generated-availability?from=${encodeURIComponent(availFrom.toISOString())}&to=${encodeURIComponent(availTo.toISOString())}`,
        { token, forceRefresh: true, timeoutMs: 8000 },
      );
      return data.items ?? [];
    },
    enabled: Boolean(token) && visible && isRecurring && !!selectedServiceId,
    staleTime: 2 * 60 * 1000,
  });

  const serviceOccurrences = useMemo(() => {
    if (!availabilityData || !selectedServiceId) return [];
    return availabilityData
      .filter((o) => o.serviceTypeId === selectedServiceId)
      .filter((o) => new Date(o.startsAt).getTime() > Date.now())
      .filter((o) => o.remainingCapacity == null || o.remainingCapacity > 0);
  }, [availabilityData, selectedServiceId]);

  const isBookingSlotsFull =
    selectedService?.totalSlots != null &&
    selectedService?.remainingTotalSlots != null &&
    selectedService.remainingTotalSlots <= 0;
  const isSlotFull =
    isBookingSlotsFull ||
    (selectedService?.capacity != null &&
      selectedService?.remainingCapacity != null &&
      selectedService.remainingCapacity <= 0);

  const tbd = "TBD (coach will confirm)";
  const locationLabel = selectedService?.defaultLocation?.trim() || tbd;
  const meetingLinkLabel = selectedService?.defaultMeetingLink?.trim() || tbd;

  useEffect(() => {
    if (!visible) {
      setBookingConfirmed(false);
      setBookingError(null);
      setConfirmedStartsAt(null);
      setSelectedOccurrence(null);
      setNotes("");
      hasUserSelectedService.current = false;
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    if (!activeServices.length) { setSelectedServiceId(null); return; }
    if (hasUserSelectedService.current && selectedServiceId) return;
    const preferred = initialServiceId ? activeServices.find((s) => s.id === initialServiceId) : null;
    const next = preferred ?? activeServices[0];
    if (!selectedServiceId || !activeServices.some((s) => s.id === selectedServiceId)) {
      setSelectedServiceId(next.id);
    }
  }, [visible, activeServices, selectedServiceId, initialServiceId]);

  useEffect(() => { setSelectedOccurrence(null); }, [selectedServiceId]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) { Keyboard.dismiss(); onClose(); }
  }, [onClose]);

  const notifyBookingConfirmed = useCallback(async (startsAt?: Date | null) => {
    try {
      const { getNotifications } = await import("@/lib/notifications");
      const Notifications = await getNotifications();
      if (!Notifications) return;
      const dateLabel = startsAt ? startsAt.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) : "your selected date";
      const timeLabel = startsAt ? startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Booking request sent",
          body: timeLabel ? `Your session on ${dateLabel} at ${timeLabel} is awaiting coach approval.` : `Your session request for ${dateLabel} is awaiting coach approval.`,
          data: { type: "booking", screen: "schedule" },
          sound: "default",
        },
        trigger: null,
      });
    } catch { /* best-effort */ }
  }, []);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!selectedService) { setBookingError("Pick a session type first."); return; }
    if (selectedService.isLocked) { setBookingError(selectedService.lockReason || "This session type isn't available for your account."); return; }
    if (isSlotFull) { setBookingError(isBookingSlotsFull ? "No booking slots left for this service." : "This session is full."); return; }
    if (isRecurring && !selectedOccurrence) { setBookingError("Pick a time slot first."); return; }
    setBookingError(null);
    setIsSubmitting(true);
    try {
      let startsAt: Date;
      let endsAt: Date;
      if (selectedOccurrence) {
        startsAt = new Date(selectedOccurrence.startsAt);
        endsAt = new Date(selectedOccurrence.endsAt);
      } else if (selectedService.oneTimeDate) {
        startsAt = new Date(`${selectedService.oneTimeDate}T${selectedService.oneTimeTime || "09:00:00"}`);
        endsAt = new Date(startsAt.getTime() + selectedService.durationMinutes * 60000);
      } else {
        startsAt = new Date();
        startsAt.setDate(startsAt.getDate() + 1);
        startsAt.setHours(12, 0, 0, 0);
        endsAt = new Date(startsAt.getTime() + selectedService.durationMinutes * 60000);
      }
      const body: Record<string, unknown> = {
        serviceTypeId: selectedService.id,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        timezoneOffsetMinutes: startsAt.getTimezoneOffset(),
        notes: notes.trim() ? notes.trim() : undefined,
      };
      if (selectedOccurrence) body.occurrenceKey = selectedOccurrence.occurrenceKey;

      await apiRequest("/bookings", { method: "POST", token, body, suppressStatusCodes: [400, 403] });
      setConfirmedStartsAt(startsAt);
      setBookingConfirmed(true);
      await notifyBookingConfirmed(startsAt);
      onSuccess(startsAt);
    } catch (err: any) {
      setBookingError(String(err?.message ?? "Failed to submit booking").replace(/^\d+\s+/, ""));
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = !!selectedService && canCreateBookings && !selectedService?.isLocked && !isSlotFull && (!isRecurring || !!selectedOccurrence);

  return (
    <BottomSheet isOpen={visible} onOpenChange={handleOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay style={{ backgroundColor: p.overlay }} />
        <BottomSheet.Content
          snapPoints={snapPoints}
          enablePanDownToClose
          backgroundStyle={{
            backgroundColor: p.pageBg,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderWidth: 1,
            borderColor: p.divider,
          }}
          handleIndicatorStyle={{ backgroundColor: p.textMuted, width: 44 }}
        >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: Math.max(insets.bottom, 12) + 24 + 56 }}
      >
        <View style={{ paddingTop: 14, paddingHorizontal: 20, paddingBottom: 26 }}>
          {/* ── Header ── */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 18, fontFamily: "ClashDisplay-Bold", color: p.textPrimary }}>
              {bookingConfirmed ? "Request sent" : "Request a session"}
            </Text>
            <Pressable onPress={onClose} style={{ padding: 6, borderRadius: 20, backgroundColor: p.accentSoft }}>
              <Feather name="x" size={18} color={p.textSecondary} />
            </Pressable>
          </View>

          {/* ── Access banner ── */}
          {!bookingConfirmed && !canCreateBookings ? (
            <View style={{ marginTop: 12, borderRadius: 20, backgroundColor: p.cardMint, padding: 14, gap: 6 }}>
              <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textSecondary, lineHeight: 18 }}>
                Pick a service, date, and time below. Booking requests need the right access level.
              </Text>
              <Pressable onPress={() => { onClose(); router.push("/(tabs)/programs"); }}>
                <Text style={{ fontSize: 12, fontFamily: "Outfit-SemiBold", color: p.accent }}>Open training →</Text>
              </Pressable>
            </View>
          ) : null}

          {bookingConfirmed ? (
            <>
              <Text style={{ fontSize: 13, fontFamily: "Outfit-Regular", color: p.textSecondary, marginTop: 8 }}>
                {confirmedStartsAt
                  ? `We sent your request for ${confirmedStartsAt.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} at ${confirmedStartsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`
                  : "Your session request was sent."}
              </Text>

              <View style={{ marginTop: 16, borderRadius: 22, backgroundColor: p.cardSage, padding: 16 }}>
                <Text style={{ fontSize: 10, fontFamily: "Outfit-Bold", color: p.success, letterSpacing: 1.2, textTransform: "uppercase" }}>
                  Awaiting coach approval
                </Text>
                <Text style={{ fontSize: 13, fontFamily: "Outfit-Regular", color: p.textPrimary, marginTop: 8 }}>
                  You'll see it on the calendar when confirmed. Check your email for a copy.
                </Text>
                <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: p.textMuted, marginTop: 12 }}>Location: {locationLabel}</Text>
                <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: p.textMuted, marginTop: 4 }}>Meeting link: {meetingLinkLabel}</Text>
              </View>

              <Pressable onPress={onClose} style={{ marginTop: 16, paddingVertical: 14, borderRadius: 100, backgroundColor: p.buttonPrimary, alignItems: "center" }}>
                <Text style={{ fontSize: 12, fontFamily: "Outfit-Bold", color: p.buttonPrimaryText, letterSpacing: 1.2, textTransform: "uppercase" }}>Done</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 13, fontFamily: "Outfit-Regular", color: p.textSecondary, marginTop: 8, lineHeight: 19 }}>
                Choose the session type, then pick a time slot. Nothing is final until the coach approves.
              </Text>

              {servicesLoading && <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textMuted, marginTop: 12 }}>Loading services...</Text>}
              {servicesError && <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.danger, marginTop: 12 }}>{servicesError}</Text>}

              {/* ── Service pills ── */}
              {activeServices.length === 0 ? (
                <View style={{ marginTop: 16, borderRadius: 22, backgroundColor: p.cardWhite, borderWidth: 1, borderColor: p.divider, borderStyle: "dashed", padding: 16 }}>
                  <Text style={{ fontSize: 13, fontFamily: "Outfit-Regular", color: p.textSecondary }}>No booking types are available right now.</Text>
                </View>
              ) : (
                <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {activeServices.map((item) => {
                    const active = selectedServiceId === item.id;
                    const locked = item.isLocked === true;
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => { hasUserSelectedService.current = true; if (item.id) setSelectedServiceId(item.id); }}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 9,
                          borderRadius: 100,
                          backgroundColor: active ? p.accent : p.cardWhite,
                          borderWidth: 1,
                          borderColor: active ? p.accent : p.divider,
                          opacity: locked && !active ? 0.5 : 1,
                        }}
                      >
                        <Text style={{
                          fontSize: 11,
                          fontFamily: "Outfit-Bold",
                          color: active ? p.buttonPrimaryText : p.textSecondary,
                          letterSpacing: 1.4,
                          textTransform: "uppercase",
                        }}>
                          {item.name}{locked ? " · LOCKED" : ""}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* ── Locked banner ── */}
              {selectedService?.isLocked ? (
                <View style={{ marginTop: 16, borderRadius: 22, backgroundColor: p.cardPink, padding: 14, gap: 6 }}>
                  <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textPrimary, lineHeight: 18 }}>
                    {selectedService.lockReason || "This session type isn't available for your account."}
                  </Text>
                  <Pressable onPress={() => { onClose(); router.push("/(tabs)/programs"); }}>
                    <Text style={{ fontSize: 12, fontFamily: "Outfit-SemiBold", color: p.accent }}>Open training →</Text>
                  </Pressable>
                </View>
              ) : null}

              {selectedService?.description?.trim() ? (
                <Text style={{ fontSize: 13, fontFamily: "Outfit-Regular", color: p.textSecondary, marginTop: 12, lineHeight: 19 }}>
                  {selectedService.description.trim()}
                </Text>
              ) : null}

              {/* ── Capacity info ── */}
              {selectedService && (() => {
                const total = selectedService.totalSlots;
                const remT = selectedService.remainingTotalSlots;
                if (total != null && remT != null) {
                  const full = remT <= 0;
                  return (
                    <View style={{ marginTop: 12, borderRadius: 22, backgroundColor: full ? p.dangerSoft : p.successSoft, padding: 14 }}>
                      <Text style={{ fontSize: 10, fontFamily: "Outfit-Bold", color: full ? p.danger : p.success, letterSpacing: 1.2, textTransform: "uppercase" }}>Slots</Text>
                      <Text style={{ fontSize: 13, fontFamily: "Outfit-Regular", color: p.textPrimary, marginTop: 4 }}>
                        {full ? "No booking slots left for this service." : `${remT} of ${total} booking slot${total === 1 ? "" : "s"} left`}
                      </Text>
                    </View>
                  );
                }
                const cap = selectedService.capacity;
                const rem = selectedService.remainingCapacity;
                if (cap != null && rem != null) {
                  return (
                    <View style={{ marginTop: 12, borderRadius: 22, backgroundColor: isSlotFull ? p.dangerSoft : p.successSoft, padding: 14 }}>
                      <Text style={{ fontSize: 10, fontFamily: "Outfit-Bold", color: isSlotFull ? p.danger : p.success, letterSpacing: 1.2, textTransform: "uppercase" }}>Availability</Text>
                      <Text style={{ fontSize: 13, fontFamily: "Outfit-Regular", color: p.textPrimary, marginTop: 4 }}>
                        {isSlotFull ? "No spots left for this session." : `${rem} of ${cap} spot${cap === 1 ? "" : "s"} open`}
                      </Text>
                    </View>
                  );
                }
                return null;
              })()}

              {/* ── One-time date ── */}
              {selectedService?.oneTimeDate ? (
                <View style={{ marginTop: 16, borderRadius: 20, backgroundColor: p.accentSoft, borderWidth: 1, borderColor: p.accent, padding: 14 }}>
                  <Text style={{ fontSize: 10, fontFamily: "Outfit-Bold", color: p.accent, letterSpacing: 1.2, textTransform: "uppercase" }}>Scheduled for</Text>
                  <Text style={{ fontSize: 13, fontFamily: "Outfit-SemiBold", color: p.textPrimary, marginTop: 4 }}>
                    {new Date(`${selectedService.oneTimeDate}T12:00:00`).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })} · {selectedService.oneTimeTime}
                  </Text>
                </View>
              ) : null}

              {/* ── Available time slots (recurring) ── */}
              {selectedService && isRecurring && !selectedService.isLocked ? (
                <View style={{ marginTop: 16, gap: 10 }}>
                  <Text style={{ fontSize: 10, fontFamily: "Outfit-Bold", color: p.textMuted, letterSpacing: 1.2, textTransform: "uppercase" }}>Pick a time slot</Text>

                  {availabilityLoading ? (
                    <View style={{ alignItems: "center", paddingVertical: 16 }}>
                      <ActivityIndicator size="small" color={p.accent} />
                      <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textMuted, marginTop: 8 }}>Loading available slots...</Text>
                    </View>
                  ) : serviceOccurrences.length === 0 ? (
                    <View style={{ borderRadius: 22, backgroundColor: p.cardWhite, borderWidth: 1, borderColor: p.divider, borderStyle: "dashed", padding: 16 }}>
                      <Text style={{ fontSize: 13, fontFamily: "Outfit-Regular", color: p.textSecondary }}>No available slots in the next 30 days. Check back later.</Text>
                    </View>
                  ) : (
                    <ScrollView horizontal={false} style={{ maxHeight: 220 }} showsVerticalScrollIndicator nestedScrollEnabled>
                      <View style={{ gap: 8 }}>
                        {serviceOccurrences.map((occ) => {
                          const isSelected = selectedOccurrence?.occurrenceKey === occ.occurrenceKey;
                          const spots = occ.remainingCapacity;
                          return (
                            <Pressable
                              key={occ.occurrenceKey}
                              onPress={() => setSelectedOccurrence(occ)}
                              style={{
                                borderRadius: 20,
                                borderWidth: 1.5,
                                borderColor: isSelected ? p.accent : p.divider,
                                backgroundColor: isSelected ? p.cardSage : p.cardWhite,
                                paddingHorizontal: 14,
                                paddingVertical: 12,
                              }}
                            >
                              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                <View style={{ gap: 2 }}>
                                  <Text style={{ fontSize: 13, fontFamily: "Outfit-SemiBold", color: p.textPrimary }}>{formatSlotDate(occ.startsAt)}</Text>
                                  <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: p.textMuted }}>{formatSlotTime(occ.startsAt)} – {formatSlotTime(occ.endsAt)}</Text>
                                </View>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                  {spots != null && (
                                    <Text style={{ fontSize: 10, fontFamily: "Outfit-Bold", color: spots <= 1 ? p.danger : p.accent, textTransform: "uppercase" }}>
                                      {spots} spot{spots === 1 ? "" : "s"}
                                    </Text>
                                  )}
                                  {isSelected && (
                                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: p.accent, alignItems: "center", justifyContent: "center" }}>
                                      <Feather name="check" size={13} color={p.buttonPrimaryText} />
                                    </View>
                                  )}
                                </View>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    </ScrollView>
                  )}
                </View>
              ) : null}

              {/* ── Location & link ── */}
              <View style={{ marginTop: 16, borderRadius: 22, backgroundColor: p.cardWhite, padding: 16 }}>
                <Text style={{ fontSize: 10, fontFamily: "Outfit-Bold", color: p.textMuted, letterSpacing: 1.2, textTransform: "uppercase" }}>Location & link</Text>
                <View style={{ marginTop: 10, gap: 8 }}>
                  <View style={{ borderRadius: 16, backgroundColor: p.inputBg, borderWidth: 1, borderColor: p.inputBorder, paddingHorizontal: 12, paddingVertical: 8 }}>
                    <Text style={{ fontSize: 10, fontFamily: "Outfit-Bold", color: p.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>Location</Text>
                    <Text style={{ fontSize: 13, fontFamily: "Outfit-Regular", color: p.textPrimary, marginTop: 4 }}>{locationLabel}</Text>
                  </View>
                  <View style={{ borderRadius: 16, backgroundColor: p.inputBg, borderWidth: 1, borderColor: p.inputBorder, paddingHorizontal: 12, paddingVertical: 8 }}>
                    <Text style={{ fontSize: 10, fontFamily: "Outfit-Bold", color: p.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>Meeting link</Text>
                    <Text style={{ fontSize: 13, fontFamily: "Outfit-Regular", color: p.textPrimary, marginTop: 4 }}>{meetingLinkLabel}</Text>
                  </View>
                </View>
              </View>

              {/* ── Notes ── */}
              <View style={{ marginTop: 16, borderRadius: 22, backgroundColor: p.cardWhite, padding: 16 }}>
                <Text style={{ fontSize: 10, fontFamily: "Outfit-Bold", color: p.textMuted, letterSpacing: 1.2, textTransform: "uppercase" }}>Notes (optional)</Text>
                <View style={{ marginTop: 10, borderRadius: 16, backgroundColor: p.inputBg, borderWidth: 1, borderColor: p.inputBorder, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Anything you'd like your coach to know?"
                    placeholderTextColor={p.textMuted}
                    multiline
                    textAlignVertical="top"
                    style={{
                      minHeight: 72,
                      color: p.textPrimary,
                      fontFamily: Platform.select({ ios: "Outfit-Regular", android: "Outfit-Regular" }),
                      fontSize: 14,
                    }}
                  />
                </View>
              </View>

              {/* ── Submit ── */}
              <Pressable
                onPress={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                style={{
                  marginTop: 16,
                  paddingVertical: 14,
                  borderRadius: 100,
                  backgroundColor: canSubmit ? p.buttonPrimary : p.accentSoft,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: canSubmit ? 1 : 0.6,
                  shadowColor: p.shadow,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: canSubmit ? 0.2 : 0,
                  shadowRadius: 12,
                  elevation: canSubmit ? 4 : 0,
                }}
              >
                {isSubmitting && <ActivityIndicator size="small" color={p.buttonPrimaryText} />}
                <Text style={{
                  fontSize: 12,
                  fontFamily: "Outfit-Bold",
                  color: canSubmit ? p.buttonPrimaryText : p.textMuted,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                }}>
                  {isSubmitting
                    ? "Sending..."
                    : selectedService?.isLocked
                      ? "Locked"
                      : isSlotFull
                        ? "Slot Full"
                        : !canCreateBookings
                          ? "Access required"
                          : isRecurring && !selectedOccurrence
                            ? "Pick a slot"
                            : "Send request"}
                </Text>
              </Pressable>
              {bookingError && (
                <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.danger, marginTop: 12 }}>{bookingError}</Text>
              )}
            </>
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
