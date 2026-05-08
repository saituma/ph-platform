import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, LayoutAnimation, Platform, Pressable, ScrollView, UIManager, View } from "react-native";
import { Bell, Calendar, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Flame, MessageSquare, Play, Target, TrendingUp, Utensils } from "lucide-react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSelector } from "@/store/hooks";
import { useActingUser } from "@/hooks/useActingUser";
import { apiRequest } from "@/lib/api";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { CalorieRing } from "./CalorieRing";
import { MealCard } from "./MealCard";
import { MealDetailModal } from "./MealDetailModal";
import { useNutritionDay } from "./useNutritionDay";
import type { MealItem, MealSlotName } from "./types";
import type { CoachFeedbackEntry } from "./useNutritionDay";

function formatDate(dateKey: string) {
  const d = new Date(dateKey + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatRelative(dateKey: string) {
  const today = new Date().toISOString().slice(0, 10);
  if (dateKey === today) return "Today";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey === yesterday.toISOString().slice(0, 10)) return "Yesterday";
  const d = new Date(dateKey + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(dateKey: string, days: number): string {
  const d = new Date(dateKey + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateNav(dateKey: string): string {
  const today = todayKey();
  if (dateKey === today) return "Today";
  const yesterday = shiftDate(today, -1);
  if (dateKey === yesterday) return "Yesterday";
  const d = new Date(dateKey + "T12:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function NutritionDashboard() {
  const p = useAdminPastel();
  const router = useRouter();
  const profile = useAppSelector((s) => s.user.profile);
  const { token } = useAppSelector((s) => s.user);
  const { actingUserId } = useActingUser();
  const athleteUserId = actingUserId;

  const [selectedDate, setSelectedDate] = useState(todayKey);
  const isToday = selectedDate === todayKey();
  const { data, loading, coachHistory, historyLoading, refetch, optimisticUpdateMeal } = useNutritionDay(selectedDate);

  const [activeMeal, setActiveMeal] = useState<MealSlotName | null>(null);
  const [showAllCoach, setShowAllCoach] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const toggleStats = useCallback(() => {
    LayoutAnimation.configureNext({
      duration: 350,
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowStats((v) => !v);
  }, []);

  const firstName = useMemo(() => {
    const name = profile?.name ?? "";
    return name.split(" ")[0] || "Athlete";
  }, [profile?.name]);

  const goBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDate((d) => shiftDate(d, -1));
  }, []);

  const goForward = useCallback(() => {
    setSelectedDate((d) => {
      const next = shiftDate(d, 1);
      if (next > todayKey()) return d;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return next;
    });
  }, []);

  const goToday = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDate(todayKey());
  }, []);

  const activeSlotData = activeMeal && data ? data.meals[activeMeal] : null;

  const serializeMealItems = (items: MealItem[]): string => {
    if (items.length === 0) return "";
    return JSON.stringify(
      items.map((i) => ({
        id: i.id,
        name: i.name,
        calories: i.calories,
        weightGrams: i.weightGrams,
        unit: i.unit,
      })),
    );
  };

  const handleConfirmMeal = useCallback(
    async (items: MealItem[]) => {
      if (!token || !activeMeal) return;
      try {
        const serialized = serializeMealItems(items);
        const body: Record<string, any> = {
          athleteId: athleteUserId || undefined,
          dateKey: data?.dateKey ?? new Date().toISOString().slice(0, 10),
        };

        if (activeMeal === "snack") {
          body.snacksMorning = serialized;
        } else {
          body[activeMeal] = serialized;
        }

        optimisticUpdateMeal(activeMeal, items);
        setActiveMeal(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        await apiRequest("/nutrition/logs", {
          method: "POST",
          token,
          body,
        });

        void refetch();
      } catch {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [activeMeal, athleteUserId, data?.dateKey, optimisticUpdateMeal, refetch, token],
  );


  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 }}>
        <ActivityIndicator size="large" color={p.accent} />
      </View>
    );
  }

  const targetCal = data?.targetCalories ?? 2000;
  const eatenCal = data?.eatenCalories ?? 0;
  const burnedCal = data?.burnedCalories ?? 0;
  const progress = targetCal > 0 ? eatenCal / targetCal : 0;
  const dateLabel = data ? formatDate(data.dateKey) : "";

  const meals = data?.meals ?? {
    breakfast: { slot: "breakfast" as const, label: "Breakfast", items: [], recommendedMin: 440, recommendedMax: 615 },
    lunch: { slot: "lunch" as const, label: "Lunch", items: [], recommendedMin: 550, recommendedMax: 620 },
    snack: { slot: "snack" as const, label: "Snack", items: [], recommendedMin: 200, recommendedMax: 360 },
    dinner: { slot: "dinner" as const, label: "Dinner", items: [], recommendedMin: 550, recommendedMax: 700 },
  };

  const visibleCoach = showAllCoach ? coachHistory : coachHistory.slice(0, 3);

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: p.pageBg }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero section */}
        <View
          style={{
            backgroundColor: p.pageBg,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            borderWidth: 1.5,
            borderTopWidth: 0,
            borderColor: p.accent,
            paddingHorizontal: 24,
            paddingTop: 8,
            paddingBottom: 32,
          }}
        >
          {/* Greeting + bell */}
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
            <View>
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textMuted }}>
                Welcome back,
              </Text>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 28, color: p.textPrimary, letterSpacing: -0.3 }}>
                {firstName}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/nutrition/reminders" as any);
              }}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 100,
                backgroundColor: p.cardWhite,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Bell size={20} color={p.accent} />
            </Pressable>
          </View>

          {/* Date navigator */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginBottom: 20,
            }}
          >
            <Pressable
              onPress={goBack}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 100,
                backgroundColor: p.cardWhite,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <ChevronLeft size={18} color={p.textPrimary} />
            </Pressable>

            <Pressable
              onPress={goToday}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 100,
                backgroundColor: isToday ? p.accent : p.cardWhite,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Calendar size={14} color={isToday ? p.buttonPrimaryText : p.textPrimary} />
              <Text
                style={{
                  fontFamily: "Outfit-Bold",
                  fontSize: 14,
                  color: isToday ? p.buttonPrimaryText : p.textPrimary,
                }}
              >
                {formatDateNav(selectedDate)}
              </Text>
            </Pressable>

            <Pressable
              onPress={goForward}
              disabled={isToday}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 100,
                backgroundColor: p.cardWhite,
                alignItems: "center",
                justifyContent: "center",
                opacity: isToday ? 0.3 : pressed ? 0.7 : 1,
              })}
            >
              <ChevronRight size={18} color={p.textPrimary} />
            </Pressable>
          </View>

          {/* Ring */}
          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <CalorieRing
              size={200}
              strokeWidth={14}
              progress={progress}
              totalKcal={eatenCal}
              dateLabel={dateLabel}
            />
          </View>

          {/* Eaten / Target / Remaining row */}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 32 }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 20, color: p.textPrimary }}>
                {eatenCal}
              </Text>
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textMuted, marginTop: 2 }}>
                Eaten
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: p.divider, height: 36 }} />
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 20, color: p.accent }}>
                {targetCal}
              </Text>
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textMuted, marginTop: 2 }}>
                Goal
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: p.divider, height: 36 }} />
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 20, color: Math.max(0, targetCal - eatenCal) > 0 ? p.textPrimary : p.success }}>
                {Math.max(0, targetCal - eatenCal)}
              </Text>
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textMuted, marginTop: 2 }}>
                Left
              </Text>
            </View>
          </View>
        </View>

        {/* Pull handle — reveals/hides detailed stats */}
        <Pressable
          onPress={toggleStats}
          style={({ pressed }) => ({
            alignItems: "center",
            paddingVertical: 12,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <View
            style={{
              width: 40,
              height: 5,
              borderRadius: 100,
              backgroundColor: p.divider,
              marginBottom: 6,
            }}
          />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: p.textMuted }}>
              {showStats ? "Hide details" : "More details"}
            </Text>
            {showStats ? <ChevronUp size={12} color={p.textMuted} /> : <ChevronDown size={12} color={p.textMuted} />}
          </View>
        </Pressable>

        {/* Detailed stats — hidden by default */}
        {showStats && (
          <View style={{ paddingHorizontal: 20, gap: 12, marginBottom: 12 }}>
            {/* 3 stat pills */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1, borderRadius: 20, backgroundColor: p.cardSage, paddingVertical: 14, alignItems: "center" }}>
                <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: p.accentSoft, alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
                  <Target size={16} color={p.accent} />
                </View>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 18, color: p.textPrimary }}>
                  {Math.round(progress * 100)}%
                </Text>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 10, color: p.textMuted, marginTop: 2 }}>
                  of daily goal
                </Text>
              </View>
              <View style={{ flex: 1, borderRadius: 20, backgroundColor: p.cardMint, paddingVertical: 14, alignItems: "center" }}>
                <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: p.accentSoft, alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
                  <Utensils size={16} color={p.accent} />
                </View>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 18, color: p.textPrimary }}>
                  {Object.values(meals).filter((m) => m.items.length > 0).length}/4
                </Text>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 10, color: p.textMuted, marginTop: 2 }}>
                  meals logged
                </Text>
              </View>
              <View style={{ flex: 1, borderRadius: 20, backgroundColor: p.cardLavender, paddingVertical: 14, alignItems: "center" }}>
                <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: p.accentSoft, alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
                  <Flame size={16} color={p.accent} />
                </View>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 18, color: p.textPrimary }}>
                  {Math.max(0, targetCal - eatenCal)}
                </Text>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 10, color: p.textMuted, marginTop: 2 }}>
                  kcal left
                </Text>
              </View>
            </View>

            {/* Macro breakdown card */}
            <View style={{ borderRadius: 22, backgroundColor: p.cardSage, padding: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: p.accentSoft, alignItems: "center", justifyContent: "center" }}>
                  <TrendingUp size={14} color={p.accent} />
                </View>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.textPrimary }}>
                  Macros
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                {[
                  { label: "Carbs", g: data?.macros?.carbs?.grams ?? 0, color: p.accent },
                  { label: "Protein", g: data?.macros?.protein?.grams ?? 0, color: p.success },
                  { label: "Fats", g: data?.macros?.fats?.grams ?? 0, color: p.textSecondary },
                ].map((m) => {
                  const total = (data?.macros?.carbs?.grams ?? 0) + (data?.macros?.protein?.grams ?? 0) + (data?.macros?.fats?.grams ?? 0);
                  const pct = total > 0 ? Math.round((m.g / total) * 100) : 0;
                  return (
                    <View key={m.label} style={{ flex: 1, alignItems: "center", gap: 6 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 100, borderWidth: 3, borderColor: m.color, backgroundColor: p.cardWhite, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: m.color }}>
                          {pct}%
                        </Text>
                      </View>
                      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.textPrimary }}>
                        {m.g}g
                      </Text>
                      <Text style={{ fontFamily: "Outfit-Regular", fontSize: 10, color: p.textMuted }}>
                        {m.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* 2x2 Meal grid */}
        <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
          {!isToday && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 12,
                paddingHorizontal: 4,
              }}
            >
              <Clock size={14} color={p.textMuted} />
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textMuted }}>
                Viewing {formatDateNav(selectedDate)} — tap Today to log meals
              </Text>
            </View>
          )}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <MealCard slot={meals.breakfast} onPressAdd={isToday ? () => setActiveMeal("breakfast") : undefined} />
            <MealCard slot={meals.lunch} onPressAdd={isToday ? () => setActiveMeal("lunch") : undefined} />
            <MealCard slot={meals.snack} onPressAdd={isToday ? () => setActiveMeal("snack") : undefined} />
            <MealCard slot={meals.dinner} onPressAdd={isToday ? () => setActiveMeal("dinner") : undefined} />
          </View>
        </View>

        {/* ── Coach Response Section ── */}
        <View style={{ paddingHorizontal: 20 }}>
          {/* Section header */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                backgroundColor: p.accentSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MessageSquare size={18} color={p.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 18, color: p.textPrimary }}>
                Coach Responses
              </Text>
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textMuted }}>
                Feedback on your nutrition logs
              </Text>
            </View>
            {coachHistory.length > 0 ? (
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 100,
                  backgroundColor: p.successSoft,
                }}
              >
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: p.success }}>
                  {coachHistory.length}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Coach feedback cards */}
          {historyLoading ? (
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <ActivityIndicator size="small" color={p.accent} />
            </View>
          ) : coachHistory.length === 0 ? (
            <View
              style={{
                borderRadius: 22,
                backgroundColor: p.cardWhite,
                padding: 20,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  backgroundColor: p.accentSoft,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <MessageSquare size={22} color={p.accent} />
              </View>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: p.textPrimary, marginBottom: 4 }}>
                No coach replies yet
              </Text>
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textMuted, textAlign: "center", lineHeight: 20 }}>
                Once your coach responds to a nutrition log, their feedback will show up here in real time.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {visibleCoach.map((entry) => (
                <CoachFeedbackCard
                  key={entry.logId}
                  entry={entry}
                  p={p}
                  onPress={() => {
                    router.push(
                      `/nutrition/log/${encodeURIComponent(entry.dateKey)}?userId=${encodeURIComponent(String(athleteUserId || "me"))}` as any,
                    );
                  }}
                />
              ))}

              {coachHistory.length > 3 ? (
                <Pressable
                  onPress={() => setShowAllCoach((v) => !v)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    height: 44,
                    borderRadius: 100,
                    backgroundColor: p.cardSage,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.accent }}>
                    {showAllCoach ? "Show less" : `View all ${coachHistory.length} responses`}
                  </Text>
                  <ChevronDown
                    size={16}
                    color={p.accent}
                    style={showAllCoach ? { transform: [{ rotate: "180deg" }] } : undefined}
                  />
                </Pressable>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Meal detail modal */}
      <MealDetailModal
        visible={activeMeal !== null}
        slot={activeSlotData}
        onClose={() => setActiveMeal(null)}
        onConfirm={handleConfirmMeal}
      />
    </>
  );
}

