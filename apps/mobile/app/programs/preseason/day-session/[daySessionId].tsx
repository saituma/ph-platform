import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Check } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAppSelector } from "@/store/hooks";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Text } from "@/components/ScaledText";
import { SkeletonBox } from "@/components/ui/legacy-skeleton";
import { usePreseasonSessionDetail, type PreseasonExercise } from "@/hooks/preseason/usePreseasonSessionDetail";

const ACCENT = "#BBFF00";
const BG = "#0D0D0D";
const CARD = "#1A1A1A";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_MUTED = "#888888";
const BORDER_MUTED = "#2A2A2A";

const CATEGORY_COLOR: Record<string, string> = {
  PRIMER: "#C5A028",
  GAME: "#E05A00",
  RECOVERY: "#6B8CE8",
  STRENGTH: "#A855F7",
  SPEED: "#22C55E",
  CONDITIONING: "#06B6D4",
};

const DAY_ABBR: Record<number, string> = {
  1: "MON",
  2: "TUE",
  3: "WED",
  4: "THU",
  5: "FRI",
  6: "SAT",
  7: "SUN",
};

function categoryColor(cat: string): string {
  return CATEGORY_COLOR[cat?.toUpperCase()] ?? "#555555";
}

function formatMetric(ex: PreseasonExercise): string {
  const sets = ex.setsOverride ?? ex.exercise.sets;
  const reps = ex.repsOverride ?? ex.exercise.reps;
  const duration = ex.durationOverride ?? ex.exercise.duration;

  if (ex.metric === "duration") {
    if (sets && duration) return `${sets}×${duration}s`;
    if (duration) return `${duration}s`;
  }

  if (sets && reps) return `${sets}×${reps}`;
  if (reps) return `${reps} reps`;
  if (sets) return `${sets} sets`;
  if (duration) return `${duration}s`;
  return "—";
}

