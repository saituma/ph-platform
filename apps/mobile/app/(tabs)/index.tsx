import React, { memo, useCallback } from "react";
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
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
import { getWeeklySummaries } from "@/lib/sqliteRuns";

import { AdminStorySection } from "@/components/home/AdminStorySection";
import { IntroVideoSection } from "@/components/home/IntroVideoSection";
import { QuickLinksSection } from "@/components/home/QuickLinksSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { useHomeContent } from "@/hooks/home/useHomeContent";
import { selectBootstrapReady } from "@/store/slices/appSlice";
import { useRunStore } from "@/store/useRunStore";

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

type IntroAudience = "team" | "youth" | "adult";

function audienceFromAppRole(role: string | null | undefined): IntroAudience | null {
  if (!role) return null;
  if (role === "team" || role.endsWith("_team") || role.endsWith("_team_guardian")) return "team";
  if (role.startsWith("youth")) return "youth";
  if (role.startsWith("adult")) return "adult";
  return null;
}

function pickIntroVideoForRole(
  introVideos: Array<{ url: string; roles: Array<IntroAudience> }> | null | undefined,
  fallback: string | null | undefined,
  audience: IntroAudience | null,
): string | null {
  if (audience && Array.isArray(introVideos)) {
    const match = introVideos.find((rule) => rule?.roles?.includes(audience))?.url;
    if (match) return match;
  }
  return fallback ?? null;
}

function formatKm(m: number): string {
  return (m / 1000).toFixed(1);
}

function formatTime(sec: number): string {
  const hrs = sec / 3600;
  return hrs >= 1 ? `${hrs.toFixed(1)}` : `${Math.round(sec / 60)}m`;
}

// ── Data hooks ───────────────────────────────────────────────────────

function useWeeklyStats(userId: string | null) {
  return useQuery({
    queryKey: ["home", "weeklyStats", userId],
    queryFn: () => getWeeklySummaries(new Date(), userId),
    staleTime: 5 * 60 * 1000,
  });
}


// ── Main screen ──────────────────────────────────────────────────────

