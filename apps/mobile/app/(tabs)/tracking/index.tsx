import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { 
  User, 
  Play, 
  ArrowRight, 
  Activity, 
  Trophy, 
  Timer, 
  Map as MapIcon, 
  Zap, 
  History, 
  Heart,
  ChevronRight,
  TrendingUp,
  Clock
} from "lucide-react-native";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming
} from "react-native-reanimated";
import { fonts, radius, spacing } from "@/constants/theme";
import { getPersonalBests, getRecentRuns, getWeeklySummaries, initSQLiteRuns, RunRecord } from "../../../lib/sqliteRuns";
import { RunCard } from "../../../components/tracking/RunCard";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useFocusEffect } from "@react-navigation/native";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Text } from "@/components/ScaledText";
import { useSafeIsFocused } from "@/hooks/navigation/useSafeReactNavigation";
import { formatDurationClock, formatHoursMinutes } from "../../../lib/tracking/runUtils";
import { getLastNDaysLabel, getLastNDaysRangeLabel } from "../../../lib/tracking/dateRange";
import { useRunStore } from "../../../store/useRunStore";
import { syncRuns } from "../../../lib/runSync";
import { trackingScrollBottomPad } from "../../../lib/tracking/mainTabBarInset";
import { TrackingHeaderTabs } from "@/components/tracking/TrackingHeaderTabs";
import { apiRequest } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { enrichTeamFieldsIfOnboardingHasThem } from "@/lib/auth/enrichTeamFromOnboarding";
import { resolveAppRole } from "@/lib/appRole";
import { hasOrgTeamMembership } from "@/lib/teamMembership";
import { shouldUseTeamTrackingFeatures } from "@/lib/tracking/teamTrackingGate";
import {
  setApiUserRole,
  setAppRole,
  setAuthTeamMembership,
} from "@/store/slices/userSlice";