function CoachFeedbackCard({
  entry,
  p,
  onPress,
}: {
  entry: CoachFeedbackEntry;
  p: ReturnType<typeof useAdminPastel>;
  onPress: () => void;
}) {
  const hasMedia = Boolean(entry.coachFeedbackMediaUrl);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: 22,
        backgroundColor: p.cardWhite,
        padding: 16,
        opacity: pressed ? 0.88 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      {/* Date + badge row */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 100,
              backgroundColor: p.accent,
            }}
          />
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.textPrimary }}>
            {formatRelative(entry.dateKey)}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {hasMedia ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 100,
                backgroundColor: p.cardMint,
              }}
            >
              <Play size={10} color={p.accent} />
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 10, color: p.accent }}>
                Media
              </Text>
            </View>
          ) : null}
          <ChevronRight size={16} color={p.textMuted} />
        </View>
      </View>

      {/* Coach text */}
      {entry.coachFeedback ? (
        <Text
          numberOfLines={3}
          style={{
            fontFamily: "Outfit-Regular",
            fontSize: 14,
            color: p.textSecondary,
            lineHeight: 22,
          }}
        >
          {entry.coachFeedback}
        </Text>
      ) : (
        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textMuted, fontStyle: "italic" }}>
          Coach sent a media response — tap to view.
        </Text>
      )}

      {/* Timestamp */}
      <Text style={{ fontFamily: "Outfit-Regular", fontSize: 10, color: p.textMuted, marginTop: 8 }}>
        Log: {entry.dateKey}
      </Text>
    </Pressable>
  );
}
