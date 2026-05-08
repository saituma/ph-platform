import React, { memo, useCallback, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
  StyleSheet,
  Linking,
  Image as RNImage,
  Dimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  Clock,
  Calendar,
  Zap,
  MapPin,
  Video,
  Plus,
  ChevronUp,
  ChevronDown,
  Users,
  Repeat,
  Store,
  Timer,
  Dumbbell,
  Phone,
  Heart,
  CheckCircle2,
  XCircle,
  ScanLine,
  Flame,
  Bell,
  CalendarCheck,
  CalendarClock,
  History,
} from "lucide-react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  withSpring,
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  runOnJS,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useStreakStore } from "@/lib/streakStore";

import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSelector } from "@/store/hooks";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { useSafeIsFocused } from "@/hooks/navigation/useSafeReactNavigation";
import { Text } from "@/components/ScaledText";
import { AgeGate } from "@/components/AgeGate";
import { SkeletonScheduleScreen } from "@/components/ui/legacy-skeleton";
import { BookingModal } from "@/components/tracking/schedule/BookingModal";
import { useScheduleData } from "@/components/tracking/schedule/hooks";
import { useActingUser } from "@/hooks/useActingUser";
import { useAppToast } from "@/hooks/useAppToast";
import type { ScheduleEvent } from "@/components/tracking/schedule/types";
import { formatDateKey, parseDateKey } from "@/components/tracking/schedule/utils";
import type { AdminPastelColors } from "@/constants/theme";

const SCHEDULE_BG = require("@/assets/images/schedule-bg.png");
const { height: SCREEN_H } = Dimensions.get("window");
const HERO_H = SCREEN_H * 0.38;

const PASTEL_GREEN = "#E8F5E9";
const PASTEL_GREEN_TEXT = "#2E7D32";
const PASTEL_GREEN_SOFT = "rgba(46,125,50,0.12)";
const PASTEL_LIME = "#F1F8E9";
const PASTEL_LIME_TEXT = "#33691E";
const PASTEL_SAGE = "#E0F2E9";
const PASTEL_SAGE_TEXT = "#1B5E20";

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

function accentFor(status: string | undefined, p: AdminPastelColors) {
  switch (status?.toLowerCase()) {
    case "confirmed": return p.success;
    case "pending":   return p.warning;
    case "declined":
    case "cancelled": return p.textMuted;
    default:          return p.accent;
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

function IconFor({ type, color, size }: { type: string; color: string; size: number }) {
  if (type === "call") return <Phone size={size} color={color} />;
  if (type === "recovery") return <Heart size={size} color={color} />;
  return <Dumbbell size={size} color={color} />;
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
  icon: Icon, label, count, accent,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  count?: number;
  accent?: string;
}) {
  const p = useAdminPastel();
  const accentColor = accent ?? p.accent;
  return (
    <View style={s.sectionLabel}>
      <View style={{ width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: p.accentSoft }}>
        <Icon size={14} color={accentColor} />
      </View>
      <Text style={{ fontSize: 15, letterSpacing: -0.1, color: p.textPrimary, fontFamily: "Outfit-Bold" }}>
        {label}
      </Text>
      {count != null && (
        <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, backgroundColor: `${accentColor}18` }}>
          <Text style={{ fontSize: 12, color: accentColor, fontFamily: "Outfit-Bold" }}>
            {count}
          </Text>
        </View>
      )}
    </View>
  );
});

// ── Date group header ────────────────────────────────────────────────

const DateGroup = memo(function DateGroup({ dateKey }: { dateKey: string }) {
  const p = useAdminPastel();
  const isToday = dateKey === todayKey();
  return (
    <View style={s.dateGroup}>
      <Text style={{
        fontSize: 12,
        letterSpacing: 0.3,
        fontFamily: isToday ? "Outfit-Bold" : "Outfit-Regular",
        color: isToday ? p.accent : p.textSecondary,
      }}>
        {relativeDate(dateKey)}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: p.divider }} />
    </View>
  );
});

