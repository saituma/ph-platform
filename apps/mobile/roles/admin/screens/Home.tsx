import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { apiRequest } from "@/lib/api";
import { requestGlobalTabChange } from "@/context/ActiveTabContext";
import { useAppSelector } from "@/store/hooks";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Modal,
    Platform,
    Pressable,
    View,
} from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import Animated, {
    FadeInDown,
    useReducedMotion,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ADMIN_TAB_ROUTES } from "../tabs";
import { isValidHex } from "@/components/admin/AdminUI";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAdminTeams } from "@/hooks/admin/useAdminTeams";
import {
    AdminScreen,
    AdminCard,
    AdminButton,
    AdminBadge,
    AdminEmptyState,
    AdminLoadingState,
    AdminModalContainer,
    AdminModalTitle,
    AdminModalSubtitle,
} from "@/components/admin/AdminUI";
import type { AdminCardColor } from "@/constants/theme";
import {
    Users,
    Shield,
    Calendar,
    MessageCircle,
    TrendingUp,
    Trophy,
    Activity,
    Layers,
    ChevronRight,
    Clock,
    AlertCircle,
    CheckCircle2,
    ArrowUpRight,
    LayoutGrid,
    Sparkles,
    RefreshCw,
} from "lucide-react-native";

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
        videoUrl?: string;
        coachVideoUrl?: string;
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
        videoUrl?: string;
        coachVideoUrl?: string;
    }
    | { kind: "athlete"; name: string; score: string; tier: string; };

function formatTierLabel(raw: string) {
    const trimmed = String(raw ?? "").trim();
    if (!trimmed) return "—";
    if (trimmed === "PHP") return "PHP";
    if (trimmed.startsWith("PHP_")) return trimmed.replaceAll("_", " ");
    return trimmed;
}

function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
}

const KPI_CARDS: { label: string; icon: any; color: AdminCardColor; iconColor: string }[] = [
    { label: "Athletes", icon: Users, color: "sage", iconColor: "#5BA67A" },
    { label: "Premium", icon: Trophy, color: "yellow", iconColor: "#D4A04A" },
    { label: "Unread", icon: MessageCircle, color: "pink", iconColor: "#D4686A" },
    { label: "Bookings", icon: Calendar, color: "lavender", iconColor: "#7C6FA0" },
];

const ACTION_CONFIG = [
    { id: "users", label: "Directory", icon: Users, color: "lavender" as AdminCardColor, iconColor: "#7C6FA0" },
    { id: "videos", label: "Analysis", icon: Activity, color: "mint" as AdminCardColor, iconColor: "#5BA67A" },
    { id: "content", label: "Library", icon: Layers, color: "yellow" as AdminCardColor, iconColor: "#D4A04A" },
    { id: "schedule", label: "Planner", icon: Calendar, color: "pink" as AdminCardColor, iconColor: "#D4686A" },
    { id: "ops", label: "System", icon: LayoutGrid, color: "peach" as AdminCardColor, iconColor: "#B07A5A" },
];

