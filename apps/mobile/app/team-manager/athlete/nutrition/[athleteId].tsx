import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Droplets, Footprints, Moon, Utensils, Zap } from "lucide-react-native";
import { Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSelector } from "@/store/hooks";
import { apiRequest } from "@/lib/api";

type NutritionLog = {
  id: number;
  dateKey: string;
  mealType: string;
  athleteType: string;
  breakfast: string | null;
  snacks: string | null;
  snacksMorning: string | null;
  snacksAfternoon: string | null;
  snacksEvening: string | null;
  lunch: string | null;
  dinner: string | null;
  waterIntake: number | null;
  steps: number | null;
  sleepHours: number | null;
  mood: number | null;
  energy: number | null;
  pain: number | null;
  foodDiary: string | null;
  coachFeedback: string | null;
  loggedAt: string;
};

type NutritionLogsResponse = {
  targetCalories: number | null;
  logs: NutritionLog[];
};

type DayGroup = {
  dateKey: string;
  logs: NutritionLog[];
};

function formatDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function RatingDot({ value, max = 5 }: { value: number | null; max?: number }) {
  const p = useAdminPastel();
  if (!value) return null;
  return (
    <View style={{ flexDirection: "row", gap: 3 }}>
      {Array.from({ length: max }, (_, i) => (
        <View
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i < value ? p.accent : p.border,
          }}
        />
      ))}
    </View>
  );
}

function MealRow({ label, value }: { label: string; value: string | null }) {
  const p = useAdminPastel();
  if (!value) return null;
  return (
    <View style={styles.mealRow}>
      <Text style={[styles.mealLabel, { color: p.textMuted }]}>{label}</Text>
      <Text style={[styles.mealValue, { color: p.textPrimary }]}>{value}</Text>
    </View>
  );
}

