import React, { memo, useCallback, useRef } from "react";
import {
  InteractionManager,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  withSpring,
  useReducedMotion,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAppSelector } from "@/store/hooks";
import { Text } from "@/components/ScaledText";
import { SkeletonHomeScreen } from "@/components/ui/Skeleton";
import { useWatchHistoryStore } from "@/lib/mmkv";
import { getRecentRuns, getWeeklySummaries, type RunRecord } from "@/lib/sqliteRuns";

import { AdminStorySection } from "@/components/home/AdminStorySection";
import { IntroVideoSection } from "@/components/home/IntroVideoSection";
import { QuickLinksSection } from "@/components/home/QuickLinksSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { useHomeContent } from "@/hooks/home/useHomeContent";
import { selectBootstrapReady } from "@/store/slices/appSlice";

// ── Constants ────────────────────────────────────────────────────────

const HEADER_HEIGHT = 56;
const BLUR_THRESHOLD = 60;

// ── Helpers ──────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatKm(m: number): string {
  return (m / 1000).toFixed(1);
}

function formatTime(sec: number): string {
  const hrs = sec / 3600;
  return hrs >= 1 ? `${hrs.toFixed(1)}` : `${Math.round(sec / 60)}m`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ── Data hooks ───────────────────────────────────────────────────────

function useWeeklyStats(userId: string | null) {
  return useQuery({
    queryKey: ["home", "weeklyStats", userId],
    queryFn: () => getWeeklySummaries(new Date(), userId),
    staleTime: 5 * 60 * 1000,
  });
}

function useRecentActivity(userId: string | null) {
  return useQuery({
    queryKey: ["home", "recentActivity", userId],
    queryFn: () => getRecentRuns(20, userId),
    staleTime: 5 * 60 * 1000,
  });
}

// ── Activity row ─────────────────────────────────────────────────────

interface ActivityItemProps {
  item: RunRecord;
  index: number;
  isLast: boolean;
  shouldAnimate: boolean;
  onPress: (id: string) => void;
}

const ActivityItem = memo(function ActivityItem({
  item,
  index,
  isLast,
  shouldAnimate,
  onPress,
}: ActivityItemProps) {
  const { colors, isDark } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const handlePress = useCallback(() => onPress(item.id), [item.id, onPress]);

  // Robis: tinted not pure — icon bg
  const iconBg = isDark ? "hsl(220, 8%, 16%)" : "hsl(220, 8%, 94%)";
  // Robis: explicit colors instead of opacity hack
  const dateColor = isDark ? "hsl(220, 5%, 48%)" : "hsl(220, 5%, 52%)";
  const timeColor = isDark ? "hsl(220, 5%, 44%)" : "hsl(220, 5%, 56%)";
  const chevronColor = isDark ? "hsl(220, 5%, 36%)" : "hsl(220, 5%, 64%)";
  const separatorColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";

  const entering =
    shouldAnimate && !reduceMotion
      ? FadeInDown.delay(index * 60).duration(300).springify()
      : undefined;

  return (
    <Animated.View entering={entering}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 14,
          paddingHorizontal: 16,
          gap: 12,
          backgroundColor: pressed
            ? isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)"
            : "transparent",
        })}
        accessibilityRole="button"
        accessibilityLabel={`Run on ${formatDate(Date.parse(item.date))}`}
      >
        {/* Icon — outer padding 16, wrap radius = card_r(24) - 16 = 8 → use 10 */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: iconBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="walk-outline" size={19} color={colors.accent} />
        </View>

        {/* Text */}
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontFamily: "Outfit-Medium", fontSize: 15, color: isDark ? "hsl(220,5%,92%)" : "hsl(220,8%,12%)", letterSpacing: -0.1 }}>
            {formatKm(item.distance_meters)} km run
          </Text>
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: dateColor }}>
            {formatDate(Date.parse(item.date))}
          </Text>
        </View>

        {/* Right */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: timeColor }}>
            {formatTime(item.duration_seconds)}
          </Text>
          <Ionicons name="chevron-forward" size={15} color={chevronColor} />
        </View>
      </Pressable>

      {/* Separator — not last */}
      {!isLast && (
        <View
          style={{
            height: 1,
            marginLeft: 68,
            marginRight: 16,
            backgroundColor: separatorColor,
          }}
        />
      )}
    </Animated.View>
  );
});

