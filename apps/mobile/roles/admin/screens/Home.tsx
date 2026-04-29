import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
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
    TouchableOpacity,
    View,
} from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import Animated, {
    FadeInDown,
    ZoomIn,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import { ADMIN_TAB_ROUTES } from "../tabs";
import { Feather } from "@/components/ui/theme-icons";
import { useAdminTeams } from "@/hooks/admin/useAdminTeams";
import { AdminHeader } from "@/components/admin/AdminUI";

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

// KPI icon/color config
const KPI_CONFIG = [
    { icon: "users", color: "#34C759", bgAlpha: "22" },
    { icon: "star", color: "#FFB020", bgAlpha: "22" },
    { icon: "message-circle", color: "#7B61FF", bgAlpha: "22" },
    { icon: "calendar", color: "#30B0C7", bgAlpha: "22" },
] as const;

// Quick action config with icons and colors
const ACTION_CONFIG: {
    id: string;
    icon: string;
    label: string;
    color: string;
    bgAlpha: string;
}[] = [
    { id: "users", icon: "users", label: "Users", color: "#34C759", bgAlpha: "18" },
    { id: "video", icon: "video", label: "Videos", color: "#7B61FF", bgAlpha: "18" },
    { id: "content", icon: "layers", label: "Content", color: "#30B0C7", bgAlpha: "18" },
    { id: "schedule", icon: "calendar", label: "Schedule", color: "#FFB020", bgAlpha: "18" },
    { id: "ops", icon: "settings", label: "Ops", color: "#FF6B6B", bgAlpha: "18" },
    { id: "nutrition", icon: "clipboard", label: "Nutrition", color: "#34C759", bgAlpha: "18" },
    { id: "referrals", icon: "activity", label: "Referrals", color: "#30B0C7", bgAlpha: "18" },
];

function PressableActionTile({
    icon,
    label,
    color,
    bgAlpha,
    onPress,
    index,
}: {
    icon: string;
    label: string;
    color: string;
    bgAlpha: string;
    onPress: () => void;
    index: number;
}) {
    const { isDark } = useAppTheme();
    const scale = useSharedValue(1);
    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));
    return (
        <Animated.View entering={ZoomIn.delay(80 + index * 35)} style={[animStyle, { flex: 1 }]}>
            <TouchableOpacity
                activeOpacity={0.75}
                onPress={onPress}
                onPressIn={() => { scale.value = withSpring(0.94, { damping: 14 }); }}
                onPressOut={() => { scale.value = withSpring(1, { damping: 14 }); }}
                style={{
                    alignItems: "center",
                    paddingVertical: 16,
                    borderRadius: 20,
                    borderWidth: 1,
                    backgroundColor: isDark ? `${color}${bgAlpha}` : `${color}12`,
                    borderColor: isDark ? `${color}30` : `${color}25`,
                }}
            >
                <View
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: isDark ? `${color}25` : `${color}18`,
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 10,
                        borderWidth: 1,
                        borderColor: isDark ? `${color}35` : `${color}22`,
                    }}
                >
                    <Feather name={icon as any} size={20} color={color} />
                </View>
                <Text
                    style={{
                        fontFamily: "Outfit-Bold",
                        fontSize: 11,
                        letterSpacing: 0.8,
                        textTransform: "uppercase",
                        color: color,
                    }}
                    numberOfLines={1}
                >
                    {label}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