// ── Session card ─────────────────────────────────────────────────────

const MeetingLinkTap = memo(function MeetingLinkTap({ meetingLink }: { meetingLink: string }) {
  const p = useAdminPastel();
  const linkScale = useSharedValue(1);
  const linkAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: linkScale.value }] }));
  const openLink = useCallback(() => { Linking.openURL(meetingLink); }, [meetingLink]);
  const linkTap = useMemo(() => Gesture.Tap()
    .onBegin(() => {
      'worklet';
      linkScale.value = withSpring(0.96, { damping: 15, stiffness: 400, mass: 0.3 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onFinalize(() => {
      'worklet';
      linkScale.value = withSpring(1, { damping: 20, stiffness: 300, mass: 0.4 });
    })
    .onEnd(() => {
      'worklet';
      runOnJS(openLink)();
    }), [openLink, linkScale]);
  return (
    <GestureDetector gesture={linkTap}>
      <Animated.View style={[{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }, linkAnimStyle]}>
        <Video size={12} color={p.accent} />
        <Text style={{ fontSize: 13, color: p.accent, fontFamily: "Outfit-Regular", marginLeft: 3 }}>
          Join online
        </Text>
      </Animated.View>
    </GestureDetector>
  );
});

const CancelTap = memo(function CancelTap({ onCancel }: { onCancel: () => void }) {
  const p = useAdminPastel();
  const cancelScale = useSharedValue(1);
  const cancelAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: cancelScale.value }] }));
  const cancelTap = useMemo(() => Gesture.Tap()
    .onBegin(() => {
      'worklet';
      cancelScale.value = withSpring(0.96, { damping: 15, stiffness: 400, mass: 0.3 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onFinalize(() => {
      'worklet';
      cancelScale.value = withSpring(1, { damping: 20, stiffness: 300, mass: 0.4 });
    })
    .onEnd(() => {
      'worklet';
      runOnJS(onCancel)();
    }), [onCancel, cancelScale]);
  return (
    <GestureDetector gesture={cancelTap}>
      <Animated.View
        style={[{ marginTop: 10, alignSelf: "flex-start" }, cancelAnimStyle]}
        accessibilityRole="button"
        accessibilityLabel="Cancel request"
      >
        <Text style={{ fontSize: 12, color: p.danger, fontFamily: "Outfit-Regular" }}>
          Cancel request
        </Text>
      </Animated.View>
    </GestureDetector>
  );
});

const CheckInButton = memo(function CheckInButton({ onCheckIn }: { onCheckIn: () => void }) {
  const p = useAdminPastel();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const tap = useMemo(() => Gesture.Tap()
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.96, { damping: 15, stiffness: 400, mass: 0.3 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSpring(1, { damping: 20, stiffness: 300, mass: 0.4 });
    })
    .onEnd(() => {
      'worklet';
      runOnJS(onCheckIn)();
    }), [onCheckIn, scale]);
  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        style={[{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginTop: 10,
          alignSelf: "flex-start",
          paddingHorizontal: 14,
          paddingVertical: 7,
          borderRadius: 20,
          backgroundColor: p.success,
        }, animStyle]}
        accessibilityRole="button"
        accessibilityLabel="Mark as attended"
      >
        <CheckCircle2 size={14} color={p.buttonPrimaryText} />
        <Text style={{ fontSize: 13, color: p.buttonPrimaryText, fontFamily: "Outfit-Bold" }}>
          Attended
        </Text>
      </Animated.View>
    </GestureDetector>
  );
});

interface CardProps { event: ScheduleEvent; index: number; onCancel?: () => void; onCheckIn?: () => void; isToday?: boolean; }