// ── Main screen ──────────────────────────────────────────────────────

const HomeScreen = memo(function HomeScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const hasAnimatedRef = useRef(false);

  const { token, profile, appRole } = useAppSelector((s) => s.user);
  const bootstrapReady = useAppSelector(selectBootstrapReady);
  const firstName = profile?.name?.trim()?.split(/\s+/)[0] ?? "Athlete";

  const { homeContent, load: reloadHomeContent } = useHomeContent(token, bootstrapReady);
  const userId = profile?.id ?? null;

  const statsQuery = useWeeklyStats(userId);
  const activityQuery = useRecentActivity(userId);
  const watchHistory = useWatchHistoryStore((s) => s.history);

  const isLoading = statsQuery.isLoading || activityQuery.isLoading;
  const runs = activityQuery.data ?? [];
  const stats = statsQuery.data;

  useFocusEffect(
    useCallback(() => {
      queryClient.prefetchQuery({ queryKey: ["home", "weeklyStats", userId], queryFn: () => getWeeklySummaries(new Date(), userId) });
      queryClient.prefetchQuery({ queryKey: ["home", "recentActivity", userId], queryFn: () => getRecentRuns(20, userId) });
    }, [queryClient, userId]),
  );

  const shouldAnimate = !hasAnimatedRef.current;
  if (!isLoading && !hasAnimatedRef.current) {
    InteractionManager.runAfterInteractions(() => { hasAnimatedRef.current = true; });
  }

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });
  const headerBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, BLUR_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ["home", "weeklyStats"] }),
      queryClient.refetchQueries({ queryKey: ["home", "recentActivity"] }),
      reloadHomeContent(true),
    ]);
  }, [queryClient, reloadHomeContent]);

  const handleRunPress = useCallback(
    (id: string) => router.push(`/(tabs)/tracking/run-path/${encodeURIComponent(id)}` as any),
    [router],
  );

  const navigateToTracking = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/(tabs)/tracking" as any);
  }, [router]);

  // Spring micro-interactions
  const ctaScale = useSharedValue(1);
  const ctaStyle = useAnimatedStyle(() => ({ transform: [{ scale: ctaScale.value }] }));
  const ctaPressIn = useCallback(() => {
    ctaScale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [ctaScale]);
  const ctaPressOut = useCallback(() => { ctaScale.value = withSpring(1.0, { damping: 20, stiffness: 400 }); }, [ctaScale]);

  const statScale = useSharedValue(1);
  const statStyle = useAnimatedStyle(() => ({ transform: [{ scale: statScale.value }] }));
  const statPressIn = useCallback(() => { statScale.value = withSpring(0.97, { damping: 18, stiffness: 350 }); }, [statScale]);
  const statPressOut = useCallback(() => { statScale.value = withSpring(1.0, { damping: 20, stiffness: 400 }); }, [statScale]);

  const renderItem = useCallback(
    ({ item, index }: { item: RunRecord; index: number }) => (
      <ActivityItem
        item={item}
        index={index}
        isLast={index === Math.min(runs.length, 6) - 1}
        shouldAnimate={shouldAnimate}
        onPress={handleRunPress}
      />
    ),
    [shouldAnimate, handleRunPress, runs.length],
  );
  const keyExtractor = useCallback((item: RunRecord) => String(item.id), []);
  const getItemType = useCallback(() => "activity", []);

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <SkeletonHomeScreen />
      </View>
    );
  }

  const totalDist = stats?.totalDistance ?? 0;
  const totalTime = stats?.totalTime ?? 0;
  const numRuns = stats?.numRuns ?? 0;

  // Robis: tinted not pure dark bg for cards
  const cardBg = isDark ? "hsl(220, 8%, 11%)" : colors.card;
  // Robis: dark mode uses border instead of shadow for elevation
  const cardBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.06)";
  // Robis: tinted text colors — no opacity hack
  const primaryText = isDark ? "hsl(220, 5%, 93%)" : "hsl(220, 8%, 10%)";
  const secondaryText = isDark ? "hsl(220, 5%, 56%)" : "hsl(220, 5%, 46%)";

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>

      {/* ── Sticky blurred header ────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top, height: HEADER_HEIGHT + insets.top }]}>
        <Animated.View style={[StyleSheet.absoluteFill, headerBgStyle]}>
          <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <View style={styles.headerContent}>
          <Text style={[styles.screenTitle, { fontFamily: "Outfit-Bold", color: primaryText }]}>
            {getGreeting()}, {firstName}
          </Text>
          {/* Bell — tap target 44px min */}
          <Pressable
            accessibilityLabel="Notifications"
            style={[
              styles.bellBtn,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.05)",
                borderWidth: 1,
                borderColor: cardBorder,
              },
            ]}
          >
            <Ionicons name="notifications-outline" size={20} color={primaryText} />
          </Pressable>
        </View>
      </View>

      {/* ── Scrollable body ──────────────────────────────────── */}
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: HEADER_HEIGHT + insets.top + 12,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 20,
          gap: 12,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
      >

        {/* ── Hero card ────────────────────────────────────────── */}
        <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(200)}>
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: cardBorder,
              },
            ]}
          >
            {watchHistory.length > 0 ? (
              <>
                <Text style={[styles.microLabel, { color: colors.accent }]}>
                  CONTINUE WATCHING
                </Text>
                <Text
                  style={[styles.heroNumber, { fontFamily: "Chillax-Semibold", color: primaryText }]}
                  numberOfLines={2}
                >
                  {watchHistory[0].title}
                </Text>
                {watchHistory[0].thumbnail ? (
                  <View style={styles.progressContainer}>
                    {/* Robis: tinted track bg */}
                    <View style={[styles.progressTrack, { backgroundColor: isDark ? "hsl(220,8%,20%)" : "hsl(220,8%,88%)" }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            backgroundColor: colors.accent,
                            width: `${Math.round(watchHistory[0].progress * 100)}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <Text style={[styles.microLabel, { color: colors.accent }]}>
                  THIS WEEK
                </Text>
                <View style={styles.heroRow}>
                  <Text style={[styles.heroNumber, { fontFamily: "Chillax-Semibold", color: primaryText }]}>
                    {formatKm(totalDist)}
                  </Text>
                  <Text style={[styles.heroUnit, { fontFamily: "Outfit-Medium", color: secondaryText }]}>
                    km
                  </Text>
                </View>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: secondaryText, marginTop: 2 }}>
                  total distance this week
                </Text>
              </>
            )}

            {/* CTA — robis: border in dark instead of shadow */}
            <Animated.View style={[ctaStyle, { marginTop: 20 }]}>
              <Pressable
                onPress={navigateToTracking}
                onPressIn={ctaPressIn}
                onPressOut={ctaPressOut}
                style={[
                  styles.ctaBtn,
                  {
                    backgroundColor: colors.accent,
                    // Robis: dark mode border instead of glow/shadow
                    borderWidth: isDark ? 1 : 0,
                    borderColor: isDark ? "rgba(255,255,255,0.10)" : "transparent",
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Start session"
              >
                <Text style={[styles.ctaText, { fontFamily: "Outfit-Bold", color: isDark ? "hsl(220,8%,10%)" : "hsl(0,0%,98%)" }]}>
                  {watchHistory.length > 0 ? "Resume watching" : "Start session"}
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </Animated.View>

        {/* ── Quick stats row ──────────────────────────────────── */}
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(80).duration(300).springify()}
          style={styles.statsRow}
        >
          {[
            { value: formatKm(totalDist), label: "Distance", unit: "km" },
            { value: formatTime(totalTime), label: "Time", unit: "" },
            { value: String(numRuns), label: "Sessions", unit: "" },
          ].map((stat) => (
            <Animated.View key={stat.label} style={[statStyle, { flex: 1 }]}>
              <Pressable
                onPressIn={statPressIn}
                onPressOut={statPressOut}
                onPress={navigateToTracking}
                style={[
                  styles.statCard,
                  {
                    backgroundColor: cardBg,
                    borderWidth: 1,
                    borderColor: cardBorder,
                  },
                ]}
              >
                {/* Robis: micro label above value */}
                <Text style={[styles.statLabel, { color: colors.accent }]}>
                  {stat.label}
                </Text>
                <Text style={[styles.statValue, { fontFamily: "Chillax-Semibold", color: primaryText }]}>
                  {stat.value}
                  {stat.unit ? (
                    <Text style={{ fontSize: 13, color: secondaryText }}> {stat.unit}</Text>
                  ) : null}
                </Text>
              </Pressable>
            </Animated.View>
          ))}
        </Animated.View>

        {/* ── Quick links ──────────────────────────────────────── */}
        <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(140).duration(300).springify()}>
          <QuickLinksSection appRole={appRole} />
        </Animated.View>

        {/* ── Recent activity ──────────────────────────────────── */}
        {runs.length > 0 ? (
          <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(180).duration(300).springify()}>
            <Text style={[styles.sectionHeader, { color: primaryText }]}>
              Recent activity
            </Text>
            {/* Robis: wrap rows in a card surface */}
            <View
              style={{
                backgroundColor: cardBg,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: cardBorder,
                overflow: "hidden",
              }}
            >
              <FlashList
                data={runs.slice(0, 6)}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                getItemType={getItemType}
                scrollEnabled={false}
              />
            </View>
          </Animated.View>
        ) : null}

        {/* ── Intro video ──────────────────────────────────────── */}
        <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(220).duration(300).springify()}>
          <IntroVideoSection
            introVideoUrl={homeContent?.introVideoUrl}
            posterUrl={homeContent?.heroImageUrl}
            isTabActive={true}
            tabIndex={0}
          />
        </Animated.View>

        {/* ── Admin story ──────────────────────────────────────── */}
        <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(280).duration(300).springify()}>
          <AdminStorySection story={homeContent?.adminStory} photoUrl={homeContent?.professionalPhoto} />
        </Animated.View>

        {/* ── Testimonials ─────────────────────────────────────── */}
        <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(340).duration(300).springify()}>
          <TestimonialsSection items={homeContent?.testimonials} />
        </Animated.View>

      </Animated.ScrollView>
    </View>
  );
});

export default HomeScreen;

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  screenTitle: {
    fontSize: 22,
    letterSpacing: -0.3,
  },
  // Robis: 44px tap target, rounded with border
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  // Hero: 24px radius, 24px padding → inner CTA pill radius unconstrained (it's full pill)
  heroCard: {
    width: "100%",
    minHeight: 200,
    borderRadius: 24,
    padding: 24,
    justifyContent: "flex-end",
  },
  // Robis: all-caps label — letterSpacing 1.2 (not 0.5)
  microLabel: {
    fontFamily: "Outfit-Medium",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    marginTop: 4,
  },
  heroNumber: {
    fontSize: 48,
    letterSpacing: -1,
    lineHeight: 52,
  },
  heroUnit: {
    fontSize: 20,
    paddingBottom: 8,
    letterSpacing: -0.3,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    width: "100%",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  ctaBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    fontSize: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  // Robis: outer 16, padding 16 → inner elements need no radius (label/value only)
  statCard: {
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  // Robis: caps label above value with correct letterSpacing
  statLabel: {
    fontFamily: "Outfit-Medium",
    fontSize: 10,
    letterSpacing: 1.0,
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 28,
    letterSpacing: -0.5,
  },
  sectionHeader: {
    fontFamily: "Outfit-Bold",
    fontSize: 17,
    letterSpacing: -0.2,
    marginBottom: 8,
    paddingLeft: 4,
  },
});
