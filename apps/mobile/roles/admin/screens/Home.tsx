import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { ActionButton } from "@/components/dashboard/ActionButton";
import { Skeleton } from "@/components/Skeleton";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { apiRequest } from "@/lib/api";
import { requestGlobalTabChange } from "@/context/ActiveTabContext";
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
    ZoomIn,
} from "react-native-reanimated";
import { AdminCard } from "../components/AdminCard";
import { ADMIN_TAB_ROUTES } from "../tabs";

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
    priorityQueue: { title: string; detail: string; status: string; }[];
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
        totals: { messages: number; bookings: number; uploads: number; };
        bars: number[];
        labels: string[];
    };
    trends: {
        trainingLoad: number;
        messagingResponseRate: number;
        bookingsUtilization: number;
    };
    highlights: { label: string; value: number; detail: string; }[];
};

type HomeDetail =
    | { kind: "stat"; label: string; value: string; }
    | { kind: "priority"; title: string; detail: string; status?: string; }
    | {
        kind: "booking";
        name: string;
        athlete: string;
        time: string;
        type: string;
    }
    | { kind: "athlete"; name: string; score: string; tier: string; };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function formatTierLabel(raw: string) {
    const trimmed = String(raw ?? "").trim();
    if (!trimmed) return "—";
    if (trimmed === "PHP") return "PHP";
    if (trimmed.startsWith("PHP_")) return trimmed.replaceAll("_", " ");
    return trimmed;
}

function chunk<T>(items: T[], size: number) {
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        result.push(items.slice(i, i + size));
    }
    return result;
}

