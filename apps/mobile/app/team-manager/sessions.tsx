import React, { useCallback, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  ChevronLeft,
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  Dumbbell,
  Phone,
  Heart,
  CalendarCheck,
} from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
import { ReplaceOnce } from "@/components/navigation/ReplaceOnce";
import { useScheduleData } from "@/components/tracking/schedule/hooks";
import { useActingUser } from "@/hooks/useActingUser";
import type { ScheduleEvent } from "@/components/tracking/schedule/types";
import { formatDateKey } from "@/components/tracking/schedule/utils";

function todayKey() {
  return formatDateKey(new Date());
}

function tomorrowKey() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatDateKey(d);
}

function relativeDate(dateKey: string): string {
  const tk = todayKey();
  const tmk = tomorrowKey();
  if (dateKey === tk) return "Today";
  if (dateKey === tmk) return "Tomorrow";
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function statusColor(status: string | undefined, p: ReturnType<typeof useAdminPastel>) {
  switch (status?.toLowerCase()) {
    case "confirmed":
      return p.success;
    case "pending":
      return p.warning;
    case "declined":
    case "cancelled":
      return p.textMuted;
    default:
      return p.accent;
  }
}

function statusLabel(status?: string) {
  switch (status?.toLowerCase()) {
    case "confirmed":
      return "Confirmed";
    case "pending":
      return "Pending";
    case "declined":
      return "Declined";
    case "cancelled":
      return "Cancelled";
    default:
      return status ?? "Scheduled";
  }
}

export default function TeamSessionsScreen() {
  const p = useAdminPastel();
  const insets = useAppSafeAreaInsets();
  const { token, appRole } = useAppSelector((s) => s.user);
  const { profileId } = useActingUser();
  const [refreshing, setRefreshing] = useState(false);

  if (appRole !== "team_manager") {
    return <ReplaceOnce href="/(tabs)" />;
  }

  const { events, eventsLoading, refreshEvents } = useScheduleData(
    token,
    profileId,
    true,
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshEvents();
    setRefreshing(false);
  }, [refreshEvents]);

  useFocusEffect(
    useCallback(() => {
      refreshEvents();
    }, [refreshEvents]),
  );

  const grouped = useMemo(() => {
    const today = todayKey();
    const upcoming = events
      .filter((e) => e.dateKey >= today)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

    const past = events
      .filter((e) => e.dateKey < today)
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
      .slice(0, 20);

    const byDate = new Map<string, ScheduleEvent[]>();
    for (const e of upcoming) {
      const arr = byDate.get(e.dateKey) ?? [];
      arr.push(e);
      byDate.set(e.dateKey, arr);
    }

    return {
      upcomingDates: Array.from(byDate.entries()),
      past,
      totalUpcoming: upcoming.length,
      totalPast: past.length,
    };
  }, [events]);

  const [showPast, setShowPast] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: p.pageBg }}>
      {/* Nav bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingBottom: 12,
          paddingTop: insets.top + 10,
          backgroundColor: p.pageBg,
          borderBottomWidth: 1,
          borderBottomColor: p.divider,
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 38,
            height: 38,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? p.accentSoft : p.cardWhite,
          })}
        >
          <ChevronLeft size={19} color={p.textSecondary} />
        </Pressable>
        <Text
          style={{
            flex: 1,
            fontSize: 17,
            fontFamily: "Outfit-Bold",
            letterSpacing: -0.2,
            color: p.textPrimary,
          }}
        >
          Sessions & Events
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={p.accent}
            colors={[p.accent]}
          />
        }
      >
        {/* Stats row */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
          <StatBadge
            icon={CalendarCheck}
            value={grouped.totalUpcoming}
            label="Upcoming"
            accent={p.accent}
          />
          <StatBadge
            icon={Calendar}
            value={events.length}
            label="Total"
            accent={p.info}
          />
        </View>

        {eventsLoading && events.length === 0 ? (
          <LoadingPlaceholder />
        ) : grouped.upcomingDates.length === 0 && grouped.totalPast === 0 ? (
          <EmptyState />
        ) : (
          <Animated.View entering={FadeInDown.duration(280)} style={{ gap: 20 }}>
            {/* Upcoming sessions grouped by date */}
            {grouped.upcomingDates.map(([dateKey, dayEvents], idx) => (
              <View key={dateKey}>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Outfit-Bold",
                    color: dateKey === todayKey() ? p.accent : p.textSecondary,
                    marginBottom: 10,
                    paddingLeft: 2,
                  }}
                >
                  {relativeDate(dateKey)}
                </Text>
                <View style={{ gap: 10 }}>
                  {dayEvents.map((event) => (
                    <SessionCard key={event.id} event={event} />
                  ))}
                </View>
              </View>
            ))}

            {/* Past sessions */}
            {grouped.totalPast > 0 && (
              <View>
                <Pressable
                  onPress={() => setShowPast((v) => !v)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 10,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "Outfit-Bold",
                      color: p.textMuted,
                      paddingLeft: 2,
                    }}
                  >
                    Past Sessions ({grouped.totalPast})
                  </Text>
                </Pressable>
                {showPast && (
                  <View style={{ gap: 10 }}>
                    {grouped.past.map((event) => (
                      <SessionCard key={event.id} event={event} isPast />
                    ))}
                  </View>
                )}
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

function SessionCard({ event, isPast }: { event: ScheduleEvent; isPast?: boolean }) {
  const p = useAdminPastel();
  const color = statusColor(event.status, p);

  return (
    <View
      style={{
        borderRadius: 18,
        backgroundColor: p.cardWhite,
        padding: 16,
        opacity: isPast ? 0.6 : 1,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: `${color}18`,
          }}
        >
          {event.type === "call" ? (
            <Phone size={18} color={color} />
          ) : event.type === "recovery" ? (
            <Heart size={18} color={color} />
          ) : (
            <Dumbbell size={18} color={color} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 15,
              fontFamily: "Outfit-Bold",
              color: p.textPrimary,
              marginBottom: 2,
            }}
          >
            {event.title}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Clock size={11} color={p.textMuted} />
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Outfit-Regular",
                  color: p.textSecondary,
                }}
              >
                {event.timeStart}
                {event.timeEnd ? ` - ${event.timeEnd}` : ""}
              </Text>
            </View>
            {event.location ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <MapPin size={11} color={p.textMuted} />
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 12,
                    fontFamily: "Outfit-Regular",
                    color: p.textSecondary,
                    maxWidth: 140,
                  }}
                >
                  {event.location}
                </Text>
              </View>
            ) : null}
            {event.meetingLink ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Video size={11} color={p.info} />
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Outfit-Regular",
                    color: p.info,
                  }}
                >
                  Online
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        {event.status && (
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 100,
              backgroundColor: `${color}18`,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontFamily: "Outfit-Bold",
                color,
              }}
            >
              {statusLabel(event.status)}
            </Text>
          </View>
        )}
      </View>
      {event.athlete ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            marginTop: 10,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: p.divider,
          }}
        >
          <Users size={12} color={p.textMuted} />
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Outfit-Regular",
              color: p.textSecondary,
            }}
          >
            {event.athlete}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function StatBadge({
  icon: Icon,
  value,
  label,
  accent,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  value: number;
  label: string;
  accent: string;
}) {
  const p = useAdminPastel();
  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        borderRadius: 16,
        backgroundColor: p.cardWhite,
        padding: 14,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: `${accent}18`,
        }}
      >
        <Icon size={18} color={accent} />
      </View>
      <View>
        <Text style={{ fontSize: 20, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
          {value}
        </Text>
        <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: p.textMuted }}>
          {label}
        </Text>
      </View>
    </View>
  );
}

function EmptyState() {
  const p = useAdminPastel();
  return (
    <View
      style={{
        borderRadius: 22,
        backgroundColor: p.cardSage,
        padding: 32,
        alignItems: "center",
        gap: 10,
      }}
    >
      <Calendar size={36} color={p.textMuted} />
      <Text
        style={{
          fontSize: 16,
          fontFamily: "Outfit-Bold",
          color: p.textPrimary,
          textAlign: "center",
        }}
      >
        No sessions yet
      </Text>
      <Text
        style={{
          fontSize: 13,
          fontFamily: "Outfit-Regular",
          color: p.textSecondary,
          textAlign: "center",
          lineHeight: 20,
        }}
      >
        Sessions booked by you or your athletes will appear here.
      </Text>
    </View>
  );
}

function LoadingPlaceholder() {
  const p = useAdminPastel();
  return (
    <View style={{ gap: 12 }}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            borderRadius: 18,
            backgroundColor: p.cardWhite,
            height: 80,
            opacity: 0.5,
          }}
        />
      ))}
    </View>
  );
}
