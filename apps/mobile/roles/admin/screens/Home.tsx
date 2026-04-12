import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { ActionButton } from "@/components/dashboard/ActionButton";
import { Skeleton } from "@/components/Skeleton";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/api";
import { requestGlobalTabChange } from "@/context/ActiveTabContext";
import { requestAdminOps } from "@/context/AdminOpsContext";
import { useAppSelector } from "@/store/hooks";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from "react-native-reanimated";

type AdminDashboard = {
  kpis: {
    totalAthletes: number;
    premiumClients: number;
    unreadMessages: number;
    bookingsToday: number;
  };
  bookingsToday: {
    id: number;
    startsAt: string;
    type: string;
    serviceName: string;
    athleteName: string;
  }[];
  priorityQueue: { title: string; detail: string; status: string }[];
  topAthletes: {
    name: string;
    team: string | null;
    tier: string;
    score: string;
  }[];
  tierDistribution: {
    program: number;
    premium: number;
    premiumPlus: number;
    pro: number;
    total: number;
  };
  weeklyVolume: {
    totals: { messages: number; bookings: number; uploads: number };
    bars: number[];
    labels: string[];
  };
  trends: {
    trainingLoad: number;
    messagingResponseRate: number;
    bookingsUtilization: number;
  };
  highlights: { label: string; value: number; detail: string }[];
};

