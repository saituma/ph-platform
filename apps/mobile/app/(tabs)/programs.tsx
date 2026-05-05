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
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { Card } from "heroui-native";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSelector } from "@/store/hooks";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { Text } from "@/components/ScaledText";
import { AgeGate } from "@/components/AgeGate";
import { useWatchHistoryStore, type WatchEntry } from "@/lib/mmkv";

import { useMyPrograms, useMyProgramDetail } from "@/hooks/programs/useMyPrograms";
import { useTeamWorkspace } from "@/hooks/programs/useTeamWorkspace";
import { TeamProgramView } from "@/components/programs/TeamProgramView";
import { hasAssignedTeam } from "@/lib/teamMembership";
import { Shadows } from "@/constants/theme";
import { SkeletonBox } from "@/components/ui/legacy-skeleton";

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

  const tap = Gesture.Tap()
    .onBegin(() => {
      "worklet";
      scale.value = withSpring(0.96, { damping: 15, stiffness: 400, mass: 0.3 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onFinalize(() => {
      "worklet";
      scale.value = withSpring(1, { damping: 20, stiffness: 300, mass: 0.4 });
    });

  const entering = reduceMotion
    ? undefined
    : FadeInDown.delay(Math.min(index, 10) * 50).springify().damping(15);

  return (
    <Animated.View entering={entering}>
      <GestureDetector gesture={tap}>
        <Animated.View
          style={[animStyle, styles.watchCard, { backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF" }]}
          accessibilityLabel={`Continue watching ${entry.title}`}
        >
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
            <View style={styles.watchProgressTrack}>
              <View
                style={[
                  styles.watchProgressFill,
                  { backgroundColor: colors.accent, width: `${Math.round(entry.progress * 100)}%` },
                ]}
              />
            </View>
          </View>
          <Text
            style={[styles.watchTitle, { fontFamily: "Outfit-Medium", color: colors.textPrimary }]}
            numberOfLines={2}
          >
            {entry.title}
          </Text>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
});

const WatchListSeparator = () => <View style={{ width: 12 }} />;
const watchListContentStyle = { paddingHorizontal: 20 };

// ── Program Content (flat module cards → tap to navigate) ───────────

const ProgramContent = memo(function ProgramContent({
  programId,
  token,
}: {
  programId: number;
  token: string | null;
}) {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const { program, isLoading, error, loadProgram } = useMyProgramDetail(token);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const reduceMotion = useReducedMotion();

  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";

  useEffect(() => {
    loadProgram(programId);
  }, [programId]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadProgram(programId, true);
    setIsRefreshing(false);
  }, [programId, loadProgram]);

  if (isLoading && !program) {
    return (
      <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 12 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonBox key={`sk-${i}`} width="100%" height={72} borderRadius={20} />
        ))}
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingTop: 40 }}>
        <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: colors.textSecondary, textAlign: "center" }}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
      showsVerticalScrollIndicator={false}
    >
      {program?.description ? (
        <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: colors.textSecondary, marginBottom: 16 }}>
          {program.description}
        </Text>
      ) : null}

      {(program?.modules ?? []).map((mod, modIdx) => {
        const entering = reduceMotion
          ? undefined
          : FadeInDown.delay(Math.min(modIdx, 8) * 40).springify().damping(15);
        return (
          <Animated.View key={mod.id} entering={entering}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/programs/assigned/${programId}?moduleId=${mod.id}&moduleName=${encodeURIComponent(mod.title)}` as any);
              }}
              style={({ pressed }) => ({
                marginBottom: 14,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <Card
                variant={isDark ? "secondary" : "default"}
                style={[
                  {
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                    borderRadius: 22,
                    overflow: "hidden",
                  },
                  isDark ? undefined : Shadows.md,
                ]}
              >
                <View style={{ height: 3, backgroundColor: colors.accent, opacity: 0.6 }} />

                <View style={{ padding: 18, flexDirection: "row", alignItems: "center" }}>
                  <Card.Header style={{ padding: 0, marginRight: 14 }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: isDark ? "rgba(138,255,0,0.16)" : "rgba(106,204,0,0.10)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 18, fontFamily: "ClashDisplay-Bold", color: colors.accent }}>
                        {mod.order}
                      </Text>
                    </View>
                  </Card.Header>

                  <Card.Body style={{ flex: 1, padding: 0 }}>
                    <Card.Title
                      style={{
                        fontSize: 17,
                        fontFamily: "Outfit-SemiBold",
                        color: colors.textPrimary,
                        letterSpacing: -0.2,
                      }}
                      numberOfLines={1}
                    >
                      {mod.title}
                    </Card.Title>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <Ionicons name="layers-outline" size={13} color={colors.textSecondary} />
                      <Card.Description
                        style={{
                          fontSize: 13,
                          fontFamily: "Outfit-Regular",
                          color: colors.textSecondary,
                        }}
                      >
                        {mod.sessionCount} {mod.sessionCount === 1 ? "session" : "sessions"}
                      </Card.Description>
                    </View>
                  </Card.Body>

                  <Card.Footer style={{ padding: 0, marginLeft: 12 }}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                    </View>
                  </Card.Footer>
                </View>
              </Card>
            </Pressable>
          </Animated.View>
        );
      })}

      {(program?.modules ?? []).length === 0 && !isLoading ? (
        <View
          style={{
            backgroundColor: colors.card,
            borderColor: borderSoft,
            borderWidth: 1,
            borderRadius: 20,
            padding: 32,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: colors.textSecondary, textAlign: "center" }}>
            No modules in this program yet. Your coach will add content soon.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
});

// ── Main Screen ──────────────────────────────────────────────────────

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

  const {
    programs,
    isLoading: programsLoading,
    error: programsError,
    loadPrograms,
  } = useMyPrograms(token, !isTeamMode);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const effectiveProgramId = selectedProgramId ?? programs[0]?.id ?? null;

  useEffect(() => {
    if (isTeamMode) {
      loadTeam();
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
      {/* ── Header ── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, marginBottom: 10 }}>
        <Text style={{ fontSize: 24, fontFamily: "ClashDisplay-Bold", color: colors.textPrimary }}>
          My Programs
        </Text>
      </View>
      <View style={{ height: 14 }} />

      {/* ── Continue Watching ── */}
      {watchHistory.length > 0 ? (
        <View style={styles.watchSection}>
          <Text style={[styles.sectionHeader, { fontFamily: "Outfit-Bold", color: colors.textPrimary }]}>
            Continue watching
          </Text>
          <FlashList
            data={watchHistory}
            renderItem={renderWatchItem}
            horizontal
            keyExtractor={watchKeyExtractor}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={watchListContentStyle}
            ItemSeparatorComponent={WatchListSeparator}
          />
        </View>
      ) : null}

      {/* ── Loading / Empty ── */}
      {programsLoading && programs.length === 0 ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBox key={`skeleton-${i}`} width="100%" height={90} borderRadius={24} />
          ))}
        </View>
      ) : programsError ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.textSecondary} style={{ marginBottom: 12 }} />
          <Text style={{ fontSize: 16, fontFamily: "Outfit-Medium", color: colors.textPrimary, marginBottom: 4 }}>
            Failed to load programs
          </Text>
          <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: colors.textSecondary, textAlign: "center" }}>
            {programsError}
          </Text>
        </View>
      ) : programs.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Ionicons name="barbell-outline" size={40} color={colors.textSecondary} style={{ marginBottom: 12 }} />
          <Text style={{ fontSize: 16, fontFamily: "Outfit-Medium", color: colors.textPrimary, marginBottom: 4 }}>
            No programs assigned
          </Text>
          <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: colors.textSecondary, textAlign: "center" }}>
            Your coach will assign programs to you. Check back later.
          </Text>
        </View>
      ) : (
        <>
          {/* ── Program Tabs ── */}
          <View style={{ borderBottomWidth: 1, borderBottomColor: borderSoft, flexDirection: "row" }}>
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingTop: 8,
                paddingBottom: 10,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
              style={{ flexGrow: 0 }}
            >
              {programs.map((p) => {
                const active = effectiveProgramId === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      setSelectedProgramId(p.id);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={{
                      paddingHorizontal: 14,
                      height: 36,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: active ? colors.accent : borderSoft,
                      backgroundColor: active
                        ? isDark
                          ? "rgba(138,255,0,0.14)"
                          : "rgba(106,204,0,0.12)"
                        : isDark
                          ? "rgba(255,255,255,0.03)"
                          : "rgba(15,23,42,0.02)",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: active ? "Outfit-SemiBold" : "Outfit-Medium",
                        color: active ? colors.textPrimary : colors.textSecondary,
                      }}
                      numberOfLines={1}
                    >
                      {p.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {effectiveProgramId ? (
            <ProgramContent
              key={effectiveProgramId}
              programId={effectiveProgramId}
              token={token}
            />
          ) : null}
        </>
      )}
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