const HomeScreen = memo(function HomeScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const queryClient = useQueryClient();

  const token = useAppSelector((s) => s.user.token);
  const profile = useAppSelector((s) => s.user.profile);
  const appRole = useAppSelector((s) => s.user.appRole);
  const bootstrapReady = useAppSelector(selectBootstrapReady);
  const firstName = profile?.name?.trim()?.split(/\s+/)[0] ?? "Athlete";

  const { homeContent, isLoading: homeLoading, load: reloadHomeContent } = useHomeContent(token, bootstrapReady);
  const userId = profile?.id ?? null;

  const statsQuery = useWeeklyStats(userId);
  const watchHistory = useWatchHistoryStore((s) => s.history);
  const runStatus = useRunStore((s) => s.status);
  const isRunActive = runStatus === "running" || runStatus === "paused";

  const isLoading = statsQuery.isLoading || !bootstrapReady;
  const homeContentLoading = !homeContent;
  const stats = statsQuery.data;
  const hasTeam = appRole === "team" || appRole === "adult_athlete_team" || appRole === "youth_athlete_team_guardian";
  const showTracking = hasTeam || appRole === "adult_athlete" || appRole === "coach";

  useFocusEffect(
    useCallback(() => {
      queryClient.prefetchQuery({ queryKey: ["home", "weeklyStats", userId], queryFn: () => getWeeklySummaries(new Date(), userId) });
    }, [queryClient, userId]),
  );

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });
  const headerBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, BLUR_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ["home", "weeklyStats"] }),
      reloadHomeContent(true),
    ]);
  }, [queryClient, reloadHomeContent]);

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

        {/* ── Hero card (hidden for non-team youth athletes) ─── */}
        {showTracking && (
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

            <Animated.View style={[ctaStyle, { marginTop: 20 }]}>
              <Pressable
                onPress={navigateToTracking}
                onPressIn={ctaPressIn}
                onPressOut={ctaPressOut}
                style={[
                  styles.ctaBtn,
                  {
                    backgroundColor: colors.accent,
                    borderWidth: isDark ? 1 : 0,
                    borderColor: isDark ? "rgba(255,255,255,0.10)" : "transparent",
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Start session"
              >
                <Text style={[styles.ctaText, { fontFamily: "Outfit-Bold", color: isDark ? "hsl(220,8%,10%)" : "hsl(0,0%,98%)" }]}>
                  {isRunActive ? "Running" : watchHistory.length > 0 ? "Resume watching" : "Start session"}
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </Animated.View>
        )}

        {/* ── Quick stats row ──────────────────────────────────── */}
        {showTracking && (
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(80).duration(300).springify()}
          style={styles.statsRow}
        >
          {[
            { value: formatKm(totalDist), label: "Dist", unit: "km" },
            { value: formatTime(totalTime), label: "Time", unit: totalTime >= 3600 ? "hr" : "min" },
            { value: String(numRuns), label: "Sessions", unit: "" },
          ].map((stat) => (
            <HomeStatCard
              key={stat.label}
              stat={stat}
              onPress={navigateToTracking}
              cardBg={cardBg}
              cardBorder={cardBorder}
              accentColor={colors.accent}
              primaryText={primaryText}
              secondaryText={secondaryText}
            />
          ))}
        </Animated.View>
        )}

        {/* ── Quick links ──────────────────────────────────────── */}
        <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(140).duration(300).springify()}>
          <QuickLinksSection appRole={appRole} />
        </Animated.View>

        {/* ── Intro video ──────────────────────────────────────── */}
        <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(220).duration(300).springify()}>
          <IntroVideoSection
            introVideoUrl={pickIntroVideoForRole(
              homeContent?.introVideos,
              homeContent?.introVideoUrl,
              audienceFromAppRole(appRole),
            )}
            posterUrl={homeContent?.heroImageUrl}
            isTabActive={true}
            tabIndex={0}
            loading={homeContentLoading}
          />
        </Animated.View>

        {/* ── Admin story ──────────────────────────────────────── */}
        <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(280).duration(300).springify()}>
          <AdminStorySection story={homeContent?.adminStory} photoUrl={homeContent?.professionalPhoto} loading={homeContentLoading} />
        </Animated.View>

        {/* ── Testimonials ─────────────────────────────────────── */}
        <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(340).duration(300).springify()}>
          <TestimonialsSection items={homeContent?.testimonials} loading={homeContentLoading} />
        </Animated.View>

      </Animated.ScrollView>
    </View>
  );
});

export default HomeScreen;

// ── HomeStatCard ────────────────────────────────────────────────────

function HomeStatCard({
  stat,
  onPress,
  cardBg,
  cardBorder,
  accentColor,
  primaryText,
  secondaryText,
}: {
  stat: { value: string; label: string; unit: string };
  onPress: () => void;
  cardBg: string;
  cardBorder: string;
  accentColor: string;
  primaryText: string;
  secondaryText: string;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[animStyle, { flex: 1 }]}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 18, stiffness: 350 }); }}
        onPressOut={() => { scale.value = withSpring(1.0, { damping: 20, stiffness: 400 }); }}
        onPress={onPress}
        style={[
          styles.statCard,
          {
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: cardBorder,
          },
        ]}
      >
        <Text style={[styles.statLabel, { color: accentColor }]} numberOfLines={1}>
          {stat.label}
        </Text>
        <View style={styles.statValueRow}>
          <Text
            style={[styles.statValue, { fontFamily: "Chillax-Semibold", color: primaryText }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {stat.value}
          </Text>
          {stat.unit ? (
            <Text style={[styles.statUnit, { color: secondaryText }]}>{stat.unit}</Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

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
  statCard: {
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  statLabel: {
    fontFamily: "Outfit-Bold",
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
  },
  statValue: {
    fontSize: 22,
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  statUnit: {
    fontFamily: "Outfit-Regular",
    fontSize: 11,
    paddingBottom: 3,
  },
  sectionHeader: {
    fontFamily: "Outfit-Bold",
    fontSize: 17,
    letterSpacing: -0.2,
    marginBottom: 8,
    paddingLeft: 4,
  },
});