export default function AdminHomeScreen() {
    const p = useAdminPastel();
    const insets = useAppSafeAreaInsets();
    const reduceMotion = useReducedMotion();
    const token = useAppSelector((state) => state.user.token);
    const profile = useAppSelector((state) => state.user.profile);
    const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
    const firstName = profile?.name?.trim()?.split(/\s+/)[0] ?? "Admin";
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
        ],
        [requestAdminTab]
    );

    const bookings = useMemo(() => data?.bookingsToday ?? [], [data]);
    const athletes = useMemo(() => data?.topAthletes?.slice(0, 5) ?? [], [data]);

    return (
        <AdminScreen>
            <ThemedScrollView
                onRefresh={() => loadDashboard(true)}
                contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
            >
                {/* ── Hero Header ── */}
                <Animated.View
                    entering={reduceMotion ? undefined : FadeInDown.delay(60).duration(400)}
                    style={{
                        paddingHorizontal: 24,
                        paddingTop: 20,
                        paddingBottom: 24,
                    }}
                >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <View style={{ flex: 1 }}>
                            <Text
                                style={{
                                    fontFamily: "Outfit-Regular",
                                    fontSize: 15,
                                    color: p.textSecondary,
                                    marginBottom: 4,
                                }}
                            >
                                {getGreeting()},
                            </Text>
                            <Text
                                style={{
                                    fontFamily: "Outfit-ExtraBold",
                                    fontSize: 34,
                                    color: p.textPrimary,
                                    letterSpacing: -1,
                                    lineHeight: 38,
                                }}
                            >
                                {firstName}
                            </Text>
                            <Text
                                style={{
                                    fontFamily: "Outfit-Regular",
                                    fontSize: 13,
                                    color: p.textMuted,
                                    marginTop: 4,
                                }}
                            >
                                {today}
                            </Text>
                        </View>
                        <Pressable
                            onPress={() => {
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                loadDashboard(true);
                            }}
                            style={({ pressed }) => ({
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                backgroundColor: p.cardLavender,
                                alignItems: "center",
                                justifyContent: "center",
                                opacity: pressed ? 0.7 : 1,
                            })}
                        >
                            <RefreshCw size={20} color={p.accent} strokeWidth={2.2} />
                        </Pressable>
                    </View>
                </Animated.View>

                {/* ── Error ── */}
                {error ? (
                    <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
                        <AdminCard color="pink" padding={20}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                <AlertCircle size={20} color={p.danger} strokeWidth={2} />
                                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.danger, flex: 1 }}>
                                    {error}
                                </Text>
                            </View>
                        </AdminCard>
                    </View>
                ) : null}

                {/* ── KPI Grid (2x2) ── */}
                <Animated.View
                    entering={reduceMotion ? undefined : FadeInDown.delay(120).duration(400)}
                    style={{ paddingHorizontal: 24, marginBottom: 24 }}
                >
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
                        {kpis.map((item, idx) => {
                            const cfg = KPI_CARDS[idx];
                            const Icon = cfg.icon;
                            return (
                                <Pressable
                                    key={item.label}
                                    onPress={() => setDetail({ kind: "stat", label: item.label, value: String(item.value ?? "—") })}
                                    style={{ width: "48%", flexGrow: 1 }}
                                >
                                    <AdminCard color={cfg.color} padding={20}>
                                        <View style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: 16,
                                            backgroundColor: p.cardWhite,
                                            alignItems: "center",
                                            justifyContent: "center",
                                            marginBottom: 14,
                                            shadowColor: p.shadow,
                                            shadowOpacity: 1,
                                            shadowRadius: 6,
                                            shadowOffset: { width: 0, height: 2 },
                                            elevation: 2,
                                        }}>
                                            <Icon size={20} color={cfg.iconColor} strokeWidth={2.2} />
                                        </View>
                                        <Text style={{
                                            fontFamily: "Outfit-ExtraBold",
                                            fontSize: 32,
                                            color: p.textPrimary,
                                            letterSpacing: -1,
                                            lineHeight: 36,
                                        }}>
                                            {loading && !data ? "—" : (item.value ?? "—")}
                                        </Text>
                                        <Text style={{
                                            fontFamily: "Outfit-Regular",
                                            fontSize: 13,
                                            color: p.textSecondary,
                                            marginTop: 4,
                                        }}>
                                            {item.label}
                                        </Text>
                                    </AdminCard>
                                </Pressable>
                            );
                        })}
                    </View>
                </Animated.View>

                {/* ── Quick Actions ── */}
                <Animated.View
                    entering={reduceMotion ? undefined : FadeInDown.delay(200).duration(400)}
                    style={{ paddingHorizontal: 24, marginBottom: 28 }}
                >
                    <Text style={{
                        fontFamily: "Outfit-ExtraBold",
                        fontSize: 20,
                        color: p.textPrimary,
                        letterSpacing: -0.5,
                        marginBottom: 14,
                    }}>
                        Quick Actions
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                        {commandActions.slice(0, 4).map((action, idx) => {
                            const Icon = action.icon;
                            return (
                                <Pressable
                                    key={action.id}
                                    onPress={action.onPress}
                                    style={{ width: "48%", flexGrow: 1 }}
                                >
                                    {({ pressed }) => (
                                        <AdminCard color={action.color} padding={18}>
                                            <View style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 14,
                                                backgroundColor: p.cardWhite,
                                                alignItems: "center",
                                                justifyContent: "center",
                                                marginBottom: 12,
                                                shadowColor: p.shadow,
                                                shadowOpacity: 1,
                                                shadowRadius: 4,
                                                shadowOffset: { width: 0, height: 1 },
                                                elevation: 1,
                                            }}>
                                                <Icon size={18} color={action.iconColor} strokeWidth={2.3} />
                                            </View>
                                            <Text style={{
                                                fontFamily: "Outfit-Bold",
                                                fontSize: 15,
                                                color: p.textPrimary,
                                            }}>
                                                {action.label}
                                            </Text>
                                            <ChevronRight
                                                size={14}
                                                color={p.textMuted}
                                                strokeWidth={2}
                                                style={{ position: "absolute", top: 20, right: 18 }}
                                            />
                                        </AdminCard>
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* Full-width 5th action */}
                    {commandActions[4] && (
                        <View style={{ marginTop: 12 }}>
                            <AdminCard
                                color={commandActions[4].color}
                                padding={18}
                                onPress={commandActions[4].onPress}
                            >
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                                    <View style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 14,
                                        backgroundColor: p.cardWhite,
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}>
                                        <LayoutGrid size={18} color={commandActions[4].iconColor} strokeWidth={2.3} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{
                                            fontFamily: "Outfit-Bold",
                                            fontSize: 15,
                                            color: p.textPrimary,
                                        }}>
                                            {commandActions[4].label}
                                        </Text>
                                        <Text style={{
                                            fontFamily: "Outfit-Regular",
                                            fontSize: 12,
                                            color: p.textSecondary,
                                        }}>
                                            Operations & settings
                                        </Text>
                                    </View>
                                    <ChevronRight size={16} color={p.textMuted} strokeWidth={2} />
                                </View>
                            </AdminCard>
                        </View>
                    )}
                </Animated.View>

                {/* ── Live Sessions ── */}
                <Animated.View
                    entering={reduceMotion ? undefined : FadeInDown.delay(280).duration(400)}
                    style={{ paddingHorizontal: 24, marginBottom: 28 }}
                >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <Text style={{
                            fontFamily: "Outfit-ExtraBold",
                            fontSize: 20,
                            color: p.textPrimary,
                            letterSpacing: -0.5,
                        }}>
                            Today's Sessions
                        </Text>
                        <AdminBadge color="mint">
                            {bookings.length} active
                        </AdminBadge>
                    </View>

                    {loading && !data ? (
                        <View style={{ gap: 12 }}>
                            <Skeleton width="100%" height={80} borderRadius={28} />
                            <Skeleton width="100%" height={80} borderRadius={28} />
                        </View>
                    ) : bookings.length === 0 ? (
                        <AdminEmptyState
                            icon={Calendar}
                            title="No sessions today"
                            description="All clear — no bookings scheduled."
                            color="mint"
                        />
                    ) : (
                        <View style={{ gap: 12 }}>
                            {bookings.map((booking, idx) => {
                                const colors: AdminCardColor[] = ["sage", "lavender", "peach", "mint", "pink"];
                                return (
                                    <AdminCard
                                        key={booking.id}
                                        color={colors[idx % colors.length]}
                                        onPress={() => setDetail({
                                            kind: "booking",
                                            name: booking.serviceName,
                                            athlete: booking.athleteName,
                                            time: booking.startsAt,
                                            type: booking.type,
                                            videoUrl: booking.videoUrl,
                                            coachVideoUrl: booking.coachVideoUrl,
                                        })}
                                        padding={18}
                                    >
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                                            <View style={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: 16,
                                                backgroundColor: p.cardWhite,
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}>
                                                <Users size={22} color={p.accent} strokeWidth={2} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{
                                                    fontFamily: "Outfit-Bold",
                                                    fontSize: 16,
                                                    color: p.textPrimary,
                                                }} numberOfLines={1}>
                                                    {booking.athleteName}
                                                </Text>
                                                <Text style={{
                                                    fontFamily: "Outfit-Regular",
                                                    fontSize: 12,
                                                    color: p.textSecondary,
                                                    marginTop: 2,
                                                }}>
                                                    {booking.type?.replace("_", " ")}
                                                </Text>
                                            </View>
                                            <View style={{ alignItems: "flex-end" }}>
                                                <Text style={{
                                                    fontFamily: "Outfit-Bold",
                                                    fontSize: 14,
                                                    color: p.textPrimary,
                                                }}>
                                                    {new Date(booking.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                                </Text>
                                                <ChevronRight size={14} color={p.textMuted} strokeWidth={2} style={{ marginTop: 4 }} />
                                            </View>
                                        </View>
                                    </AdminCard>
                                );
                            })}
                        </View>
                    )}
                </Animated.View>

                {/* ── Task Queue ── */}
                <Animated.View
                    entering={reduceMotion ? undefined : FadeInDown.delay(360).duration(400)}
                    style={{ paddingHorizontal: 24, marginBottom: 28 }}
                >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <Text style={{
                            fontFamily: "Outfit-ExtraBold",
                            fontSize: 20,
                            color: p.textPrimary,
                            letterSpacing: -0.5,
                        }}>
                            Task Queue
                        </Text>
                        {(data?.priorityQueue?.length ?? 0) > 0 && (
                            <AdminBadge color="yellow">
                                {data?.priorityQueue?.length} pending
                            </AdminBadge>
                        )}
                    </View>

                    {(data?.priorityQueue?.length ?? 0) === 0 ? (
                        <AdminEmptyState
                            icon={CheckCircle2}
                            title="All clear"
                            description="No pending tasks — everything is in sync."
                            color="sage"
                        />
                    ) : (
                        <View style={{ gap: 12 }}>
                            {data?.priorityQueue?.map((item, idx) => (
                                <AdminCard
                                    key={idx}
                                    color="yellow"
                                    onPress={() => setDetail({ kind: "priority", title: item.title, detail: item.detail, status: item.status })}
                                    padding={20}
                                >
                                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                                        <View style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 12,
                                            backgroundColor: p.cardWhite,
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}>
                                            <AlertCircle size={18} color={p.warning} strokeWidth={2.2} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{
                                                fontFamily: "Outfit-Bold",
                                                fontSize: 15,
                                                color: p.textPrimary,
                                                marginBottom: 4,
                                            }}>
                                                {item.title}
                                            </Text>
                                            <Text style={{
                                                fontFamily: "Outfit-Regular",
                                                fontSize: 13,
                                                color: p.textSecondary,
                                                lineHeight: 18,
                                            }} numberOfLines={2}>
                                                {item.detail}
                                            </Text>
                                        </View>
                                        <ChevronRight size={16} color={p.textMuted} strokeWidth={2} style={{ marginTop: 4 }} />
                                    </View>
                                </AdminCard>
                            ))}
                        </View>
                    )}
                </Animated.View>

                {/* ── Top Athletes ── */}
                <Animated.View
                    entering={reduceMotion ? undefined : FadeInDown.delay(440).duration(400)}
                    style={{ paddingHorizontal: 24, marginBottom: 28 }}
                >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <Text style={{
                            fontFamily: "Outfit-ExtraBold",
                            fontSize: 20,
                            color: p.textPrimary,
                            letterSpacing: -0.5,
                        }}>
                            Top Athletes
                        </Text>
                        <Pressable onPress={() => requestAdminTab("admin-users")}>
                            <Text style={{
                                fontFamily: "Outfit-Bold",
                                fontSize: 13,
                                color: p.accent,
                            }}>
                                See all
                            </Text>
                        </Pressable>
                    </View>

                    {athletes.length === 0 ? (
                        <AdminEmptyState
                            icon={Trophy}
                            title="No athlete data"
                            description="Athletes will appear here once data is available."
                            color="yellow"
                        />
                    ) : (
                        <View style={{ gap: 10 }}>
                            {athletes.map((athlete, idx) => {
                                const colors: AdminCardColor[] = ["sage", "lavender", "peach", "mint", "pink"];
                                return (
                                    <AdminCard
                                        key={idx}
                                        color={colors[idx % colors.length]}
                                        onPress={() => setDetail({ kind: "athlete", name: athlete.name, score: athlete.score, tier: athlete.tier })}
                                        padding={16}
                                    >
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                                            <View style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 20,
                                                backgroundColor: p.cardWhite,
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}>
                                                <Text style={{
                                                    fontFamily: "Outfit-ExtraBold",
                                                    fontSize: 16,
                                                    color: p.accent,
                                                }}>
                                                    {idx + 1}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{
                                                    fontFamily: "Outfit-Bold",
                                                    fontSize: 16,
                                                    color: p.textPrimary,
                                                }} numberOfLines={1}>
                                                    {athlete.name}
                                                </Text>
                                                <Text style={{
                                                    fontFamily: "Outfit-Regular",
                                                    fontSize: 12,
                                                    color: p.textMuted,
                                                    marginTop: 2,
                                                }}>
                                                    {formatTierLabel(athlete.tier)}
                                                </Text>
                                            </View>
                                            <View style={{
                                                paddingHorizontal: 14,
                                                paddingVertical: 6,
                                                borderRadius: 100,
                                                backgroundColor: p.cardWhite,
                                            }}>
                                                <Text style={{
                                                    fontFamily: "Outfit-ExtraBold",
                                                    fontSize: 16,
                                                    color: p.textPrimary,
                                                    letterSpacing: -0.5,
                                                }}>
                                                    {athlete.score}
                                                </Text>
                                            </View>
                                        </View>
                                    </AdminCard>
                                );
                            })}
                        </View>
                    )}
                </Animated.View>
            </ThemedScrollView>

            {/* ── Detail Modal ── */}
            <Modal
                visible={detail != null}
                animationType="fade"
                transparent
                onRequestClose={() => setDetail(null)}
            >
                <AdminModalContainer onClose={() => setDetail(null)}>
                    <AdminModalTitle>
                        {detail?.kind === "stat" ? detail.label
                            : detail?.kind === "booking" ? detail.name
                            : detail?.kind === "athlete" ? detail.name
                            : detail?.title ?? ""}
                    </AdminModalTitle>

                    {detail?.kind === "stat" && (
                        <View style={{ alignItems: "center", paddingVertical: 24 }}>
                            <Text style={{
                                fontFamily: "Outfit-ExtraBold",
                                fontSize: 64,
                                color: p.textPrimary,
                                letterSpacing: -2,
                            }}>
                                {detail.value}
                            </Text>
                            <AdminBadge color="sage">{detail.label}</AdminBadge>
                        </View>
                    )}

                    {detail?.kind === "booking" && (
                        <View style={{ gap: 16, paddingVertical: 8 }}>
                            <DetailRow label="Athlete" value={detail.athlete} icon={Users} p={p} />
                            <DetailRow label="Time" value={new Date(detail.time).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} icon={Clock} p={p} />
                            <DetailRow label="Type" value={detail.type} icon={Layers} p={p} />
                        </View>
                    )}

                    {detail?.kind === "athlete" && (
                        <View style={{ gap: 16, paddingVertical: 8 }}>
                            <DetailRow label="Score" value={detail.score} icon={Trophy} p={p} />
                            <DetailRow label="Tier" value={formatTierLabel(detail.tier)} icon={Shield} p={p} />
                        </View>
                    )}

                    {detail?.kind === "priority" && (
                        <View style={{ paddingVertical: 8 }}>
                            <AdminCard color="yellow" padding={16}>
                                <Text style={{
                                    fontFamily: "Outfit-Regular",
                                    fontSize: 15,
                                    color: p.textPrimary,
                                    lineHeight: 22,
                                }}>
                                    {detail.detail}
                                </Text>
                            </AdminCard>
                        </View>
                    )}

                    <View style={{ marginTop: 20 }}>
                        <AdminButton
                            label="Close"
                            variant="secondary"
                            onPress={() => setDetail(null)}
                        />
                    </View>
                </AdminModalContainer>
            </Modal>
        </AdminScreen>
    );
}

function DetailRow({ label, value, icon: Icon, p }: { label: string; value: string; icon: any; p: ReturnType<typeof useAdminPastel> }) {
    return (
        <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            paddingVertical: 12,
            paddingHorizontal: 16,
            backgroundColor: p.inputBg,
            borderRadius: 20,
        }}>
            <View style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                backgroundColor: p.cardWhite,
                alignItems: "center",
                justifyContent: "center",
            }}>
                <Icon size={16} color={p.accent} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textMuted }}>{label}</Text>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: p.textPrimary }}>{value}</Text>
            </View>
        </View>
    );
}