const SessionCard = memo(function SessionCard({ event, index, onCancel, onCheckIn, isToday }: CardProps) {
  const p = useAdminPastel();
  const reduceMotion = useReducedMotion();
  const accent  = accentFor(event.status, p);
  const durStr  = duration(event.timeStart, event.timeEnd);
  const isDeclined = event.status?.toLowerCase() === "declined" || event.status?.toLowerCase() === "cancelled";
  const isPending  = event.status?.toLowerCase() === "pending";

  const entering = !reduceMotion
    ? FadeInDown.delay(Math.min(index, 10) * 50).springify().damping(15)
    : undefined;

  return (
    <Animated.View entering={entering}>
      <View style={{
        flexDirection: "row",
        borderRadius: 18,
        marginBottom: 10,
        overflow: "hidden",
        backgroundColor: p.cardWhite,
        opacity: isDeclined ? 0.55 : 1,
      }}>
        {/* Accent bar */}
        <View style={{ width: 4, backgroundColor: accent }} />

        {/* Body */}
        <View style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 14 }}>
          {/* Title + badge */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Text style={{ flex: 1, fontSize: 15, letterSpacing: -0.1, color: p.textPrimary, fontFamily: "Outfit-Bold" }} numberOfLines={1}>
              {event.title}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: `${accent}1A` }}>
              {isPending && <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: accent }} />}
              <Text style={{ fontSize: 11, color: accent, fontFamily: "Outfit-Regular" }}>
                {labelFor(event.status)}
              </Text>
            </View>
          </View>

          {/* Time + duration */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 }}>
            <Clock size={12} color={p.textSecondary} />
            <Text style={{ fontSize: 13, color: p.textSecondary, fontFamily: "Outfit-Regular" }}>
              {event.timeStart}{event.timeEnd ? ` – ${event.timeEnd}` : ""}
            </Text>
            {durStr && (
              <>
                <Text style={{ fontSize: 13, opacity: 0.4, color: p.textSecondary }}>·</Text>
                <Text style={{ fontSize: 13, color: p.textSecondary, fontFamily: "Outfit-Regular" }}>
                  {durStr}
                </Text>
              </>
            )}
          </View>

          {/* Location / link */}
          {event.meetingLink ? (
            <MeetingLinkTap meetingLink={event.meetingLink} />
          ) : event.location && event.location !== "TBD" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }}>
              <MapPin size={12} color={p.textSecondary} />
              <Text style={{ fontSize: 13, color: p.textSecondary, fontFamily: "Outfit-Regular", marginLeft: 3 }} numberOfLines={1}>
                {event.location}
              </Text>
            </View>
          ) : null}

          {/* Notes */}
          {event.notes ? (
            <Text style={{ fontSize: 12, lineHeight: 17, opacity: 0.65, marginTop: 6, color: p.textSecondary, fontFamily: "Outfit-Regular" }} numberOfLines={2}>
              {event.notes}
            </Text>
          ) : null}

          {/* Cancel action (pending only) */}
          {onCancel && <CancelTap onCancel={onCancel} />}

          {/* Attendance check-in for today's scheduled sessions */}
          {isToday && event.tag === "Scheduled" && event.attendanceStatus === "attended" && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 10, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: `${p.success}18` }}>
              <CheckCircle2 size={13} color={p.success} />
              <Text style={{ fontSize: 12, color: p.success, fontFamily: "Outfit-Bold" }}>Attended</Text>
            </View>
          )}
          {isToday && event.tag === "Scheduled" && event.attendanceStatus === "missed" && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 10, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: `${p.danger}18` }}>
              <XCircle size={13} color={p.danger} />
              <Text style={{ fontSize: 12, color: p.danger, fontFamily: "Outfit-Bold" }}>Missed</Text>
            </View>
          )}
          {isToday && event.tag === "Scheduled" && (!event.attendanceStatus || event.attendanceStatus === "unmarked") && onCheckIn && (
            <CheckInButton onCheckIn={onCheckIn} />
          )}
        </View>

        {/* Type icon */}
        <View style={{ width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", margin: 14, alignSelf: "flex-start", backgroundColor: p.inputBg }}>
          <IconFor type={event.type} size={15} color={p.textSecondary} />
        </View>
      </View>
    </Animated.View>
  );
});

