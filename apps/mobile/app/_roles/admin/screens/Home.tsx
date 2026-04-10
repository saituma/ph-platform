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
import { Modal, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";

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
  topAthletes: { name: string; team: string | null; tier: string; score: string }[];
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
  | { kind: "booking"; name: string; athlete: string; time: string; type: string }
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
        setError(e instanceof Error ? e.message : "Failed to load admin dashboard");
      } finally {
        setLoading(false);
        setHasLoadedOnce(true);
      }
    },
    [bootstrapReady, token]
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
    [data]
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
      <ThemedScrollView onRefresh={() => load(true)} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Header Region */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} className="pt-6 mb-6 flex-row items-center justify-between px-4">
          <View className="flex-row items-center gap-3 flex-1 mb-2">
            <View className="h-8 w-1.5 rounded-full bg-accent" />
            <Text className="text-4xl font-telma-bold text-app tracking-tight">Admin Overview</Text>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)} className="mb-6 px-4">
          <View className="flex-row gap-3 mb-3">
            <ActionButton icon="users" label="Users" color="bg-accent" onPress={() => requestGlobalTabChange(3)} />
            <ActionButton icon="video" label="Videos" color="bg-accent" onPress={() => requestGlobalTabChange(2)} />
            <ActionButton icon="shield" label="Teams" color="bg-accent" onPress={() => router.push("/admin-teams")} />
          </View>
          <View className="flex-row gap-3">
            <ActionButton icon="layers" label="Content" color="bg-accent" onPress={() => requestGlobalTabChange(5)} />
            <ActionButton icon="calendar" label="Schedule" color="bg-accent" onPress={() => { requestGlobalTabChange(6); requestAdminOps({ section: "bookings" }); }} />
            <ActionButton icon="settings" label="Ops" color="bg-accent" onPress={() => { requestGlobalTabChange(6); requestAdminOps({ section: "services" }); }} />
          </View>
        </Animated.View>

        <View className="px-4 gap-5">
          {/* Daily KPIs */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)} className="rounded-[28px] border p-5" style={CardStyle}>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-[14px] font-outfit-semibold uppercase tracking-widest text-[#10B981]">Today's KPI</Text>
              {loading && !data && <Skeleton width={40} height={12} />}
            </View>

            {error ? (
              <Text className="text-sm font-outfit text-red-500">{error}</Text>
            ) : (
              <View className="flex-row flex-wrap gap-3">
                {kpis.map((item, index) => (
                  <AnimatedPressable
                    entering={ZoomIn.delay(200 + index * 50)}
                    key={item.label}
                    onPress={() => setDetail({ kind: "stat", label: item.label, value: String(item.value ?? "—") })}
                    className="rounded-2xl border px-4 py-3 flex-1 min-w-[45%]"
                    style={InnerCardStyle}
                  >
                    <Text className="text-[11px] font-outfit text-secondary tracking-wider uppercase mb-1">{item.label}</Text>
                    <Text className="text-3xl font-clash font-bold text-app" style={{ fontVariant: ["tabular-nums"] }}>
                      {item.value ?? "—"}
                    </Text>
                  </AnimatedPressable>
                ))}
              </View>
            )}
          </Animated.View>

          {/* Bookings Today List */}
          <Animated.View entering={FadeInDown.delay(250).duration(400)} className="rounded-[28px] border p-5" style={CardStyle}>
            <Text className="text-[14px] font-outfit-semibold uppercase tracking-widest text-app mb-4">Live Schedule</Text>
            {loading && !data ? (
              <View className="gap-3"><Skeleton width="100%" height={50} /><Skeleton width="100%" height={50} /></View>
            ) : bookings.length === 0 ? (
              <Text className="text-sm font-outfit text-secondary">No sessions scheduled for today.</Text>
            ) : (
              <View className="gap-3">
                {bookings.map((booking, idx) => (
                  <Pressable
                    key={booking.id}
                    onPress={() => setDetail({ kind: "booking", name: booking.serviceName, athlete: booking.athleteName, time: booking.startsAt, type: booking.type })}
                    className="flex-row items-center justify-between rounded-2xl border p-4"
                    style={InnerCardStyle}
                  >
                    <View className="flex-1 right-2">
                       <Text className="text-[11px] font-outfit-semibold uppercase tracking-widest text-accent mb-1" numberOfLines={1}>{booking.type?.replace("_", " ")}</Text>
                       <Text className="text-sm font-clash font-bold text-app" numberOfLines={1}>{booking.athleteName}</Text>
                    </View>
                    <View className="items-end bg-accent/10 px-3 py-1.5 rounded-full">
                       <Text className="text-[12px] font-outfit-semibold text-accent">
                         {new Date(booking.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                       </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </Animated.View>

          {/* Priority Queue */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)} className="rounded-[28px] border p-5" style={CardStyle}>
            <Text className="text-[14px] font-outfit-semibold uppercase tracking-widest text-[#F59E0B] mb-4">Priority Actions</Text>
            {(data?.priorityQueue?.length ?? 0) === 0 ? (
              <Text className="text-sm font-outfit text-secondary">Inbox zero. All caught up.</Text>
            ) : (
              <View className="gap-3">
                {data?.priorityQueue.map((item, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => setDetail({ kind: "priority", title: item.title, detail: item.detail, status: item.status })}
                    className="rounded-2xl border p-4"
                    style={InnerCardStyle}
                  >
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="text-[13px] font-clash font-bold text-app">{item.title}</Text>
                      {item.status && <Text className="text-[10px] font-outfit text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">{item.status}</Text>}
                    </View>
                    <Text className="text-[12px] font-outfit text-secondary mt-1">{item.detail}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Animated.View>

          {/* Top Athletes */}
          <Animated.View entering={FadeInDown.delay(350).duration(400)} className="rounded-[28px] border p-5" style={CardStyle}>
            <Text className="text-[14px] font-outfit-semibold uppercase tracking-widest text-app mb-4">Top Engagement</Text>
            {athletes.length === 0 ? (
              <Text className="text-sm font-outfit text-secondary">No athletes indexed.</Text>
            ) : (
              <View className="gap-3">
                {athletes.map((athlete, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => setDetail({ kind: "athlete", name: athlete.name, score: athlete.score, tier: athlete.tier })}
                    className="flex-row items-center justify-between rounded-2xl border p-3 pl-4"
                    style={InnerCardStyle}
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="w-6 h-6 rounded-full bg-accent/20 items-center justify-center">
                        <Text className="text-[10px] font-outfit-bold text-accent">{idx + 1}</Text>
                      </View>
                      <View>
                        <Text className="text-[13px] font-clash font-bold text-app">{athlete.name}</Text>
                        <Text className="text-[11px] font-outfit text-secondary">{athlete.tier.replace("PHP_", "Tier ")}</Text>
                      </View>
                    </View>
                    <Text className="text-[12px] font-outfit-semibold text-app">{athlete.score}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Animated.View>

        </View>

        <Modal visible={detail != null} animationType="slide" presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"} onRequestClose={() => setDetail(null)}>
          <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: isDark ? colors.background : "#FFFFFF" }}>
            <ThemedScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 + insets.bottom }}>
              <View className="pt-4 mb-6 flex-row items-center justify-between">
                <Text className="text-2xl font-clash font-bold text-app flex-1 pr-3" numberOfLines={1}>
                  {detail?.kind === "stat" ? detail.label : detail?.kind === "booking" ? detail.name : detail?.kind === "athlete" ? detail.name : detail?.title}
                </Text>
                <Pressable
                  onPress={() => setDetail(null)}
                  style={({ pressed }) => [{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, opacity: pressed ? 0.7 : 1, ...InnerCardStyle }]}
                >
                  <Text className="text-[12px] font-outfit-semibold text-app">Close</Text>
                </Pressable>
              </View>
              <View className="rounded-[28px] border p-6" style={CardStyle}>
                {detail?.kind === "stat" ? (
                  <Text className="text-5xl font-clash font-bold text-app tabular-nums">{detail.value}</Text>
                ) : detail?.kind === "booking" ? (
                  <View className="gap-2">
                    <Text className="text-sm font-outfit text-secondary">Athlete: <Text className="text-app font-bold">{detail.athlete}</Text></Text>
                    <Text className="text-sm font-outfit text-secondary">Time: <Text className="text-app font-bold">{new Date(detail.time).toLocaleString()}</Text></Text>
                    <Text className="text-sm font-outfit text-secondary">Type: <Text className="text-app font-bold">{detail.type}</Text></Text>
                  </View>
                ) : detail?.kind === "athlete" ? (
                  <View className="gap-2">
                    <Text className="text-sm font-outfit text-secondary">Engagement: <Text className="text-app font-bold">{detail.score}</Text></Text>
                    <Text className="text-sm font-outfit text-secondary">Program Tier: <Text className="text-app font-bold">{detail.tier}</Text></Text>
                  </View>
                ) : detail?.kind === "priority" ? (
                  <View className="gap-3">
                    <Text className="text-sm font-outfit text-secondary leading-6">{detail.detail || "No additional context."}</Text>
                    {detail.status && <Text className="text-xs font-outfit-semibold text-[#F59E0B] uppercase tracking-widest">{detail.status}</Text>}
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
