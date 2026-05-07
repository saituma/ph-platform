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
import { AlertCircle, ChevronRight, Dumbbell, Layers } from "lucide-react-native";
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

import { useAdminPastel } from "@/components/admin/AdminUI";
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
import { SkeletonBox } from "@/components/ui/legacy-skeleton";

const MODULE_CARD_COLORS = ["cardSage", "cardMint", "cardPeach", "cardLavender"] as const;

// ── Continue Watching Card ───────────────────────────────────────────

interface WatchCardProps {
  entry: WatchEntry;
  index: number;
}

const WatchCard = memo(function WatchCard({ entry, index }: WatchCardProps) {
  const p = useAdminPastel();
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
          style={[animStyle, styles.watchCard, { backgroundColor: p.cardWhite }]}
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
              <View style={[StyleSheet.absoluteFill, { backgroundColor: p.inputBg }]} />
            )}
            <View style={styles.watchProgressTrack}>
              <View
                style={[
                  styles.watchProgressFill,
                  { backgroundColor: p.accent, width: `${Math.round(entry.progress * 100)}%` },
                ]}
              />
            </View>
          </View>
          <Text
            style={{
              fontSize: 13,
              fontFamily: "Outfit-Regular",
              color: p.textPrimary,
              paddingHorizontal: 10,
              paddingVertical: 10,
              lineHeight: 18,
            }}
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
  const p = useAdminPastel();
  const router = useRouter();
  const { program, isLoading, error, loadProgram } = useMyProgramDetail(token);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const reduceMotion = useReducedMotion();

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
        <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary, textAlign: "center" }}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={p.accent} />}
      showsVerticalScrollIndicator={false}
    >
      {program?.description ? (
        <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary, marginBottom: 16 }}>
          {program.description}
        </Text>
      ) : null}

      {(program?.modules ?? []).map((mod, modIdx) => {
        const entering = reduceMotion
          ? undefined
          : FadeInDown.delay(Math.min(modIdx, 8) * 40).springify().damping(15);
        const cardColorKey = MODULE_CARD_COLORS[modIdx % MODULE_CARD_COLORS.length];
        const cardBg = p[cardColorKey] as string;
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
              <View
                style={{
                  borderRadius: 22,
                  backgroundColor: cardBg,
                  overflow: "hidden",
                }}
              >
                <View style={{ height: 3, backgroundColor: p.accent, opacity: 0.6 }} />

                <View style={{ padding: 18, flexDirection: "row", alignItems: "center" }}>
                  <View style={{ marginRight: 14 }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: p.accentSoft,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 18, fontFamily: "Outfit-Bold", color: p.accent }}>
                        {mod.order}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 17,
                        fontFamily: "Outfit-Bold",
                        color: p.textPrimary,
                        letterSpacing: -0.2,
                      }}
                      numberOfLines={1}
                    >
                      {mod.title}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <Layers size={13} color={p.textSecondary} />
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: "Outfit-Regular",
                          color: p.textSecondary,
                        }}
                      >
                        {mod.sessionCount} {mod.sessionCount === 1 ? "session" : "sessions"}
                      </Text>
                    </View>
                  </View>

                  <View style={{ marginLeft: 12 }}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        backgroundColor: p.accentSoft,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ChevronRight size={16} color={p.textSecondary} />
                    </View>
                  </View>
                </View>
              </View>
            </Pressable>
          </Animated.View>
        );
      })}

      {(program?.modules ?? []).length === 0 && !isLoading ? (
        <View
          style={{
            backgroundColor: p.cardWhite,
            borderRadius: 20,
            padding: 32,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary, textAlign: "center" }}>
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
  const p = useAdminPastel();
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
      <View style={{ flex: 1, backgroundColor: p.pageBg, paddingTop: insets.top }}>
        {watchHistory.length > 0 ? (
          <View style={{ marginBottom: 8 }}>
            <Text
              style={{
                fontSize: 17,
                fontFamily: "Outfit-Bold",
                color: p.textPrimary,
                letterSpacing: -0.2,
                paddingHorizontal: 20,
                marginBottom: 12,
                marginTop: 12,
              }}
            >
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

  return (
    <View style={{ flex: 1, backgroundColor: p.pageBg, paddingTop: insets.top }}>
      {/* ── Header ── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, marginBottom: 10 }}>
        <Text style={{ fontSize: 24, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
          My Programs
        </Text>
      </View>
      <View style={{ height: 14 }} />

      {/* ── Continue Watching ── */}
      {watchHistory.length > 0 ? (
        <View style={{ marginBottom: 8 }}>
          <Text
            style={{
              fontSize: 17,
              fontFamily: "Outfit-Bold",
              color: p.textPrimary,
              letterSpacing: -0.2,
              paddingHorizontal: 20,
              marginBottom: 12,
              marginTop: 12,
            }}
          >
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
          <AlertCircle size={40} color={p.textSecondary} style={{ marginBottom: 12 }} />
          <Text style={{ fontSize: 16, fontFamily: "Outfit-Bold", color: p.textPrimary, marginBottom: 4 }}>
            Failed to load programs
          </Text>
          <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary, textAlign: "center" }}>
            {programsError}
          </Text>
        </View>
      ) : programs.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Dumbbell size={40} color={p.textSecondary} style={{ marginBottom: 12 }} />
          <Text style={{ fontSize: 16, fontFamily: "Outfit-Bold", color: p.textPrimary, marginBottom: 4 }}>
            No programs assigned
          </Text>
          <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary, textAlign: "center" }}>
            Your coach will assign programs to you. Check back later.
          </Text>
        </View>
      ) : (
        <>
          {/* ── Program Tabs ── */}
          <View style={{ borderBottomWidth: 1, borderBottomColor: p.divider, flexDirection: "row" }}>
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
              {programs.map((prog) => {
                const active = effectiveProgramId === prog.id;
                return (
                  <Pressable
                    key={prog.id}
                    onPress={() => {
                      setSelectedProgramId(prog.id);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={{
                      paddingHorizontal: 14,
                      height: 36,
                      borderRadius: 100,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: active ? p.accent : p.cardWhite,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: active ? "Outfit-Bold" : "Outfit-Regular",
                        color: active ? p.buttonPrimaryText : p.textSecondary,
                      }}
                      numberOfLines={1}
                    >
                      {prog.name}
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
});