type HomeDetail =
  | { kind: "stat"; label: string; value: string }
  | { kind: "priority"; title: string; detail: string; status?: string }
  | {
      kind: "booking";
      name: string;
      athlete: string;
      time: string;
      type: string;
    }
  | { kind: "athlete"; name: string; score: string; tier: string };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function AdminHomeScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const canLoad = Boolean(token && bootstrapReady);

  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [detail, setDetail] = useState<HomeDetail | null>(null);

  const load = useCallback(
    async (forceRefresh: boolean) => {
      if (!token || !bootstrapReady) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<AdminDashboard>("/admin/dashboard", {
          token,
          suppressStatusCodes: [403],
          skipCache: forceRefresh,
          forceRefresh,
        });
        setData(res ?? null);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to load admin dashboard",
        );
      } finally {
        setLoading(false);
        setHasLoadedOnce(true);
      }
    },
    [bootstrapReady, token],
  );

  useEffect(() => {
    if (!canLoad) return;
    void load(false);
  }, [canLoad, load]);

  const kpis = useMemo(
    () => [
      { label: "Athletes", value: data?.kpis?.totalAthletes ?? null },
      { label: "Premium", value: data?.kpis?.premiumClients ?? null },
      { label: "Unread", value: data?.kpis?.unreadMessages ?? null },
      { label: "Bookings", value: data?.kpis?.bookingsToday ?? null },
    ],
    [data],
  );

  const bookings = useMemo(() => data?.bookingsToday ?? [], [data]);
  const athletes = useMemo(() => data?.topAthletes?.slice(0, 5) ?? [], [data]);

  const CardStyle = {
    backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
    ...(isDark ? Shadows.none : Shadows.md),
  };

  const InnerCardStyle = {
    backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
    borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ThemedScrollView
        onRefresh={() => load(true)}
        contentContainerStyle={{ paddingBottom: 56 }}
      >
        {/* Header Region */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          className="pt-10 mb-8 px-6"
        >
          <View className="flex-row items-center gap-3 mb-2">
            <View className="h-8 w-1.5 rounded-full bg-accent" />
            <Text className="text-5xl font-telma-bold text-app tracking-tight">
              Admin
            </Text>
          </View>
          <Text className="text-base font-outfit text-secondary leading-relaxed">
            Monitor engagement, manage bookings, and broadcast updates.
          </Text>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(400)}
          className="mb-10 px-6"
        >
          <Text className="text-[11px] font-outfit-bold font-bold uppercase tracking-[1.5px] text-dim mb-4 ml-1">
            Command Center
          </Text>
          <View className="flex-row gap-4 mb-4">
            <ActionButton
              icon="users"
              label="Users"
              color="bg-accent"
              onPress={() => requestGlobalTabChange(3)}
            />
            <ActionButton
              icon="video"
              label="Videos"
              color="bg-accent"
              onPress={() => requestGlobalTabChange(2)}
            />
            <ActionButton
              icon="shield"
              label="Teams"
              color="bg-accent"
              onPress={() => router.push("/admin-teams")}
            />
          </View>
          <View className="flex-row gap-4">
            <ActionButton
              icon="layers"
              label="Content"
              color="bg-accent"
              onPress={() => requestGlobalTabChange(5)}
            />
            <ActionButton
              icon="calendar"
              label="Schedule"
              color="bg-accent"
              onPress={() => {
                requestGlobalTabChange(6);
                requestAdminOps({ section: "bookings" });
              }}
            />
            <ActionButton
              icon="settings"
              label="Ops"
              color="bg-accent"
              onPress={() => {
                requestGlobalTabChange(6);
                requestAdminOps({ section: "services" });
              }}
            />
          </View>
          <View className="flex-row gap-4 mt-4">
            <ActionButton
              icon="clipboard"
              label="Nutrition"
              color="bg-accent"
              onPress={() => router.push("/admin-nutrition")}
            />
            <View className="flex-1" />
            <View className="flex-1" />
          </View>
        </Animated.View>

        <View className="px-6 gap-6">
          {/* Daily KPIs */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(400)}
            className="rounded-[32px] border p-6"
            style={CardStyle}
          >
            <View className="flex-row justify-between items-center mb-6">
              <View className="flex-row items-center gap-2">
                <View className="w-2 h-2 rounded-full bg-accent" />
                <Text className="text-[13px] font-outfit-bold font-bold uppercase tracking-widest text-app">
                  Performance KPI
                </Text>
              </View>
              {loading && !data && (
                <ActivityIndicator size="small" color={colors.accent} />
              )}
            </View>

            {error ? (
              <Text className="text-sm font-outfit text-red-500">{error}</Text>
            ) : (
              <View className="flex-row flex-wrap gap-4">
                {kpis.map((item, index) => (
                  <AnimatedPressable
                    entering={ZoomIn.delay(200 + index * 50)}
                    key={item.label}
                    onPress={() =>
                      setDetail({
                        kind: "stat",
                        label: item.label,
                        value: String(item.value ?? "—"),
                      })
                    }
                    className="rounded-[24px] border px-5 py-4 flex-1 min-w-[42%]"
                    style={InnerCardStyle}
                  >
                    <Text className="text-[11px] font-outfit-bold font-bold text-secondary tracking-widest uppercase mb-1.5">
                      {item.label}
                    </Text>
                    <Text
                      className="text-3xl font-clash-bold font-bold text-app"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {item.value ?? "—"}
                    </Text>
                  </AnimatedPressable>
                ))}
              </View>
            )}
          </Animated.View>

          {/* Bookings Today List */}
          <Animated.View
            entering={FadeInDown.delay(250).duration(400)}
            className="rounded-[32px] border p-6"
            style={CardStyle}
          >
            <View className="flex-row items-center gap-2 mb-6">
              <View className="w-2 h-2 rounded-full bg-accent" />
              <Text className="text-[13px] font-outfit-bold font-bold uppercase tracking-widest text-app">
                Live Schedule
              </Text>
            </View>
            {loading && !data ? (
              <View className="gap-4">
                <Skeleton width="100%" height={60} />
                <Skeleton width="100%" height={60} />
              </View>
            ) : bookings.length === 0 ? (
              <View className="py-4 items-center justify-center">
                <Text className="text-sm font-outfit text-dim">
                  No sessions scheduled for today.
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {bookings.map((booking, idx) => (
                  <Pressable
                    key={booking.id}
                    onPress={() =>
                      setDetail({
                        kind: "booking",
                        name: booking.serviceName,
                        athlete: booking.athleteName,
                        time: booking.startsAt,
                        type: booking.type,
                      })
                    }
                    className="flex-row items-center justify-between rounded-[22px] border p-4 active:opacity-80"
                    style={InnerCardStyle}
                  >
                    <View className="flex-1">
                      <Text
                        className="text-[10px] font-outfit-bold font-bold uppercase tracking-widest text-accent mb-1.5"
                        numberOfLines={1}
                      >
                        {booking.type?.replace("_", " ")}
                      </Text>
                      <Text
                        className="text-base font-clash-bold font-bold text-app"
                        numberOfLines={1}
                      >
                        {booking.athleteName}
                      </Text>
                    </View>
                    <View className="bg-accent/10 px-4 py-2 rounded-full border border-accent/20">
                      <Text className="text-[13px] font-outfit-bold font-bold text-accent">
                        {new Date(booking.startsAt).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </Animated.View>

          {/* Priority Queue */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(400)}
            className="rounded-[32px] border p-6"
            style={CardStyle}
          >
            <View className="flex-row items-center gap-2 mb-6">
              <View className="w-2 h-2 rounded-full bg-amber-500" />
              <Text className="text-[13px] font-outfit-bold font-bold uppercase tracking-widest text-app">
                Priority Actions
              </Text>
            </View>
            {(data?.priorityQueue?.length ?? 0) === 0 ? (
              <View className="py-4 items-center justify-center">
                <Text className="text-sm font-outfit text-dim">
                  Inbox zero. All caught up.
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {data?.priorityQueue.map((item, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() =>
                      setDetail({
                        kind: "priority",
                        title: item.title,
                        detail: item.detail,
                        status: item.status,
                      })
                    }
                    className="rounded-[22px] border p-5 active:opacity-80"
                    style={InnerCardStyle}
                  >
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-base font-clash-bold font-bold text-app">
                        {item.title}
                      </Text>
                      {item.status && (
                        <View className="bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                          <Text className="text-[10px] font-outfit-bold font-bold text-amber-500 uppercase tracking-wider">
                            {item.status}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-[13px] font-outfit text-secondary leading-5">
                      {item.detail}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Animated.View>

          {/* Top Athletes */}
          <Animated.View
            entering={FadeInDown.delay(350).duration(400)}
            className="rounded-[32px] border p-6"
            style={CardStyle}
          >
            <View className="flex-row items-center gap-2 mb-6">
              <View className="w-2 h-2 rounded-full bg-accent" />
              <Text className="text-[13px] font-outfit-bold font-bold uppercase tracking-widest text-app">
                Top Engagement
              </Text>
            </View>
            {athletes.length === 0 ? (
              <View className="py-4 items-center justify-center">
                <Text className="text-sm font-outfit text-dim">
                  No athletes indexed.
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {athletes.map((athlete, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() =>
                      setDetail({
                        kind: "athlete",
                        name: athlete.name,
                        score: athlete.score,
                        tier: athlete.tier,
                      })
                    }
                    className="flex-row items-center justify-between rounded-[22px] border p-4 active:opacity-80"
                    style={InnerCardStyle}
                  >
                    <View className="flex-row items-center gap-4">
                      <View className="w-8 h-8 rounded-xl bg-accent/15 items-center justify-center border border-accent/20">
                        <Text className="text-[12px] font-outfit-bold font-bold text-accent">
                          {idx + 1}
                        </Text>
                      </View>
                      <View>
                        <Text className="text-[15px] font-clash-bold font-bold text-app">
                          {athlete.name}
                        </Text>
                        <Text className="text-[12px] font-outfit text-secondary mt-0.5">
                          {athlete.tier.replace("PHP_", "Tier ")}
                        </Text>
                      </View>
                    </View>
                    <View className="bg-background-secondary px-3 py-1 rounded-lg">
                      <Text className="text-[13px] font-outfit-bold font-bold text-app">
                        {athlete.score}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </Animated.View>
        </View>

        <Modal
          visible={detail != null}
          animationType="slide"
          presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
          onRequestClose={() => setDetail(null)}
        >
          <View
            style={{
              flex: 1,
              paddingTop: insets.top,
              backgroundColor: isDark ? colors.background : "#FFFFFF",
            }}
          >
            <ThemedScrollView
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: 24 + insets.bottom,
              }}
            >
              <View className="pt-4 mb-6 flex-row items-center justify-between">
                <Text
                  className="text-2xl font-clash font-bold text-app flex-1 pr-3"
                  numberOfLines={1}
                >
                  {detail?.kind === "stat"
                    ? detail.label
                    : detail?.kind === "booking"
                      ? detail.name
                      : detail?.kind === "athlete"
                        ? detail.name
                        : detail?.title}
                </Text>
                <Pressable
                  onPress={() => setDetail(null)}
                  style={({ pressed }) => [
                    {
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                      borderWidth: 1,
                      opacity: pressed ? 0.7 : 1,
                      ...InnerCardStyle,
                    },
                  ]}
                >
                  <Text className="text-[12px] font-outfit-semibold text-app">
                    Close
                  </Text>
                </Pressable>
              </View>
              <View className="rounded-[28px] border p-6" style={CardStyle}>
                {detail?.kind === "stat" ? (
                  <Text className="text-5xl font-clash font-bold text-app tabular-nums">
                    {detail.value}
                  </Text>
                ) : detail?.kind === "booking" ? (
                  <View className="gap-2">
                    <Text className="text-sm font-outfit text-secondary">
                      Athlete:{" "}
                      <Text className="text-app font-bold">
                        {detail.athlete}
                      </Text>
                    </Text>
                    <Text className="text-sm font-outfit text-secondary">
                      Time:{" "}
                      <Text className="text-app font-bold">
                        {new Date(detail.time).toLocaleString()}
                      </Text>
                    </Text>
                    <Text className="text-sm font-outfit text-secondary">
                      Type:{" "}
                      <Text className="text-app font-bold">{detail.type}</Text>
                    </Text>
                  </View>
                ) : detail?.kind === "athlete" ? (
                  <View className="gap-2">
                    <Text className="text-sm font-outfit text-secondary">
                      Engagement:{" "}
                      <Text className="text-app font-bold">{detail.score}</Text>
                    </Text>
                    <Text className="text-sm font-outfit text-secondary">
                      Program Tier:{" "}
                      <Text className="text-app font-bold">{detail.tier}</Text>
                    </Text>
                  </View>
                ) : detail?.kind === "priority" ? (
                  <View className="gap-3">
                    <Text className="text-sm font-outfit text-secondary leading-6">
                      {detail.detail || "No additional context."}
                    </Text>
                    {detail.status && (
                      <Text className="text-xs font-outfit-semibold text-[#F59E0B] uppercase tracking-widest">
                        {detail.status}
                      </Text>
                    )}
                  </View>
                ) : null}
              </View>
            </ThemedScrollView>
          </View>
        </Modal>
      </ThemedScrollView>
    </View>
  );
}
