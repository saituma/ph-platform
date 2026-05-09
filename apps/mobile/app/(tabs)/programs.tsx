import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  Image as RNImage,
  Dimensions,
  useColorScheme,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { AlertCircle, ChevronRight, Dumbbell, Layers, Flame, Bell, BookOpen, Library } from "lucide-react-native";
import { useRouter } from "expo-router";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  withSpring,
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  runOnJS,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { useStreakStore } from "@/lib/streakStore";

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
import { hasAssignedTeam, hasOrgTeamMembership } from "@/lib/teamMembership";
import { SkeletonBox } from "@/components/ui/legacy-skeleton";

const PROGRAMS_BG = require("@/assets/images/programs-bg.png");
const { height: SCREEN_H } = Dimensions.get("window");
const HERO_H = SCREEN_H * 0.38;


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
  const isDark = useColorScheme() === "dark";
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
        const cardBg = "transparent";
        const cardText = p.textPrimary;
        const cardSubText = p.textSecondary;
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
                      <Text style={{ fontSize: 18, fontFamily: "Outfit-Bold", color: cardText }}>
                        {mod.order}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 17,
                        fontFamily: "Outfit-Bold",
                        color: cardText,
                        letterSpacing: -0.2,
                      }}
                      numberOfLines={1}
                    >
                      {mod.title}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <Layers size={13} color={cardSubText} />
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: "Outfit-Regular",
                          color: cardSubText,
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
                      <ChevronRight size={16} color={cardText} />
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
  const appRole = useAppSelector((s) => s.user.appRole);
  const authTeamMembership = useAppSelector((s) => s.user.authTeamMembership);

  const activeAthlete = useMemo(() => {
    return (
      managedAthletes.find((a) => a.id === athleteUserId || a.userId === athleteUserId) ??
      managedAthletes[0] ??
      null
    );
  }, [athleteUserId, managedAthletes]);

  const isTeamMode =
    hasAssignedTeam(activeAthlete?.team) ||
    hasOrgTeamMembership(authTeamMembership ?? undefined) ||
    appRole === "adult_athlete_team" ||
    appRole === "team" ||
    appRole === "team_manager" ||
    appRole === "youth_athlete_team_guardian";

  const isYouth =
    ((activeAthlete?.age ?? 0) > 0 && (activeAthlete?.age ?? 99) < 18) ||
    appRole === "youth_athlete" ||
    appRole === "youth_athlete_guardian_only";

  const useAgeBasedContent = isTeamMode || isYouth;

  const {
    workspace,
    activeTab,
    setActiveTab,
    load: loadTeam,
  } = useTeamWorkspace(token, activeAthlete?.age || (isTeamMode ? 18 : null));

  const {
    programs,
    isLoading: programsLoading,
    error: programsError,
    loadPrograms,
  } = useMyPrograms(token, !useAgeBasedContent);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const effectiveProgramId = selectedProgramId ?? programs[0]?.id ?? null;

  useEffect(() => {
    if (useAgeBasedContent) {
      loadTeam();
    }
  }, [useAgeBasedContent]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (useAgeBasedContent) {
      await loadTeam(true);
    } else {
      await loadPrograms(true);
    }
    setIsRefreshing(false);
  }, [useAgeBasedContent, loadTeam, loadPrograms]);

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

  if (useAgeBasedContent) {
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

  const reduceMotion = useReducedMotion();
  const streak = useStreakStore((ss) => ss.currentStreak);
  const firstName = profile?.name?.trim()?.split(/\s+/)[0] ?? "Athlete";
  const profilePic = profile?.avatar ?? null;
  const totalModules = programs.reduce((sum, prog) => sum + (prog.moduleCount ?? 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: p.pageBg }}>
      {/* ── Loading / Error states (no hero) ── */}
      {programsLoading && programs.length === 0 ? (
        <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 60, gap: 12 }}>
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
          {/* ── Hero Header ── */}
          <View style={{ height: HERO_H + insets.top, overflow: "hidden" }}>
            <RNImage source={PROGRAMS_BG} style={{ position: "absolute", width: "100%", height: "100%", resizeMode: "cover" }} />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.45)", p.pageBg]}
              locations={[0.25, 0.65, 1]}
              style={{ position: "absolute", width: "100%", height: "100%" }}
            />

            <View style={{ flex: 1, paddingTop: insets.top + 12, paddingHorizontal: 20, justifyContent: "space-between" }}>
              {/* Top bar */}
              <Animated.View entering={reduceMotion ? undefined : FadeIn.delay(100).duration(400)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  {profilePic ? (
                    <RNImage source={{ uri: profilePic }} style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: "rgba(255,255,255,0.2)" }} />
                  ) : (
                    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: "#fff" }}>{firstName[0]}</Text>
                    </View>
                  )}
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {streak > 0 && (
                    <Animated.View entering={reduceMotion ? undefined : FadeIn.delay(400).duration(400)} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 }}>
                      <Flame size={13} color="#FF9500" fill="#FF9500" />
                      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: "#fff" }}>{streak}</Text>
                    </Animated.View>
                  )}
                  <Pressable onPress={() => router.push("/notifications" as any)} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
                    <Bell size={18} color="#fff" />
                    <View style={{ position: "absolute", top: 8, right: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: p.accent }} />
                  </Pressable>
                </View>
              </Animated.View>

              {/* Hero text */}
              <View style={{ gap: 6, paddingBottom: 20 }}>
                <Animated.Text entering={reduceMotion ? undefined : FadeInDown.delay(200).duration(500)} style={{ fontFamily: "Outfit-Regular", fontSize: 16, color: "rgba(255,255,255,0.7)" }}>
                  Your
                </Animated.Text>
                <Animated.Text entering={reduceMotion ? undefined : FadeInDown.delay(300).duration(500)} style={{ fontFamily: "Outfit-Bold", fontSize: 38, color: "#fff", letterSpacing: -1.5, lineHeight: 42 }}>
                  Programs
                </Animated.Text>

                {/* Glass stat pills */}
                <Animated.View entering={reduceMotion ? undefined : FadeInRight.delay(500).duration(500).springify().damping(16)} style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  <BlurView intensity={40} tint="dark" style={{ borderRadius: 100, overflow: "hidden" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8 }}>
                      <BookOpen size={14} color={p.accent} />
                      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: "#fff" }}>{programs.length}</Text>
                      <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                        {programs.length === 1 ? "program" : "programs"}
                      </Text>
                    </View>
                  </BlurView>
                  {totalModules > 0 && (
                    <BlurView intensity={40} tint="dark" style={{ borderRadius: 100, overflow: "hidden" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8 }}>
                        <Library size={14} color={p.accent} />
                        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: "#fff" }}>{totalModules}</Text>
                        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>modules</Text>
                      </View>
                    </BlurView>
                  )}
                </Animated.View>
              </View>
            </View>
          </View>

          {/* ── Bento Stats ── */}
          <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 10 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Animated.View
                entering={reduceMotion ? undefined : FadeInDown.delay(0).springify().damping(18)}
                style={{ flex: 2, backgroundColor: p.cardWhite, borderRadius: 24, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: p.accentSoft, alignItems: "center", justifyContent: "center" }}>
                  <BookOpen size={22} color={p.accent} />
                </View>
                <View style={{ gap: 2 }}>
                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 26, color: p.textPrimary, letterSpacing: -0.5 }}>
                    {programs.length}
                  </Text>
                  <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textSecondary, opacity: 0.6 }}>
                    {programs.length === 1 ? "Program" : "Programs"}
                  </Text>
                </View>
              </Animated.View>

              <Animated.View
                entering={reduceMotion ? undefined : FadeInDown.delay(60).springify().damping(18)}
                style={{ flex: 1, backgroundColor: p.cardWhite, borderRadius: 24, padding: 18, alignItems: "center", justifyContent: "center", gap: 4 }}
              >
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 28, color: p.textPrimary, letterSpacing: -1 }}>
                  {totalModules}
                </Text>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textSecondary, opacity: 0.6 }}>
                  Modules
                </Text>
              </Animated.View>
            </View>
          </View>

          {/* ── Continue Watching ── */}
          {watchHistory.length > 0 ? (
            <View style={{ marginTop: 16, marginBottom: 8 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Outfit-Bold",
                  letterSpacing: 0.8,
                  color: p.textMuted,
                  textTransform: "uppercase",
                  paddingHorizontal: 20,
                  marginBottom: 12,
                }}
              >
                Continue Watching
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

          {/* ── Program Tabs ── */}
          <View style={{ borderBottomWidth: 1, borderBottomColor: p.divider, flexDirection: "row", marginTop: watchHistory.length > 0 ? 0 : 16 }}>
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
