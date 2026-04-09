import React, { useEffect, useState } from "react";
import { View, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming
} from "react-native-reanimated";
import { fonts, radius, spacing, icons } from "@/constants/theme";
import { getPersonalBests, getRecentRuns, getWeeklySummaries, initSQLiteRuns, RunRecord } from "../../../lib/sqliteRuns";
import { RunCard } from "../../../components/tracking/RunCard";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ScaledText";
import { useIsFocused } from "@react-navigation/native";
import { formatDurationClock, formatHoursMinutes } from "../../../lib/tracking/runUtils";
import { getLastNDaysLabel, getLastNDaysRangeLabel } from "../../../lib/tracking/dateRange";
import { RunGoalSheet } from "../../../components/tracking/RunGoalSheet";
import { useRunStore } from "../../../store/useRunStore";
import { syncRuns } from "../../../lib/runSync";

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
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [recentRuns, setRecentRuns] = useState<RunRecord[]>([]);
  const [weeklyStats, setWeeklyStats] = useState({ totalDistance: 0, totalTime: 0, numRuns: 0 });
  const [personalBests, setPersonalBests] = useState(() => getPersonalBests());
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);
  const { setGoalKm, setDestination } = useRunStore();

  // Screen entry animation
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);

  // START RUN button press animation
  const scaleBtn = useSharedValue(1);

  // Progress bar animation
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    initSQLiteRuns();
    loadStats();
    
    // Entry animations
    opacity.value = withTiming(1, { duration: 350 });
    translateY.value = withSpring(0, { damping: 18, stiffness: 200 });

    // Cloud sync on mount (fire-and-forget)
    syncRuns().then(() => loadStats());
  }, []);

  useEffect(() => {
    if (!isFocused) return;
    // Reload local stats and sync with cloud
    syncRuns().then(() => loadStats());
  }, [isFocused]);

  useEffect(() => {
    // Goal animation (assuming 30km goal)
    const goalKm = 30;
    const currentKm = weeklyStats.totalDistance / 1000;
    const percentage = Math.min(Math.max((currentKm / goalKm) * 100, 0), 100);
    // Animate width later in layout
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
    scaleBtn.value = withSpring(0.97, { damping: 15, stiffness: 300 });
    setTimeout(() => {
      scaleBtn.value = withSpring(1, { damping: 15, stiffness: 300 });
      setGoalSheetOpen(true);
    }, 100);
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

  return (
    <Animated.View style={[animatedScreenStyle, { flex: 1, backgroundColor: colors.background }]}>
      <ScrollView 
        bounces={true} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: insets.top + 24, paddingBottom: 40 }}
      >
        {/* Section 1 - Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xxxl }}>
          <View>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.textSecondary }}>Let's</Text>
            <Text style={{ fontFamily: fonts.heroNumber, fontSize: 52, color: colors.accent, letterSpacing: -2, lineHeight: 52 }}>Run.</Text>
          </View>
          <View 
            style={{ 
              width: 44, 
              height: 44, 
              borderRadius: radius.pill, 
              backgroundColor: colors.surfaceHigh, 
              borderWidth: 1, 
              borderColor: colors.borderMid,
              justifyContent: 'center', 
              alignItems: 'center' 
            }}
          >
            <Ionicons name={icons.person.name as any} size={28} color={colors.textSecondary} />
          </View>
        </View>

        {/* Section 2 - START RUN hero button */}
        <AnimatedPressable 
          onPress={handleStartRun}
          onPressIn={() => scaleBtn.value = withSpring(0.97, { damping: 15, stiffness: 300 })}
          onPressOut={() => scaleBtn.value = withSpring(1, { damping: 15, stiffness: 300 })}
          style={[animatedBtnStyle, {
            width: '100%',
            height: 90,
            borderRadius: radius.xxl,
            backgroundColor: colors.accent,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing.lg,
            marginBottom: spacing.xxxl,
            ...(isDark
              ? {}
              : {
                  shadowColor: colors.accent,
                  shadowOpacity: 0.18,
                  shadowRadius: 18,
                  shadowOffset: { width: 0, height: 10 },
                  elevation: 6,
                }),
          }]}
        >
          <View style={{ 
            width: 52, 
            height: 52, 
            borderRadius: radius.pill, 
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            justifyContent: 'center', 
            alignItems: 'center',
            marginRight: spacing.md
          }}>
            <MaterialCommunityIcons name={icons.startRun.name as any} size={32} color={colors.textInverse} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.heading1, fontSize: 22, color: colors.textInverse }}>START RUN</Text>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textInverse, opacity: 0.6 }}>Tap to begin</Text>
          </View>
          <Ionicons name={icons.arrowRight.name as any} size={24} color={colors.textInverse} />
        </AnimatedPressable>

        {/* Section 3 - THIS WEEK card */}
        <View style={{ 
          backgroundColor: colors.surface, 
          borderColor: colors.borderSubtle, 
          borderWidth: 1, 
          borderRadius: radius.xl, 
          padding: spacing.lg, 
          marginBottom: spacing.xxl 
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name={icons.chart.name as any} size={18} color={colors.accent} style={{ marginRight: spacing.xs }} />
              <Text style={{ fontFamily: fonts.labelCaps, fontSize: 11, color: colors.textSecondary, letterSpacing: 2.5 }}>THIS WEEK</Text>
            </View>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textDim }}>{weeklyRangeLabel}</Text>
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg }}>
            <View style={{ flex: 1, alignItems: 'flex-start' }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={{ fontFamily: fonts.heroDisplay, fontSize: 36, color: colors.accent, fontVariant: ['tabular-nums'] }}>
                  {formatDistance(weeklyStats.totalDistance)}
                </Text>
                <Text style={{ fontFamily: fonts.labelMedium, fontSize: 13, color: colors.textSecondary, marginLeft: 4 }}>km</Text>
              </View>
            </View>
            
            <View style={{ width: 1, backgroundColor: colors.borderMid, marginHorizontal: spacing.sm }} />
            
            <View style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={{ fontFamily: fonts.heroDisplay, fontSize: 36, color: colors.textPrimary, fontVariant: ['tabular-nums'] }}>
                  {weeklyTime.h}
                </Text>
                <Text style={{ fontFamily: fonts.labelMedium, fontSize: 13, color: colors.textSecondary, marginHorizontal: 2 }}>h</Text>
                <Text style={{ fontFamily: fonts.heroDisplay, fontSize: 36, color: colors.textPrimary, fontVariant: ['tabular-nums'] }}>
                  {weeklyTime.m}
                </Text>
                <Text style={{ fontFamily: fonts.labelMedium, fontSize: 13, color: colors.textSecondary, marginLeft: 2 }}>m</Text>
              </View>
            </View>

            <View style={{ width: 1, backgroundColor: colors.borderMid, marginHorizontal: spacing.sm }} />
            
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
               <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={{ fontFamily: fonts.heroDisplay, fontSize: 36, color: colors.purple, fontVariant: ['tabular-nums'] }}>
                  {weeklyStats.numRuns}
                </Text>
                <Text style={{ fontFamily: fonts.labelMedium, fontSize: 13, color: colors.textSecondary, marginLeft: 4 }}>runs</Text>
              </View>
            </View>
          </View>

          {/* Bottom mini progress bar */}
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary }}>{weeklyRangeShortLabel} goal: 30km</Text>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary }}>
                {Math.min(Math.max(Math.round((weeklyStats.totalDistance / 1000 / 30) * 100), 0), 100)}%
              </Text>
            </View>
            <View style={{ height: 4, backgroundColor: colors.surfaceHigh, borderRadius: radius.pill, overflow: 'hidden' }}>
              <Animated.View style={[animatedProgressStyle, { height: '100%', backgroundColor: colors.accent, borderRadius: radius.pill }]} />
            </View>
          </View>
        </View>

        {/* Section 4 - Personal Bests strip */}
        <View style={{ marginBottom: spacing.xxl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
            <MaterialCommunityIcons name={icons.trophy.name as any} size={18} color={colors.amber} style={{ marginRight: spacing.xs }} />
            <Text style={{ fontFamily: fonts.labelCaps, fontSize: 11, color: colors.textSecondary, letterSpacing: 2.5 }}>PERSONAL BESTS</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            <View style={{ width: 130, height: 90, backgroundColor: colors.surface, borderColor: colors.borderMid, borderWidth: 1, borderRadius: radius.xl, padding: spacing.md }}>
              <View style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, backgroundColor: colors.amber, borderTopRightRadius: radius.pill, borderBottomRightRadius: radius.pill }} />
              <MaterialCommunityIcons name={icons.timer.name as any} size={20} color={colors.amber} style={{ marginBottom: spacing.xs }} />
              <Text style={{ fontFamily: fonts.statNumber, fontSize: 22, color: colors.textPrimary, fontVariant: ['tabular-nums'] }}>
                {personalBests.best5kSeconds ? formatDurationClock(personalBests.best5kSeconds) : "--"}
              </Text>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textSecondary }}>5K Best</Text>
            </View>

            <View style={{ width: 130, height: 90, backgroundColor: colors.surface, borderColor: colors.borderMid, borderWidth: 1, borderRadius: radius.xl, padding: spacing.md }}>
              <View style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, backgroundColor: colors.purple, borderTopRightRadius: radius.pill, borderBottomRightRadius: radius.pill }} />
              <MaterialCommunityIcons name={icons.distance.name as any} size={20} color={colors.purple} style={{ marginBottom: spacing.xs }} />
              <Text style={{ fontFamily: fonts.statNumber, fontSize: 22, color: colors.textPrimary, fontVariant: ['tabular-nums'] }}>
                {personalBests.longestRunMeters ? (personalBests.longestRunMeters / 1000).toFixed(1) : "--"}
              </Text>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textSecondary }}>Longest Run (km)</Text>
            </View>

            <View style={{ width: 130, height: 90, backgroundColor: colors.surface, borderColor: colors.borderMid, borderWidth: 1, borderRadius: radius.xl, padding: spacing.md }}>
              <View style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, backgroundColor: colors.cyan, borderTopRightRadius: radius.pill, borderBottomRightRadius: radius.pill }} />
              <Ionicons name={icons.speed.name as any} size={20} color={colors.cyan} style={{ marginBottom: spacing.xs }} />
              <Text style={{ fontFamily: fonts.statNumber, fontSize: 22, color: colors.textPrimary, fontVariant: ['tabular-nums'] }}>
                {personalBests.bestPaceMinPerKm ? personalBests.bestPaceMinPerKm.toFixed(2) : "--"}
              </Text>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textSecondary }}>Best Pace (min/km)</Text>
            </View>
          </ScrollView>
        </View>

        {/* Section 5 - Recent Runs */}
        <View style={{ marginBottom: spacing.xxl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name={icons.history.name as any} size={18} color={colors.textSecondary} style={{ marginRight: spacing.xs }} />
              <Text style={{ fontFamily: fonts.labelCaps, fontSize: 11, color: colors.textSecondary, letterSpacing: 2.5 }}>RECENT RUNS</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.accent, marginRight: spacing.xs }}>See all</Text>
              <Ionicons name={icons.arrowRight.name as any} size={14} color={colors.accent} />
            </View>
          </View>

          {recentRuns.length === 0 ? (
            <View style={{ 
              backgroundColor: colors.surface, 
              borderColor: colors.borderSubtle, 
              borderWidth: 1, 
              borderRadius: radius.xl, 
              padding: spacing.xxl, 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <View style={{ 
                width: 80, 
                height: 80, 
                borderRadius: radius.pill, 
                backgroundColor: colors.surfaceHigh, 
                borderColor: colors.borderSubtle, 
                borderWidth: 1, 
                justifyContent: 'center', 
                alignItems: 'center',
                marginBottom: spacing.md
              }}>
                <MaterialCommunityIcons name={icons.startRun.name as any} size={52} color={colors.textDim} />
              </View>
              <Text style={{ fontFamily: fonts.heading2, fontSize: 20, color: colors.textSecondary, marginTop: spacing.md }}>No runs yet</Text>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textDim, marginTop: 4, marginBottom: spacing.lg }}>Lace up and go</Text>
              
              <Pressable 
                onPress={handleStartRun}
                style={{
                  backgroundColor: 'transparent',
                  borderColor: colors.borderMid,
                  borderWidth: 1,
                  borderRadius: radius.xxl,
                  paddingHorizontal: spacing.xl,
                  paddingVertical: spacing.md
                }}
              >
                <Text style={{ fontFamily: fonts.heading3, fontSize: 15, color: colors.accent }}>START RUN</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
	              {recentRuns.map((run) => (
                  // Note: avg_pace is stored in minutes per km.
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

        {/* Section 6 - Motivational quote footer */}
        <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
          <Ionicons name={icons.heart.name as any} size={14} color={colors.coral} style={{ marginBottom: spacing.sm }} />
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center' }}>
            "{todayQuote}"
          </Text>
        </View>
      </ScrollView>

      <RunGoalSheet
        visible={goalSheetOpen}
        onClose={() => setGoalSheetOpen(false)}
        onConfirm={(goalKm, destination) => {
          setGoalKm(goalKm);
          setDestination(destination);
          router.push("/(tabs)/tracking/active-run" as any);
        }}
      />
    </Animated.View>
  );
}