// ── Empty slot (inside a section) ────────────────────────────────────

const InlineEmpty = memo(function InlineEmpty({ message }: { message: string }) {
  const p = useAdminPastel();
  return (
    <View style={{ borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 4, backgroundColor: p.inputBg }}>
      <Text style={{ fontSize: 13, color: p.textSecondary, fontFamily: "Outfit-Regular" }}>
        {message}
      </Text>
    </View>
  );
});

// ── Past section toggle ──────────────────────────────────────────────

const PastToggle = memo(function PastToggle({
  count, open, onToggle,
}: { count: number; open: boolean; onToggle: () => void }) {
  const p = useAdminPastel();
  const toggleScale = useSharedValue(1);
  const toggleAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: toggleScale.value }] }));
  const toggleTap = useMemo(() => Gesture.Tap()
    .onBegin(() => {
      'worklet';
      toggleScale.value = withSpring(0.96, { damping: 15, stiffness: 400, mass: 0.3 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onFinalize(() => {
      'worklet';
      toggleScale.value = withSpring(1, { damping: 20, stiffness: 300, mass: 0.4 });
    })
    .onEnd(() => {
      'worklet';
      runOnJS(onToggle)();
    }), [onToggle, toggleScale]);
  return (
    <GestureDetector gesture={toggleTap}>
      <Animated.View
        style={[{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, marginBottom: 4, alignSelf: "flex-start" }, toggleAnimStyle]}
        accessibilityRole="button"
      >
        <Clock size={14} color={p.textMuted} />
        <Text style={{ fontSize: 13, color: p.textMuted, fontFamily: "Outfit-Regular" }}>
          {open ? "Hide" : `Show ${count} past session${count !== 1 ? "s" : ""}`}
        </Text>
        {open
          ? <ChevronUp size={14} color={p.textMuted} />
          : <ChevronDown size={14} color={p.textMuted} />
        }
      </Animated.View>
    </GestureDetector>
  );
});

// ── Stats bar ────────────────────────────────────────────────────────

const StatsBar = memo(function StatsBar({
  upcoming, pending,
}: { upcoming: number; pending: number }) {
  const p = useAdminPastel();
  if (upcoming === 0 && pending === 0) return null;
  return (
    <View style={s.statsBar}>
      {upcoming > 0 && (
        <View style={s.statChip}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.success }} />
          <Text style={{ fontSize: 12, color: p.textSecondary, fontFamily: "Outfit-Regular" }}>
            {upcoming} upcoming
          </Text>
        </View>
      )}
      {upcoming > 0 && pending > 0 && (
        <View style={{ width: 1, height: 12, backgroundColor: p.divider }} />
      )}
      {pending > 0 && (
        <View style={s.statChip}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.warning }} />
          <Text style={{ fontSize: 12, color: p.textSecondary, fontFamily: "Outfit-Regular" }}>
            {pending} pending
          </Text>
        </View>
      )}
    </View>
  );
});

// ── Team banner ──────────────────────────────────────────────────────

const TeamBanner = memo(function TeamBanner() {
  const p = useAdminPastel();
  return (
    <View style={{
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: 20,
      marginBottom: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: p.cardMint,
    }}>
      <Users size={15} color={p.accent} />
      <Text style={{ fontSize: 13, color: p.textSecondary, fontFamily: "Outfit-Regular" }}>
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
  p: AdminPastelColors;
}

const BookButton = memo(function BookButton({
  onBook, serviceName, accentColor, textColor,
}: { onBook: () => void; serviceName: string; accentColor: string; textColor: string }) {
  const bookScale = useSharedValue(1);
  const bookAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: bookScale.value }] }));
  const bookTap = useMemo(() => Gesture.Tap()
    .onBegin(() => {
      'worklet';
      bookScale.value = withSpring(0.96, { damping: 15, stiffness: 400, mass: 0.3 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onFinalize(() => {
      'worklet';
      bookScale.value = withSpring(1, { damping: 20, stiffness: 300, mass: 0.4 });
    })
    .onEnd(() => {
      'worklet';
      runOnJS(onBook)();
    }), [onBook, bookScale]);
  return (
    <GestureDetector gesture={bookTap}>
      <Animated.View
        style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexShrink: 0, backgroundColor: accentColor }, bookAnimStyle]}
        accessibilityRole="button"
        accessibilityLabel={`Book ${serviceName}`}
      >
        <Text style={{ fontSize: 12, color: textColor, fontFamily: "Outfit-Bold" }}>Book</Text>
      </Animated.View>
    </GestureDetector>
  );
});

