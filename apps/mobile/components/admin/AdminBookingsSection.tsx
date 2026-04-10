import React, { useState, useEffect } from "react";
import { View, Pressable, TextInput, Modal, Platform } from "react-native";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { formatIsoShort } from "@/lib/admin-utils";
import { SmallAction } from "./AdminShared";
import { useAdminBookings } from "@/hooks/admin/useAdminBookings";
import { ServiceType, AdminUserLite } from "@/types/admin";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  token: string | null;
  canLoad: boolean;
  services: ServiceType[];
  initialAction?: "createBooking" | null;
}

export function AdminBookingsSection({ token, canLoad, services, initialAction }: Props) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const bookingsHook = useAdminBookings(token, canLoad);

  const [bookingQuery, setBookingQuery] = useState("");
  const [bookingLimit, setBookingLimit] = useState("50");
  const [bookingDetailOpenId, setBookingDetailOpenId] = useState<number | null>(null);

  // Create booking state
  const [createBookingOpen, setCreateBookingOpen] = useState(false);
  const [createBookingUserQuery, setCreateBookingUserQuery] = useState("");
  const [createBookingSelectedUser, setCreateBookingSelectedUser] = useState<AdminUserLite | null>(null);
  const [createBookingServiceId, setCreateBookingServiceId] = useState<number | null>(null);
  const [createBookingDate, setCreateBookingDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  });
  const [createBookingTime, setCreateBookingTime] = useState<Date>(() => {
    const t = new Date();
    t.setHours(9, 0, 0, 0);
    return t;
  });
  const [createBookingShowDatePicker, setCreateBookingShowDatePicker] = useState(false);
  const [createBookingShowTimePicker, setCreateBookingShowTimePicker] = useState(false);
  const [createBookingLocation, setCreateBookingLocation] = useState("");
  const [createBookingMeetingLink, setCreateBookingMeetingLink] = useState("");
  const [createBookingError, setCreateBookingError] = useState<string | null>(null);

  useEffect(() => {
    if (canLoad) {
      bookingsHook.loadBookings(bookingQuery, bookingLimit, false);
    }
  }, [canLoad]);

  useEffect(() => {
    if (initialAction === "createBooking") {
      setCreateBookingOpen(true);
    }
  }, [initialAction]);

  const handleUpdateStatus = async (id: number, status: "confirmed" | "declined" | "cancelled") => {
    await bookingsHook.updateBookingStatus(id, status, async () => {
      await bookingsHook.loadBookings(bookingQuery, bookingLimit, true);
      if (bookingDetailOpenId === id) {
        await bookingsHook.loadBookingDetail(id, true);
      }
    });
  };

  const submitCreateBooking = async () => {
    const userId = createBookingSelectedUser?.id;
    if (!userId) {
      setCreateBookingError("Pick a user first.");
      return;
    }
    if (!createBookingServiceId) {
      setCreateBookingError("Pick a service type first.");
      return;
    }
    const service = services.find((s) => s.id === createBookingServiceId);
    if (!service) {
      setCreateBookingError("Service type not found.");
      return;
    }

    const durationMinutes = Number(service.durationMinutes ?? 30);
    const startsAt = new Date(createBookingDate);
    startsAt.setHours(createBookingTime.getHours(), createBookingTime.getMinutes(), 0, 0);
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60000);

    try {
      setCreateBookingError(null);
      await bookingsHook.createBooking({
        userId,
        serviceTypeId: createBookingServiceId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        location: createBookingLocation.trim() || undefined,
        meetingLink: createBookingMeetingLink.trim() || undefined,
      });
      setCreateBookingOpen(false);
      await bookingsHook.loadBookings(bookingQuery, bookingLimit, true);
    } catch (e) {
      setCreateBookingError(e instanceof Error ? e.message : "Failed to create booking");
    }
  };

  return (
    <View className="gap-4">
      <View className="gap-2">
        <Text className="text-[13px] font-outfit-semibold text-app">Create booking</Text>
        <View className="flex-row gap-2">
          <SmallAction
            label="New booking"
            tone="success"
            onPress={() => setCreateBookingOpen(true)}
            disabled={bookingsHook.createBookingBusy}
          />
        </View>
        <Text className="text-[12px] font-outfit text-secondary">
          Places a booking for a client as admin/coach (defaults to confirmed).
        </Text>
      </View>

      <View className="gap-3">
        <Text className="text-[13px] font-outfit-semibold text-app">Search</Text>
        <View className="gap-2">
          <Text className="text-[12px] font-outfit text-secondary">
            Query (matches service, athlete, status, id)
          </Text>
          <View
            className="rounded-2xl border px-4 py-3"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
            }}
          >
            <TextInput
              className="text-[14px] font-outfit text-app"
              value={bookingQuery}
              onChangeText={setBookingQuery}
              placeholder="e.g. pending, role_model, 123"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-[12px] font-outfit text-secondary">Limit (1–200)</Text>
          <View
            className="rounded-2xl border px-4 py-3"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
            }}
          >
            <TextInput
              className="text-[14px] font-outfit text-app"
              value={bookingLimit}
              onChangeText={setBookingLimit}
              placeholder="50"
              placeholderTextColor={colors.placeholder}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View className="flex-row gap-2">
          <SmallAction
            label="Run"
            tone="success"
            onPress={() => bookingsHook.loadBookings(bookingQuery, bookingLimit, true)}
            disabled={bookingsHook.bookingsLoading}
          />
          <SmallAction
            label="Reset"
            tone="neutral"
            onPress={() => {
              setBookingQuery("");
              setBookingLimit("50");
              bookingsHook.loadBookings("", "50", true);
            }}
            disabled={bookingsHook.bookingsLoading}
          />
        </View>
      </View>

      {bookingsHook.bookingsLoading && bookingsHook.bookings.length === 0 ? (
        <View className="gap-2">
          <Skeleton width="92%" height={14} />
          <Skeleton width="86%" height={14} />
          <Skeleton width="90%" height={14} />
        </View>
      ) : bookingsHook.bookingsError ? (
        <Text selectable className="text-sm font-outfit text-red-400">
          {bookingsHook.bookingsError}
        </Text>
      ) : bookingsHook.bookings.length === 0 ? (
        <Text className="text-sm font-outfit text-secondary">No bookings found.</Text>
      ) : (
        <View className="gap-3">
          {bookingsHook.bookings.map((b) => (
            <Pressable
              key={String(b.id)}
              onPress={() => {
                setBookingDetailOpenId(b.id);
                if (!bookingsHook.bookingDetails[b.id]) {
                  bookingsHook.loadBookingDetail(b.id, false);
                }
              }}
              style={({ pressed }) => [
                {
                  borderRadius: 18,
                  borderWidth: 1,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                  borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View className="gap-1">
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="text-[13px] font-clash font-bold text-app" numberOfLines={1}>
                    #{b.id} {b.serviceName ?? "(service)"}
                  </Text>
                  <Text
                    className="text-[11px] font-outfit text-secondary"
                    style={{ fontVariant: ["tabular-nums"] }}
                    numberOfLines={1}
                  >
                    {b.status ?? "—"}
                  </Text>
                </View>
                <Text className="text-[12px] font-outfit text-secondary" numberOfLines={1}>
                  {b.athleteName ?? "(athlete)"} • {formatIsoShort(b.startsAt)}
                </Text>

                <View className="flex-row gap-2 mt-2">
                  <SmallAction
                    label="Confirm"
                    tone="success"
                    onPress={() => handleUpdateStatus(b.id, "confirmed")}
                    disabled={bookingsHook.bookingMutatingId === b.id}
                  />
                  <SmallAction
                    label="Decline"
                    tone="danger"
                    onPress={() => handleUpdateStatus(b.id, "declined")}
                    disabled={bookingsHook.bookingMutatingId === b.id}
                  />
                  <SmallAction
                    label="Cancel"
                    tone="neutral"
                    onPress={() => handleUpdateStatus(b.id, "cancelled")}
                    disabled={bookingsHook.bookingMutatingId === b.id}
                  />
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* CREATE BOOKING MODAL */}
      <Modal
        visible={createBookingOpen}
        animationType="slide"
        presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
        onRequestClose={() => setCreateBookingOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            paddingTop: insets.top,
          }}
        >
          <View className="px-4 pb-3 flex-row items-center justify-between gap-3">
            <View style={{ flex: 1 }}>
              <Text className="text-[18px] font-clash font-bold text-app">Create booking</Text>
              <Text className="text-[12px] font-outfit text-secondary">
                Admin/coach creates a confirmed booking.
              </Text>
            </View>
            <SmallAction label="Done" tone="neutral" onPress={() => setCreateBookingOpen(false)} />
          </View>

          <ThemedScrollView>
            <View className="gap-4 p-4">
              {/* User Search Card */}
              <View
                className="rounded-[20px] border p-4"
                style={{
                  backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
                  borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
                  ...(isDark ? Shadows.none : Shadows.md),
                }}
              >
                <Text className="text-[13px] font-outfit-semibold text-app">User</Text>
                <Text className="text-[12px] font-outfit text-secondary mt-1">
                  Search by name or email, then select.
                </Text>
                <View
                  className="mt-3 rounded-2xl border px-4 py-3"
                  style={{
                    backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                    borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                  }}
                >
                  <TextInput
                    className="text-[14px] font-outfit text-app"
                    value={createBookingUserQuery}
                    onChangeText={setCreateBookingUserQuery}
                    placeholder="e.g. piers, piers@email.com"
                    placeholderTextColor={colors.placeholder}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <View className="flex-row gap-2 mt-3">
                  <SmallAction
                    label="Search"
                    tone="neutral"
                    onPress={() => bookingsHook.searchUsers(createBookingUserQuery, true)}
                  />
                  {createBookingSelectedUser?.id ? (
                    <SmallAction
                      label="Clear"
                      tone="neutral"
                      onPress={() => setCreateBookingSelectedUser(null)}
                    />
                  ) : null}
                </View>

                {createBookingSelectedUser?.id ? (
                  <View
                    className="mt-3 rounded-2xl border px-4 py-3"
                    style={{
                      backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                      borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                    }}
                  >
                    <Text className="text-[12px] font-outfit text-secondary">Selected</Text>
                    <Text className="text-[14px] font-outfit text-app" numberOfLines={1}>
                      #{createBookingSelectedUser.id}{" "}
                      {createBookingSelectedUser.name ?? createBookingSelectedUser.email ?? "User"}
                    </Text>
                    <Text className="text-[12px] font-outfit text-secondary" numberOfLines={1}>
                      {createBookingSelectedUser.email ?? ""}
                      {createBookingSelectedUser.athleteName
                        ? ` • ${createBookingSelectedUser.athleteName}`
                        : ""}
                    </Text>
                  </View>
                ) : bookingsHook.createBookingUsers.length > 0 ? (
                  <View className="mt-3 gap-2">
                    {bookingsHook.createBookingUsers.slice(0, 8).map((u) => (
                      <Pressable
                        key={`u-${u.id ?? "x"}-${u.email ?? ""}`}
                        accessibilityRole="button"
                        onPress={() => setCreateBookingSelectedUser(u)}
                        className="rounded-2xl border px-4 py-3"
                        style={{
                          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                        }}
                      >
                        <Text className="text-[13px] font-clash font-bold text-app" numberOfLines={1}>
                          #{u.id ?? "—"} {u.name ?? u.email ?? "User"}
                        </Text>
                        <Text className="text-[12px] font-outfit text-secondary" numberOfLines={1}>
                          {u.email ?? ""}
                          {u.athleteName ? ` • ${u.athleteName}` : ""}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>

              {/* Service Type Pick */}
              <View
                className="rounded-[20px] border p-4"
                style={{
                  backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
                  borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
                  ...(isDark ? Shadows.none : Shadows.md),
                }}
              >
                <Text className="text-[13px] font-outfit-semibold text-app">Service type</Text>
                <Text className="text-[12px] font-outfit text-secondary mt-1">
                  Pick the session type.
                </Text>
                {services.length === 0 ? (
                  <Text className="text-[12px] font-outfit text-secondary mt-3">
                    Loading services…
                  </Text>
                ) : (
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    {services
                      .filter((s) => s.isActive !== false)
                      .slice(0, 12)
                      .map((s) => (
                        <Pressable
                          key={`svc-${s.id}`}
                          accessibilityRole="button"
                          onPress={() => setCreateBookingServiceId(s.id)}
                          className="rounded-full border px-3 py-2"
                          style={{
                            backgroundColor:
                              createBookingServiceId === s.id
                                ? isDark ? `${colors.accent}22` : `${colors.accent}16`
                                : isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                            borderColor:
                              createBookingServiceId === s.id
                                ? isDark ? `${colors.accent}44` : `${colors.accent}2E`
                                : isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                          }}
                        >
                          <Text
                            className="text-[11px] font-outfit-semibold"
                            style={{
                              color: createBookingServiceId === s.id ? colors.accent : colors.textSecondary,
                            }}
                            numberOfLines={1}
                          >
                            #{s.id} {s.name ?? "Service"}
                          </Text>
                        </Pressable>
                      ))}
                  </View>
                )}
              </View>

              {/* Date & Time Pick */}
              <View
                className="rounded-[20px] border p-4"
                style={{
                  backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
                  borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
                  ...(isDark ? Shadows.none : Shadows.md),
                }}
              >
                <Text className="text-[13px] font-outfit-semibold text-app">Date & time</Text>
                <View className="mt-3 gap-2">
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setCreateBookingShowDatePicker(true)}
                    className="rounded-2xl border px-4 py-3"
                    style={{
                      backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                      borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                    }}
                  >
                    <Text className="text-[12px] font-outfit text-secondary">Date</Text>
                    <Text className="text-[14px] font-outfit text-app">
                      {createBookingDate.toLocaleDateString()}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setCreateBookingShowTimePicker(true)}
                    className="rounded-2xl border px-4 py-3"
                    style={{
                      backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                      borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                    }}
                  >
                    <Text className="text-[12px] font-outfit text-secondary">Start time</Text>
                    <Text className="text-[14px] font-outfit text-app">
                      {createBookingTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </Pressable>
                </View>

                {createBookingShowDatePicker && (
                  <DateTimePicker
                    value={createBookingDate}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(_, date) => {
                      setCreateBookingShowDatePicker(false);
                      if (date) setCreateBookingDate(date);
                    }}
                  />
                )}
                {createBookingShowTimePicker && (
                  <DateTimePicker
                    value={createBookingTime}
                    mode="time"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(_, date) => {
                      setCreateBookingShowTimePicker(false);
                      if (date) setCreateBookingTime(date);
                    }}
                  />
                )}
              </View>

              {/* Details & Submit */}
              <View
                className="rounded-[20px] border p-4"
                style={{
                  backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
                  borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
                  ...(isDark ? Shadows.none : Shadows.md),
                }}
              >
                <Text className="text-[13px] font-outfit-semibold text-app">Details (optional)</Text>
                <View className="mt-3 gap-2">
                  <View
                    className="rounded-2xl border px-4 py-3"
                    style={{
                      backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                      borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                    }}
                  >
                    <TextInput
                      className="text-[14px] font-outfit text-app"
                      value={createBookingLocation}
                      onChangeText={setCreateBookingLocation}
                      placeholder="Location"
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
                  <View
                    className="rounded-2xl border px-4 py-3"
                    style={{
                      backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                      borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                    }}
                  >
                    <TextInput
                      className="text-[14px] font-outfit text-app"
                      value={createBookingMeetingLink}
                      onChangeText={setCreateBookingMeetingLink}
                      placeholder="Meeting link"
                      placeholderTextColor={colors.placeholder}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {createBookingError && (
                  <Text className="text-[12px] font-outfit text-red-400 mt-3">{createBookingError}</Text>
                )}

                <View className="flex-row gap-2 mt-4">
                  <SmallAction
                    label={bookingsHook.createBookingBusy ? "Creating…" : "Create confirmed"}
                    tone="success"
                    onPress={submitCreateBooking}
                    disabled={bookingsHook.createBookingBusy}
                  />
                </View>
              </View>
            </View>
          </ThemedScrollView>
        </View>
      </Modal>

      {/* BOOKING DETAIL MODAL */}
      <Modal
        visible={bookingDetailOpenId != null}
        animationType="slide"
        presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
        onRequestClose={() => setBookingDetailOpenId(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            paddingTop: insets.top,
          }}
        >
          <View className="px-4 pb-3 flex-row items-center justify-between gap-3">
            <View style={{ flex: 1 }}>
              <Text className="text-[18px] font-clash font-bold text-app" numberOfLines={1}>
                Booking #{bookingDetailOpenId ?? ""}
              </Text>
              <Text className="text-[12px] font-outfit text-secondary">Details and actions</Text>
            </View>
            <SmallAction label="Done" tone="neutral" onPress={() => setBookingDetailOpenId(null)} />
          </View>

          <ThemedScrollView>
            {bookingDetailOpenId != null && (() => {
              const b = bookingsHook.bookings.find((x) => x.id === bookingDetailOpenId);
              const detail = bookingsHook.bookingDetails[bookingDetailOpenId];
              const detailLoading = Boolean(bookingsHook.bookingDetailLoadingIds[bookingDetailOpenId]);

              return (
                <View className="gap-4 p-4">
                  <View
                    className="rounded-[20px] border p-4"
                    style={{
                      backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
                      borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
                      ...(isDark ? Shadows.none : Shadows.md),
                    }}
                  >
                    <View className="gap-1">
                      <View className="flex-row items-center justify-between gap-3">
                        <Text className="text-[14px] font-clash font-bold text-app" numberOfLines={1}>
                          {b?.serviceName ?? "(service)"}
                        </Text>
                        <Text
                          className="text-[12px] font-outfit text-secondary"
                          style={{ fontVariant: ["tabular-nums"] }}
                        >
                          {detail?.status ?? b?.status ?? "—"}
                        </Text>
                      </View>
                      <Text className="text-[12px] font-outfit text-secondary" numberOfLines={2}>
                        {b?.athleteName ?? "(athlete)"} • {formatIsoShort(b?.startsAt)}
                      </Text>
                    </View>

                    <View className="flex-row gap-2 mt-3">
                      <SmallAction
                        label="Confirm"
                        tone="success"
                        onPress={() => handleUpdateStatus(bookingDetailOpenId, "confirmed")}
                        disabled={bookingsHook.bookingMutatingId === bookingDetailOpenId}
                      />
                      <SmallAction
                        label="Decline"
                        tone="danger"
                        onPress={() => handleUpdateStatus(bookingDetailOpenId, "declined")}
                        disabled={bookingsHook.bookingMutatingId === bookingDetailOpenId}
                      />
                      <SmallAction
                        label="Cancel"
                        tone="neutral"
                        onPress={() => handleUpdateStatus(bookingDetailOpenId, "cancelled")}
                        disabled={bookingsHook.bookingMutatingId === bookingDetailOpenId}
                      />
                    </View>
                  </View>

                  <View
                    className="rounded-[20px] border p-4"
                    style={{
                      backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                      borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                    }}
                  >
                    {detailLoading ? (
                      <View className="gap-2">
                        <Skeleton width="82%" height={12} />
                        <Skeleton width="88%" height={12} />
                        <Skeleton width="76%" height={12} />
                      </View>
                    ) : detail ? (
                      <View className="gap-2">
                        <Text selectable className="text-[12px] font-outfit text-secondary">
                          Guardian: {detail.guardianName ?? "—"} • {detail.guardianEmail ?? "—"}
                        </Text>
                        <Text selectable className="text-[12px] font-outfit text-secondary">
                          Window: {formatIsoShort(detail.startsAt)} → {formatIsoShort(detail.endTime)}
                        </Text>
                        {detail.slotsTotal != null && (
                          <Text selectable className="text-[12px] font-outfit text-secondary">
                            Capacity: {detail.slotsUsed ?? 0}/{detail.slotsTotal}
                          </Text>
                        )}
                        {detail.location && (
                          <Text selectable className="text-[12px] font-outfit text-secondary">
                            Location: {detail.location}
                          </Text>
                        )}
                        {detail.meetingLink && (
                          <Text selectable className="text-[12px] font-outfit text-secondary">
                            Meeting: {detail.meetingLink}
                          </Text>
                        )}
                        {detail.createdAt && (
                          <Text selectable className="text-[11px] font-outfit text-secondary">
                            Created {formatIsoShort(detail.createdAt)}
                          </Text>
                        )}
                      </View>
                    ) : (
                      <Text className="text-[12px] font-outfit text-secondary">No detail loaded.</Text>
                    )}
                  </View>
                </View>
              );
            })()}
          </ThemedScrollView>
        </View>
      </Modal>
    </View>
  );
}