function StatCard({
    label,
    value,
    icon,
    color,
    bgAlpha,
    index,
    onPress,
    loading,
}: {
    label: string;
    value: number | null;
    icon: string;
    color: string;
    bgAlpha: string;
    index: number;
    onPress: () => void;
    loading: boolean;
}) {
    const { isDark, colors } = useAppTheme();
    const scale = useSharedValue(1);
    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View
            entering={ZoomIn.delay(160 + index * 50)}
            style={[animStyle, { flex: 1 }]}
        >
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={onPress}
                onPressIn={() => { scale.value = withSpring(0.96, { damping: 14 }); }}
                onPressOut={() => { scale.value = withSpring(1, { damping: 14 }); }}
                style={{
                    minHeight: 110,
                    borderRadius: 20,
                    borderWidth: 1,
                    backgroundColor: isDark ? colors.cardElevated : colors.card,
                    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)",
                    padding: 16,
                    overflow: "hidden",
                }}
            >
                {/* Colored top bar accent */}
                <View
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 16,
                        right: 16,
                        height: 2,
                        borderRadius: 1,
                        backgroundColor: color,
                        opacity: 0.6,
                    }}
                />
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                    <Text
                        style={{
                            fontFamily: "Outfit-Bold",
                            fontSize: 10,
                            letterSpacing: 1.4,
                            textTransform: "uppercase",
                            color: colors.textSecondary,
                        }}
                    >
                        {label}
                    </Text>
                    <View
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 10,
                            backgroundColor: `${color}${bgAlpha}`,
                            alignItems: "center",
                            justifyContent: "center",
                            borderWidth: 1,
                            borderColor: `${color}30`,
                        }}
                    >
                        <Feather name={icon as any} size={14} color={color} />
                    </View>
                </View>
                {loading && value === null ? (
                    <Skeleton width={60} height={36} borderRadius={8} />
                ) : (
                    <Text
                        style={{
                            fontFamily: "Outfit-Black",
                            fontSize: 38,
                            lineHeight: 42,
                            color: colors.textPrimary,
                            fontVariant: ["tabular-nums"] as any,
                        }}
                        numberOfLines={1}
                    >
                        {value ?? "—"}
                    </Text>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

export default function AdminHomeScreen() {
    const { colors, isDark } = useAppTheme();
    const insets = useAppSafeAreaInsets();
    const token = useAppSelector((state) => state.user.token);
    const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
    const canLoad = Boolean(token && bootstrapReady);

    const [data, setData] = useState<AdminDashboard | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [detail, setDetail] = useState<HomeDetail | null>(null);

    const today = useMemo(() => {
        return new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
        });
    }, []);

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

    const teamsHook = useAdminTeams(token, canLoad);

    useEffect(() => {
        if (!canLoad) return;
        void loadDashboard(false);
        void teamsHook.load(false);
    }, [canLoad, loadDashboard]); // eslint-disable-line react-hooks/exhaustive-deps

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
            { ...ACTION_CONFIG[0], onPress: () => requestAdminTab("admin-users") },
            { ...ACTION_CONFIG[1], onPress: () => requestAdminTab("admin-videos") },
            { ...ACTION_CONFIG[2], onPress: () => requestAdminTab("admin-content") },
            { ...ACTION_CONFIG[3], onPress: () => router.push("/admin/ops/schedule") },
            { ...ACTION_CONFIG[4], onPress: () => requestAdminTab("admin-ops") },
            { ...ACTION_CONFIG[5], onPress: () => router.push("/admin/ops/nutrition") },
            { ...ACTION_CONFIG[6], onPress: () => router.push("/admin/ops/referrals") },
        ],
        [requestAdminTab]
    );

    const bookings = useMemo(() => data?.bookingsToday ?? [], [data]);
    const athletes = useMemo(() => data?.topAthletes?.slice(0, 5) ?? [], [data]);

    // Section heading style
    const sectionLabel = {
        fontFamily: "Outfit-Bold" as const,
        fontSize: 11,
        letterSpacing: 1.8,
        textTransform: "uppercase" as const,
        color: colors.textSecondary,
    };

    return (
        <View style={{ flex: 1, paddingTop: insets.top }}>
            <ThemedScrollView
                onRefresh={() => loadDashboard(true)}
                contentContainerStyle={{ paddingBottom: 56 + insets.bottom }}
            >
                <Animated.View
                    entering={FadeInDown.delay(60).duration(380)}
                    style={{ marginBottom: 18 }}
                >
                    <AdminHeader
                        eyebrow="Overview"
                        title="Admin Panel"
                        subtitle={today}
                        tone="accent"
                        right={loading && !data ? (
                            <ActivityIndicator size="small" color={colors.accent} />
                        ) : null}
                    />
                </Animated.View>

                {/* ── Stats Grid (2×2) ── */}
                <Animated.View
                    entering={FadeInDown.delay(120).duration(380)}
                    style={{ paddingHorizontal: 24, marginBottom: 28 }}
                >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
                        <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: colors.accent }} />
                        <Text style={sectionLabel}>Performance KPIs</Text>
                    </View>
                    {error ? (
                        <View
                            style={{
                                padding: 20,
                                borderRadius: 20,
                                backgroundColor: `${colors.danger}12`,
                                borderWidth: 1,
                                borderColor: `${colors.danger}25`,
                            }}
                        >
                            <Text
                                style={{
                                    fontFamily: "Outfit-Regular",
                                    fontSize: 14,
                                    color: colors.danger,
                                    textAlign: "center",
                                }}
                            >
                                {error}
                            </Text>
                        </View>
                    ) : (
                        chunk(kpis, 2).map((row, rowIndex) => (
                            <View
                                key={`kpi-row-${rowIndex}`}
                                style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}
                            >
                                {row.map((item, colIndex) => {
                                    const idx = rowIndex * 2 + colIndex;
                                    const cfg = KPI_CONFIG[idx];
                                    return (
                                        <StatCard
                                            key={item.label}
                                            label={item.label}
                                            value={item.value}
                                            icon={cfg.icon}
                                            color={cfg.color}
                                            bgAlpha={cfg.bgAlpha}
                                            index={idx}
                                            loading={loading}
                                            onPress={() =>
                                                setDetail({
                                                    kind: "stat",
                                                    label: item.label,
                                                    value: String(item.value ?? "—"),
                                                })
                                            }
                                        />
                                    );
                                })}
                                {row.length === 1 && <View style={{ flex: 1 }} />}
                            </View>
                        ))
                    )}
                </Animated.View>

                {/* ── Quick Actions ── */}
                <Animated.View
                    entering={FadeInDown.delay(180).duration(380)}
                    style={{ paddingHorizontal: 24, marginBottom: 28 }}
                >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
                        <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: colors.accent }} />
                        <Text style={sectionLabel}>Quick Actions</Text>
                    </View>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                        {commandActions.map((action, index) => (
                            <View key={action.id} style={{ width: "30.5%" }}>
                                <PressableActionTile
                                    icon={action.icon}
                                    label={action.label}
                                    color={action.color}
                                    bgAlpha={action.bgAlpha}
                                    onPress={action.onPress}
                                    index={index}
                                />
                            </View>
                        ))}
                    </View>
                </Animated.View>

                <View style={{ paddingHorizontal: 24, gap: 24 }}>
                    {/* ── Live Schedule ── */}
                    <Animated.View entering={FadeInDown.delay(240).duration(380)}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
                            <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: "#30B0C7" }} />
                            <Text style={{ ...sectionLabel, color: colors.textSecondary }}>Live Schedule</Text>
                        </View>
                        <View
                            style={{
                                borderRadius: 22,
                                borderWidth: 1,
                                backgroundColor: isDark ? colors.cardElevated : colors.card,
                                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)",
                                overflow: "hidden",
                            }}
                        >
                            {/* Colored top strip */}
                            <View style={{ height: 3, backgroundColor: "#30B0C7", opacity: 0.7 }} />
                            <View style={{ padding: 16 }}>
                                {loading && !data ? (
                                    <View style={{ gap: 10 }}>
                                        <Skeleton width="100%" height={64} borderRadius={14} />
                                        <Skeleton width="100%" height={64} borderRadius={14} />
                                    </View>
                                ) : bookings.length === 0 ? (
                                    <View style={{ paddingVertical: 28, alignItems: "center" }}>
                                        <View
                                            style={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: 14,
                                                backgroundColor: isDark ? "rgba(48,176,199,0.12)" : "rgba(48,176,199,0.08)",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                marginBottom: 12,
                                            }}
                                        >
                                            <Feather name="calendar" size={22} color="#30B0C7" />
                                        </View>
                                        <Text
                                            style={{
                                                fontFamily: "Outfit-Regular",
                                                fontSize: 14,
                                                color: colors.textSecondary,
                                                textAlign: "center",
                                            }}
                                        >
                                            No sessions scheduled for today.
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={{ gap: 8 }}>
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
                                                style={({ pressed }) => ({
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    borderRadius: 14,
                                                    borderWidth: 1,
                                                    backgroundColor: isDark
                                                        ? "rgba(255,255,255,0.03)"
                                                        : "rgba(15,23,42,0.03)",
                                                    borderColor: isDark
                                                        ? "rgba(255,255,255,0.07)"
                                                        : "rgba(15,23,42,0.06)",
                                                    padding: 14,
                                                    opacity: pressed ? 0.78 : 1,
                                                })}
                                            >
                                                <View style={{ flex: 1, marginRight: 12 }}>
                                                    <Text
                                                        style={{
                                                            fontFamily: "Outfit-Bold",
                                                            fontSize: 10,
                                                            letterSpacing: 1.2,
                                                            textTransform: "uppercase",
                                                            color: "#30B0C7",
                                                            marginBottom: 4,
                                                        }}
                                                        numberOfLines={1}
                                                    >
                                                        {booking.type?.replace("_", " ")}
                                                    </Text>
                                                    <Text
                                                        style={{
                                                            fontFamily: "Outfit-Bold",
                                                            fontSize: 15,
                                                            color: colors.textPrimary,
                                                        }}
                                                        numberOfLines={1}
                                                    >
                                                        {booking.athleteName}
                                                    </Text>
                                                </View>
                                                <View
                                                    style={{
                                                        paddingHorizontal: 14,
                                                        paddingVertical: 7,
                                                        borderRadius: 20,
                                                        backgroundColor: isDark
                                                            ? "rgba(48,176,199,0.14)"
                                                            : "rgba(48,176,199,0.10)",
                                                        borderWidth: 1,
                                                        borderColor: isDark
                                                            ? "rgba(48,176,199,0.25)"
                                                            : "rgba(48,176,199,0.20)",
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            fontFamily: "Outfit-Bold",
                                                            fontSize: 13,
                                                            color: "#30B0C7",
                                                            fontVariant: ["tabular-nums"] as any,
                                                        }}
                                                    >
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
                            </View>
                        </View>
                    </Animated.View>

                    {/* ── Priority Actions ── */}
                    <Animated.View entering={FadeInDown.delay(290).duration(380)}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
                            <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: colors.warning }} />
                            <Text style={{ ...sectionLabel, color: colors.textSecondary }}>Priority Actions</Text>
                        </View>
                        <View
                            style={{
                                borderRadius: 22,
                                borderWidth: 1,
                                backgroundColor: isDark ? colors.cardElevated : colors.card,
                                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)",
                                overflow: "hidden",
                            }}
                        >
                            <View style={{ height: 3, backgroundColor: colors.warning, opacity: 0.7 }} />
                            <View style={{ padding: 16 }}>
                                {(data?.priorityQueue?.length ?? 0) === 0 ? (
                                    <View style={{ paddingVertical: 28, alignItems: "center" }}>
                                        <View
                                            style={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: 14,
                                                backgroundColor: isDark ? `${colors.warning}18` : `${colors.warning}10`,
                                                alignItems: "center",
                                                justifyContent: "center",
                                                marginBottom: 12,
                                            }}
                                        >
                                            <Feather name="check-circle" size={22} color={colors.warning} />
                                        </View>
                                        <Text
                                            style={{
                                                fontFamily: "Outfit-Regular",
                                                fontSize: 14,
                                                color: colors.textSecondary,
                                                textAlign: "center",
                                            }}
                                        >
                                            Inbox zero. All caught up.
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={{ gap: 8 }}>
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
                                                style={({ pressed }) => ({
                                                    borderRadius: 14,
                                                    borderWidth: 1,
                                                    backgroundColor: isDark
                                                        ? "rgba(255,255,255,0.03)"
                                                        : "rgba(15,23,42,0.03)",
                                                    borderColor: isDark
                                                        ? "rgba(255,255,255,0.07)"
                                                        : "rgba(15,23,42,0.06)",
                                                    padding: 16,
                                                    opacity: pressed ? 0.78 : 1,
                                                })}
                                            >
                                                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                                    <Text
                                                        style={{
                                                            fontFamily: "Outfit-Bold",
                                                            fontSize: 15,
                                                            color: colors.textPrimary,
                                                            flex: 1,
                                                            marginRight: 8,
                                                        }}
                                                    >
                                                        {item.title}
                                                    </Text>
                                                    {item.status && (
                                                        <View
                                                            style={{
                                                                paddingHorizontal: 10,
                                                                paddingVertical: 4,
                                                                borderRadius: 20,
                                                                backgroundColor: isDark ? `${colors.warning}18` : `${colors.warning}10`,
                                                                borderWidth: 1,
                                                                borderColor: isDark ? `${colors.warning}30` : `${colors.warning}20`,
                                                            }}
                                                        >
                                                            <Text
                                                                style={{
                                                                    fontFamily: "Outfit-Bold",
                                                                    fontSize: 10,
                                                                    color: colors.warning,
                                                                    textTransform: "uppercase",
                                                                    letterSpacing: 1,
                                                                }}
                                                            >
                                                                {item.status}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text
                                                    style={{
                                                        fontFamily: "Outfit-Regular",
                                                        fontSize: 13,
                                                        color: colors.textSecondary,
                                                        lineHeight: 19,
                                                    }}
                                                >
                                                    {item.detail}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>
                    </Animated.View>

                    {/* ── Top Engagement ── */}
                    <Animated.View entering={FadeInDown.delay(340).duration(380)}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: colors.accent }} />
                                <Text style={sectionLabel}>Top Engagement</Text>
                            </View>
                            <Pressable
                                onPress={() => requestAdminTab("admin-users")}
                                style={({ pressed }) => ({
                                    paddingHorizontal: 14,
                                    paddingVertical: 6,
                                    borderRadius: 20,
                                    borderWidth: 1,
                                    backgroundColor: isDark ? `${colors.accent}14` : `${colors.accent}10`,
                                    borderColor: isDark ? `${colors.accent}28` : `${colors.accent}20`,
                                    opacity: pressed ? 0.7 : 1,
                                })}
                            >
                                <Text
                                    style={{
                                        fontFamily: "Outfit-Bold",
                                        fontSize: 11,
                                        color: colors.accent,
                                        letterSpacing: 0.8,
                                    }}
                                >
                                    View all
                                </Text>
                            </Pressable>
                        </View>
                        <View
                            style={{
                                borderRadius: 22,
                                borderWidth: 1,
                                backgroundColor: isDark ? colors.cardElevated : colors.card,
                                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)",
                                overflow: "hidden",
                            }}
                        >
                            <View style={{ height: 3, backgroundColor: colors.accent, opacity: 0.7 }} />
                            <View style={{ padding: 16 }}>
                                {athletes.length === 0 ? (
                                    <View style={{ paddingVertical: 28, alignItems: "center" }}>
                                        <View
                                            style={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: 14,
                                                backgroundColor: isDark ? `${colors.accent}14` : `${colors.accent}10`,
                                                alignItems: "center",
                                                justifyContent: "center",
                                                marginBottom: 12,
                                            }}
                                        >
                                            <Feather name="users" size={22} color={colors.accent} />
                                        </View>
                                        <Text
                                            style={{
                                                fontFamily: "Outfit-Regular",
                                                fontSize: 14,
                                                color: colors.textSecondary,
                                                textAlign: "center",
                                            }}
                                        >
                                            No athletes indexed.
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={{ gap: 8 }}>
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
                                                style={({ pressed }) => ({
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    borderRadius: 14,
                                                    borderWidth: 1,
                                                    backgroundColor: isDark
                                                        ? "rgba(255,255,255,0.03)"
                                                        : "rgba(15,23,42,0.03)",
                                                    borderColor: isDark
                                                        ? "rgba(255,255,255,0.07)"
                                                        : "rgba(15,23,42,0.06)",
                                                    paddingHorizontal: 14,
                                                    paddingVertical: 12,
                                                    opacity: pressed ? 0.78 : 1,
                                                })}
                                            >
                                                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1, marginRight: 10 }}>
                                                    <View
                                                        style={{
                                                            width: 36,
                                                            height: 36,
                                                            borderRadius: 10,
                                                            backgroundColor: isDark ? `${colors.accent}18` : `${colors.accent}12`,
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            borderWidth: 1,
                                                            borderColor: isDark ? `${colors.accent}28` : `${colors.accent}20`,
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                fontFamily: "Outfit-Bold",
                                                                fontSize: 13,
                                                                color: colors.accent,
                                                                fontVariant: ["tabular-nums"] as any,
                                                            }}
                                                        >
                                                            {idx + 1}
                                                        </Text>
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text
                                                            style={{
                                                                fontFamily: "Outfit-Bold",
                                                                fontSize: 15,
                                                                color: colors.textPrimary,
                                                            }}
                                                            numberOfLines={1}
                                                        >
                                                            {athlete.name}
                                                        </Text>
                                                        <Text
                                                            style={{
                                                                fontFamily: "Outfit-Regular",
                                                                fontSize: 12,
                                                                color: colors.textSecondary,
                                                                marginTop: 2,
                                                            }}
                                                            numberOfLines={1}
                                                        >
                                                            {formatTierLabel(athlete.tier)}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <View style={{ alignItems: "flex-end" }}>
                                                    <View
                                                        style={{
                                                            paddingHorizontal: 10,
                                                            paddingVertical: 5,
                                                            borderRadius: 20,
                                                            backgroundColor: isDark
                                                                ? "rgba(255,255,255,0.05)"
                                                                : "rgba(15,23,42,0.05)",
                                                            borderWidth: 1,
                                                            borderColor: isDark
                                                                ? "rgba(255,255,255,0.10)"
                                                                : "rgba(15,23,42,0.08)",
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                fontFamily: "Outfit-Bold",
                                                                fontSize: 12,
                                                                color: colors.textPrimary,
                                                                fontVariant: ["tabular-nums"] as any,
                                                            }}
                                                        >
                                                            {athlete.score}
                                                        </Text>
                                                    </View>
                                                    <Text
                                                        style={{
                                                            fontFamily: "Outfit-Regular",
                                                            fontSize: 10,
                                                            color: colors.textSecondary,
                                                            marginTop: 3,
                                                        }}
                                                    >
                                                        score
                                                    </Text>
                                                </View>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>
                    </Animated.View>

                    {/* ── Teams Overview ── */}
                    <Animated.View entering={FadeInDown.delay(390).duration(380)}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: "#34C759" }} />
                                <Text style={{ ...sectionLabel, color: colors.textSecondary }}>Teams</Text>
                            </View>
                        </View>
                        <View
                            style={{
                                borderRadius: 22,
                                borderWidth: 1,
                                backgroundColor: isDark ? colors.cardElevated : colors.card,
                                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)",
                                overflow: "hidden",
                            }}
                        >
                            <View style={{ height: 3, backgroundColor: "#34C759", opacity: 0.7 }} />
                            <View style={{ padding: 16 }}>
                                {teamsHook.loading && teamsHook.teams.length === 0 ? (
                                    <View style={{ gap: 8 }}>
                                        <Skeleton width="100%" height={56} borderRadius={14} />
                                        <Skeleton width="100%" height={56} borderRadius={14} />
                                    </View>
                                ) : teamsHook.teams.length === 0 ? (
                                    <View style={{ paddingVertical: 28, alignItems: "center" }}>
                                        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: isDark ? "rgba(52,199,89,0.12)" : "rgba(52,199,89,0.08)", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                                            <Feather name="users" size={22} color="#34C759" />
                                        </View>
                                        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: colors.textSecondary, textAlign: "center" }}>
                                            No teams created yet.
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={{ gap: 8 }}>
                                        {teamsHook.teams.slice(0, 5).map((team) => (
                                            <View
                                                key={team.id}
                                                style={{
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    borderRadius: 14,
                                                    borderWidth: 1,
                                                    backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                                                    borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.06)",
                                                    paddingHorizontal: 14,
                                                    paddingVertical: 12,
                                                }}
                                            >
                                                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1, marginRight: 10 }}>
                                                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? "rgba(52,199,89,0.14)" : "rgba(52,199,89,0.10)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: isDark ? "rgba(52,199,89,0.25)" : "rgba(52,199,89,0.20)" }}>
                                                        <Feather name="shield" size={16} color="#34C759" />
                                                    </View>
                                                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: colors.textPrimary, flex: 1 }} numberOfLines={1}>
                                                        {team.team}
                                                    </Text>
                                                </View>
                                                <View style={{ alignItems: "flex-end", gap: 3 }}>
                                                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: "#34C759" }}>
                                                        {team.memberCount}
                                                    </Text>
                                                    <Text style={{ fontFamily: "Outfit-Regular", fontSize: 10, color: colors.textSecondary }}>
                                                        athletes
                                                    </Text>
                                                </View>
                                            </View>
                                        ))}
                                        {teamsHook.teams.length > 5 && (
                                            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: colors.textSecondary, textAlign: "center", paddingVertical: 6 }}>
                                                +{teamsHook.teams.length - 5} more teams
                                            </Text>
                                        )}
                                    </View>
                                )}
                            </View>
                        </View>
                    </Animated.View>
                </View>

                {/* ── Detail Modal ── */}
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
                                paddingHorizontal: 20,
                                paddingBottom: 40 + insets.bottom,
                            }}
                        >
                            <View
                                style={{
                                    paddingTop: 20,
                                    marginBottom: 24,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }}
                            >
                                <Text
                                    style={{
                                        fontFamily: "Outfit-Bold",
                                        fontSize: 22,
                                        color: colors.textPrimary,
                                        flex: 1,
                                        marginRight: 12,
                                    }}
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
                                    style={({ pressed }) => ({
                                        paddingHorizontal: 16,
                                        paddingVertical: 9,
                                        borderRadius: 999,
                                        borderWidth: 1,
                                        backgroundColor: isDark
                                            ? "rgba(255,255,255,0.06)"
                                            : "rgba(15,23,42,0.06)",
                                        borderColor: isDark
                                            ? "rgba(255,255,255,0.12)"
                                            : "rgba(15,23,42,0.10)",
                                        opacity: pressed ? 0.7 : 1,
                                    })}
                                >
                                    <Text
                                        style={{
                                            fontFamily: "Outfit-SemiBold",
                                            fontSize: 13,
                                            color: colors.textPrimary,
                                        }}
                                    >
                                        Close
                                    </Text>
                                </Pressable>
                            </View>
                            <View
                                style={{
                                    borderRadius: 22,
                                    borderWidth: 1,
                                    backgroundColor: isDark ? colors.cardElevated : colors.card,
                                    borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)",
                                    padding: 24,
                                }}
                            >
                                {detail?.kind === "stat" ? (
                                    <Text
                                        style={{
                                            fontFamily: "Outfit-Black",
                                            fontSize: 72,
                                            color: colors.textPrimary,
                                            fontVariant: ["tabular-nums"] as any,
                                        }}
                                    >
                                        {detail.value}
                                    </Text>
                                ) : detail?.kind === "booking" ? (
                                    <View style={{ gap: 10 }}>
                                        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: colors.textSecondary }}>
                                            Athlete:{" "}
                                            <Text style={{ fontFamily: "Outfit-Bold", color: colors.textPrimary }}>
                                                {detail.athlete}
                                            </Text>
                                        </Text>
                                        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: colors.textSecondary }}>
                                            Time:{" "}
                                            <Text style={{ fontFamily: "Outfit-Bold", color: colors.textPrimary }}>
                                                {new Date(detail.time).toLocaleString()}
                                            </Text>
                                        </Text>
                                        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: colors.textSecondary }}>
                                            Type:{" "}
                                            <Text style={{ fontFamily: "Outfit-Bold", color: colors.textPrimary }}>{detail.type}</Text>
                                        </Text>
                                    </View>
                                ) : detail?.kind === "athlete" ? (
                                    <View style={{ gap: 10 }}>
                                        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: colors.textSecondary }}>
                                            Engagement:{" "}
                                            <Text style={{ fontFamily: "Outfit-Bold", color: colors.textPrimary }}>{detail.score}</Text>
                                        </Text>
                                        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: colors.textSecondary }}>
                                            Program Tier:{" "}
                                            <Text style={{ fontFamily: "Outfit-Bold", color: colors.textPrimary }}>{detail.tier}</Text>
                                        </Text>
                                    </View>
                                ) : detail?.kind === "priority" ? (
                                    <View style={{ gap: 14 }}>
                                        <Text
                                            style={{
                                                fontFamily: "Outfit-Regular",
                                                fontSize: 15,
                                                color: colors.textSecondary,
                                                lineHeight: 23,
                                            }}
                                        >
                                            {detail.detail || "No additional context."}
                                        </Text>
                                        {detail.status && (
                                            <Text
                                                style={{
                                                    fontFamily: "Outfit-Bold",
                                                    fontSize: 11,
                                                    color: colors.warning,
                                                    textTransform: "uppercase",
                                                    letterSpacing: 1.5,
                                                }}
                                            >
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