const ServiceCard = memo(function ServiceCard({ service, onBook, p }: ServiceCardProps) {
  const scheduleLabel = useMemo(() => formatServiceSchedule(service), [service]);
  const isRecurring = service.schedulePattern === "weekly_recurring";
  const bookable = service.isBookable !== false;

  return (
    <View style={{
      width: 220,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 18,
      padding: 14,
      marginRight: 12,
      backgroundColor: p.cardWhite,
    }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, alignSelf: "flex-start", marginTop: 4, flexShrink: 0, backgroundColor: isRecurring ? p.accent : p.success }} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontSize: 14, letterSpacing: -0.1, color: p.textPrimary, fontFamily: "Outfit-Bold" }} numberOfLines={1}>
          {service.name}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {isRecurring
            ? <Repeat size={11} color={p.accent} />
            : <Calendar size={11} color={p.success} />
          }
          <Text style={{ fontSize: 11, flex: 1, color: p.textSecondary, fontFamily: "Outfit-Regular" }}>
            {scheduleLabel}
          </Text>
        </View>
        {service.durationMinutes > 0 && (
          <Text style={{ fontSize: 11, opacity: 0.6, color: p.textSecondary, fontFamily: "Outfit-Regular" }}>
            {service.durationMinutes < 60
              ? `${service.durationMinutes}m`
              : `${Math.floor(service.durationMinutes / 60)}h${service.durationMinutes % 60 ? ` ${service.durationMinutes % 60}m` : ""}`}
          </Text>
        )}
      </View>
      {bookable && onBook ? (
        <BookButton onBook={onBook} serviceName={service.name} accentColor={p.accent} textColor={p.buttonPrimaryText} />
      ) : (
        <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, flexShrink: 0, backgroundColor: p.accentSoft }}>
          <Text style={{ fontSize: 11, color: p.textSecondary, fontFamily: "Outfit-Regular" }}>
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
  p: AdminPastelColors;
}

const ServicesPanel = memo(function ServicesPanel({ bookable, nonBookable, onBook, p }: ServicesPanelProps) {
  if (bookable.length === 0 && nonBookable.length === 0) return null;
  const all = [...bookable, ...nonBookable];
  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
      <SectionLabel icon={Store} label="Services" count={all.length} accent={p.accent} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 4 }}
      >
        {bookable.map((svc) => (
          <ServiceCard
            key={svc.id}
            service={svc}
            onBook={() => onBook(svc.id)}
            p={p}
          />
        ))}
        {nonBookable.map((svc) => (
          <ServiceCard
            key={svc.id}
            service={svc}
            p={p}
          />
        ))}
      </ScrollView>
    </View>
  );
});

// ── Main screen ──────────────────────────────────────────────────────