export default function AdminHomeScreen() {
    const { colors } = useAppTheme();
    const insets = useSafeAreaInsets();
    const token = useAppSelector((state) => state.user.token);
    const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
    const canLoad = Boolean(token && bootstrapReady);

    const [data, setData] = useState<AdminDashboard | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [detail, setDetail] = useState<HomeDetail | null>(null);

    const requestAdminTab = useCallback((key: (typeof ADMIN_TAB_ROUTES)[number]["key"]) => {
        const index = ADMIN_TAB_ROUTES.findIndex((tab) => tab.key === key);
        if (index < 0) return;
        requestGlobalTabChange(index);
    }, []);

    const loadDashboard = useCallback(
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
            }
        },
        [bootstrapReady, token],
    );

    useEffect(() => {
        if (!canLoad) return;
        void loadDashboard(false);
    }, [canLoad, loadDashboard]);

    const kpis = useMemo(
        () => [
            { label: "Athletes", value: data?.kpis?.totalAthletes ?? null },
            { label: "Premium", value: data?.kpis?.premiumClients ?? null },
            { label: "Unread", value: data?.kpis?.unreadMessages ?? null },
            { label: "Bookings", value: data?.kpis?.bookingsToday ?? null },
        ],
        [data],
    );

    const commandActions = useMemo(
        () => [
            { id: "users", icon: "users", label: "Users", onPress: () => requestAdminTab("admin-users") },
            { id: "video", icon: "video", label: "Videos", onPress: () => requestAdminTab("admin-videos") },
            { id: "content", icon: "layers", label: "Content", onPress: () => requestAdminTab("admin-content") },
            { id: "schedule", icon: "calendar", label: "Schedule", onPress: () => router.push("/admin/ops/schedule") },
            { id: "ops", icon: "settings", label: "Ops", onPress: () => requestAdminTab("admin-ops") },
            { id: "nutrition", icon: "clipboard", label: "Nutrition", onPress: () => router.push("/admin/ops/nutrition") },
            { id: "referrals", icon: "activity", label: "Referrals", onPress: () => router.push("/admin/ops/referrals") },
        ],
        [requestAdminTab]
    );

    const bookings = useMemo(() => data?.bookingsToday ?? [], [data]);
    const athletes = useMemo(() => data?.topAthletes?.slice(0, 5) ?? [], [data]);

    return (
        <View style={{ flex: 1, paddingTop: insets.top }}>
            <ThemedScrollView
                onRefresh={() => loadDashboard(true)}
                contentContainerStyle={{ paddingBottom: 56 + insets.bottom }}
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
                </Animated.View>

                <Animated.View
                    entering={FadeInDown.delay(150).duration(400)}
                    className="mb-6 px-6"
                >
                    <AdminCard>
                        <View className="flex-row flex-wrap" style={{ marginHorizontal: -8, marginBottom: -16 }}>
                            {commandActions.map((action) => (
                                <View
                                    key={action.id}
                                    style={{ width: '33.33%', paddingHorizontal: 8, paddingBottom: 16 }}
                                >
                                    <ActionButton
                                        icon={action.icon as any} // Adjust casting if ActionButton expects a specific union type
                                        label={action.label}
                                        color="bg-accent"
                                        onPress={action.onPress}
                                    />
                                </View>
                            ))}
                        </View>
                    </AdminCard>
                </Animated.View>

                <View className="px-6 gap-6">
                    {/* Daily KPIs */}
                    <Animated.View
                        entering={FadeInDown.delay(200).duration(400)}
                    >
                        <AdminCard>
                            <View className="flex-row items-start justify-between mb-5">
                                <View className="flex-1 pr-3">
                                    <View className="flex-row items-center gap-2">
                                        <View className="w-2 h-2 rounded-full bg-accent" />
                                        <Text className="text-[12px] font-outfit-bold font-bold uppercase tracking-[1.2px] text-app">
                                            Performance KPI
                                        </Text>
                                    </View>
                                    <Text className="text-[12px] font-outfit text-secondary mt-1">
                                        Quick snapshot for today.
                                    </Text>
                                </View>
                                <View className="items-end">
                                    {loading && !data ? (
                                        <ActivityIndicator size="small" color={colors.accent} />
                                    ) : (
                                        <View className="px-3 py-1.5 rounded-full border border-app/10 bg-card">
                                            <Text className="text-[10px] font-outfit-bold text-secondary uppercase tracking-[1.1px]">
                                                Tap for details
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {error ? (
                                <Text className="text-sm font-outfit text-danger">{error}</Text>
                            ) : (
                                <View className="gap-3">
                                    {chunk(kpis, 2).map((row, rowIndex) => (
                                        <View key={`kpi-row-${rowIndex}`} className="flex-row gap-3">
                                            {row.map((item, colIndex) => {
                                                const index = rowIndex * 2 + colIndex;
                                                return (
                                                    <AnimatedPressable
                                                        entering={ZoomIn.delay(140 + index * 45)}
                                                        key={item.label}
                                                        onPress={() =>
                                                            setDetail({
                                                                kind: "stat",
                                                                label: item.label,
                                                                value: String(item.value ?? "—"),
                                                            })
                                                        }
                                                        className="flex-1 rounded-card-lg border border-app/10 bg-card px-5 py-4 active:opacity-90"
                                                        style={{ minHeight: 92 }}
                                                    >
                                                        <Text className="text-[10px] font-outfit-bold font-bold text-secondary uppercase tracking-[1.15px]">
                                                            {item.label}
                                                        </Text>
                                                        <Text
                                                            className="mt-2 text-[34px] leading-[38px] font-clash-bold font-bold text-app"
                                                            style={{ fontVariant: ["tabular-nums"] }}
                                                            numberOfLines={1}
                                                        >
                                                            {item.value ?? "—"}
                                                        </Text>
                                                    </AnimatedPressable>
                                                );
                                            })}
                                            {row.length === 1 ? <View className="flex-1" /> : null}
                                        </View>
                                    ))}
                                </View>
                            )}
                        </AdminCard>
                    </Animated.View>

                    {/* Bookings Today List */}
                    <Animated.View
                        entering={FadeInDown.delay(250).duration(400)}
                    >
                        <AdminCard>
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
                                    <Text className="text-sm font-outfit text-muted">
                                        No sessions scheduled for today.
                                    </Text>
                                </View>
                            ) : (
                                <View className="gap-3">
                                    {bookings.map((booking) => (
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
                                            className="flex-row items-center justify-between rounded-card border border-app/10 bg-card p-4 active:opacity-80"
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
                                            <View className="bg-accent-light px-4 py-2 rounded-full border border-app/10">
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
                        </AdminCard>
                    </Animated.View>

                    {/* Priority Queue */}
                    <Animated.View
                        entering={FadeInDown.delay(300).duration(400)}
                    >
                        <AdminCard>
                            <View className="flex-row items-center gap-2 mb-6">
                                <View className="w-2 h-2 rounded-full bg-warning" />
                                <Text className="text-[13px] font-outfit-bold font-bold uppercase tracking-widest text-app">
                                    Priority Actions
                                </Text>
                            </View>
                            {(data?.priorityQueue?.length ?? 0) === 0 ? (
                                <View className="py-4 items-center justify-center">
                                    <Text className="text-sm font-outfit text-muted">
                                        Inbox zero. All caught up.
                                    </Text>
                                </View>
                            ) : (
                                <View className="gap-3">
                                    {data?.priorityQueue?.map((item, idx) => (
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
                                            className="rounded-card border border-app/10 bg-card p-5 active:opacity-80"
                                        >
                                            <View className="flex-row justify-between items-center mb-2">
                                                <Text className="text-base font-clash-bold font-bold text-app">
                                                    {item.title}
                                                </Text>
                                                {item.status && (
                                                    <View className="bg-warning-soft px-2.5 py-1 rounded-full border border-app/10">
                                                        <Text className="text-[10px] font-outfit-bold font-bold text-warning uppercase tracking-wider">
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
                        </AdminCard>
                    </Animated.View>

                    {/* Top Athletes */}
                    <Animated.View
                        entering={FadeInDown.delay(350).duration(400)}
                    >
                        <AdminCard>
                            <View className="flex-row items-start justify-between mb-5">
                                <View className="flex-1 pr-3">
                                    <View className="flex-row items-center gap-2">
                                        <View className="w-2 h-2 rounded-full bg-accent" />
                                        <Text className="text-[12px] font-outfit-bold font-bold uppercase tracking-[1.2px] text-app">
                                            Top Engagement
                                        </Text>
                                    </View>
                                    <Text className="text-[12px] font-outfit text-secondary mt-1">
                                        Highest activity and coaching touchpoints.
                                    </Text>
                                </View>
                                <Pressable
                                    onPress={() => requestAdminTab("admin-users")}
                                    className="px-3 py-1.5 rounded-full border border-app/10 bg-card active:opacity-90"
                                >
                                    <Text className="text-[10px] font-outfit-bold text-accent uppercase tracking-[1.1px]">
                                        View users
                                    </Text>
                                </Pressable>
                            </View>
                            {athletes.length === 0 ? (
                                <View className="py-4 items-center justify-center">
                                    <Text className="text-sm font-outfit text-muted">
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
                                            className="flex-row items-center justify-between rounded-card-lg border border-app/10 bg-card px-4 py-3.5 active:opacity-90"
                                        >
                                            <View className="flex-row items-center gap-3 flex-1 pr-3">
                                                <View className="w-10 h-10 rounded-button-lg bg-accent-light items-center justify-center border border-app/10">
                                                    <Text
                                                        className="text-[12px] font-outfit-bold font-bold text-accent tabular-nums"
                                                        style={{ fontVariant: ["tabular-nums"] }}
                                                    >
                                                        {idx + 1}
                                                    </Text>
                                                </View>
                                                <View className="flex-1">
                                                    <Text
                                                        className="text-[15px] font-clash-bold font-bold text-app"
                                                        numberOfLines={1}
                                                    >
                                                        {athlete.name}
                                                    </Text>
                                                    <Text
                                                        className="text-[12px] font-outfit text-secondary mt-0.5"
                                                        numberOfLines={1}
                                                    >
                                                        {formatTierLabel(athlete.tier)}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View className="items-end">
                                                <View className="bg-background-secondary px-3 py-1.5 rounded-full border border-app/10">
                                                    <Text
                                                        className="text-[12px] font-outfit-bold font-bold text-app tabular-nums"
                                                        style={{ fontVariant: ["tabular-nums"] }}
                                                    >
                                                        {athlete.score}
                                                    </Text>
                                                </View>
                                                <Text className="text-[10px] font-outfit text-secondary mt-1">
                                                    Engagement score
                                                </Text>
                                            </View>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </AdminCard>
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
                            backgroundColor: colors.background,
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
                                        },
                                    ]}
                                    className="bg-card border-app/10"
                                >
                                    <Text className="text-[12px] font-outfit-semibold text-app">
                                        Close
                                    </Text>
                                </Pressable>
                            </View>
                            <AdminCard className="rounded-card-lg border border-app bg-card-elevated p-6">
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
                                            <Text className="text-xs font-outfit-semibold text-warning uppercase tracking-widest">
                                                {detail.status}
                                            </Text>
                                        )}
                                    </View>
                                ) : null}
                            </AdminCard>
                        </ThemedScrollView>
                    </View>
                </Modal>
            </ThemedScrollView>
        </View>
    );
}