const QUOTES = [
  "Rest is a weapon. Use it wisely.", // Sunday
  "Never miss a Monday.", // Monday
  "Discipline eats motivation for breakfast.", // Tuesday
  "Halfway there. Keep pushing.", // Wednesday
  "Every run is a step towards a stronger you.", // Thursday
  "Finish strong.", // Friday
  "Long run day. Enjoy the miles." // Saturday
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function TrackingHomeScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors, isDark } = useAppTheme();
  const token = useAppSelector((s) => s.user.token);
  const appRole = useAppSelector((s) => s.user.appRole);
  const authTeamMembership = useAppSelector((s) => s.user.authTeamMembership);
  const managedAthletes = useAppSelector((s) => s.user.managedAthletes);
  
  const [directMeTeam, setDirectMeTeam] = useState<{
    team: string | null;
    teamId: number | null;
  } | null | undefined>(undefined);

  const loadMeForTeamHeader = useCallback(async () => {
    if (!token) return;
    try {
      const me = await apiRequest<{
        user?: {
          role?: string | null;
          team?: unknown;
          teamId?: unknown;
          athleteType?: "youth" | "adult" | null;
        };
      }>("/auth/me", {
        token,
        forceRefresh: true,
        suppressStatusCodes: [401, 403],
      });
      if (!me.user) {
        setDirectMeTeam(null);
        return;
      }

      const { fields, athleteType: athleteTypeForRole } =
        await enrichTeamFieldsIfOnboardingHasThem({
          token,
          meUser: me.user,
        });

      setDirectMeTeam(fields);
      dispatch(setAuthTeamMembership(fields));
      dispatch(setApiUserRole(me.user.role ?? null));
      dispatch(
        setAppRole(
          resolveAppRole({
            userRole: me.user.role ?? "guardian",
            athlete: {
              ...fields,
              athleteType: athleteTypeForRole,
            },
          }),
        ),
      );
    } catch (err) {
      setDirectMeTeam(null);
    }
  }, [token, dispatch]);

  useFocusEffect(
    useCallback(() => {
      void loadMeForTeamHeader();
    }, [loadMeForTeamHeader]),
  );

  const showTeamTab = useMemo(() => {
    const fromDirectFetch =
      directMeTeam != null && hasOrgTeamMembership(directMeTeam);
    const fromRedux = shouldUseTeamTrackingFeatures({
      appRole,
      authTeamMembership,
      firstManagedAthlete: managedAthletes[0] ?? null,
    });
    return fromDirectFetch || fromRedux;
  }, [directMeTeam, appRole, authTeamMembership, managedAthletes]);

  const insets = useAppSafeAreaInsets();
  const isFocused = useSafeIsFocused(true);
  const [recentRuns, setRecentRuns] = useState<RunRecord[]>([]);
  const [weeklyStats, setWeeklyStats] = useState({ totalDistance: 0, totalTime: 0, numRuns: 0 });
  const [personalBests, setPersonalBests] = useState(() => getPersonalBests());
  const { resetRun } = useRunStore();

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);
  const scaleBtn = useSharedValue(1);
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    initSQLiteRuns();
    loadStats();
    opacity.value = withTiming(1, { duration: 400 });
    translateY.value = withSpring(0, { damping: 20, stiffness: 150 });
    syncRuns().then(() => loadStats());
  }, []);

  useEffect(() => {
    if (!isFocused) return;
    syncRuns().then(() => loadStats());
  }, [isFocused]);

  useEffect(() => {
    const goalKm = 30;
    const currentKm = weeklyStats.totalDistance / 1000;
    const percentage = Math.min(Math.max((currentKm / goalKm) * 100, 0), 100);
    progressWidth.value = withSpring(percentage, { damping: 20, stiffness: 100 });
  }, [weeklyStats.totalDistance]);

  const loadStats = () => {
    try {
      setRecentRuns(getRecentRuns(3));
      setWeeklyStats(getWeeklySummaries());
      setPersonalBests(getPersonalBests());
    } catch (err) {
      console.warn("Database empty or error querying", err);
    }
  };

  const handleStartRun = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    scaleBtn.value = withSpring(0.96, { damping: 15, stiffness: 300 });
    setTimeout(() => {
      scaleBtn.value = withSpring(1, { damping: 15, stiffness: 300 });
      resetRun();
      router.push("/(tabs)/tracking/run-setup" as any);
    }, 80);
  };

  const animatedScreenStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }]
  }));

  const animatedBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleBtn.value }]
  }));

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%` as any
  }));

  const formatDistance = (meters: number) => (meters / 1000).toFixed(1);
  const weeklyTime = formatHoursMinutes(weeklyStats.totalTime);
  const todayQuote = QUOTES[new Date().getDay()];
  const weeklyRangeLabel = getLastNDaysRangeLabel(7);
  const weeklyRangeShortLabel = getLastNDaysLabel(7);

  // Design Tokens
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const accentMuted = `${colors.accent}15`;

  return (
    <Animated.View style={[animatedScreenStyle, { flex: 1, backgroundColor: colors.background }]}>
      <ScrollView 
        bounces={true} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingTop: 0,
          paddingBottom: trackingScrollBottomPad(insets),
          flexGrow: 1,
          alignItems: "stretch",
        }}
      >
        <TrackingHeaderTabs
          active="running"
          colors={colors}
          isDark={isDark}
          topInset={insets.top + 12}
          paddingHorizontal={0}
          showTeamTab={showTeamTab}
        />

        {/* Header Section */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.xl }}>
          <View>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.textSecondary, marginBottom: -4 }}>
              READY TO
            </Text>
            <Text style={{ fontFamily: fonts.heroNumber, fontSize: 56, color: colors.accent, letterSpacing: -2, lineHeight: 56 }}>
              Run?
            </Text>
          </View>
          <Pressable 
            style={({ pressed }) => ({ 
              width: 48, 
              height: 48, 
              borderRadius: radius.pill, 
              backgroundColor: cardBg, 
              borderWidth: 1, 
              borderColor: cardBorder,
              justifyContent: 'center', 
              alignItems: 'center',
              opacity: pressed ? 0.8 : 1
            })}
          >
            <User size={24} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Hero START RUN Button */}
        <AnimatedPressable 
          onPress={handleStartRun}
          style={[animatedBtnStyle, {
            width: '100%',
            height: 100,
            borderRadius: radius.xxl,
            backgroundColor: colors.accent,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing.xl,
            marginBottom: spacing.xxl,
            overflow: "hidden",
            ...(isDark ? {} : {
              shadowColor: colors.accent,
              shadowOpacity: 0.25,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 12 },
              elevation: 8,
            }),
          }]}
        >
          {/* Subtle background graphic hint */}
          <View style={{ position: "absolute", right: -20, bottom: -20, opacity: 0.1 }}>
             <Play size={160} color="#FFF" fill="#FFF" />
          </View>

          <View style={{ 
            width: 56, 
            height: 56, 
            borderRadius: radius.pill, 
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            justifyContent: 'center', 
            alignItems: 'center',
            marginRight: spacing.lg
          }}>
            <Play size={32} color="#FFF" fill="#FFF" strokeWidth={0} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.heading1, fontSize: 24, color: "#FFF", letterSpacing: 0.5 }}>START RUN</Text>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: "#FFF", opacity: 0.7 }}>Lace up and hit the road</Text>
          </View>
          <ArrowRight size={24} color="#FFF" strokeWidth={3} />
        </AnimatedPressable>

        {/* This Week Stats Card */}
        <View style={{ 
          backgroundColor: colors.surface, 
          borderColor: cardBorder, 
          borderWidth: 1, 
          borderRadius: radius.xxl, 
          padding: spacing.xl, 
          marginBottom: spacing.xxl 
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 28, height: 28, borderRadius: radius.md, backgroundColor: accentMuted, alignItems: "center", justifyContent: "center" }}>
                <Activity size={16} color={colors.accent} strokeWidth={2.5} />
              </View>
              <Text style={{ fontFamily: fonts.labelCaps, fontSize: 11, color: colors.textSecondary, letterSpacing: 2 }}>WEEKLY PROGRESS</Text>
            </View>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textDim }}>{weeklyRangeLabel}</Text>
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.labelMedium, fontSize: 11, color: colors.textDim, marginBottom: 4 }}>DISTANCE</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={{ fontFamily: fonts.heroDisplay, fontSize: 32, color: colors.accent, fontVariant: ['tabular-nums'] }}>
                  {formatDistance(weeklyStats.totalDistance)}
                </Text>
                <Text style={{ fontFamily: fonts.labelMedium, fontSize: 12, color: colors.textSecondary, marginLeft: 2 }}>km</Text>
              </View>
            </View>
            
            <View style={{ width: 1, backgroundColor: colors.borderSubtle, marginHorizontal: spacing.md }} />
            
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.labelMedium, fontSize: 11, color: colors.textDim, marginBottom: 4 }}>TIME</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={{ fontFamily: fonts.heroDisplay, fontSize: 32, color: colors.textPrimary, fontVariant: ['tabular-nums'] }}>
                  {weeklyTime.h}
                </Text>
                <Text style={{ fontFamily: fonts.labelMedium, fontSize: 12, color: colors.textSecondary, marginHorizontal: 1 }}>h</Text>
                <Text style={{ fontFamily: fonts.heroDisplay, fontSize: 32, color: colors.textPrimary, fontVariant: ['tabular-nums'] }}>
                  {weeklyTime.m}
                </Text>
                <Text style={{ fontFamily: fonts.labelMedium, fontSize: 12, color: colors.textSecondary, marginLeft: 1 }}>m</Text>
              </View>
            </View>

            <View style={{ width: 1, backgroundColor: colors.borderSubtle, marginHorizontal: spacing.md }} />
            
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
               <Text style={{ fontFamily: fonts.labelMedium, fontSize: 11, color: colors.textDim, marginBottom: 4 }}>RUNS</Text>
               <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={{ fontFamily: fonts.heroDisplay, fontSize: 32, color: colors.purple, fontVariant: ['tabular-nums'] }}>
                  {weeklyStats.numRuns}
                </Text>
              </View>
            </View>
          </View>

          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary }}>
                Goal: <Text style={{ color: colors.textPrimary }}>30km</Text>
              </Text>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: colors.accent }}>
                {Math.min(Math.max(Math.round((weeklyStats.totalDistance / 1000 / 30) * 100), 0), 100)}%
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: colors.surfaceHigh, borderRadius: radius.pill, overflow: 'hidden' }}>
              <Animated.View style={[animatedProgressStyle, { height: '100%', backgroundColor: colors.accent, borderRadius: radius.pill }]} />
            </View>
          </View>
        </View>

        {/* Personal Bests Section */}
        <View style={{ marginBottom: spacing.xxl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg, gap: 8 }}>
            <Trophy size={16} color={colors.amber} strokeWidth={2.5} />
            <Text style={{ fontFamily: fonts.labelCaps, fontSize: 11, color: colors.textSecondary, letterSpacing: 2 }}>PERSONAL BESTS</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: spacing.xl }}>
            <PBItem 
              label="5K Best" 
              value={personalBests.best5kSeconds ? formatDurationClock(personalBests.best5kSeconds) : "--"} 
              icon={Timer} 
              color={colors.amber} 
              cardBg={colors.surface} 
              cardBorder={cardBorder} 
              textPrimary={colors.textPrimary}
              textDim={colors.textDim}
            />
            <PBItem 
              label="Longest Run" 
              value={personalBests.longestRunMeters ? `${(personalBests.longestRunMeters / 1000).toFixed(1)} km` : "--"} 
              icon={MapIcon} 
              color={colors.purple} 
              cardBg={colors.surface} 
              cardBorder={cardBorder} 
              textPrimary={colors.textPrimary}
              textDim={colors.textDim}
            />
            <PBItem 
              label="Best Pace" 
              value={personalBests.bestPaceMinPerKm ? `${personalBests.bestPaceMinPerKm.toFixed(2)} /km` : "--"} 
              icon={Zap} 
              color={colors.cyan} 
              cardBg={colors.surface} 
              cardBorder={cardBorder} 
              textPrimary={colors.textPrimary}
              textDim={colors.textDim}
            />
          </ScrollView>
        </View>

        {/* Recent Runs Section */}
        <View style={{ marginBottom: spacing.xxl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <History size={16} color={colors.textSecondary} strokeWidth={2} />
              <Text style={{ fontFamily: fonts.labelCaps, fontSize: 11, color: colors.textSecondary, letterSpacing: 2 }}>RECENT RUNS</Text>
            </View>
            <Pressable style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: pressed ? 0.7 : 1 })}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accent }}>See all</Text>
              <ChevronRight size={14} color={colors.accent} strokeWidth={3} />
            </Pressable>
          </View>

          {recentRuns.length === 0 ? (
            <View style={{ 
              backgroundColor: colors.surface, 
              borderColor: cardBorder, 
              borderWidth: 1, 
              borderRadius: radius.xxl, 
              padding: spacing.xxl, 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <View style={{ 
                width: 80, 
                height: 80, 
                borderRadius: 40, 
                backgroundColor: colors.surfaceHigh, 
                justifyContent: 'center', 
                alignItems: 'center',
                marginBottom: spacing.lg
              }}>
                <TrendingUp size={40} color={colors.textDim} strokeWidth={1} />
              </View>
              <Text style={{ fontFamily: fonts.heading2, fontSize: 20, color: colors.textPrimary }}>No runs yet</Text>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textDim, marginTop: 4, marginBottom: spacing.xl }}>Time to lace up and hit the road!</Text>
              
              <Pressable 
                onPress={handleStartRun}
                style={({ pressed }) => ({
                  backgroundColor: colors.accent,
                  borderRadius: radius.pill,
                  paddingHorizontal: spacing.xl,
                  paddingVertical: spacing.md,
                  opacity: pressed ? 0.9 : 1
                })}
              >
                <Text style={{ fontFamily: fonts.heading3, fontSize: 15, color: "#FFF" }}>START FIRST RUN</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: 14 }}>
	              {recentRuns.map((run) => (
	                <RunCard 
	                  key={run.id}
	                  distance={formatDistance(run.distance_meters)}
	                  date={new Date(run.date).toLocaleDateString()}
	                  time={formatDurationClock(run.duration_seconds)}
	                  pace={`${Number.isFinite(run.avg_pace) ? run.avg_pace.toFixed(2) : "0.00"}/km`}
	                  effortLevel={run.effort_level}
	                />
	              ))}
            </View>
          )}
        </View>

        {/* Motivational Footer */}
        <View style={{ alignItems: 'center', paddingVertical: spacing.xl, marginBottom: spacing.xl }}>
	          <Heart size={16} color={colors.coral} fill={colors.coral} style={{ marginBottom: spacing.sm }} />
	          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textDim, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: spacing.xxl }}>
	            {`"${todayQuote}"`}
	          </Text>
	        </View>
      </ScrollView>
    </Animated.View>
  );
}

function PBItem({ label, value, icon: Icon, color, cardBg, cardBorder, textPrimary, textDim }: { label: string; value: string; icon: any; color: string; cardBg: string; cardBorder: string; textPrimary: string; textDim: string }) {
  return (
    <View style={{ 
      width: 140, 
      backgroundColor: cardBg, 
      borderColor: cardBorder, 
      borderWidth: 1, 
      borderRadius: radius.xl, 
      padding: spacing.lg,
      position: 'relative',
      overflow: 'hidden'
    }}>
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: color }} />
      <Icon size={18} color={color} style={{ marginBottom: spacing.sm }} strokeWidth={2.5} />
      <Text style={{ fontFamily: fonts.statNumber, fontSize: 20, color: textPrimary, fontVariant: ['tabular-nums'], marginBottom: 2 }}>
        {value}
      </Text>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: textDim }}>{label}</Text>
    </View>
  );
}