export default memo(function ScheduleScreen() {
  const p = useAdminPastel();
  const router = useRouter();
  const insets = useAppSafeAreaInsets();
  const toast = useAppToast();
  const token = useAppSelector((s) => s.user.token);
  const capabilities = useAppSelector((s) => s.user.capabilities);
  const managedAthletes = useAppSelector((s) => s.user.managedAthletes);
  const athleteUserId = useAppSelector((s) => s.user.athleteUserId);
  const authTeamMembership = useAppSelector((s) => s.user.authTeamMembership);
  const profile = useAppSelector((s) => s.user.profile);
  const streak = useStreakStore((ss) => ss.currentStreak);
  const firstName = profile?.name?.trim()?.split(/\s+/)[0] ?? "Athlete";
  const profilePic = profile?.avatar ?? null;
  const { width: screenWidth } = Dimensions.get("window");
  const reduceMotion = useReducedMotion();
  const { effectiveProfileId } = useActingUser();
  const canBook = capabilities?.coachBooking === true;
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

  // Invalidate stale schedule queries on tab focus so useScheduleData refetches
  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      void queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.all(effectiveProfileId),
        refetchType: "none",
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.services(effectiveProfileId),
        refetchType: "none",
      });
    }, [token, effectiveProfileId, queryClient]),
  );

  // ── Data ──────────────────────────────────────────────────────
  const { events, eventsLoading, services, servicesLoading, servicesError,
          refreshEvents, refreshServices } = useScheduleData(token, effectiveProfileId, isFocused);

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

  // ── Attendance check-in ──────────────────────────────────────
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const checkIn = useCallback(async (sessionId: string) => {
    if (!token || checkingIn) return;
    setCheckingIn(sessionId);
    try {
      const { apiRequest } = await import("@/lib/api");
      await apiRequest(`/sessions/${sessionId}/check-in`, { method: "POST", token });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refreshEvents();
    } catch {
      toast.error("Check-in failed", "Could not mark attendance. Please try again.");
    } finally {
      setCheckingIn(null);
    }
  }, [token, checkingIn, refreshEvents, toast]);

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
              toast.error("Error", "Could not cancel the request. Please try again.");
            }
          },
        },
      ],
    );
  }, [token, refreshEvents]);

  // ── FAB animation ────────────────────────────────────────────
  const fabScale = useSharedValue(1);
  const fabStyle = useAnimatedStyle(() => ({ transform: [{ scale: fabScale.value }] }));

  const openBooking = useCallback(() => {
    if (services.length === 0) refreshServices();
    setBookingServiceId(null);
    setBookingOpen(true);
  }, [services.length, refreshServices]);

  const fabTap = useMemo(() => Gesture.Tap()
    .onBegin(() => {
      'worklet';
      fabScale.value = withSpring(0.96, { damping: 15, stiffness: 400, mass: 0.3 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onFinalize(() => {
      'worklet';
      fabScale.value = withSpring(1, { damping: 20, stiffness: 300, mass: 0.4 });
    })
    .onEnd(() => {
      'worklet';
      runOnJS(openBooking)();
    }), [openBooking, fabScale]);

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
      <View style={{ flex: 1, backgroundColor: p.pageBg, paddingTop: insets.top }}>
        <SkeletonScheduleScreen />
      </View>
    );
  }

  const fabBottom = 20 + insets.bottom + 56; // 56 = TAB_HEIGHT
  const bentoGap = 10;
  const bentoHalf = (screenWidth - 40 - bentoGap) / 2;

  return (
    <View style={{ flex: 1, backgroundColor: p.pageBg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: fabBottom + (canBook ? 72 : 24),
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refreshEvents}
            tintColor={p.accent}
          />
        }
      >
        {/* ── Hero Header ── */}
        <View style={{ height: HERO_H + insets.top, overflow: "hidden" }}>
          <RNImage source={SCHEDULE_BG} style={{ position: "absolute", width: "100%", height: "100%", resizeMode: "cover" }} />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.45)", p.pageBg]}
            locations={[0.25, 0.65, 1]}
            style={{ position: "absolute", width: "100%", height: "100%" }}
          />

          <View style={{ flex: 1, paddingTop: insets.top + 12, paddingHorizontal: 20, justifyContent: "space-between" }}>
            {/* Top bar */}
            <Animated.View entering={reduceMotion ? undefined : FadeIn.delay(100).duration(400)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {profilePic ? (
                  <RNImage source={{ uri: profilePic }} style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: "rgba(255,255,255,0.2)" }} />
                ) : (
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: "#fff" }}>{firstName[0]}</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {streak > 0 && (
                  <Animated.View entering={reduceMotion ? undefined : FadeIn.delay(400).duration(400)} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 }}>
                    <Flame size={13} color="#FF9500" fill="#FF9500" />
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: "#fff" }}>{streak}</Text>
                  </Animated.View>
                )}
                <Pressable onPress={() => router.push("/qr-scan")} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
                  <ScanLine size={18} color="#fff" />
                </Pressable>
                <Pressable onPress={() => router.push("/notifications" as any)} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
                  <Bell size={18} color="#fff" />
                  <View style={{ position: "absolute", top: 8, right: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: p.accent }} />
                </Pressable>
              </View>
            </Animated.View>

            {/* Hero text */}
            <View style={{ gap: 6, paddingBottom: 20 }}>
              <Animated.Text entering={reduceMotion ? undefined : FadeInDown.delay(200).duration(500)} style={{ fontFamily: "Outfit-Regular", fontSize: 16, color: "rgba(255,255,255,0.7)" }}>
                Your
              </Animated.Text>
              <Animated.Text entering={reduceMotion ? undefined : FadeInDown.delay(300).duration(500)} style={{ fontFamily: "Outfit-Bold", fontSize: 38, color: "#fff", letterSpacing: -1.5, lineHeight: 42 }}>
                Schedule
              </Animated.Text>

              {/* Glass stat pills */}
              <Animated.View entering={reduceMotion ? undefined : FadeInRight.delay(500).duration(500).springify().damping(16)} style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <BlurView intensity={40} tint="dark" style={{ borderRadius: 100, overflow: "hidden" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8 }}>
                    <CalendarCheck size={14} color={p.accent} />
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: "#fff" }}>{upcoming.length}</Text>
                    <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>upcoming</Text>
                  </View>
                </BlurView>
                {requests.length > 0 && (
                  <BlurView intensity={40} tint="dark" style={{ borderRadius: 100, overflow: "hidden" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8 }}>
                      <CalendarClock size={14} color="#FFAB40" />
                      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: "#fff" }}>{requests.length}</Text>
                      <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>pending</Text>
                    </View>
                  </BlurView>
                )}
              </Animated.View>
            </View>
          </View>
        </View>

        {/* ── Bento Stats ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: bentoGap }}>
          <View style={{ flexDirection: "row", gap: bentoGap }}>
            <Animated.View
              entering={reduceMotion ? undefined : FadeInDown.delay(0).springify().damping(18)}
              style={{ flex: 2, backgroundColor: PASTEL_GREEN, borderRadius: 24, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: PASTEL_GREEN_SOFT, alignItems: "center", justifyContent: "center" }}>
                <CalendarCheck size={22} color={PASTEL_GREEN_TEXT} />
              </View>
              <View style={{ gap: 2 }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 26, color: PASTEL_GREEN_TEXT, letterSpacing: -0.5 }}>
                  {upcoming.length}
                </Text>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: PASTEL_GREEN_TEXT, opacity: 0.6 }}>
                  Upcoming
                </Text>
              </View>
            </Animated.View>

            <Animated.View
              entering={reduceMotion ? undefined : FadeInDown.delay(60).springify().damping(18)}
              style={{ flex: 1, backgroundColor: PASTEL_LIME, borderRadius: 24, padding: 18, alignItems: "center", justifyContent: "center", gap: 4 }}
            >
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 28, color: PASTEL_LIME_TEXT, letterSpacing: -1 }}>
                {requests.length}
              </Text>
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: PASTEL_LIME_TEXT, opacity: 0.6 }}>
                Pending
              </Text>
            </Animated.View>
          </View>

          {past.length > 0 && (
            <Animated.View
              entering={reduceMotion ? undefined : FadeInDown.delay(120).springify().damping(18)}
              style={{ backgroundColor: PASTEL_SAGE, borderRadius: 24, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: "rgba(27,94,32,0.12)", alignItems: "center", justifyContent: "center" }}>
                <History size={20} color={PASTEL_SAGE_TEXT} />
              </View>
              <View style={{ gap: 2 }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 18, color: PASTEL_SAGE_TEXT, letterSpacing: -0.3 }}>
                  {past.length} Past Sessions
                </Text>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: PASTEL_SAGE_TEXT, opacity: 0.6 }}>
                  Your training history
                </Text>
              </View>
            </Animated.View>
          )}
        </View>

        {/* ── Team banner ── */}
        {!canBook && (
          <View style={{ paddingTop: 12 }}>
            <TeamBanner />
          </View>
        )}

        {/* ── Pinned services ── */}
        {(bookableServices.length > 0 || nonBookableServices.length > 0) && (
          <View style={{ paddingTop: 12 }}>
            <ServicesPanel
              bookable={bookableServices}
              nonBookable={nonBookableServices}
              onBook={openBookingForService}
              p={p}
            />
          </View>
        )}

        {/* ── Sessions list ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>

        {/* ════ UPCOMING ════ */}
        <SectionLabel
          icon={Zap}
          label="Upcoming"
          count={upcoming.length}
          accent={p.success}
        />

        {upcomingGroups.length === 0 ? (
          <InlineEmpty
            message={canBook
              ? "No upcoming sessions — book one below."
              : "No upcoming sessions yet."}
          />
        ) : (
          upcomingGroups.map(([dateKey, group]) => {
            const groupIsToday = dateKey === todKey;
            return (
              <View key={dateKey}>
                <DateGroup dateKey={dateKey} />
                {group.map((evt, i) => {
                  const isProgram = evt.id.startsWith("program-");
                  const card = (
                    <SessionCard
                      key={evt.id}
                      event={evt}
                      index={i}
                      isToday={groupIsToday}
                      onCheckIn={groupIsToday && evt.tag === "Scheduled" && (!evt.attendanceStatus || evt.attendanceStatus === "unmarked")
                        ? () => checkIn(evt.id)
                        : undefined}
                    />
                  );
                  if (isProgram) {
                    const programId = evt.id.replace("program-", "");
                    return (
                      <Pressable key={evt.id} onPress={() => router.push(`/programs/assigned/${programId}` as any)}>
                        {card}
                      </Pressable>
                    );
                  }
                  return card;
                })}
              </View>
            );
          })
        )}

        {/* ════ REQUESTS ════ */}
        <View style={{ height: 24 }} />
        <SectionLabel
          icon={Timer}
          label="Requests"
          count={requests.length}
          accent={p.warning}
        />

        {requests.length === 0 ? (
          <InlineEmpty
            message={canBook
              ? "No pending requests."
              : "No booking requests."}
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
            <View style={{ height: 24 }} />
            <PastToggle
              count={past.length}
              open={pastOpen}
              onToggle={() => { setPastOpen((v) => !v); }}
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
        </View>
      </ScrollView>

      {/* ── FAB ── */}
      {canBook && (
        <GestureDetector gesture={fabTap}>
          <Animated.View
            style={[{ position: "absolute", left: 20, right: 20, bottom: fabBottom }, fabStyle]}
            accessibilityLabel="Book a session"
            accessibilityRole="button"
          >
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              height: 56,
              borderRadius: 100,
              backgroundColor: p.accent,
              shadowColor: p.shadow,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18,
              shadowRadius: 12,
              elevation: 6,
            }}>
              <Plus size={22} color={p.buttonPrimaryText} />
              <Text style={{ fontSize: 16, color: p.buttonPrimaryText, letterSpacing: -0.1, fontFamily: "Outfit-Bold" }}>
                Book a Session
              </Text>
            </View>
          </Animated.View>
        </GestureDetector>
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

// ── Styles (minimal - only layout helpers that don't reference colors) ──

const s = StyleSheet.create({
  sectionLabel: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, marginBottom: 12 },
  dateGroup:    { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, marginTop: 4 },
  statsBar:     { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 6 },
  statChip:     { flexDirection: "row", alignItems: "center", gap: 5 },
});