function ExerciseCard({ ex, index }: { ex: PreseasonExercise; index: number }) {
  const metric = formatMetric(ex);
  return (
    <Animated.View entering={FadeInDown.delay(index * 40).springify().damping(18)}>
      <View style={styles.exerciseCard}>
        <View style={styles.exerciseNumBadge}>
          <Text style={styles.exerciseNum}>{index + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.exerciseName}>{ex.exercise.name}</Text>
          <Text style={styles.exerciseMetric}>{metric}</Text>
          {ex.notes ? (
            <Text style={styles.exerciseNotes}>{ex.notes}</Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

export default function PreseasonSessionDetailScreen() {
  const { daySessionId: param } = useLocalSearchParams<{ daySessionId: string }>();
  const daySessionId = param ? parseInt(param, 10) : null;
  const router = useRouter();
  const insets = useAppSafeAreaInsets();
  const token = useAppSelector((s) => s.user.token);
  const { daySession, exercises, loading, error, completeSession, completing } =
    usePreseasonSessionDetail(token, daySessionId);

  const handleComplete = useCallback(async () => {
    await completeSession();
  }, [completeSession]);

  const catColor = daySession ? categoryColor(daySession.category) : ACCENT;
  const dayAbbr = daySession ? (DAY_ABBR[daySession.dayOfWeek] ?? "---") : "---";

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Navigation header */}
      <View style={styles.navRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Back">
          <ChevronLeft size={22} color={TEXT_PRIMARY} />
        </Pressable>
        <Text style={styles.navTitle}>{dayAbbr}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !daySession ? (
        <View style={styles.skeletonWrap}>
          <SkeletonBox width={200} height={16} borderRadius={6} />
          <SkeletonBox width="100%" height={40} borderRadius={8} />
          <SkeletonBox width="100%" height={60} borderRadius={8} />
          <SkeletonBox width="100%" height={100} borderRadius={10} />
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBox key={i} width="100%" height={80} borderRadius={12} />
          ))}
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : daySession ? (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Breadcrumb */}
            <View style={styles.breadcrumb}>
              <Text style={styles.breadcrumbText}>{dayAbbr}</Text>
              <Text style={styles.breadcrumbSep}> › </Text>
              <Text style={styles.breadcrumbText}>{daySession.category}</Text>
              <View style={[styles.categoryBadge, { backgroundColor: catColor + "22", borderColor: catColor + "55" }]}>
                <Text style={[styles.categoryText, { color: catColor }]}>
                  {daySession.category}
                </Text>
              </View>
            </View>

            {/* Session title */}
            <Text style={styles.sessionTitle}>{daySession.title}</Text>

            {/* Description */}
            <Text style={styles.sessionDesc}>{daySession.description}</Text>

            {/* Stat row */}
            <View style={styles.statRow}>
              {[
                { label: "DURATION", value: daySession.durationLabel },
                { label: "INTENSITY", value: daySession.intensityLabel },
                { label: "FOCUS", value: daySession.focusLabel },
              ].map((stat) => (
                <View key={stat.label} style={styles.statCard}>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                  <Text style={styles.statValue}>{stat.value || "—"}</Text>
                </View>
              ))}
            </View>

            {/* Session plan */}
            <Text style={styles.sectionHeader}>SESSION PLAN</Text>

            <View style={{ gap: 10 }}>
              {exercises.map((ex, idx) => (
                <ExerciseCard key={ex.id} ex={ex} index={idx} />
              ))}
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Complete button — fixed at bottom */}
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
            <Pressable
              onPress={handleComplete}
              disabled={daySession.completed || completing}
              style={({ pressed }) => [
                styles.completeBtn,
                daySession.completed && styles.completeBtnDone,
                pressed && !daySession.completed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={daySession.completed ? "Session completed" : "Mark complete"}
            >
              {completing ? (
                <ActivityIndicator size="small" color={BG} />
              ) : daySession.completed ? (
                <>
                  <Check size={18} color={BG} strokeWidth={3} />
                  <Text style={styles.completeBtnText}>Completed</Text>
                </>
              ) : (
                <Text style={styles.completeBtnText}>Mark Complete</Text>
              )}
            </Pressable>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CARD,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 17,
    fontFamily: "Outfit-Bold",
    color: TEXT_PRIMARY,
    letterSpacing: 1.5,
    flex: 1,
    textAlign: "center",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  breadcrumbText: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    color: TEXT_MUTED,
    letterSpacing: 0.3,
  },
  breadcrumbSep: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    color: TEXT_MUTED,
  },
  categoryBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    marginLeft: 4,
  },
  categoryText: {
    fontSize: 10,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.5,
  },
  sessionTitle: {
    fontSize: 26,
    fontFamily: "Outfit-Bold",
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
    lineHeight: 30,
    marginBottom: 12,
  },
  sessionDesc: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    color: TEXT_MUTED,
    lineHeight: 21,
    marginBottom: 20,
  },
  statRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_MUTED,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  statLabel: {
    fontSize: 9,
    fontFamily: "Outfit-Bold",
    color: TEXT_MUTED,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
    color: TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    color: TEXT_MUTED,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  exerciseCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_MUTED,
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 14,
  },
  exerciseNumBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: ACCENT + "1A",
    borderWidth: 1,
    borderColor: ACCENT + "40",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  exerciseNum: {
    fontSize: 13,
    fontFamily: "Outfit-Bold",
    color: ACCENT,
  },
  exerciseName: {
    fontSize: 15,
    fontFamily: "Outfit-Bold",
    color: TEXT_PRIMARY,
    marginBottom: 4,
    letterSpacing: -0.1,
  },
  exerciseMetric: {
    fontSize: 13,
    fontFamily: "Outfit-Bold",
    color: ACCENT,
    marginBottom: 4,
  },
  exerciseNotes: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    color: TEXT_MUTED,
    fontStyle: "italic",
    lineHeight: 17,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: BORDER_MUTED,
  },
  completeBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  completeBtnDone: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: ACCENT + "44",
  },
  completeBtnText: {
    fontSize: 15,
    fontFamily: "Outfit-Bold",
    color: BG,
    letterSpacing: 0.3,
  },
  skeletonWrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  errorBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    color: TEXT_MUTED,
    textAlign: "center",
  },
});
