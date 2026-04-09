import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text, TextInput } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AdminBooking = {
  id: number;
  startsAt?: string | null;
  endTime?: string | null;
  type?: string | null;
  status?: "pending" | "confirmed" | "declined" | "cancelled" | string | null;
  location?: string | null;
  meetingLink?: string | null;
  serviceName?: string | null;
  athleteName?: string | null;
};

type AdminBookingDetail = {
  id: number;
  startsAt?: string | null;
  endTime?: string | null;
  type?: string | null;
  status?: "pending" | "confirmed" | "declined" | "cancelled" | string | null;
  location?: string | null;
  meetingLink?: string | null;
  serviceTypeId?: number | null;
  serviceName?: string | null;
  serviceCapacity?: number | null;
  slotsUsed?: number | null;
  slotsTotal?: number | null;
  athleteName?: string | null;
  guardianName?: string | null;
  guardianEmail?: string | null;
  createdAt?: string | null;
};

type AdminAvailabilityBlock = {
  id: number;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt?: string | null;
  serviceName?: string | null;
};

type ServiceType = {
  id: number;
  name?: string | null;
  type?: string | null;
  durationMinutes?: number | null;
  capacity?: number | null;
  isActive?: boolean | null;
  defaultLocation?: string | null;
  defaultMeetingLink?: string | null;
  programTier?: string | null;
};

type OpsSection = "bookings" | "availability" | "services";

function formatIsoShort(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return value;
  return d.toLocaleString();
}

function parseIntOrUndefined(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return undefined;
  const asInt = Math.floor(n);
  if (asInt < 0) return undefined;
  return asInt;
}

