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
    StyleSheet,
    View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import Animated, {
    FadeInDown,
    ZoomIn,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
    withDelay,
    withRepeat,
    withSequence,
    runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { ADMIN_TAB_ROUTES } from "../tabs";
import { Feather } from "@/components/ui/theme-icons";
import { useAdminTeams } from "@/hooks/admin/useAdminTeams";
import { AdminHeader, isValidHex } from "@/components/admin/AdminUI";
import { 
    UICard, 
    UISurface, 
    UIButton, 
    UIChip, 
    UISectionHeader,
    Button,
    cn 
} from "@/components/ui/hero";
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
    Search,
    Plus,
    X,
    Filter,
    Clock,
    AlertCircle,
    CheckCircle2,
    ArrowUpRight,
    LayoutGrid,
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

const Sparkle = React.memo(({ size, top, left, delay }: { size: number, top: number, left: number, delay: number }) => {
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0);

    React.useEffect(() => {
        opacity.value = withDelay(delay, withRepeat(withSequence(withTiming(0.8, { duration: 1500 }), withTiming(0, { duration: 1500 })), -1, true));
        scale.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 1500 }), withTiming(0.4, { duration: 1500 })), -1, true));
    }, [delay, opacity, scale]);

    const style = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View
            style={[
                {
                    position: "absolute",
                    top,
                    left,
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: "#FFF",
                },
                style,
            ]}
        />
    );
});

function chunk<T>(items: T[], size: number) {
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        result.push(items.slice(i, i + size));
    }
    return result;
}

const KPI_CONFIG = [
    { icon: Users, color: "#7B61FF", bgAlpha: "12" },
    { icon: Trophy, color: "#FFB020", bgAlpha: "12" },
    { icon: MessageCircle, color: "#34C759", bgAlpha: "12" },
    { icon: Calendar, color: "#30B0C7", bgAlpha: "12" },
];

const ACTION_CONFIG = [
    { id: "users", label: "Directory", icon: Users, color: "#7B61FF" },
    { id: "videos", label: "Analysis", icon: Activity, color: "#30B0C7" },
    { id: "content", label: "Library", icon: Layers, color: "#FFB020" },
    { id: "schedule", label: "Planner", icon: Calendar, color: "#34C759" },
    { id: "ops", label: "System", icon: LayoutGrid, color: "#64748b" },
];

