import React, { memo, useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
  StyleSheet,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  withSpring,
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSelector } from "@/store/hooks";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { useSafeIsFocused } from "@/hooks/navigation/useSafeReactNavigation";
import { Text } from "@/components/ScaledText";
import { AgeGate } from "@/components/AgeGate";
import { SkeletonScheduleScreen } from "@/components/ui/Skeleton";
import { BookingModal } from "@/components/tracking/schedule/BookingModal";
import { useScheduleData } from "@/components/tracking/schedule/hooks";
import { canSelfBookSchedule } from "@/lib/scheduleBookingAccess";
import type { ScheduleEvent } from "@/components/tracking/schedule/types";
import { formatDateKey, parseDateKey } from "@/components/tracking/schedule/utils";

// ── Pure helpers ──────────────────────────────────────────────────────

function todayKey() { return formatDateKey(new Date()); }
function tomorrowKey() {
  const d = new Date(); d.setDate(d.getDate() + 1); return formatDateKey(d);
}

function relativeDate(dateKey: string): string {
  const tk = todayKey(), tmk = tomorrowKey();
  if (dateKey === tk) return "Today";
  if (dateKey === tmk) return "Tomorrow";
  return parseDateKey(dateKey).toLocaleDateString("en-US", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function accentFor(status?: string, colors?: Record<string, string>) {
  switch (status?.toLowerCase()) {
    case "confirmed": return colors?.success ?? "#22C55E";
    case "pending":   return colors?.warning ?? "#F59E0B";
    case "declined":
    case "cancelled": return colors?.textSecondary ?? "#94A3B8";
    default:          return colors?.accent ?? "#6366F1";
  }
}

function labelFor(status?: string) {
  switch (status?.toLowerCase()) {
    case "confirmed": return "Confirmed";
    case "pending":   return "Awaiting approval";
    case "declined":  return "Declined";
    case "cancelled": return "Cancelled";
    default:          return status ?? "";
  }
}

function iconFor(type: string): keyof typeof Ionicons.glyphMap {
  if (type === "call") return "call-outline";
  if (type === "recovery") return "heart-outline";
  return "barbell-outline";
}

function duration(a: string, b: string) {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  const mins = (bh * 60 + bm) - (ah * 60 + (am || 0));
  if (!mins || mins <= 0) return null;
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// ── Section label row ────────────────────────────────────────────────

const SectionLabel = memo(function SectionLabel({
  icon, label, count, accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  count?: number;
  accent?: string;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={s.sectionLabel}>
      <View style={[s.sectionIcon, { backgroundColor: `${accent ?? colors.accent}15` }]}>
        <Ionicons name={icon} size={14} color={accent ?? colors.accent} />
      </View>
      <Text style={[s.sectionLabelText, { color: colors.textPrimary, fontFamily: "Outfit-SemiBold" }]}>
        {label}
      </Text>
      {count != null && (
        <View style={[s.countPill, { backgroundColor: `${accent ?? colors.accent}18` }]}>
          <Text style={[s.countText, { color: accent ?? colors.accent, fontFamily: "Outfit-SemiBold" }]}>
            {count}
          </Text>
        </View>
      )}
    </View>
  );
});

// ── Date group header ────────────────────────────────────────────────

const DateGroup = memo(function DateGroup({ dateKey }: { dateKey: string }) {
  const { colors } = useAppTheme();
  const isToday = dateKey === todayKey();
  return (
    <View style={s.dateGroup}>
      <Text style={[
        s.dateGroupText,
        { fontFamily: isToday ? "Outfit-Bold" : "Outfit-SemiBold", color: isToday ? colors.accent : colors.textSecondary },
      ]}>
        {relativeDate(dateKey)}
      </Text>
      <View style={[s.dateGroupLine, { backgroundColor: `${colors.textSecondary}18` }]} />
    </View>
  );
});

// ── Session card ─────────────────────────────────────────────────────

interface CardProps { event: ScheduleEvent; index: number; onCancel?: () => void; }

const SessionCard = memo(function SessionCard({ event, index, onCancel }: CardProps) {
  const { colors, isDark } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const accent  = accentFor(event.status);
  const durStr  = duration(event.timeStart, event.timeEnd);
  const isPending  = event.status?.toLowerCase() === "pending";
  const isDeclined = event.status?.toLowerCase() === "declined" || event.status?.toLowerCase() === "cancelled";

  const entering = !reduceMotion
    ? FadeInDown.delay(index * 45).duration(200).springify()
    : undefined;

  const openLink = useCallback(() => {
    if (event.meetingLink) Linking.openURL(event.meetingLink);
  }, [event.meetingLink]);

  return (
    <Animated.View entering={entering}>
      <View style={[
        s.card,
        { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF", opacity: isDeclined ? 0.55 : 1,
          shadowColor: isDark ? "transparent" : "#000" },
      ]}>
        {/* Accent bar */}
        <View style={[s.accentBar, { backgroundColor: accent }]} />

        {/* Body */}
        <View style={s.cardBody}>
          {/* Title + badge */}
          <View style={s.row}>
            <Text style={[s.cardTitle, { color: colors.textPrimary, fontFamily: "Outfit-SemiBold" }]} numberOfLines={1}>
              {event.title}
            </Text>
            <View style={[s.badge, { backgroundColor: `${accent}1A` }]}>
              {isPending && <View style={[s.dot, { backgroundColor: accent }]} />}
              <Text style={[s.badgeText, { color: accent, fontFamily: "Outfit-Medium" }]}>
                {labelFor(event.status)}
              </Text>
            </View>
          </View>

          {/* Time + duration */}
          <View style={[s.row, { marginTop: 6 }]}>
            <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
            <Text style={[s.meta, { color: colors.textSecondary, fontFamily: "Outfit-Regular" }]}>
              {event.timeStart}{event.timeEnd ? ` – ${event.timeEnd}` : ""}
            </Text>
            {durStr && (
              <>
                <Text style={[s.metaDot, { color: colors.textSecondary }]}>·</Text>
                <Text style={[s.meta, { color: colors.textSecondary, fontFamily: "Outfit-Regular" }]}>
                  {durStr}
                </Text>
              </>
            )}
          </View>

          {/* Location / link */}
          {event.meetingLink ? (
            <Pressable onPress={openLink} style={[s.row, { marginTop: 4 }]}>
              <Ionicons name="videocam-outline" size={12} color="#6366F1" />
              <Text style={[s.meta, { color: "#6366F1", fontFamily: "Outfit-Regular", marginLeft: 3 }]}>
                Join online
              </Text>
            </Pressable>
          ) : event.location && event.location !== "TBD" ? (
            <View style={[s.row, { marginTop: 4 }]}>
              <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
              <Text style={[s.meta, { color: colors.textSecondary, fontFamily: "Outfit-Regular", marginLeft: 3 }]} numberOfLines={1}>
                {event.location}
              </Text>
            </View>
          ) : null}

          {/* Notes */}
          {event.notes ? (
            <Text style={[s.notes, { color: colors.textSecondary }]} numberOfLines={2}>
              {event.notes}
            </Text>
          ) : null}

          {/* Cancel action (pending only) */}
          {onCancel && (
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [s.cancelLink, pressed && { opacity: 0.5 }]}
              accessibilityRole="button"
              accessibilityLabel="Cancel request"
            >
              <Text style={[s.cancelLinkText, { fontFamily: "Outfit-Medium" }]}>
                Cancel request
              </Text>
            </Pressable>
          )}
        </View>

        {/* Type icon */}
        <View style={[s.typeIcon, { backgroundColor: isDark ? "#2A2A2C" : "#F2F2F7" }]}>
          <Ionicons name={iconFor(event.type)} size={15} color={colors.textSecondary} />
        </View>
      </View>
    </Animated.View>
  );
});

// ── Empty slot (inside a section) ────────────────────────────────────

const InlineEmpty = memo(function InlineEmpty({
  message, isDark,
}: { message: string; isDark: boolean }) {
  const { colors } = useAppTheme();
  return (
    <View style={[s.inlineEmpty, { backgroundColor: isDark ? "#1C1C1E" : "#F8F8F8" }]}>
      <Text style={[s.inlineEmptyText, { color: colors.textSecondary, fontFamily: "Outfit-Regular" }]}>
        {message}
      </Text>
    </View>
  );
});

// ── Past section toggle ──────────────────────────────────────────────

const PastToggle = memo(function PastToggle({
  count, open, onToggle,
}: { count: number; open: boolean; onToggle: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [s.pastToggle, pressed && { opacity: 0.65 }]}
      accessibilityRole="button"
    >
      <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
      <Text style={[s.pastToggleText, { color: colors.textSecondary, fontFamily: "Outfit-Medium" }]}>
        {open ? "Hide" : `Show ${count} past session${count !== 1 ? "s" : ""}`}
      </Text>
      <Ionicons
        name={open ? "chevron-up" : "chevron-down"}
        size={14}
        color={colors.textSecondary}
      />
    </Pressable>
  );
});

// ── Stats bar ────────────────────────────────────────────────────────

const StatsBar = memo(function StatsBar({
  upcoming, pending,
}: { upcoming: number; pending: number }) {
  const { colors } = useAppTheme();
  if (upcoming === 0 && pending === 0) return null;
  return (
    <View style={s.statsBar}>
      {upcoming > 0 && (
        <View style={s.statChip}>
          <View style={[s.statDot, { backgroundColor: "#22C55E" }]} />
          <Text style={[s.statText, { color: colors.textSecondary, fontFamily: "Outfit-Regular" }]}>
            {upcoming} upcoming
          </Text>
        </View>
      )}
      {upcoming > 0 && pending > 0 && (
        <View style={[s.statDivider, { backgroundColor: `${colors.textSecondary}20` }]} />
      )}
      {pending > 0 && (
        <View style={s.statChip}>
          <View style={[s.statDot, { backgroundColor: "#F59E0B" }]} />
          <Text style={[s.statText, { color: colors.textSecondary, fontFamily: "Outfit-Regular" }]}>
            {pending} pending
          </Text>
        </View>
      )}
    </View>
  );
});

// ── Team banner ──────────────────────────────────────────────────────

const TeamBanner = memo(function TeamBanner() {
  const { colors, isDark } = useAppTheme();
  return (
    <View style={[s.teamBanner, {
      backgroundColor: isDark ? "rgba(99,102,241,0.10)" : "rgba(99,102,241,0.07)",
      borderColor:     isDark ? "rgba(99,102,241,0.22)" : "rgba(99,102,241,0.16)",
    }]}>
      <Ionicons name="people-outline" size={15} color="#6366F1" />
      <Text style={[s.teamBannerText, { color: colors.textSecondary, fontFamily: "Outfit-Regular" }]}>
        Your coach manages your schedule
      </Text>
    </View>
  );
});

// ── Service schedule helpers ─────────────────────────────────────────

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatServiceSchedule(service: import("@/components/tracking/schedule/types").ServiceType): string {
  if (service.schedulePattern === "weekly_recurring" && Array.isArray(service.weeklyEntries) && service.weeklyEntries.length > 0) {
    const entry = service.weeklyEntries[0];
    const dayName = WEEKDAY_NAMES[entry.weekday] ?? "Weekly";
    const [h, m] = entry.time.split(":").map(Number);
    const ampm = (h ?? 0) >= 12 ? "PM" : "AM";
    const hour12 = ((h ?? 0) % 12) || 12;
    const min = String(m ?? 0).padStart(2, "0");
    return `Every ${dayName} at ${hour12}:${min} ${ampm}`;
  }
  if (service.oneTimeDate) {
    const d = new Date(`${service.oneTimeDate}T${service.oneTimeTime ?? "12:00"}:00`);
    const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const [h, m] = (service.oneTimeTime ?? "12:00").split(":").map(Number);
    const ampm = (h ?? 0) >= 12 ? "PM" : "AM";
    const hour12 = ((h ?? 0) % 12) || 12;
    const min = String(m ?? 0).padStart(2, "0");
    return `${label} · ${hour12}:${min} ${ampm}`;
  }
  return "Flexible timing";
}

// ── Pinned service card ──────────────────────────────────────────────

interface ServiceCardProps {
  service: import("@/components/tracking/schedule/types").ServiceType;
  onBook?: () => void;
  isDark: boolean;
  colors: Record<string, string>;
}

const ServiceCard = memo(function ServiceCard({ service, onBook, isDark, colors }: ServiceCardProps) {
  const scheduleLabel = useMemo(() => formatServiceSchedule(service), [service]);
  const isRecurring = service.schedulePattern === "weekly_recurring";
  const bookable = service.isBookable !== false;

  return (
    <View style={[
      sc.card,
      { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF", shadowColor: isDark ? "transparent" : "#000" },
    ]}>
      <View style={[sc.dot, { backgroundColor: isRecurring ? "#6366F1" : "#22C55E" }]} />
      <View style={sc.body}>
        <Text style={[sc.name, { color: colors.textPrimary, fontFamily: "Outfit-SemiBold" }]} numberOfLines={1}>
          {service.name}
        </Text>
        <View style={sc.row}>
          <Ionicons
            name={isRecurring ? "repeat-outline" : "calendar-outline"}
            size={11}
            color={isRecurring ? "#6366F1" : "#22C55E"}
          />
          <Text style={[sc.schedule, { color: colors.textSecondary, fontFamily: "Outfit-Regular" }]}>
            {scheduleLabel}
          </Text>
        </View>
        {service.durationMinutes > 0 && (
          <Text style={[sc.duration, { color: colors.textSecondary, fontFamily: "Outfit-Regular" }]}>
            {service.durationMinutes < 60
              ? `${service.durationMinutes}m`
              : `${Math.floor(service.durationMinutes / 60)}h${service.durationMinutes % 60 ? ` ${service.durationMinutes % 60}m` : ""}`}
          </Text>
        )}
      </View>
      {bookable && onBook ? (
        <Pressable
          onPress={onBook}
          style={({ pressed }) => [sc.bookBtn, { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={`Book ${service.name}`}
        >
          <Text style={[sc.bookBtnText, { fontFamily: "Outfit-SemiBold" }]}>Book</Text>
        </Pressable>
      ) : (
        <View style={[sc.infoTag, { backgroundColor: `${colors.textSecondary}18` }]}>
          <Text style={[sc.infoTagText, { color: colors.textSecondary, fontFamily: "Outfit-Medium" }]}>
            Info
          </Text>
        </View>
      )}
    </View>
  );
});

// ── Services panel ───────────────────────────────────────────────────

interface ServicesPanelProps {
  bookable: import("@/components/tracking/schedule/types").ServiceType[];
  nonBookable: import("@/components/tracking/schedule/types").ServiceType[];
  onBook: (serviceId: number) => void;
  isDark: boolean;
  colors: Record<string, string>;
}

const ServicesPanel = memo(function ServicesPanel({ bookable, nonBookable, onBook, isDark, colors }: ServicesPanelProps) {
  if (bookable.length === 0 && nonBookable.length === 0) return null;
  const all = [...bookable, ...nonBookable];
  return (
    <View style={sp.wrapper}>
      <SectionLabel icon="storefront-outline" label="Services" count={all.length} accent="#6366F1" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={sp.scroll}
      >
        {bookable.map((svc) => (
          <ServiceCard
            key={svc.id}
            service={svc}
            onBook={() => onBook(svc.id)}
            isDark={isDark}
            colors={colors}
          />
        ))}
        {nonBookable.map((svc) => (
          <ServiceCard
            key={svc.id}
            service={svc}
            isDark={isDark}
            colors={colors}
          />
        ))}
      </ScrollView>
    </View>
  );
});

// ── Main screen ──────────────────────────────────────────────────────

export default memo(function ScheduleScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const token = useAppSelector((s) => s.user.token);
  const capabilities = useAppSelector((s) => s.user.capabilities);
  const apiUserRole = useAppSelector((s) => s.user.apiUserRole);
  const managedAthletes = useAppSelector((s) => s.user.managedAthletes);
  const athleteUserId = useAppSelector((s) => s.user.athleteUserId);
  const authTeamMembership = useAppSelector((s) => s.user.authTeamMembership);
  const canBook = canSelfBookSchedule(apiUserRole);
  const userTeamId = authTeamMembership?.teamId ?? null;
  const userAthleteType = useMemo(() => {
    const active =
      managedAthletes.find((a) => a.userId === athleteUserId || a.id === athleteUserId) ??
      managedAthletes[0] ??
      null;
    return active?.athleteType ?? null;
  }, [managedAthletes, athleteUserId]);
  const { isSectionHidden } = useAgeExperience();
  const isFocused = useSafeIsFocused(true);
  const queryClient = useQueryClient();

  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingServiceId, setBookingServiceId] = useState<number | null>(null);
  const [pastOpen, setPastOpen] = useState(false);

  // Re-prefetch on each tab focus so data stays fresh
  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      void queryClient.prefetchQuery({
        queryKey: ["bookings"],
        queryFn: async () => {
          const { apiRequest } = await import("@/lib/api");
          const data = await apiRequest<{ items: any[] }>("/bookings", { token });
          const { mapBookingsToEvents } = await import("@/components/tracking/schedule/utils");
          return mapBookingsToEvents(data.items ?? []);
        },
        staleTime: 2 * 60 * 1000,
      });
      void queryClient.prefetchQuery({
        queryKey: ["booking-services"],
        queryFn: async () => {
          const { apiRequest } = await import("@/lib/api");
          const data = await apiRequest<{ items: any[] }>(
            "/bookings/services?includeLocked=true&omitWithoutBookableSlots=true",
            { token, timeoutMs: 6000 },
          );
          return data.items ?? [];
        },
        staleTime: 5 * 60 * 1000,
      });
    }, [token, queryClient]),
  );

  // ── Data ──────────────────────────────────────────────────────
  const { events, eventsLoading, services, servicesLoading, servicesError,
          refreshEvents, refreshServices } = useScheduleData(token, isFocused);

  const bookingServices = useMemo(() => {
    const base = capabilities?.semiPrivateBooking
      ? services
      : services.filter((s) => String(s.type ?? "").toLowerCase() !== "semi_private");

    return base.filter((s) => {
      const targets = s.eligibleTargets;
      // No restriction set — visible to everyone
      if (!Array.isArray(targets) || targets.length === 0) return true;
      // Explicitly set to all clients
      if (targets.includes("all")) return true;
      // Check youth/adult audience match
      if (userAthleteType && targets.includes(userAthleteType)) return true;
      // Check team membership match (format: "team:123")
      if (userTeamId && targets.some((t) => t === `team:${userTeamId}`)) return true;
      // Has restrictions but none match this user
      return false;
    });
  }, [services, capabilities?.semiPrivateBooking, userAthleteType, userTeamId]);

  const bookableServices = useMemo(
    () => bookingServices.filter((s) => s.isBookable !== false),
    [bookingServices],
  );
  const nonBookableServices = useMemo(
    () => bookingServices.filter((s) => s.isBookable === false),
    [bookingServices],
  );

  // ── Partition events ─────────────────────────────────────────
  const nowMs = Date.now();
  const todKey = todayKey();

  const { upcoming, requests, past } = useMemo(() => {
    const upcoming: ScheduleEvent[] = [];
    const requests: ScheduleEvent[] = [];
    const past: ScheduleEvent[]    = [];

    for (const e of events) {
      const ms = new Date(e.startsAt).getTime();
      const status = e.status?.toLowerCase();
      if (status === "pending") {
        requests.push(e);
      } else if (status === "declined" || status === "cancelled") {
        // skip declined/cancelled from main view
      } else if (ms >= nowMs || e.dateKey >= todKey) {
        upcoming.push(e);
      } else {
        past.push(e);
      }
    }

    // upcoming: chronological
    upcoming.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    // requests: newest first
    requests.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
    // past: most recent first
    past.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

    return { upcoming, requests, past };
  }, [events, nowMs, todKey]);

  // Group upcoming by dateKey
  const upcomingGroups = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    for (const e of upcoming) {
      const arr = map.get(e.dateKey) ?? [];
      arr.push(e);
      map.set(e.dateKey, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [upcoming]);

  // ── Cancel booking ───────────────────────────────────────────
  const cancelBooking = useCallback((bookingId: string) => {
    Alert.alert(
      "Cancel Request",
      "Are you sure you want to cancel this booking request? Your coach will be notified.",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Request",
          style: "destructive",
          onPress: async () => {
            try {
              await import("@/lib/api").then(({ apiRequest }) =>
                apiRequest(`/bookings/${bookingId}`, { method: "DELETE", token }),
              );
              refreshEvents();
            } catch {
              Alert.alert("Error", "Could not cancel the request. Please try again.");
            }
          },
        },
      ],
    );
  }, [token, refreshEvents]);

  // ── FAB animation ────────────────────────────────────────────
  const fabScale = useSharedValue(1);
  const fabStyle = useAnimatedStyle(() => ({ transform: [{ scale: fabScale.value }] }));
  const onFabIn  = useCallback(() => {
    fabScale.value = withSpring(0.94, { damping: 15, stiffness: 300 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [fabScale]);
  const onFabOut = useCallback(() => {
    fabScale.value = withSpring(1, { damping: 20, stiffness: 400 });
  }, [fabScale]);

  const openBooking = useCallback(() => {
    if (services.length === 0) refreshServices();
    setBookingServiceId(null);
    setBookingOpen(true);
  }, [services.length, refreshServices]);

  const openBookingForService = useCallback((serviceId: number) => {
    if (services.length === 0) refreshServices();
    setBookingServiceId(serviceId);
    setBookingOpen(true);
  }, [services.length, refreshServices]);

  // ── Guards ────────────────────────────────────────────────────
  if (isSectionHidden("schedule")) {
    return <AgeGate title="Schedule locked" message="Scheduling is restricted for this age." />;
  }
  if (eventsLoading) {
    return (
      <View style={[s.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <SkeletonScheduleScreen />
      </View>
    );
  }

  const fabBottom = 20 + insets.bottom + 56; // 56 = TAB_HEIGHT

  return (
    <View style={[s.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={[s.screenTitle, { color: colors.textPrimary, fontFamily: "Outfit-Bold" }]}>
          Schedule
        </Text>
        <StatsBar upcoming={upcoming.length} pending={requests.length} />
      </View>

      {/* ── Team banner ── */}
      {!canBook && <TeamBanner />}

      {/* ── Pinned services ── */}
      {(bookableServices.length > 0 || nonBookableServices.length > 0) && (
        <ServicesPanel
          bookable={bookableServices}
          nonBookable={nonBookableServices}
          onBook={openBookingForService}
          isDark={isDark}
          colors={colors as Record<string, string>}
        />
      )}

      {/* ── Main scroll ── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.scrollContent,
          { paddingBottom: fabBottom + (canBook ? 72 : 24) },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refreshEvents}
            tintColor={colors.accent}
          />
        }
      >

        {/* ════ UPCOMING ════ */}
        <SectionLabel
          icon="flash-outline"
          label="Upcoming"
          count={upcoming.length}
          accent="#22C55E"
        />

        {upcomingGroups.length === 0 ? (
          <InlineEmpty
            message={canBook
              ? "No upcoming sessions — book one below."
              : "No upcoming sessions yet."}
            isDark={isDark}
          />
        ) : (
          upcomingGroups.map(([dateKey, group]) => (
            <View key={dateKey}>
              <DateGroup dateKey={dateKey} />
              {group.map((evt, i) => (
                <SessionCard key={evt.id} event={evt} index={i} />
              ))}
            </View>
          ))
        )}

        {/* ════ REQUESTS ════ */}
        <View style={s.sectionGap} />
        <SectionLabel
          icon="hourglass-outline"
          label="Requests"
          count={requests.length}
          accent="#F59E0B"
        />

        {requests.length === 0 ? (
          <InlineEmpty
            message={canBook
              ? "No pending requests."
              : "No booking requests."}
            isDark={isDark}
          />
        ) : (
          requests.map((evt, i) => (
            <View key={evt.id}>
              {/* Show the requested date above each request */}
              <DateGroup dateKey={evt.dateKey} />
              <SessionCard
                event={evt}
                index={i}
                onCancel={() => cancelBooking(evt.id)}
              />
            </View>
          ))
        )}

        {/* ════ PAST ════ */}
        {past.length > 0 && (
          <>
            <View style={s.sectionGap} />
            <PastToggle
              count={past.length}
              open={pastOpen}
              onToggle={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setPastOpen((v) => !v);
              }}
            />
            {pastOpen && past.map((evt, i) => (
              <View key={evt.id}>
                {(i === 0 || past[i - 1].dateKey !== evt.dateKey) && (
                  <DateGroup dateKey={evt.dateKey} />
                )}
                <SessionCard event={evt} index={i} />
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* ── FAB ── */}
      {canBook && (
        <Animated.View style={[s.fabWrap, { bottom: fabBottom }, fabStyle]}>
          <Pressable
            onPress={openBooking}
            onPressIn={onFabIn}
            onPressOut={onFabOut}
            style={[s.fabBtn, { backgroundColor: colors.accent }]}
            accessibilityLabel="Book a session"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={22} color="#FFF" />
            <Text style={[s.fabLabel, { fontFamily: "Outfit-SemiBold" }]}>
              Book a Session
            </Text>
          </Pressable>
        </Animated.View>
      )}

      {/* ── Booking modal ── */}
      <BookingModal
        visible={bookingOpen}
        onClose={() => { setBookingOpen(false); setBookingServiceId(null); }}
        token={token}
        services={bookableServices}
        servicesLoading={servicesLoading}
        servicesError={servicesError}
        canCreateBookings={canBook}
        onSuccess={refreshEvents}
        initialServiceId={bookingServiceId}
      />
    </View>
  );
});

// ── Styles ────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:        { flex: 1 },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // Header
  header:      { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  screenTitle: { fontSize: 28, letterSpacing: -0.5 },

  // Stats bar
  statsBar:    { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 6 },
  statChip:    { flexDirection: "row", alignItems: "center", gap: 5 },
  statDot:     { width: 6, height: 6, borderRadius: 3 },
  statText:    { fontSize: 12 },
  statDivider: { width: 1, height: 12 },

  // Team banner
  teamBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 20, marginBottom: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
  },
  teamBannerText: { fontSize: 13 },

  // Section label
  sectionLabel:     { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, marginBottom: 12 },
  sectionIcon:      { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  sectionLabelText: { fontSize: 15, letterSpacing: -0.1 },
  countPill:        { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  countText:        { fontSize: 12 },
  sectionGap:       { height: 24 },

  // Date group
  dateGroup:     { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, marginTop: 4 },
  dateGroupText: { fontSize: 12, letterSpacing: 0.3 },
  dateGroupLine: { flex: 1, height: 1 },

  // Card
  card: {
    flexDirection: "row", borderRadius: 18, marginBottom: 10,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6,
    elevation: 2,
  },
  accentBar: { width: 4 },
  cardBody:  { flex: 1, paddingHorizontal: 14, paddingVertical: 14 },
  row:       { flexDirection: "row", alignItems: "center", gap: 5 },
  cardTitle: { flex: 1, fontSize: 15, letterSpacing: -0.1 },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  dot:       { width: 5, height: 5, borderRadius: 2.5 },
  badgeText: { fontSize: 11 },
  meta:      { fontSize: 13 },
  metaDot:   { fontSize: 13, opacity: 0.4 },
  notes:     { fontSize: 12, lineHeight: 17, opacity: 0.65, marginTop: 6 },
  typeIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    margin: 14, alignSelf: "flex-start",
  },

  // Cancel link
  cancelLink: { marginTop: 10, alignSelf: "flex-start" },
  cancelLinkText: { fontSize: 12, color: "#EF4444" },

  // Inline empty
  inlineEmpty: {
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    marginBottom: 4,
  },
  inlineEmptyText: { fontSize: 13 },

  // Past toggle
  pastToggle: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 10, marginBottom: 4, alignSelf: "flex-start",
  },
  pastToggleText: { fontSize: 13 },

  // Services panel
  servicesSection: { marginBottom: 4 },

  // FAB
  fabWrap: { position: "absolute", left: 20, right: 20 },
  fabBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, height: 56, borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12,
    elevation: 6,
  },
  fabLabel: { fontSize: 16, color: "#FFF", letterSpacing: -0.1 },
});

// ── Service card styles ───────────────────────────────────────────────

const sc = StyleSheet.create({
  card: {
    width: 220, flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 18, padding: 14, marginRight: 12,
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6,
    elevation: 2,
  },
  dot: { width: 8, height: 8, borderRadius: 4, alignSelf: "flex-start", marginTop: 4, flexShrink: 0 },
  body: { flex: 1, gap: 3 },
  name: { fontSize: 14, letterSpacing: -0.1 },
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  schedule: { fontSize: 11, flex: 1 },
  duration: { fontSize: 11, opacity: 0.6 },
  bookBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexShrink: 0,
  },
  bookBtnText: { fontSize: 12, color: "#FFF" },
  infoTag: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, flexShrink: 0,
  },
  infoTagText: { fontSize: 11 },
});

// ── Services panel styles ─────────────────────────────────────────────

const sp = StyleSheet.create({
  wrapper: { paddingHorizontal: 20, marginBottom: 8 },
  scroll: { paddingVertical: 4 },
});