function defaultServicePatchJson(s: ServiceType) {
  return JSON.stringify(
    {
      name: s.name ?? undefined,
      type: s.type ?? undefined,
      durationMinutes: s.durationMinutes ?? undefined,
      capacity: s.capacity ?? undefined,
      isActive: s.isActive ?? undefined,
      defaultLocation: s.defaultLocation ?? undefined,
      defaultMeetingLink: s.defaultMeetingLink ?? undefined,
      programTier: s.programTier ?? undefined,
    },
    null,
    2,
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, isDark } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        {
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 999,
          borderWidth: 1,
          opacity: pressed ? 0.85 : 1,
          backgroundColor: selected
            ? isDark
              ? `${colors.accent}22`
              : `${colors.accent}16`
            : isDark
              ? "rgba(255,255,255,0.03)"
              : "rgba(15,23,42,0.03)",
          borderColor: selected
            ? isDark
              ? `${colors.accent}44`
              : `${colors.accent}2E`
            : isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(15,23,42,0.06)",
        },
      ]}
    >
      <Text
        className="text-[12px] font-outfit-semibold"
        style={{ color: selected ? colors.accent : colors.textSecondary }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SmallAction({
  label,
  tone,
  onPress,
  disabled,
}: {
  label: string;
  tone: "neutral" | "success" | "danger";
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors, isDark } = useAppTheme();
  const tint =
    tone === "success"
      ? colors.accent
      : tone === "danger"
        ? colors.danger
        : colors.text;
  const bg =
    tone === "success"
      ? isDark
        ? `${colors.accent}18`
        : `${colors.accent}12`
      : tone === "danger"
        ? isDark
          ? `${colors.danger}18`
          : `${colors.danger}10`
        : isDark
          ? "rgba(255,255,255,0.04)"
          : "rgba(15,23,42,0.04)";
  const border =
    tone === "success"
      ? isDark
        ? `${colors.accent}30`
        : `${colors.accent}24`
      : tone === "danger"
        ? isDark
          ? `${colors.danger}30`
          : `${colors.danger}24`
        : isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(15,23,42,0.06)";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          paddingHorizontal: 10,
          paddingVertical: 8,
          borderRadius: 14,
          borderWidth: 1,
          backgroundColor: bg,
          borderColor: border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        className="text-[11px] font-outfit-semibold"
        style={{ color: tint }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function AdminOpsScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);

  const [section, setSection] = useState<OpsSection>("bookings");

  const [bookingQuery, setBookingQuery] = useState("");
  const [bookingLimit, setBookingLimit] = useState("50");
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [bookingDetailOpenId, setBookingDetailOpenId] = useState<number | null>(
    null,
  );
  const [bookingDetails, setBookingDetails] = useState<
    Record<number, AdminBookingDetail | undefined>
  >({});
  const [bookingDetailLoadingIds, setBookingDetailLoadingIds] = useState<
    Record<number, boolean>
  >({});
  const [bookingMutatingId, setBookingMutatingId] = useState<number | null>(
    null,
  );

  const [availability, setAvailability] = useState<AdminAvailabilityBlock[]>(
    [],
  );
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(
    null,
  );
  const [availabilityDetailOpenId, setAvailabilityDetailOpenId] = useState<
    number | null
  >(null);
  const [availabilityServiceTypeId, setAvailabilityServiceTypeId] =
    useState("");
  const [availabilityStartsAt, setAvailabilityStartsAt] = useState("");
  const [availabilityEndsAt, setAvailabilityEndsAt] = useState("");
  const [availabilityCreateBusy, setAvailabilityCreateBusy] = useState(false);

  const [services, setServices] = useState<ServiceType[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [serviceCreateName, setServiceCreateName] = useState("");
  const [serviceCreateType, setServiceCreateType] = useState("call");
  const [serviceCreateDurationMinutes, setServiceCreateDurationMinutes] =
    useState("30");
  const [serviceCreateCapacity, setServiceCreateCapacity] = useState("");
  const [serviceCreateIsActive, setServiceCreateIsActive] = useState("true");
  const [serviceCreateDefaultLocation, setServiceCreateDefaultLocation] =
    useState("");
  const [serviceCreateDefaultMeetingLink, setServiceCreateDefaultMeetingLink] =
    useState("");
  const [serviceCreateAdvancedJson, setServiceCreateAdvancedJson] =
    useState("{}");
  const [serviceCreateBusy, setServiceCreateBusy] = useState(false);
  const [serviceDetailOpenId, setServiceDetailOpenId] = useState<number | null>(
    null,
  );
  const [serviceEditAdvancedJson, setServiceEditAdvancedJson] = useState<
    Record<number, string>
  >({});
  const [serviceEditBusyId, setServiceEditBusyId] = useState<number | null>(
    null,
  );

  const canLoad = Boolean(token && bootstrapReady);

  const loadBookings = useCallback(
    async (forceRefresh: boolean) => {
      if (!canLoad) return;
      setBookingsLoading(true);
      setBookingsError(null);
      try {
        const q = bookingQuery.trim();
        const limit = parseIntOrUndefined(bookingLimit) ?? 50;
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        params.set("limit", String(limit));
        const res = await apiRequest<{ bookings?: AdminBooking[] }>(
          `/admin/bookings?${params.toString()}`,
          {
            token,
            suppressStatusCodes: [403],
            skipCache: forceRefresh,
            forceRefresh,
          },
        );
        setBookings(Array.isArray(res?.bookings) ? res.bookings : []);
      } catch (e) {
        setBookingsError(
          e instanceof Error ? e.message : "Failed to load bookings",
        );
        setBookings([]);
      } finally {
        setBookingsLoading(false);
      }
    },
    [bookingLimit, bookingQuery, canLoad, token],
  );

  const loadBookingDetail = useCallback(
    async (bookingId: number, forceRefresh: boolean) => {
      if (!canLoad) return;
      if (!bookingId) return;
      setBookingDetailLoadingIds((prev) => ({ ...prev, [bookingId]: true }));
      try {
        const res = await apiRequest<{ booking?: AdminBookingDetail }>(
          `/admin/bookings/${bookingId}`,
          {
            token,
            suppressStatusCodes: [403],
            skipCache: forceRefresh,
            forceRefresh,
          },
        );
        const detail = res?.booking;
        setBookingDetails((prev) => ({ ...prev, [bookingId]: detail }));
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to load booking";
        setBookingDetails((prev) => ({
          ...prev,
          [bookingId]: {
            id: bookingId,
            status: "pending",
          } as any,
        }));
        setBookingsError(message);
      } finally {
        setBookingDetailLoadingIds((prev) => ({ ...prev, [bookingId]: false }));
      }
    },
    [canLoad, token],
  );

  const updateBookingStatus = useCallback(
    async (
      bookingId: number,
      status: "pending" | "confirmed" | "declined" | "cancelled",
    ) => {
      if (!canLoad) return;
      setBookingMutatingId(bookingId);
      setBookingsError(null);
      try {
        await apiRequest(`/admin/bookings/${bookingId}/status`, {
          method: "PATCH",
          token,
          body: { status },
          suppressStatusCodes: [403],
          skipCache: true,
          forceRefresh: true,
        });
        await loadBookings(true);
        if (bookingDetailOpenId === bookingId) {
          await loadBookingDetail(bookingId, true);
        }
      } catch (e) {
        setBookingsError(
          e instanceof Error ? e.message : "Failed to update booking",
        );
      } finally {
        setBookingMutatingId(null);
      }
    },
    [bookingDetailOpenId, canLoad, loadBookingDetail, loadBookings, token],
  );

  const loadAvailability = useCallback(
    async (forceRefresh: boolean) => {
      if (!canLoad) return;
      setAvailabilityLoading(true);
      setAvailabilityError(null);
      try {
        const res = await apiRequest<{ items?: AdminAvailabilityBlock[] }>(
          "/admin/availability",
          {
            token,
            suppressStatusCodes: [403],
            skipCache: forceRefresh,
            forceRefresh,
          },
        );
        setAvailability(Array.isArray(res?.items) ? res.items : []);
      } catch (e) {
        setAvailabilityError(
          e instanceof Error ? e.message : "Failed to load availability",
        );
        setAvailability([]);
      } finally {
        setAvailabilityLoading(false);
      }
    },
    [canLoad, token],
  );

  const createAvailabilityBlock = useCallback(async () => {
    if (!canLoad) return;
    const serviceTypeId = parseIntOrUndefined(availabilityServiceTypeId);
    if (!serviceTypeId) {
      setAvailabilityError("Service Type ID is required");
      return;
    }
    const startsAt = availabilityStartsAt.trim();
    const endsAt = availabilityEndsAt.trim();
    if (!startsAt || !endsAt) {
      setAvailabilityError("Start and end ISO datetimes are required");
      return;
    }
    setAvailabilityCreateBusy(true);
    setAvailabilityError(null);
    try {
      await apiRequest("/bookings/availability", {
        method: "POST",
        token,
        body: { serviceTypeId, startsAt, endsAt },
        suppressStatusCodes: [403],
        skipCache: true,
        forceRefresh: true,
      });
      setAvailabilityStartsAt("");
      setAvailabilityEndsAt("");
      await loadAvailability(true);
    } catch (e) {
      setAvailabilityError(
        e instanceof Error ? e.message : "Failed to create availability",
      );
    } finally {
      setAvailabilityCreateBusy(false);
    }
  }, [
    availabilityEndsAt,
    availabilityServiceTypeId,
    availabilityStartsAt,
    canLoad,
    loadAvailability,
    token,
  ]);

  const loadServices = useCallback(
    async (forceRefresh: boolean) => {
      if (!canLoad) return;
      setServicesLoading(true);
      setServicesError(null);
      try {
        const res = await apiRequest<{ items?: ServiceType[] }>(
          "/bookings/services?includeInactive=true",
          {
            token,
            suppressStatusCodes: [403],
            skipCache: forceRefresh,
            forceRefresh,
          },
        );
        setServices(Array.isArray(res?.items) ? res.items : []);
      } catch (e) {
        setServicesError(
          e instanceof Error ? e.message : "Failed to load services",
        );
        setServices([]);
      } finally {
        setServicesLoading(false);
      }
    },
    [canLoad, token],
  );

  const createServiceType = useCallback(async () => {
    if (!canLoad) return;
    const name = serviceCreateName.trim();
    const type = serviceCreateType.trim();
    const durationMinutes = parseIntOrUndefined(serviceCreateDurationMinutes);
    const capacity = parseIntOrUndefined(serviceCreateCapacity);
    const isActive = serviceCreateIsActive.trim().toLowerCase();

    if (!name) {
      setServicesError("Name is required");
      return;
    }
    if (!type) {
      setServicesError("Type is required");
      return;
    }
    if (!durationMinutes || durationMinutes < 1) {
      setServicesError("Duration minutes is required");
      return;
    }

    let advanced: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(serviceCreateAdvancedJson || "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        advanced = parsed;
      }
    } catch {
      setServicesError("Advanced JSON must be valid JSON");
      return;
    }

    setServiceCreateBusy(true);
    setServicesError(null);
    try {
      const body: Record<string, unknown> = {
        name,
        type,
        durationMinutes,
        ...(capacity !== undefined ? { capacity } : {}),
        ...(serviceCreateDefaultLocation.trim().length
          ? { defaultLocation: serviceCreateDefaultLocation.trim() }
          : {}),
        ...(serviceCreateDefaultMeetingLink.trim().length
          ? { defaultMeetingLink: serviceCreateDefaultMeetingLink.trim() }
          : {}),
        ...(isActive === "true" || isActive === "false"
          ? { isActive: isActive === "true" }
          : {}),
        ...advanced,
      };

      await apiRequest("/bookings/services", {
        method: "POST",
        token,
        body,
        suppressStatusCodes: [403],
        skipCache: true,
        forceRefresh: true,
      });

      setServiceCreateName("");
      setServiceCreateType("call");
      setServiceCreateDurationMinutes("30");
      setServiceCreateCapacity("");
      setServiceCreateIsActive("true");
      setServiceCreateDefaultLocation("");
      setServiceCreateDefaultMeetingLink("");
      setServiceCreateAdvancedJson("{}");
      await loadServices(true);
    } catch (e) {
      setServicesError(
        e instanceof Error ? e.message : "Failed to create service",
      );
    } finally {
      setServiceCreateBusy(false);
    }
  }, [
    canLoad,
    loadServices,
    serviceCreateAdvancedJson,
    serviceCreateCapacity,
    serviceCreateDefaultLocation,
    serviceCreateDefaultMeetingLink,
    serviceCreateDurationMinutes,
    serviceCreateIsActive,
    serviceCreateName,
    serviceCreateType,
    token,
  ]);

  const updateServiceType = useCallback(
    async (serviceId: number, patchBody: Record<string, unknown>) => {
      if (!canLoad) return;
      setServiceEditBusyId(serviceId);
      setServicesError(null);
      try {
        await apiRequest(`/bookings/services/${serviceId}`, {
          method: "PATCH",
          token,
          body: patchBody,
          suppressStatusCodes: [403],
          skipCache: true,
          forceRefresh: true,
        });
        await loadServices(true);
      } catch (e) {
        setServicesError(
          e instanceof Error ? e.message : "Failed to update service",
        );
      } finally {
        setServiceEditBusyId(null);
      }
    },
    [canLoad, loadServices, token],
  );

  const deleteServiceType = useCallback(
    async (serviceId: number) => {
      if (!canLoad) return;
      setServiceEditBusyId(serviceId);
      setServicesError(null);
      try {
        await apiRequest(`/bookings/services/${serviceId}`, {
          method: "DELETE",
          token,
          suppressStatusCodes: [403],
          skipCache: true,
          forceRefresh: true,
        });
        if (serviceDetailOpenId === serviceId) setServiceDetailOpenId(null);
        await loadServices(true);
      } catch (e) {
        setServicesError(
          e instanceof Error ? e.message : "Failed to delete service",
        );
      } finally {
        setServiceEditBusyId(null);
      }
    },
    [canLoad, loadServices, serviceDetailOpenId, token],
  );

  useEffect(() => {
    if (!canLoad) return;
    if (!bookingDetailOpenId) return;
    if (bookingDetails[bookingDetailOpenId]) return;
    if (bookingDetailLoadingIds[bookingDetailOpenId]) return;
    void loadBookingDetail(bookingDetailOpenId, false);
  }, [
    bookingDetailLoadingIds,
    bookingDetailOpenId,
    bookingDetails,
    canLoad,
    loadBookingDetail,
  ]);

  useEffect(() => {
    if (!serviceDetailOpenId) return;
    if (serviceEditAdvancedJson[serviceDetailOpenId]) return;

    const svc = services.find((s) => s.id === serviceDetailOpenId);
    if (!svc) return;

    setServiceEditAdvancedJson((prev) =>
      prev[serviceDetailOpenId]
        ? prev
        : { ...prev, [serviceDetailOpenId]: defaultServicePatchJson(svc) },
    );
  }, [serviceDetailOpenId, serviceEditAdvancedJson, services]);

  useEffect(() => {
    if (!canLoad) return;
    void loadBookings(false);
  }, [canLoad, loadBookings]);

  useEffect(() => {
    if (!canLoad) return;
    if (section === "availability") void loadAvailability(false);
    if (section === "services") void loadServices(false);
  }, [canLoad, loadAvailability, loadServices, section]);

  const subtitle = useMemo(() => {
    if (section === "bookings") {
      if (bookingsLoading) return "Loading bookings…";
      if (bookingsError) return "Bookings error";
      return `${bookings.length} bookings`;
    }
    if (section === "availability") {
      if (availabilityLoading) return "Loading availability…";
      if (availabilityError) return "Availability error";
      return `${availability.length} availability blocks`;
    }
    if (servicesLoading) return "Loading services…";
    if (servicesError) return "Services error";
    return `${services.length} service types`;
  }, [
    availability.length,
    availabilityError,
    availabilityLoading,
    bookings.length,
    bookingsError,
    bookingsLoading,
    section,
    services.length,
    servicesError,
    servicesLoading,
  ]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ThemedScrollView
        onRefresh={() => {
          if (section === "bookings") return loadBookings(true);
          if (section === "availability") return loadAvailability(true);
          return loadServices(true);
        }}
      >
        <View className="pt-6 mb-4">
          <View className="flex-row items-center gap-3 overflow-hidden">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <View className="flex-1">
              <Text
                className="text-4xl font-telma-bold text-app tracking-tight"
                numberOfLines={1}
              >
                Ops
              </Text>
              <Text
                className="text-[12px] font-outfit text-secondary"
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row gap-2 mb-4">
          <Chip
            label="Bookings"
            selected={section === "bookings"}
            onPress={() => setSection("bookings")}
          />
          <Chip
            label="Availability"
            selected={section === "availability"}
            onPress={() => setSection("availability")}
          />
          <Chip
            label="Services"
            selected={section === "services"}
            onPress={() => setSection("services")}
          />
        </View>

        <View
          className="rounded-[28px] border p-5"
          style={{
            backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
            borderColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(15,23,42,0.06)",
            ...(isDark ? Shadows.none : Shadows.md),
          }}
        >
          {!canLoad ? (
            <Text selectable className="text-sm font-outfit text-secondary">
              Admin tools will load after auth bootstrap.
            </Text>
          ) : section === "bookings" ? (
            <View className="gap-4">
              <View className="gap-3">
                <Text className="text-[13px] font-outfit-semibold text-app">
                  Search
                </Text>
                <View className="gap-2">
                  <Text className="text-[12px] font-outfit text-secondary">
                    Query (matches service, athlete, status, id)
                  </Text>
                  <View
                    className="rounded-2xl border px-4 py-3"
                    style={{
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(15,23,42,0.03)",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(15,23,42,0.06)",
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
                  <Text className="text-[12px] font-outfit text-secondary">
                    Limit (1–200)
                  </Text>
                  <View
                    className="rounded-2xl border px-4 py-3"
                    style={{
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(15,23,42,0.03)",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(15,23,42,0.06)",
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
                    onPress={() => loadBookings(true)}
                    disabled={bookingsLoading}
                  />
                  <SmallAction
                    label="Reset"
                    tone="neutral"
                    onPress={() => {
                      setBookingQuery("");
                      setBookingLimit("50");
                      void loadBookings(true);
                    }}
                    disabled={bookingsLoading}
                  />
                </View>
              </View>

              {bookingsLoading && bookings.length === 0 ? (
                <View className="gap-2">
                  <Skeleton width="92%" height={14} />
                  <Skeleton width="86%" height={14} />
                  <Skeleton width="90%" height={14} />
                </View>
              ) : bookingsError ? (
                <Text selectable className="text-sm font-outfit text-red-400">
                  {bookingsError}
                </Text>
              ) : bookings.length === 0 ? (
                <Text className="text-sm font-outfit text-secondary">
                  No bookings found.
                </Text>
              ) : (
                <View className="gap-3">
                  {bookings.map((b) => {
                    const status = (b.status ?? "—") as string;
                    return (
                      <Pressable
                        key={String(b.id)}
                        onPress={() => {
                          setBookingDetailOpenId(b.id);
                          if (!bookingDetails[b.id]) {
                            void loadBookingDetail(b.id, false);
                          }
                        }}
                        style={({ pressed }) => [
                          {
                            borderRadius: 18,
                            borderWidth: 1,
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.03)"
                              : "rgba(15,23,42,0.03)",
                            borderColor: isDark
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(15,23,42,0.06)",
                            opacity: pressed ? 0.9 : 1,
                          },
                        ]}
                      >
                        <View className="gap-1">
                          <View className="flex-row items-center justify-between gap-3">
                            <Text
                              className="text-[13px] font-clash font-bold text-app"
                              numberOfLines={1}
                            >
                              #{b.id} {b.serviceName ?? "(service)"}
                            </Text>
                            <Text
                              className="text-[11px] font-outfit text-secondary"
                              style={{ fontVariant: ["tabular-nums"] }}
                              numberOfLines={1}
                            >
                              {status}
                            </Text>
                          </View>
                          <Text
                            className="text-[12px] font-outfit text-secondary"
                            numberOfLines={1}
                          >
                            {b.athleteName ?? "(athlete)"} •{" "}
                            {formatIsoShort(b.startsAt)}
                          </Text>

                          <View className="flex-row gap-2 mt-2">
                            <SmallAction
                              label="Confirm"
                              tone="success"
                              onPress={() =>
                                updateBookingStatus(b.id, "confirmed")
                              }
                              disabled={bookingMutatingId === b.id}
                            />
                            <SmallAction
                              label="Decline"
                              tone="danger"
                              onPress={() =>
                                updateBookingStatus(b.id, "declined")
                              }
                              disabled={bookingMutatingId === b.id}
                            />
                            <SmallAction
                              label="Cancel"
                              tone="neutral"
                              onPress={() =>
                                updateBookingStatus(b.id, "cancelled")
                              }
                              disabled={bookingMutatingId === b.id}
                            />
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          ) : section === "availability" ? (
            <View className="gap-4">
              <View className="gap-3">
                <Text className="text-[13px] font-outfit-semibold text-app">
                  Create availability block
                </Text>
                <View className="gap-2">
                  <Text className="text-[12px] font-outfit text-secondary">
                    Service Type ID
                  </Text>
                  <View
                    className="rounded-2xl border px-4 py-3"
                    style={{
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(15,23,42,0.03)",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(15,23,42,0.06)",
                    }}
                  >
                    <TextInput
                      className="text-[14px] font-outfit text-app"
                      value={availabilityServiceTypeId}
                      onChangeText={setAvailabilityServiceTypeId}
                      placeholder="e.g. 3"
                      placeholderTextColor={colors.placeholder}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
                <View className="gap-2">
                  <Text className="text-[12px] font-outfit text-secondary">
                    Starts at (ISO)
                  </Text>
                  <View
                    className="rounded-2xl border px-4 py-3"
                    style={{
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(15,23,42,0.03)",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(15,23,42,0.06)",
                    }}
                  >
                    <TextInput
                      className="text-[14px] font-outfit text-app"
                      value={availabilityStartsAt}
                      onChangeText={setAvailabilityStartsAt}
                      placeholder="2026-04-09T15:00:00.000Z"
                      placeholderTextColor={colors.placeholder}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>
                <View className="gap-2">
                  <Text className="text-[12px] font-outfit text-secondary">
                    Ends at (ISO)
                  </Text>
                  <View
                    className="rounded-2xl border px-4 py-3"
                    style={{
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(15,23,42,0.03)",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(15,23,42,0.06)",
                    }}
                  >
                    <TextInput
                      className="text-[14px] font-outfit text-app"
                      value={availabilityEndsAt}
                      onChangeText={setAvailabilityEndsAt}
                      placeholder="2026-04-09T15:30:00.000Z"
                      placeholderTextColor={colors.placeholder}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>
                <View className="flex-row gap-2">
                  <SmallAction
                    label={availabilityCreateBusy ? "Creating…" : "Create"}
                    tone="success"
                    onPress={createAvailabilityBlock}
                    disabled={availabilityCreateBusy}
                  />
                  <SmallAction
                    label="Refresh"
                    tone="neutral"
                    onPress={() => loadAvailability(true)}
                    disabled={availabilityLoading}
                  />
                </View>
              </View>

              {availabilityLoading && availability.length === 0 ? (
                <View className="gap-2">
                  <Skeleton width="92%" height={14} />
                  <Skeleton width="86%" height={14} />
                  <Skeleton width="90%" height={14} />
                </View>
              ) : availabilityError ? (
                <Text selectable className="text-sm font-outfit text-red-400">
                  {availabilityError}
                </Text>
              ) : availability.length === 0 ? (
                <Text className="text-sm font-outfit text-secondary">
                  No availability blocks.
                </Text>
              ) : (
                <View className="gap-3">
                  {availability.map((a) => (
                    <Pressable
                      key={String(a.id)}
                      accessibilityRole="button"
                      onPress={() => setAvailabilityDetailOpenId(a.id)}
                      className="rounded-2xl border px-4 py-3"
                      style={{
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.03)"
                          : "rgba(15,23,42,0.03)",
                        borderColor: isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(15,23,42,0.06)",
                      }}
                    >
                      <Text
                        className="text-[13px] font-clash font-bold text-app"
                        numberOfLines={1}
                      >
                        #{a.id} {a.serviceName ?? "(service)"}
                      </Text>
                      <Text
                        selectable
                        className="text-[12px] font-outfit text-secondary"
                      >
                        {formatIsoShort(a.startsAt)} →{" "}
                        {formatIsoShort(a.endsAt)}
                      </Text>
                      <Text
                        selectable
                        className="text-[11px] font-outfit text-secondary"
                      >
                        Created {formatIsoShort(a.createdAt)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View className="gap-4">
              <View className="gap-3">
                <Text className="text-[13px] font-outfit-semibold text-app">
                  Create service type
                </Text>
                <View className="gap-2">
                  <Text className="text-[12px] font-outfit text-secondary">
                    Name
                  </Text>
                  <View
                    className="rounded-2xl border px-4 py-3"
                    style={{
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(15,23,42,0.03)",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(15,23,42,0.06)",
                    }}
                  >
                    <TextInput
                      className="text-[14px] font-outfit text-app"
                      value={serviceCreateName}
                      onChangeText={setServiceCreateName}
                      placeholder="e.g. Coach Call"
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
                </View>
                <View className="gap-2">
                  <Text className="text-[12px] font-outfit text-secondary">
                    Type (call, group_call, individual_call, lift_lab_1on1,
                    role_model, one_on_one)
                  </Text>
                  <View
                    className="rounded-2xl border px-4 py-3"
                    style={{
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(15,23,42,0.03)",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(15,23,42,0.06)",
                    }}
                  >
                    <TextInput
                      className="text-[14px] font-outfit text-app"
                      value={serviceCreateType}
                      onChangeText={setServiceCreateType}
                      placeholder="call"
                      placeholderTextColor={colors.placeholder}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>
                <View className="gap-2">
                  <Text className="text-[12px] font-outfit text-secondary">
                    Duration minutes
                  </Text>
                  <View
                    className="rounded-2xl border px-4 py-3"
                    style={{
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(15,23,42,0.03)",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(15,23,42,0.06)",
                    }}
                  >
                    <TextInput
                      className="text-[14px] font-outfit text-app"
                      value={serviceCreateDurationMinutes}
                      onChangeText={setServiceCreateDurationMinutes}
                      placeholder="30"
                      placeholderTextColor={colors.placeholder}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
                <View className="gap-2">
                  <Text className="text-[12px] font-outfit text-secondary">
                    Capacity (optional)
                  </Text>
                  <View
                    className="rounded-2xl border px-4 py-3"
                    style={{
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(15,23,42,0.03)",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(15,23,42,0.06)",
                    }}
                  >
                    <TextInput
                      className="text-[14px] font-outfit text-app"
                      value={serviceCreateCapacity}
                      onChangeText={setServiceCreateCapacity}
                      placeholder="e.g. 1"
                      placeholderTextColor={colors.placeholder}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
                <View className="gap-2">
                  <Text className="text-[12px] font-outfit text-secondary">
                    Active? (true/false)
                  </Text>
                  <View
                    className="rounded-2xl border px-4 py-3"
                    style={{
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(15,23,42,0.03)",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(15,23,42,0.06)",
                    }}
                  >
                    <TextInput
                      className="text-[14px] font-outfit text-app"
                      value={serviceCreateIsActive}
                      onChangeText={setServiceCreateIsActive}
                      placeholder="true"
                      placeholderTextColor={colors.placeholder}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>
                <View className="gap-2">
                  <Text className="text-[12px] font-outfit text-secondary">
                    Default location (optional)
                  </Text>
                  <View
                    className="rounded-2xl border px-4 py-3"
                    style={{
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(15,23,42,0.03)",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(15,23,42,0.06)",
                    }}
                  >
                    <TextInput
                      className="text-[14px] font-outfit text-app"
                      value={serviceCreateDefaultLocation}
                      onChangeText={setServiceCreateDefaultLocation}
                      placeholder="e.g. Zoom"
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
                </View>
                <View className="gap-2">
                  <Text className="text-[12px] font-outfit text-secondary">
                    Default meeting link (optional)
                  </Text>
                  <View
                    className="rounded-2xl border px-4 py-3"
                    style={{
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(15,23,42,0.03)",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(15,23,42,0.06)",
                    }}
                  >
                    <TextInput
                      className="text-[14px] font-outfit text-app"
                      value={serviceCreateDefaultMeetingLink}
                      onChangeText={setServiceCreateDefaultMeetingLink}
                      placeholder="https://…"
                      placeholderTextColor={colors.placeholder}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <View className="gap-2">
                  <Text className="text-[12px] font-outfit text-secondary">
                    Advanced JSON (optional)
                  </Text>
                  <View
                    className="rounded-2xl border px-4 py-3"
                    style={{
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(15,23,42,0.03)",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(15,23,42,0.06)",
                    }}
                  >
                    <TextInput
                      className="text-[12px] font-outfit text-app"
                      value={serviceCreateAdvancedJson}
                      onChangeText={setServiceCreateAdvancedJson}
                      placeholder='{"programTier":"PHP_Premium"}'
                      placeholderTextColor={colors.placeholder}
                      autoCapitalize="none"
                      autoCorrect={false}
                      multiline
                      style={{ minHeight: 72, textAlignVertical: "top" }}
                    />
                  </View>
                </View>

                <View className="flex-row gap-2">
                  <SmallAction
                    label={serviceCreateBusy ? "Creating…" : "Create"}
                    tone="success"
                    onPress={createServiceType}
                    disabled={serviceCreateBusy}
                  />
                  <SmallAction
                    label="Refresh"
                    tone="neutral"
                    onPress={() => loadServices(true)}
                    disabled={servicesLoading}
                  />
                </View>
              </View>

              {servicesLoading && services.length === 0 ? (
                <View className="gap-2">
                  <Skeleton width="92%" height={14} />
                  <Skeleton width="86%" height={14} />
                  <Skeleton width="90%" height={14} />
                </View>
              ) : servicesError ? (
                <Text selectable className="text-sm font-outfit text-red-400">
                  {servicesError}
                </Text>
              ) : services.length === 0 ? (
                <Text className="text-sm font-outfit text-secondary">
                  No service types.
                </Text>
              ) : (
                <View className="gap-3">
                  {services.map((s) => {
                    const busy = serviceEditBusyId === s.id;
                    const advancedJson = defaultServicePatchJson(s);

                    return (
                      <Pressable
                        key={String(s.id)}
                        onPress={() => {
                          setServiceDetailOpenId(s.id);
                          setServiceEditAdvancedJson((prev) =>
                            prev[s.id]
                              ? prev
                              : { ...prev, [s.id]: advancedJson },
                          );
                        }}
                        style={({ pressed }) => [
                          {
                            borderRadius: 18,
                            borderWidth: 1,
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.03)"
                              : "rgba(15,23,42,0.03)",
                            borderColor: isDark
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(15,23,42,0.06)",
                            opacity: pressed ? 0.9 : 1,
                          },
                        ]}
                      >
                        <View className="gap-1">
                          <View className="flex-row items-center justify-between gap-3">
                            <Text
                              className="text-[13px] font-clash font-bold text-app"
                              numberOfLines={1}
                            >
                              #{s.id} {s.name ?? "(name)"}
                            </Text>
                            <Text
                              className="text-[11px] font-outfit text-secondary"
                              numberOfLines={1}
                            >
                              {s.isActive === false ? "inactive" : "active"}
                            </Text>
                          </View>
                          <Text
                            className="text-[12px] font-outfit text-secondary"
                            numberOfLines={1}
                          >
                            {s.type ?? "—"} • {s.durationMinutes ?? "—"}m • cap{" "}
                            {s.capacity ?? "—"}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>
      </ThemedScrollView>

      <Modal
        visible={bookingDetailOpenId != null}
        animationType="slide"
        presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
        onRequestClose={() => setBookingDetailOpenId(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: isDark ? colors.background : colors.background,
            paddingTop: insets.top,
          }}
        >
          <View
            style={{
              paddingHorizontal: 16,
              paddingBottom: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                className="text-[18px] font-clash font-bold text-app"
                numberOfLines={1}
              >
                Booking #{bookingDetailOpenId ?? ""}
              </Text>
              <Text className="text-[12px] font-outfit text-secondary">
                Details and actions
              </Text>
            </View>
            <SmallAction
              label="Done"
              tone="neutral"
              onPress={() => setBookingDetailOpenId(null)}
            />
          </View>

          <ThemedScrollView>
            {bookingDetailOpenId == null
              ? null
              : (() => {
                  const b = bookings.find((x) => x.id === bookingDetailOpenId);
                  const detail = bookingDetails[bookingDetailOpenId];
                  const detailLoading = Boolean(
                    bookingDetailLoadingIds[bookingDetailOpenId],
                  );

                  const status =
                    (detail?.status ?? b?.status ?? "—")?.toString() ?? "—";

                  return (
                    <View className="gap-4">
                      <View
                        className="rounded-[20px] border p-4"
                        style={{
                          backgroundColor: isDark
                            ? colors.cardElevated
                            : "#FFFFFF",
                          borderColor: isDark
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(15,23,42,0.06)",
                          ...(isDark ? Shadows.none : Shadows.md),
                        }}
                      >
                        <View className="gap-1">
                          <View className="flex-row items-center justify-between gap-3">
                            <Text
                              className="text-[14px] font-clash font-bold text-app"
                              numberOfLines={1}
                            >
                              {b?.serviceName ?? "(service)"}
                            </Text>
                            <Text
                              className="text-[12px] font-outfit text-secondary"
                              style={{ fontVariant: ["tabular-nums"] }}
                            >
                              {status}
                            </Text>
                          </View>
                          <Text
                            className="text-[12px] font-outfit text-secondary"
                            numberOfLines={2}
                          >
                            {b?.athleteName ?? "(athlete)"} •{" "}
                            {formatIsoShort(b?.startsAt)}
                          </Text>
                        </View>

                        <View className="flex-row gap-2 mt-3">
                          <SmallAction
                            label="Confirm"
                            tone="success"
                            onPress={() =>
                              bookingDetailOpenId != null &&
                              updateBookingStatus(
                                bookingDetailOpenId,
                                "confirmed",
                              )
                            }
                            disabled={bookingMutatingId === bookingDetailOpenId}
                          />
                          <SmallAction
                            label="Decline"
                            tone="danger"
                            onPress={() =>
                              bookingDetailOpenId != null &&
                              updateBookingStatus(
                                bookingDetailOpenId,
                                "declined",
                              )
                            }
                            disabled={bookingMutatingId === bookingDetailOpenId}
                          />
                          <SmallAction
                            label="Cancel"
                            tone="neutral"
                            onPress={() =>
                              bookingDetailOpenId != null &&
                              updateBookingStatus(
                                bookingDetailOpenId,
                                "cancelled",
                              )
                            }
                            disabled={bookingMutatingId === bookingDetailOpenId}
                          />
                        </View>
                      </View>

                      <View
                        className="rounded-[20px] border p-4"
                        style={{
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.03)"
                            : "rgba(15,23,42,0.03)",
                          borderColor: isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(15,23,42,0.06)",
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
                            <Text
                              selectable
                              className="text-[12px] font-outfit text-secondary"
                            >
                              Guardian: {detail.guardianName ?? "—"} •{" "}
                              {detail.guardianEmail ?? "—"}
                            </Text>
                            <Text
                              selectable
                              className="text-[12px] font-outfit text-secondary"
                            >
                              Window: {formatIsoShort(detail.startsAt)} →{" "}
                              {formatIsoShort(detail.endTime)}
                            </Text>
                            {detail.slotsTotal != null ? (
                              <Text
                                selectable
                                className="text-[12px] font-outfit text-secondary"
                              >
                                Capacity: {detail.slotsUsed ?? 0}/
                                {detail.slotsTotal}
                              </Text>
                            ) : null}
                            {detail.location ? (
                              <Text
                                selectable
                                className="text-[12px] font-outfit text-secondary"
                              >
                                Location: {detail.location}
                              </Text>
                            ) : null}
                            {detail.meetingLink ? (
                              <Text
                                selectable
                                className="text-[12px] font-outfit text-secondary"
                              >
                                Meeting: {detail.meetingLink}
                              </Text>
                            ) : null}
                            {detail.createdAt ? (
                              <Text
                                selectable
                                className="text-[11px] font-outfit text-secondary"
                              >
                                Created {formatIsoShort(detail.createdAt)}
                              </Text>
                            ) : null}
                          </View>
                        ) : (
                          <Text className="text-[12px] font-outfit text-secondary">
                            No detail loaded.
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })()}
          </ThemedScrollView>
        </View>
      </Modal>

      <Modal
        visible={availabilityDetailOpenId != null}
        animationType="slide"
        presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
        onRequestClose={() => setAvailabilityDetailOpenId(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: isDark ? colors.background : colors.background,
            paddingTop: insets.top,
          }}
        >
          <View
            style={{
              paddingHorizontal: 16,
              paddingBottom: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                className="text-[18px] font-clash font-bold text-app"
                numberOfLines={1}
              >
                Availability #{availabilityDetailOpenId ?? ""}
              </Text>
              <Text className="text-[12px] font-outfit text-secondary">
                Block details
              </Text>
            </View>
            <SmallAction
              label="Done"
              tone="neutral"
              onPress={() => setAvailabilityDetailOpenId(null)}
            />
          </View>

          <ThemedScrollView>
            {availabilityDetailOpenId == null
              ? null
              : (() => {
                  const block = availability.find(
                    (x) => x.id === availabilityDetailOpenId,
                  );
                  if (!block) {
                    return (
                      <Text className="text-sm font-outfit text-secondary">
                        Not found.
                      </Text>
                    );
                  }
                  return (
                    <View className="gap-3">
                      <View
                        className="rounded-[20px] border p-4"
                        style={{
                          backgroundColor: isDark
                            ? colors.cardElevated
                            : "#FFFFFF",
                          borderColor: isDark
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(15,23,42,0.06)",
                          ...(isDark ? Shadows.none : Shadows.md),
                        }}
                      >
                        <Text
                          className="text-[14px] font-clash font-bold text-app"
                          numberOfLines={2}
                        >
                          {block.serviceName ?? "(service)"}
                        </Text>
                        <Text
                          selectable
                          className="text-[12px] font-outfit text-secondary"
                        >
                          {formatIsoShort(block.startsAt)} →{" "}
                          {formatIsoShort(block.endsAt)}
                        </Text>
                        <Text
                          selectable
                          className="text-[11px] font-outfit text-secondary"
                        >
                          Created {formatIsoShort(block.createdAt)}
                        </Text>
                      </View>
                    </View>
                  );
                })()}
          </ThemedScrollView>
        </View>
      </Modal>

      <Modal
        visible={serviceDetailOpenId != null}
        animationType="slide"
        presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
        onRequestClose={() => setServiceDetailOpenId(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: isDark ? colors.background : colors.background,
            paddingTop: insets.top,
          }}
        >
          <View
            style={{
              paddingHorizontal: 16,
              paddingBottom: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                className="text-[18px] font-clash font-bold text-app"
                numberOfLines={1}
              >
                Service #{serviceDetailOpenId ?? ""}
              </Text>
              <Text className="text-[12px] font-outfit text-secondary">
                Patch and manage
              </Text>
            </View>
            <SmallAction
              label="Done"
              tone="neutral"
              onPress={() => setServiceDetailOpenId(null)}
            />
          </View>

          <ThemedScrollView>
            {serviceDetailOpenId == null
              ? null
              : (() => {
                  const s = services.find((x) => x.id === serviceDetailOpenId);
                  const busy = serviceEditBusyId === serviceDetailOpenId;
                  const jsonValue =
                    serviceEditAdvancedJson[serviceDetailOpenId] ??
                    (s ? defaultServicePatchJson(s) : "{} ");

                  return (
                    <View className="gap-4">
                      <View
                        className="rounded-[20px] border p-4"
                        style={{
                          backgroundColor: isDark
                            ? colors.cardElevated
                            : "#FFFFFF",
                          borderColor: isDark
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(15,23,42,0.06)",
                          ...(isDark ? Shadows.none : Shadows.md),
                        }}
                      >
                        <Text
                          className="text-[14px] font-clash font-bold text-app"
                          numberOfLines={2}
                        >
                          {s?.name ?? "(name)"}
                        </Text>
                        <Text className="text-[12px] font-outfit text-secondary">
                          {s?.type ?? "—"} • {s?.durationMinutes ?? "—"}m • cap{" "}
                          {s?.capacity ?? "—"}
                        </Text>
                        <Text className="text-[11px] font-outfit text-secondary">
                          Status:{" "}
                          {s?.isActive === false ? "inactive" : "active"}
                        </Text>
                      </View>

                      <View className="gap-2">
                        <Text className="text-[12px] font-outfit text-secondary">
                          Patch JSON (send only the fields you want to change)
                        </Text>
                        <View
                          className="rounded-2xl border px-4 py-3"
                          style={{
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.03)"
                              : "rgba(15,23,42,0.03)",
                            borderColor: isDark
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(15,23,42,0.06)",
                          }}
                        >
                          <TextInput
                            className="text-[12px] font-outfit text-app"
                            value={jsonValue}
                            onChangeText={(t) =>
                              setServiceEditAdvancedJson((prev) => ({
                                ...prev,
                                [serviceDetailOpenId]: t,
                              }))
                            }
                            autoCapitalize="none"
                            autoCorrect={false}
                            multiline
                            style={{ minHeight: 160, textAlignVertical: "top" }}
                            placeholderTextColor={colors.placeholder}
                          />
                        </View>
                      </View>

                      <View className="flex-row gap-2">
                        <SmallAction
                          label={busy ? "Saving…" : "Save"}
                          tone="success"
                          onPress={() => {
                            let patch: Record<string, unknown> = {};
                            try {
                              const parsed = JSON.parse(
                                (jsonValue ?? "{}").trim() || "{}",
                              );
                              if (
                                parsed &&
                                typeof parsed === "object" &&
                                !Array.isArray(parsed)
                              ) {
                                patch = parsed;
                              } else {
                                setServicesError(
                                  "Patch JSON must be an object",
                                );
                                return;
                              }
                            } catch {
                              setServicesError("Patch JSON must be valid JSON");
                              return;
                            }
                            void updateServiceType(serviceDetailOpenId, patch);
                          }}
                          disabled={busy}
                        />
                        <SmallAction
                          label={busy ? "Deleting…" : "Delete"}
                          tone="danger"
                          onPress={() => deleteServiceType(serviceDetailOpenId)}
                          disabled={busy}
                        />
                        <SmallAction
                          label="Toggle active"
                          tone="neutral"
                          onPress={() =>
                            updateServiceType(serviceDetailOpenId, {
                              isActive: !((s?.isActive ?? true) as boolean),
                            })
                          }
                          disabled={busy}
                        />
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
