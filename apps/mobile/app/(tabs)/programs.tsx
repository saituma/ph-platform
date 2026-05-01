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
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, {
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
import { useWatchHistoryStore, type WatchEntry } from "@/lib/mmkv";

import { useMyPrograms } from "@/hooks/programs/useMyPrograms";
import { useTeamWorkspace } from "@/hooks/programs/useTeamWorkspace";
import { TeamProgramView } from "@/components/programs/TeamProgramView";
import { hasAssignedTeam } from "@/lib/teamMembership";
import { Shadows } from "@/constants/theme";

// ── Continue Watching Card ───────────────────────────────────────────

interface WatchCardProps {
  entry: WatchEntry;
  index: number;
}

const WatchCard = memo(function WatchCard({ entry, index }: WatchCardProps) {
  const { colors, isDark } = useAppTheme();
  const reduceMotion = useReducedMotion();

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
    <Animated.View entering={entering}>
      <Animated.View style={animStyle}>
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
    </Animated.View>
  );
});

const WatchListSeparator = () => <View style={{ width: 12 }} />;
const watchListContentStyle = { paddingHorizontal: 20 };

// ── Main Screen ──────────────────────────────────────────────────────

const ProgramCard = memo(function ProgramCard({
  program,
  index,
  onPress,
}: {
  program: { id: number; name: string; description: string | null; moduleCount: number };
  index: number;
  onPress: () => void;
}) {
  const { colors, isDark } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";

  const entering = reduceMotion
    ? undefined
    : FadeInDown.delay(index * 80).duration(300).springify();

  return (
    <Animated.View entering={entering}>
      <Animated.View style={animStyle}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 18, stiffness: 350 });
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        onPressOut={() => {
          scale.value = withSpring(1.0, { damping: 20, stiffness: 400 });
        }}
        onPress={onPress}
        style={{
          backgroundColor: colors.card,
          borderColor: borderSoft,
          borderWidth: 1,
          borderRadius: 24,
          padding: 20,
          marginBottom: 12,
          ...(isDark ? {} : Shadows.md),
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontFamily: "ClashDisplay-Bold", color: colors.textPrimary }}>
              {program.name}
            </Text>
            {program.description ? (
              <Text
                style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: colors.textSecondary, marginTop: 4 }}
                numberOfLines={2}
              >
                {program.description}
              </Text>
            ) : null}
            <Text style={{ fontSize: 12, fontFamily: "Outfit-Medium", color: colors.accent, marginTop: 8 }}>
              {program.moduleCount} {program.moduleCount === 1 ? "module" : "modules"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </View>
      </Pressable>
      </Animated.View>
    </Animated.View>
  );
});

const ProgramsScreen = memo(function ProgramsScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const { isSectionHidden } = useAgeExperience();
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

  const { programs, isLoading: programsLoading, loadPrograms } = useMyPrograms(token);

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (isTeamMode) {
      loadTeam();
    } else {
      loadPrograms();
    }
  }, [isTeamMode]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (isTeamMode) {
      await loadTeam(true);
    } else {
      await loadPrograms(true);
    }
    setIsRefreshing(false);
  }, [isTeamMode, loadTeam, loadPrograms]);

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

  if (isSectionHidden("programs")) {
    return <AgeGate title="Programs locked" message="Programs are restricted for this age." />;
  }

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

  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";

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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
      >
        <Text style={{ fontSize: 24, fontFamily: "ClashDisplay-Bold", color: colors.textPrimary, marginBottom: 4 }}>
          My Programs
        </Text>
        <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: colors.textSecondary, marginBottom: 20 }}>
          Your assigned training programs.
        </Text>

        {programsLoading && programs.length === 0 ? (
          <View style={{ gap: 12 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <View
                key={`skeleton-${i}`}
                style={{
                  backgroundColor: colors.card,
                  borderColor: borderSoft,
                  borderWidth: 1,
                  borderRadius: 24,
                  padding: 20,
                  height: 90,
                }}
              />
            ))}
          </View>
        ) : programs.length === 0 ? (
          <View
            style={{
              backgroundColor: colors.card,
              borderColor: borderSoft,
              borderWidth: 1,
              borderRadius: 24,
              padding: 32,
              alignItems: "center",
            }}
          >
            <Ionicons name="barbell-outline" size={40} color={colors.textSecondary} style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 16, fontFamily: "Outfit-Medium", color: colors.textPrimary, marginBottom: 4 }}>
              No programs assigned
            </Text>
            <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: colors.textSecondary, textAlign: "center" }}>
              Your coach will assign programs to you. Check back later.
            </Text>
          </View>
        ) : (
          programs.map((program, index) => (
            <ProgramCard
              key={program.id}
              program={program}
              index={index}
              onPress={() => router.push(`/programs/assigned/${program.id}` as any)}
            />
          ))
        )}
      </ScrollView>
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