function LogCard({ log }: { log: NutritionLog }) {
  const p = useAdminPastel();
  const isYouth = log.athleteType === "youth";

  const hasContent =
    log.breakfast ||
    log.lunch ||
    log.dinner ||
    log.snacks ||
    log.snacksMorning ||
    log.snacksAfternoon ||
    log.snacksEvening ||
    log.foodDiary;

  return (
    <View style={[styles.logCard, { backgroundColor: p.cardWhite, borderColor: p.border }]}>
      <View style={styles.logCardHeader}>
        <View style={[styles.mealBadge, { backgroundColor: p.accent + "20" }]}>
          <Utensils size={12} color={p.accent} />
          <Text style={[styles.mealBadgeText, { color: p.accent }]}>
            {log.mealType.replace(/_/g, " ")}
          </Text>
        </View>
        <Text style={[styles.logTime, { color: p.textMuted }]}>
          {new Date(log.loggedAt).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </Text>
      </View>

      {isYouth ? (
        <>
          <MealRow label="Breakfast" value={log.breakfast} />
          <MealRow label="Morning Snack" value={log.snacksMorning} />
          <MealRow label="Lunch" value={log.lunch} />
          <MealRow label="Afternoon Snack" value={log.snacksAfternoon} />
          <MealRow label="Dinner" value={log.dinner} />
          <MealRow label="Evening Snack" value={log.snacksEvening} />
          <MealRow label="Snacks" value={log.snacks} />
        </>
      ) : (
        <MealRow label="Food Diary" value={log.foodDiary} />
      )}

      {!hasContent && (
        <Text style={[styles.emptyEntry, { color: p.textMuted }]}>No meal entries recorded.</Text>
      )}

      {(log.waterIntake != null || log.steps != null || log.sleepHours != null) && (
        <View style={[styles.statsRow, { borderTopColor: p.border }]}>
          {log.waterIntake != null && log.waterIntake > 0 && (
            <View style={styles.statChip}>
              <Droplets size={13} color={p.textMuted} />
              <Text style={[styles.statText, { color: p.textSecondary }]}>
                {log.waterIntake} oz water
              </Text>
            </View>
          )}
          {log.steps != null && log.steps > 0 && (
            <View style={styles.statChip}>
              <Footprints size={13} color={p.textMuted} />
              <Text style={[styles.statText, { color: p.textSecondary }]}>
                {log.steps.toLocaleString()} steps
              </Text>
            </View>
          )}
          {log.sleepHours != null && log.sleepHours > 0 && (
            <View style={styles.statChip}>
              <Moon size={13} color={p.textMuted} />
              <Text style={[styles.statText, { color: p.textSecondary }]}>
                {log.sleepHours}h sleep
              </Text>
            </View>
          )}
        </View>
      )}

      {(log.mood != null || log.energy != null || log.pain != null) && (
        <View style={[styles.ratingsRow, { borderTopColor: p.border }]}>
          {log.mood != null && (
            <View style={styles.ratingItem}>
              <Text style={[styles.ratingLabel, { color: p.textMuted }]}>Mood</Text>
              <RatingDot value={log.mood} />
            </View>
          )}
          {log.energy != null && (
            <View style={styles.ratingItem}>
              <Zap size={11} color={p.textMuted} />
              <Text style={[styles.ratingLabel, { color: p.textMuted }]}>Energy</Text>
              <RatingDot value={log.energy} />
            </View>
          )}
          {log.pain != null && log.pain > 0 && (
            <View style={styles.ratingItem}>
              <Text style={[styles.ratingLabel, { color: p.textMuted }]}>Pain</Text>
              <RatingDot value={log.pain} />
            </View>
          )}
        </View>
      )}

      {log.coachFeedback ? (
        <View style={[styles.feedbackBox, { backgroundColor: p.accent + "12", borderColor: p.accent + "30" }]}>
          <Text style={[styles.feedbackLabel, { color: p.accent }]}>Coach Feedback</Text>
          <Text style={[styles.feedbackText, { color: p.textPrimary }]}>{log.coachFeedback}</Text>
        </View>
      ) : null}
    </View>
  );
}

function DaySection({ group }: { group: DayGroup }) {
  const p = useAdminPastel();
  return (
    <View style={styles.daySection}>
      <View style={[styles.dayHeader, { borderBottomColor: p.border }]}>
        <Text style={[styles.dayTitle, { color: p.textPrimary }]}>{formatDate(group.dateKey)}</Text>
        <Text style={[styles.dayCount, { color: p.textMuted }]}>
          {group.logs.length} {group.logs.length === 1 ? "entry" : "entries"}
        </Text>
      </View>
      <View style={styles.dayCards}>
        {group.logs.map((log) => (
          <LogCard key={log.id} log={log} />
        ))}
      </View>
    </View>
  );
}

export default function AthleteNutritionScreen() {
  const p = useAdminPastel();
  const insets = useSafeAreaInsets();
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const { token } = useAppSelector((state) => state.user);

  const [data, setData] = useState<NutritionLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(
    async (isRefresh = false) => {
      if (!token || !athleteId) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await apiRequest<NutritionLogsResponse>(
          `/team/roster/athletes/${athleteId}/nutrition/logs`,
          { token },
        );
        setData(result);
      } catch {
        setError("Failed to load nutrition logs.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, athleteId],
  );

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const dayGroups = React.useMemo<DayGroup[]>(() => {
    if (!data?.logs?.length) return [];
    const map = new Map<string, NutritionLog[]>();
    for (const log of data.logs) {
      const group = map.get(log.dateKey) ?? [];
      group.push(log);
      map.set(log.dateKey, group);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dateKey, logs]) => ({ dateKey, logs }));
  }, [data]);

  return (
    <View style={[styles.root, { backgroundColor: p.pageBg }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            borderBottomColor: p.border,
            backgroundColor: p.pageBg,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
        >
          <ArrowLeft size={22} color={p.textPrimary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: p.textPrimary }]}>Nutrition Logs</Text>
          {data?.targetCalories ? (
            <Text style={[styles.headerSub, { color: p.textMuted }]}>
              Target: {data.targetCalories} cal/day
            </Text>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={p.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: p.textMuted }]}>{error}</Text>
        </View>
      ) : dayGroups.length === 0 ? (
        <View style={styles.center}>
          <Utensils size={40} color={p.textMuted} style={{ opacity: 0.35, marginBottom: 12 }} />
          <Text style={[styles.emptyTitle, { color: p.textPrimary }]}>No nutrition logs yet</Text>
          <Text style={[styles.emptySubtitle, { color: p.textMuted }]}>
            Logs will appear here once the athlete starts tracking meals.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchLogs(true)}
              tintColor={p.accent}
            />
          }
        >
          {dayGroups.map((group) => (
            <DaySection key={group.dateKey} group={group} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerText: { flex: 1 },
  headerTitle: {
    fontFamily: "Outfit-Bold",
    fontSize: 20,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontFamily: "Outfit-Regular",
    fontSize: 13,
    marginTop: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  errorText: { fontFamily: "Outfit-Regular", fontSize: 15, textAlign: "center" },
  emptyTitle: {
    fontFamily: "Outfit-Bold",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: "Outfit-Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  list: { paddingTop: 8 },
  daySection: { marginBottom: 4 },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayTitle: {
    fontFamily: "Outfit-Bold",
    fontSize: 15,
    letterSpacing: -0.2,
  },
  dayCount: {
    fontFamily: "Outfit-Regular",
    fontSize: 12,
  },
  dayCards: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, gap: 10 },
  logCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  logCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  mealBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  mealBadgeText: {
    fontFamily: "Outfit-Bold",
    fontSize: 11,
    textTransform: "capitalize",
  },
  logTime: { fontFamily: "Outfit-Regular", fontSize: 12 },
  mealRow: { paddingHorizontal: 14, paddingBottom: 10, gap: 3 },
  mealLabel: {
    fontFamily: "Outfit-Bold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mealValue: { fontFamily: "Outfit-Regular", fontSize: 14, lineHeight: 20 },
  emptyEntry: { fontFamily: "Outfit-Regular", fontSize: 13, paddingHorizontal: 14, paddingBottom: 12 },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statChip: { flexDirection: "row", alignItems: "center", gap: 5 },
  statText: { fontFamily: "Outfit-Regular", fontSize: 12 },
  ratingsRow: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ratingItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  ratingLabel: { fontFamily: "Outfit-Regular", fontSize: 11 },
  feedbackBox: {
    margin: 12,
    marginTop: 4,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  feedbackLabel: {
    fontFamily: "Outfit-Bold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  feedbackText: { fontFamily: "Outfit-Regular", fontSize: 13, lineHeight: 18 },
});