export default function AdminHomeScreen() {
    const { colors, isDark } = useAppTheme();
    const insets = useAppSafeAreaInsets();
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
        <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
            <ThemedScrollView
                onRefresh={() => loadDashboard(true)}
                contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
            >
                {/* ━━━ High-Impact Hero Header ━━━ */}
                <View style={{ width: "100%", height: 260 + insets.top, overflow: "hidden", marginBottom: -40 }}>
                    <LinearGradient
                        colors={["#8aff00", "rgba(138, 255, 0, 0.4)", "transparent"]}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0.1, y: 0 }}
                        end={{ x: 0.9, y: 1 }}
                    />
                    
                    {/* Atmospheric Sparkles */}
                    <Sparkle size={4} top={insets.top + 20} left={40} delay={0} />
                    <Sparkle size={3} top={insets.top + 80} left={80} delay={500} />
                    <Sparkle size={5} top={insets.top + 40} left={250} delay={1000} />
                    <Sparkle size={3} top={insets.top + 100} left={320} delay={1500} />
                    <Sparkle size={4} top={insets.top + 60} left={180} delay={2000} />

                    <View style={{ paddingHorizontal: 28, paddingTop: insets.top + 40 }}>
                        <View className="flex-row items-center justify-between">
                            <View>
                                <Animated.Text 
                                    entering={FadeInDown.delay(100).duration(600)}
                                    style={{
                                        color: "black",
                                        fontFamily: "Outfit-Black",
                                        textTransform: "uppercase",
                                        letterSpacing: 4,
                                        fontSize: 10,
                                        marginBottom: 12,
                                        opacity: 0.7
                                    }}
                                >
                                    Admin Overview
                                </Animated.Text>
                                <Animated.Text 
                                    entering={FadeInDown.delay(200).duration(600)}
                                    style={{
                                        color: "rgba(255,255,255,0.8)",
                                        fontSize: 24,
                                        fontFamily: "Outfit-Medium",
                                        letterSpacing: -0.5,
                                        marginBottom: 4
                                    }}
                                >
                                    {getGreeting()},
                                </Animated.Text>
                                <Animated.Text 
                                    entering={FadeInDown.delay(300).duration(600)}
                                    style={{
                                        color: "white",
                                        fontSize: 72,
                                        fontFamily: "Outfit-Black",
                                        fontStyle: "italic",
                                        textTransform: "uppercase",
                                        letterSpacing: -3,
                                        lineHeight: 64
                                    }}
                                >
                                    {firstName}
                                </Animated.Text>
                            </View>

                            <Animated.View 
                                entering={FadeInDown.delay(400).duration(600)}
                                className="items-end"
                            >
                                <View className="flex-row items-center px-3 py-1.5 bg-black/20 rounded-full border border-white/10 mb-4">
                                    <View className="w-2 h-2 rounded-full bg-white mr-2 animate-pulse" />
                                    <Text className="text-[9px] font-black text-white uppercase tracking-widest">LIVE DATA</Text>
                                </View>
                                <Pressable 
                                    onPress={() => {
                                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                        loadDashboard(true);
                                    }}
                                    style={({ pressed }) => ({
                                        width: 52,
                                        height: 52,
                                        borderRadius: 26,
                                        backgroundColor: "rgba(0,0,0,0.3)",
                                        borderWidth: 1,
                                        borderColor: "rgba(255,255,255,0.2)",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        opacity: pressed ? 0.7 : 1
                                    })}
                                >
                                    <Activity size={22} color="white" strokeWidth={2.5} />
                                </Pressable>
                            </Animated.View>
                        </View>
                    </View>
                </View>

                {/* ━━━ KPI Grid ━━━ */}
                <View className="px-7 mb-24">
                    {error ? (
                        <View className="bg-danger/5 border border-danger/10 p-8 items-center rounded-sm">
                            <AlertCircle size={28} color={colors.danger} className="mb-3" />
                            <Text className="text-danger font-outfit text-sm text-center font-black uppercase tracking-widest">{error}</Text>
                        </View>
                    ) : (
                        chunk(kpis, 2).map((row, rowIndex) => (
                            <View
                                key={`kpi-row-${rowIndex}`}
                                style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}
                            >
                                {row.map((item, colIndex) => {
                                    const idx = rowIndex * 2 + colIndex;
                                    const cfg = KPI_CONFIG[idx];
                                    return (
                                        <Pressable
                                            key={item.label}
                                            onPress={() => setDetail({ kind: "stat", label: item.label, value: String(item.value ?? "—") })}
                                            style={({ pressed }) => ({
                                                flex: 1,
                                                backgroundColor: "#111",
                                                borderRadius: 1,
                                                padding: 24,
                                                borderLeftWidth: 4,
                                                borderLeftColor: cfg.color,
                                                opacity: pressed ? 0.92 : 1,
                                                transform: [{ scale: pressed ? 0.985 : 1 }]
                                            })}
                                        >
                                            <View className="flex-row items-center justify-between mb-8">
                                                <Text className="text-white/30 text-[9px] font-black uppercase tracking-[0.4em]">{item.label}</Text>
                                                <cfg.icon size={15} color={cfg.color} strokeWidth={3} />
                                            </View>
                                            <Text className="text-white text-5xl font-black italic uppercase leading-none tracking-tighter" style={{ fontVariant: ["tabular-nums"] }}>
                                                {item.value ?? "—"}
                                            </Text>
                                            <View className="mt-6 h-[2px] w-full bg-white/5 overflow-hidden">
                                                <View className="h-full bg-[#8aff00]/50" style={{ width: "75%" }} />
                                            </View>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        ))
                    )}
                </View>

                {/* ━━━ LIVE PULSE ━━━ */}
                <Animated.View 
                    entering={FadeInDown.delay(200).duration(600)}
                    className="px-7 mb-24"
                >
                    <View className="flex-row items-center justify-between mb-12 border-b border-white/10 pb-6">
                        <Text className="text-white text-2xl font-black italic uppercase tracking-tighter">Live Sessions</Text>
                        <View className="flex-row items-center gap-3">
                            <View className="w-2 h-2 rounded-full bg-[#8aff00] animate-pulse" />
                            <Text className="text-xs font-black text-[#8aff00] uppercase tracking-[0.3em]">{bookings.length} ACTIVE</Text>
                        </View>
                    </View>

                    {loading && !data ? (
                        <View className="gap-5">
                            <Skeleton width="100%" height={100} borderRadius={1} />
                            <Skeleton width="100%" height={100} borderRadius={1} />
                        </View>
                    ) : bookings.length === 0 ? (
                        <View className="py-24 items-center bg-[#111] rounded-sm border border-dashed border-white/10">
                            <Activity size={32} color="#8aff00" opacity={0.1} />
                            <Text className="text-white/15 text-[11px] font-black uppercase tracking-[0.5em] mt-8">No Active Sessions</Text>
                        </View>
                    ) : (
                        <View className="gap-4">
                            {bookings.map((booking) => (
                                <Pressable
                                    key={booking.id}
                                    onPress={() => setDetail({ kind: "booking", ...booking, name: booking.serviceName, athlete: booking.athleteName, time: booking.startsAt, type: booking.type })}
                                    style={({ pressed }) => ({
                                        backgroundColor: "#111",
                                        paddingHorizontal: 22,
                                        paddingVertical: 24,
                                        flexDirection: "row",
                                        alignItems: "center",
                                        borderWidth: 1,
                                        borderColor: "rgba(255,255,255,0.06)",
                                        opacity: pressed ? 0.8 : 1
                                    })}
                                >
                                    <View className="w-14 h-14 bg-[#8aff00] items-center justify-center mr-6 rounded-none">
                                        <Users size={28} color="black" strokeWidth={3} />
                                    </View>
                                    <View className="flex-1 mr-4">
                                        <Text className="text-white font-black italic uppercase text-2xl leading-none tracking-tighter mb-3">{booking.athleteName}</Text>
                                        <Text className="text-[#8aff00] text-[10px] font-black uppercase tracking-[0.25em]">{booking.type?.replace("_", " ")}</Text>
                                    </View>
                                    <View className="items-end">
                                        <Text className="text-white/40 text-[13px] font-black uppercase tracking-widest mb-3" style={{ fontVariant: ["tabular-nums"] }}>
                                            {new Date(booking.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                        </Text>
                                        <ArrowUpRight size={20} color="#8aff00" strokeWidth={3} />
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    )}
                </Animated.View>

                {/* ━━━ COMMAND TERMINAL (Tactical 2x2 Grid) ━━━ */}
                <Animated.View
                    entering={FadeInDown.delay(300).duration(600)}
                    className="px-7 mb-24"
                >
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 32 }}>
                        <Text style={{ color: "rgba(255,255,255,0.3)", fontFamily: "Outfit-Black", fontSize: 10, textTransform: "uppercase", letterSpacing: 6 }}>Quick Actions</Text>
                        <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.1)", marginLeft: 20 }} />
                    </View>
                    
                    <View style={{ gap: 10, marginBottom: 10 }}>
                        {/* Primary 2x2 Grid */}
                        {chunk(commandActions.slice(0, 4), 2).map((row, rIdx) => (
                            <View key={`term-row-${rIdx}`} style={{ flexDirection: "row", gap: 10 }}>
                                {row.map((action) => (
                                    <Pressable
                                        key={action.id}
                                        onPress={action.onPress}
                                        style={({ pressed }) => ({
                                            flex: 1,
                                            height: 110,
                                            padding: 20,
                                            backgroundColor: "#111",
                                            borderWidth: 1,
                                            borderColor: "rgba(255,255,255,0.08)",
                                            justifyContent: "space-between",
                                            opacity: pressed ? 0.8 : 1,
                                            transform: [{ scale: pressed ? 0.98 : 1 }]
                                        })}
                                    >
                                        <View style={{ width: 36, height: 36, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center", borderSize: 1, borderColor: "rgba(255,255,255,0.1)" }}>
                                            <action.icon size={18} color={action.color} strokeWidth={2.5} />
                                        </View>
                                        <Text style={{ color: "white", fontFamily: "Outfit-Black", fontStyle: "italic", textTransform: "uppercase", fontSize: 11, letterSpacing: 1.5 }}>
                                            {action.label}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        ))}
                    </View>
                    
                    {/* Tactical Base Bar (5th Action) */}
                    {commandActions[4] && (() => {
                        const MasterIcon = commandActions[4].icon;
                        return (
                            <Pressable
                                onPress={commandActions[4].onPress}
                                style={({ pressed }) => ({
                                    width: "100%",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    paddingVertical: 18,
                                    paddingHorizontal: 22,
                                    backgroundColor: "#111",
                                    borderLeftWidth: 4,
                                    borderLeftColor: commandActions[4].color,
                                    borderWidth: 1,
                                    borderColor: "rgba(255,255,255,0.08)",
                                    opacity: pressed ? 0.8 : 1,
                                    transform: [{ scale: pressed ? 0.99 : 1 }]
                                })}
                            >
                                <View style={{ width: 40, height: 40, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center", marginRight: 16 }}>
                                    <MasterIcon size={20} color={commandActions[4].color} strokeWidth={2.5} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: "white", fontFamily: "Outfit-Black", fontStyle: "italic", textTransform: "uppercase", fontSize: 13, letterSpacing: 1 }}>{commandActions[4].label}</Text>
                                </View>
                                <ArrowUpRight size={18} color={commandActions[4].color} opacity={0.4} />
                            </Pressable>
                        );
                    })()}
                </Animated.View>

                <View className="px-7 gap-16">
                    {/* ━━━ Priority Actions ━━━ */}
                    <Animated.View entering={FadeInDown.delay(400).duration(600)}>
                        <View className="flex-row items-center justify-between mb-10">
                            <Text className="text-white text-2xl font-black italic uppercase tracking-wider">Task Queue</Text>
                            <View className="bg-warning/15 border border-warning/30 px-3 py-1.5">
                                <Text className="text-warning text-[9px] font-black uppercase tracking-[0.2em]">PENDING DATA</Text>
                            </View>
                        </View>
                        
                        {(data?.priorityQueue?.length ?? 0) === 0 ? (
                            <View className="py-20 items-center bg-[#111] rounded-sm border border-dashed border-white/10">
                                <CheckCircle2 size={36} color="#8aff00" opacity={0.1} />
                                <Text className="text-white/15 text-[11px] font-black uppercase tracking-[0.4em] mt-6">QUEUE SYNCHRONIZED</Text>
                            </View>
                        ) : (
                            <View className="gap-5">
                                {data?.priorityQueue?.map((item, idx) => (
                                    <Pressable
                                        key={idx}
                                        onPress={() => setDetail({ kind: "priority", title: item.title, detail: item.detail, status: item.status })}
                                        style={({ pressed }) => ({
                                            backgroundColor: "#111",
                                            padding: 28,
                                            borderLeftWidth: 4,
                                            borderLeftColor: colors.warning,
                                            opacity: pressed ? 0.8 : 1
                                        })}
                                    >
                                        <View className="flex-row justify-between items-center mb-5">
                                            <Text className="text-white font-black italic uppercase text-xl flex-1 mr-8 tracking-tighter leading-none">
                                                {item.title}
                                            </Text>
                                            <ChevronRight size={20} color="white" opacity={0.2} />
                                        </View>
                                        <Text className="text-white/40 font-outfit text-sm leading-7">
                                            {item.detail}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        )}
                    </Animated.View>

                    {/* ━━━ Top Athletes ━━━ */}
                    <Animated.View entering={FadeInDown.delay(500).duration(600)}>
                        <View className="flex-row items-center justify-between mb-10">
                            <Text className="text-white text-2xl font-black italic uppercase tracking-wider">Top Athletes</Text>
                            <Pressable 
                                onPress={() => requestAdminTab("admin-users")}
                                className="border-b-2 border-[#8aff00] pb-1.5"
                            >
                                <Text className="text-[11px] font-black text-[#8aff00] tracking-[0.3em] uppercase">REGISTRY</Text>
                            </Pressable>
                        </View>

                        <View className="gap-4">
                            {athletes.map((athlete, idx) => (
                                <Pressable
                                    key={idx}
                                    onPress={() => setDetail({ kind: "athlete", name: athlete.name, score: athlete.score, tier: athlete.tier })}
                                    style={({ pressed }) => ({
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        backgroundColor: "#111",
                                        paddingHorizontal: 22,
                                        paddingVertical: 20,
                                        borderWidth: 1,
                                        borderColor: "rgba(255,255,255,0.06)",
                                        opacity: pressed ? 0.8 : 1
                                    })}
                                >
                                    <View className="flex-row items-center gap-7 flex-1">
                                        <Text className="text-[#8aff00] font-black italic text-3xl w-12">0{idx + 1}</Text>
                                        <View className="flex-1">
                                            <Text className="text-white font-black italic uppercase text-xl tracking-tighter mb-1.5" numberOfLines={1}>
                                                {athlete.name}
                                            </Text>
                                            <Text className="text-white/25 text-[10px] font-black uppercase tracking-[0.2em]">
                                                {formatTierLabel(athlete.tier)}
                                            </Text>
                                        </View>
                                    </View>
                                    <View className="bg-white/5 px-5 py-3 border border-white/10">
                                        <Text className="text-white font-black italic text-2xl tracking-tighter">
                                            {athlete.score}
                                        </Text>
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    </Animated.View>
                </View>

                {/* ━━━ Detail Modal ━━━ */}
                <Modal
                    visible={detail != null}
                    animationType="slide"
                    presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
                    onRequestClose={() => setDetail(null)}
                >
                    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
                        <View className="w-14 h-1 bg-white/10 rounded-full self-center my-8" />
                        <ThemedScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 + insets.bottom }}>
                            <View className="mb-14">
                                <Text className="text-[#8aff00] text-[11px] font-black uppercase tracking-[0.4em] mb-5">Metric Analysis</Text>
                                <Text className="text-white text-5xl font-black italic uppercase tracking-tighter leading-none">
                                    {detail?.kind === "stat" ? detail.label : detail?.kind === "booking" ? detail.name : detail?.kind === "athlete" ? detail.name : detail?.title}
                                </Text>
                            </View>
                            
                            <View className="bg-[#111] p-10 rounded-sm border border-white/10 mb-10">
                                {detail?.kind === "stat" && (
                                    <View className="items-center py-8">
                                        <Text className="text-white/30 text-[11px] font-black uppercase tracking-[0.35em] mb-8 text-center">Live Operational Data</Text>
                                        <Text className="text-white text-9xl font-black italic tracking-tighter">{detail.value}</Text>
                                        <View className="mt-14 px-8 py-4 bg-[#8aff00] w-full items-center">
                                            <Text className="text-black font-black uppercase tracking-[0.2em] text-sm italic">SYNCHRONIZED</Text>
                                        </View>
                                    </View>
                                )}
                                {detail?.kind === "booking" && (
                                    <View className="w-full gap-5">
                                        <DetailRow label="Athlete" value={detail.athlete} icon={Users} />
                                        <DetailRow label="Schedule" value={new Date(detail.time).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} icon={Clock} />
                                        <DetailRow label="Category" value={detail.type} icon={Layers} />
                                    </View>
                                )}
                                {detail?.kind === "athlete" && (
                                    <View className="w-full gap-5">
                                        <DetailRow label="Performance Index" value={detail.score} icon={Trophy} />
                                        <DetailRow label="Tier Classification" value={formatTierLabel(detail.tier)} icon={Shield} />
                                    </View>
                                )}
                                {detail?.kind === "priority" && (
                                    <View className="w-full">
                                        <View className="flex-row items-center gap-4 mb-10">
                                            <AlertCircle size={24} color={colors.warning} />
                                            <Text className="text-warning font-black italic uppercase text-lg tracking-widest">{detail.status || "ACTION REQUIRED"}</Text>
                                        </View>
                                        <View className="bg-white/5 p-10 border border-white/10">
                                            <Text className="text-white font-outfit text-2xl leading-relaxed opacity-90 italic">{detail.detail}</Text>
                                        </View>
                                        <UIButton 
                                            label="Execute Command" 
                                            variant="primary" 
                                            className="mt-14 h-16 rounded-none bg-[#8aff00]"
                                            textClassName="text-black font-black italic uppercase tracking-[0.2em]"
                                            onPress={() => setDetail(null)}
                                        />
                                    </View>
                                )}
                            </View>

                            {detail?.kind !== "priority" && (
                                <View className="gap-5">
                                    <UIButton 
                                        label="Open System Registry" 
                                        variant="primary" 
                                        className="h-16 rounded-none bg-[#8aff00]"
                                        textClassName="text-black font-black italic uppercase tracking-[0.2em]"
                                        onPress={() => setDetail(null)}
                                    />
                                    <UIButton 
                                        label="Export Terminal Data" 
                                        variant="outline" 
                                        className="h-16 rounded-none border-white/20"
                                        textClassName="text-white font-black italic uppercase tracking-[0.2em]"
                                        onPress={() => setDetail(null)}
                                    />
                                </View>
                            )}
                        </ThemedScrollView>
                    </View>
                </Modal>
            </ThemedScrollView>
        </View>
    );
}

function DetailRow({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color?: string }) {
    const { colors } = useAppTheme();
    return (
        <View className="flex-row items-center justify-between py-4 border-b border-app/5">
            <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-lg bg-app/5 items-center justify-center">
                    <Icon size={16} color={colors.textSecondary} />
                </View>
                <Text className="text-secondary font-outfit text-sm">{label}</Text>
            </View>
            <Text className="text-app font-bold font-clash text-base" style={color ? { color } : {}}>{value}</Text>
        </View>
    );
}
