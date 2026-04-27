import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, {
  FadeIn,
  FadeInDown,
  withSpring,
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSelector } from "@/store/hooks";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { Text } from "@/components/ScaledText";
import { AgeGate } from "@/components/AgeGate";
import { SkeletonProgramsScreen } from "@/components/ui/Skeleton";
import { useWatchHistoryStore, type WatchEntry } from "@/lib/mmkv";

import { programDetailRouteIdFromTier } from "@/lib/planAccess";
import { ProgramDetailPanel } from "@/components/programs/ProgramDetailPanel";
import { SafeMaskedView } from "@/components/navigation/TransitionStack";
import { useTeamWorkspace } from "@/hooks/programs/useTeamWorkspace";
import { TeamProgramView } from "@/components/programs/TeamProgramView";
import { hasAssignedTeam } from "@/lib/teamMembership";
import type { ProgramId } from "@/constants/program-details";

// ── Continue Watching Card ───────────────────────────────────────────

interface WatchCardProps {
  entry: WatchEntry;
  index: number;
}

const WatchCard = memo(function WatchCard({ entry, index }: WatchCardProps) {
  const { colors, isDark } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const router = useRouter();

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 18, stiffness: 350 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [scale]);
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1.0, { damping: 20, stiffness: 400 });
  }, [scale]);

  const entering = reduceMotion
    ? undefined
    : FadeInDown.delay(index * 60).duration(250).springify();

  return (
    <Animated.View entering={entering} style={animStyle}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.watchCard, { backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF" }]}
        accessibilityLabel={`Continue watching ${entry.title}`}
      >
        {/* Thumbnail */}
        <View style={styles.watchThumb}>
          {entry.thumbnail ? (
            <Image
              source={{ uri: entry.thumbnail }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory-disk"
              placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "#242424" : "#E5E5EA" }]} />
          )}
          {/* Progress bar */}
          <View style={styles.watchProgressTrack}>
            <View
              style={[
                styles.watchProgressFill,
                { backgroundColor: colors.accent, width: `${Math.round(entry.progress * 100)}%` },
              ]}
            />
          </View>
        </View>
        {/* Title */}
        <Text
          style={[styles.watchTitle, { fontFamily: "Outfit-Medium", color: colors.textPrimary }]}
          numberOfLines={2}
        >
          {entry.title}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

const WatchListSeparator = () => <View style={{ width: 12 }} />;
const watchListContentStyle = { paddingHorizontal: 20 };

// ── Main Screen ──────────────────────────────────────────────────────

const ProgramsScreen = memo(function ProgramsScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { isSectionHidden } = useAgeExperience();
  const programTier = useAppSelector((s) => s.user.programTier);
  const token = useAppSelector((s) => s.user.token);
  const profile = useAppSelector((s) => s.user.profile);
  const athleteUserId = useAppSelector((s) => s.user.athleteUserId);
  const managedAthletes = useAppSelector((s) => s.user.managedAthletes);

  const activeAthlete = useMemo(() => {
    return (
      managedAthletes.find((a) => a.id === athleteUserId || a.userId === athleteUserId) ??
      managedAthletes[0] ??
      null
    );
  }, [athleteUserId, managedAthletes]);

  const isTeamMode = hasAssignedTeam(activeAthlete?.team);

  const {
    workspace,
    activeTab,
    setActiveTab,
    load: loadTeam,
  } = useTeamWorkspace(token, activeAthlete?.age ?? null);

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (isTeamMode) loadTeam();
  }, [isTeamMode]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (isTeamMode) await loadTeam(true);
    setIsRefreshing(false);
  }, [isTeamMode, loadTeam]);

  // ── Watch history (AsyncStorage-backed Zustand store) ────────────────
  const watchHistory = useWatchHistoryStore((s) => s.history);

  const renderWatchItem = useCallback(
    ({ item, index }: { item: WatchEntry; index: number }) => (
      <WatchCard entry={item} index={index} />
    ),
    [],
  );

  const watchKeyExtractor = useCallback((item: WatchEntry) => item.videoId, []);

  const focusInfo = useMemo(
    () =>
      [
        activeAthlete?.age ? `${activeAthlete.age} yrs` : null,
        activeAthlete?.team,
      ].filter(Boolean) as string[],
    [activeAthlete?.age, activeAthlete?.team],
  );

  const onOpenModule = useCallback(
    (id: number) => router.push(`/programs/module/${id}`),
    [router],
  );

  const onNavigate = useCallback(
    (path: string) => router.push(path as any),
    [router],
  );

  if (isSectionHidden("programs")) {
    return <AgeGate title="Programs locked" message="Programs are restricted for this age." />;
  }

  // ── Team mode → delegated view ─────────────────────────────
  if (isTeamMode) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        {watchHistory.length > 0 ? (
          <View style={styles.watchSection}>
            <Text style={[styles.sectionHeader, { fontFamily: "Outfit-Bold", color: colors.textPrimary }]}>
              Continue watching
            </Text>
            <FlashList
              data={watchHistory}
              renderItem={renderWatchItem}
              estimatedItemSize={160}
              horizontal
              keyExtractor={watchKeyExtractor}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={watchListContentStyle}
              ItemSeparatorComponent={WatchListSeparator}
            />
          </View>
        ) : null}

        <TeamProgramView
          workspace={workspace}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenModule={onOpenModule}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          focusName={activeAthlete?.name || profile.name || "Athlete"}
          focusInfo={focusInfo}
        />
      </View>
    );
  }

  // ── Solo mode → program detail panel ───────────────────────
  const programId = programDetailRouteIdFromTier(programTier) as ProgramId;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {watchHistory.length > 0 ? (
        <View style={styles.watchSection}>
          <Text style={[styles.sectionHeader, { fontFamily: "Outfit-Bold", color: colors.textPrimary }]}>
            Continue watching
          </Text>
          <FlashList
            data={watchHistory}
            renderItem={renderWatchItem}
            estimatedItemSize={160}
            horizontal
            keyExtractor={watchKeyExtractor}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={watchListContentStyle}
            ItemSeparatorComponent={WatchListSeparator}
          />
        </View>
      ) : null}

      <SafeMaskedView style={{ flex: 1 }}>
        <ProgramDetailPanel
          programId={programId}
          showBack={false}
          onNavigate={onNavigate}
        />
      </SafeMaskedView>
    </View>
  );
});

export default ProgramsScreen;

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  watchSection: {
    marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 17,
    letterSpacing: -0.2,
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 12,
  },
  watchCard: {
    width: 160,
    borderRadius: 16,
    overflow: "hidden",
  },
  watchThumb: {
    width: 160,
    height: 90,
    position: "relative",
  },
  watchProgressTrack: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  watchProgressFill: {
    height: 3,
    borderRadius: 1.5,
  },
  watchTitle: {
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 10,
    lineHeight: 18,
  },
});
