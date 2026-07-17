import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { Text } from "@/components/ScaledText";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { apiRequest } from "@/lib/api";
import { useNutritionTheme } from "@/components/nutrition/theme";
import { queryKeys } from "@/lib/queryKeys";
import { useAppSelector } from "@/store/hooks";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { SkeletonNutritionLogScreen } from "@/components/ui/legacy-skeleton";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  X,
  Utensils,
  Droplets,
  Moon,
  Footprints,
  Heart,
  Zap,
  AlertCircle,
  MessageSquare,
} from "lucide-react-native";

type MealItem = {
  id?: string;
  name: string;
  calories: number;
  weightGrams?: number;
  unit?: string;
  protein?: number;
  carbs?: number;
  fat?: number;
};

type ParsedMeal =
  | { logged: false }
  | { logged: true; items: MealItem[]; legacyText?: string };

function parseMealSlot(value: unknown): ParsedMeal {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return { logged: false };

  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return { logged: true, items: parsed as MealItem[] };
      }
    } catch {}
  }

  if (raw.toLowerCase() === "yes") return { logged: true, items: [] };
  return { logged: true, items: [], legacyText: raw };
}

function mealTotalCals(meal: ParsedMeal): number {
  if (!meal.logged) return 0;
  return meal.items.reduce((sum, i) => sum + (i.calories ?? 0), 0);
}

function photosForSlots(log: any, slots: string[]): string[] {
  const rows = Array.isArray(log?.photos) ? log.photos : [];
  return rows
    .filter((row: any) => slots.includes(String(row?.mealSlot ?? "")) && typeof row?.url === "string" && row.url)
    .map((row: any) => row.url as string);
}

function MealSection({
  label,
  meal,
  p,
  photos = [],
  onPhotoPress,
}: {
  label: string;
  meal: ParsedMeal;
  p: ReturnType<typeof useNutritionTheme>;
  photos?: string[];
  onPhotoPress?: (url: string) => void;
}) {
  if (!meal.logged && photos.length === 0) return null;
  const total = mealTotalCals(meal);
  const items = meal.logged ? meal.items : [];

  return (
    <View
      style={{
        borderRadius: 18,
        backgroundColor: p.inputBg,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: p.divider,
      }}
    >
      {/* Meal header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderBottomWidth: items.length > 0 || photos.length > 0 ? 1 : 0,
          borderBottomColor: p.divider,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              backgroundColor: p.accentSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Utensils size={14} color={p.accent} />
          </View>
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.textPrimary }}>
            {label}
          </Text>
        </View>
        {total > 0 && (
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.accent }}>
            {total} kcal
          </Text>
        )}
        {meal.logged && meal.items.length === 0 && !meal.legacyText && (
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textMuted }}>
            Logged
          </Text>
        )}
      </View>

      {/* Legacy text log */}
      {meal.logged && meal.legacyText ? (
        <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textSecondary, lineHeight: 20 }}>
            {meal.legacyText}
          </Text>
        </View>
      ) : null}

      {/* Food photos */}
      {photos.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 14, paddingVertical: 10 }}>
          {photos.map((url) => (
            <Pressable key={url} onPress={onPhotoPress ? () => onPhotoPress(url) : undefined} accessibilityLabel="View meal photo">
              <Image
                source={{ uri: url }}
                style={{ width: 72, height: 72, borderRadius: 12, backgroundColor: p.divider }}
                contentFit="cover"
                transition={150}
              />
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Food items */}
      {items.map((item, idx) => {
        const hasWeight = item.weightGrams && item.weightGrams > 0;
        const hasMacros =
          (item.protein ?? 0) > 0 || (item.carbs ?? 0) > 0 || (item.fat ?? 0) > 0;
        return (
          <View
            key={item.id ?? idx}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderTopWidth: idx > 0 ? 1 : 0,
              borderTopColor: p.divider,
              gap: 4,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  fontFamily: "Outfit-Medium",
                  fontSize: 13,
                  color: p.textPrimary,
                }}
                numberOfLines={2}
              >
                {item.name}
              </Text>
              <View style={{ alignItems: "flex-end", gap: 2 }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.textPrimary }}>
                  {item.calories} kcal
                </Text>
                {hasWeight ? (
                  <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textMuted }}>
                    {item.weightGrams}
                    {item.unit ?? "g"}
                  </Text>
                ) : null}
              </View>
            </View>
            {hasMacros && (
              <View style={{ flexDirection: "row", gap: 12, marginTop: 2 }}>
                {(item.protein ?? 0) > 0 && (
                  <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.success }}>
                    P {Math.round(item.protein!)}g
                  </Text>
                )}
                {(item.carbs ?? 0) > 0 && (
                  <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.accent }}>
                    C {Math.round(item.carbs!)}g
                  </Text>
                )}
                {(item.fat ?? 0) > 0 && (
                  <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textSecondary }}>
                    F {Math.round(item.fat!)}g
                  </Text>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function StatRow({
  icon,
  label,
  value,
  p,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  p: ReturnType<typeof useNutritionTheme>;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 10,
      }}
    >
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
        {icon}
      </View>
      <Text style={{ flex: 1, fontFamily: "Outfit-Regular", fontSize: 14, color: p.textPrimary }}>
        {label}
      </Text>
      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.textPrimary }}>
        {value}
      </Text>
    </View>
  );
}

export default function NutritionLogDetailScreen() {
  const router = useRouter();
  const p = useNutritionTheme();
  const { dateKey, userId } = useLocalSearchParams<{
    dateKey: string;
    userId?: string;
  }>();
  const athleteUserId = useAppSelector((s) => s.user.athleteUserId);
  const token = useAppSelector((s) => s.user.token);

  const effectiveUserId = useMemo(() => {
    if (typeof userId === "string" && userId.trim().length) return userId.trim();
    return athleteUserId ? String(athleteUserId) : "me";
  }, [athleteUserId, userId]);

  const dk = String(dateKey ?? "").trim();
  const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(dk);

  const {
    data: logResult,
    isLoading: loading,
    isError,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.nutrition.log(dk, effectiveUserId),
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("userId", effectiveUserId);
      qs.set("from", dk);
      qs.set("to", dk);
      qs.set("limit", "5");
      const data = await apiRequest<{ logs: any[] }>(
        `/nutrition/logs?${qs.toString()}`,
        { token: token!, suppressLog: true },
      );
      return (data.logs ?? []).find((l: any) => l?.dateKey === dk) ?? null;
    },
    enabled: !!token && isValidDate,
    staleTime: 5 * 60 * 1000,
  });

  const log: any | null = logResult ?? null;
  const error: string | null = !token
    ? "Not signed in."
    : !isValidDate
      ? "Invalid date."
      : isError
        ? ((queryError as Error)?.message ?? "Failed to load log.")
        : !loading && logResult === null
          ? "Log not found."
          : null;

  const [photoViewerUrl, setPhotoViewerUrl] = useState<string | null>(null);

  const slotPhotos = useMemo(
    () => ({
      breakfast: photosForSlots(log, ["breakfast"]),
      lunch: photosForSlots(log, ["lunch"]),
      dinner: photosForSlots(log, ["dinner"]),
      snacksMorning: photosForSlots(log, ["snacksMorning"]),
      snacksAfternoon: photosForSlots(log, ["snacksAfternoon"]),
      snacksEvening: photosForSlots(log, ["snacksEvening"]),
      snacks: photosForSlots(log, ["snacks"]),
    }),
    [log],
  );
  const hasModernSnackPhotos =
    slotPhotos.snacksMorning.length > 0 || slotPhotos.snacksAfternoon.length > 0 || slotPhotos.snacksEvening.length > 0;
  const hasAnyMealPhotos = Object.values(slotPhotos).some((urls) => urls.length > 0);

  const coachText =
    typeof log?.coachFeedback === "string" ? log.coachFeedback.trim() : "";
  const coachMedia =
    typeof log?.coachFeedbackMediaUrl === "string"
      ? log.coachFeedbackMediaUrl.trim()
      : "";

  const meals = useMemo(() => {
    if (!log) return null;
    const breakfast = parseMealSlot(log?.breakfast);
    const lunch = parseMealSlot(log?.lunch);
    const dinner = parseMealSlot(log?.dinner);
    const snacksMorning = parseMealSlot(log?.snacksMorning);
    const snacksAfternoon = parseMealSlot(log?.snacksAfternoon);
    const snacksEvening = parseMealSlot(log?.snacksEvening);

    // Decide how to show snacks: if modern snacks exist use them, otherwise fall back
    const anyModernSnack =
      snacksMorning.logged || snacksAfternoon.logged || snacksEvening.logged;
    const legacySnack = anyModernSnack ? null : parseMealSlot(log?.snacks);

    const totalCals =
      mealTotalCals(breakfast) +
      mealTotalCals(lunch) +
      mealTotalCals(dinner) +
      mealTotalCals(snacksMorning) +
      mealTotalCals(snacksAfternoon) +
      mealTotalCals(snacksEvening) +
      (legacySnack ? mealTotalCals(legacySnack) : 0);

    return {
      breakfast,
      lunch,
      dinner,
      snacksMorning,
      snacksAfternoon,
      snacksEvening,
      legacySnack,
      anyModernSnack,
      totalCals,
      water: typeof log?.waterIntake === "number" ? log.waterIntake : 0,
      steps: log?.athleteType === "adult" && typeof log?.steps === "number" ? log.steps : null,
      sleepHours: log?.athleteType === "adult" && typeof log?.sleepHours === "number" ? log.sleepHours : null,
      mood: typeof log?.mood === "number" ? log.mood : null,
      energy: typeof log?.energy === "number" ? log.energy : null,
      pain: typeof log?.pain === "number" ? log.pain : null,
      foodDiary: typeof log?.foodDiary === "string" ? log.foodDiary.trim() : "",
      targetCalories: typeof log?.targetCalories === "number" ? log.targetCalories : null,
    };
  }, [log]);

  const formattedDate = useMemo(() => {
    if (!dk) return "";
    const d = new Date(dk + "T00:00:00");
    return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }, [dk]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }} edges={["top"]}>
      <MoreStackHeader
        title="Nutrition Log"
        subtitle={formattedDate}
        rightSlot={
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace("/nutrition");
            }}
            style={{
              height: 40,
              width: 40,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 100,
              backgroundColor: p.inputBg,
            }}
          >
            <X size={20} color={p.textSecondary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <SkeletonNutritionLogScreen />
        ) : error === "Log not found." ? (
          <View
            style={{
              borderRadius: 22,
              paddingHorizontal: 20,
              paddingVertical: 24,
              gap: 16,
              alignItems: "center",
              backgroundColor: p.cardWhite,
            }}
          >
            <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary, textAlign: "center" }}>
              No nutrition log for this day yet.
            </Text>
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)" as any)}
              style={{ borderRadius: 100, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: p.buttonPrimary }}
            >
              <Text style={{ fontSize: 14, fontFamily: "Outfit-Bold", textAlign: "center", color: p.buttonPrimaryText }}>
                Log today's nutrition
              </Text>
            </TouchableOpacity>
          </View>
        ) : error ? (
          <View
            style={{
              borderRadius: 22,
              padding: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              backgroundColor: p.cardPeach,
            }}
          >
            <AlertCircle size={18} color={p.textSecondary} />
            <Text style={{ flex: 1, fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
              {error}
            </Text>
          </View>
        ) : meals ? (
          <>
            {/* Calorie summary strip */}
            {meals.totalCals > 0 && (
              <View
                style={{
                  borderRadius: 20,
                  backgroundColor: p.cardWhite,
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View>
                  <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textMuted, marginBottom: 2 }}>
                    Total eaten
                  </Text>
                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 28, color: p.textPrimary, letterSpacing: -0.5 }}>
                    {meals.totalCals}
                    <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textMuted }}> kcal</Text>
                  </Text>
                </View>
                {meals.targetCalories && (
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textMuted, marginBottom: 2 }}>
                      Goal
                    </Text>
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 20, color: p.accent }}>
                      {meals.targetCalories}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Meal sections */}
            <View style={{ gap: 10 }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.textMuted, textTransform: "uppercase", letterSpacing: 1, paddingLeft: 4 }}>
                Meals
              </Text>
              <MealSection label="Breakfast" meal={meals.breakfast} p={p} photos={slotPhotos.breakfast} onPhotoPress={setPhotoViewerUrl} />
              <MealSection label="Lunch" meal={meals.lunch} p={p} photos={slotPhotos.lunch} onPhotoPress={setPhotoViewerUrl} />
              <MealSection label="Dinner" meal={meals.dinner} p={p} photos={slotPhotos.dinner} onPhotoPress={setPhotoViewerUrl} />
              {meals.anyModernSnack || hasModernSnackPhotos ? (
                <>
                  <MealSection label="Morning Snack" meal={meals.snacksMorning} p={p} photos={slotPhotos.snacksMorning} onPhotoPress={setPhotoViewerUrl} />
                  <MealSection label="Afternoon Snack" meal={meals.snacksAfternoon} p={p} photos={slotPhotos.snacksAfternoon} onPhotoPress={setPhotoViewerUrl} />
                  <MealSection label="Evening Snack" meal={meals.snacksEvening} p={p} photos={slotPhotos.snacksEvening} onPhotoPress={setPhotoViewerUrl} />
                </>
              ) : meals.legacySnack ? (
                <MealSection label="Snack" meal={meals.legacySnack} p={p} photos={slotPhotos.snacks} onPhotoPress={setPhotoViewerUrl} />
              ) : null}
              {!meals.breakfast.logged &&
                !meals.lunch.logged &&
                !meals.dinner.logged &&
                !meals.snacksMorning.logged &&
                !hasAnyMealPhotos && (
                  <View style={{ borderRadius: 18, backgroundColor: p.inputBg, padding: 16 }}>
                    <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textSecondary, textAlign: "center" }}>
                      No meals logged for this day.
                    </Text>
                  </View>
                )}
            </View>

            {/* Daily stats */}
            {(meals.water > 0 || meals.steps !== null || meals.sleepHours !== null || meals.mood !== null || meals.energy !== null || meals.pain !== null || meals.foodDiary) && (
              <View
                style={{
                  borderRadius: 20,
                  backgroundColor: p.cardWhite,
                  paddingHorizontal: 16,
                  paddingTop: 14,
                  paddingBottom: 6,
                }}
              >
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                  Daily stats
                </Text>
                <View style={{ height: 1, backgroundColor: p.divider, marginBottom: 4 }} />
                {meals.water > 0 && (
                  <StatRow icon={<Droplets size={15} color={p.accent} />} label="Water" value={`${meals.water} L`} p={p} />
                )}
                {meals.steps !== null && (
                  <StatRow icon={<Footprints size={15} color={p.accent} />} label="Steps" value={meals.steps.toLocaleString()} p={p} />
                )}
                {meals.sleepHours !== null && (
                  <StatRow icon={<Moon size={15} color={p.accent} />} label="Sleep" value={`${meals.sleepHours}h`} p={p} />
                )}
                {meals.mood !== null && (
                  <StatRow icon={<Heart size={15} color={p.accent} />} label="Mood" value={`${meals.mood}/5`} p={p} />
                )}
                {meals.energy !== null && (
                  <StatRow icon={<Zap size={15} color={p.accent} />} label="Energy" value={`${meals.energy}/5`} p={p} />
                )}
                {meals.pain !== null && (
                  <StatRow icon={<AlertCircle size={15} color={p.accent} />} label="Pain" value={`${meals.pain}/5`} p={p} />
                )}
                {meals.foodDiary ? (
                  <View style={{ paddingTop: 8, paddingBottom: 10 }}>
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, color: p.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.8 }}>
                      Food diary
                    </Text>
                    <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textPrimary, lineHeight: 22 }}>
                      {meals.foodDiary}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Coach response */}
            <View style={{ gap: 10 }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.textMuted, textTransform: "uppercase", letterSpacing: 1, paddingLeft: 4 }}>
                Coach response
              </Text>
              <View
                style={{
                  borderRadius: 20,
                  backgroundColor: p.cardWhite,
                  padding: 16,
                  gap: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: p.accentSoft, alignItems: "center", justifyContent: "center" }}>
                    <MessageSquare size={14} color={p.accent} />
                  </View>
                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.textPrimary }}>
                    {coachText || coachMedia ? "Feedback" : "No response yet"}
                  </Text>
                </View>
                {coachText ? (
                  <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textPrimary, lineHeight: 24 }}>
                    {coachText}
                  </Text>
                ) : !coachMedia ? (
                  <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
                    Once your coach reviews this log, their feedback will appear here.
                  </Text>
                ) : null}
                {coachMedia ? (
                  <View style={{ borderRadius: 16, overflow: "hidden", backgroundColor: p.inputBg }}>
                    <VideoPlayer uri={coachMedia} height={200} useVideoResolution />
                  </View>
                ) : null}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Full-screen photo viewer */}
      <Modal
        visible={photoViewerUrl !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoViewerUrl(null)}
      >
        <Pressable
          onPress={() => setPhotoViewerUrl(null)}
          accessibilityLabel="Close photo"
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" }}
        >
          {photoViewerUrl ? (
            <Image
              source={{ uri: photoViewerUrl }}
              style={{ width: "100%", height: "80%" }}
              contentFit="contain"
              transition={150}
            />
          ) : null}
          <View
            style={{
              position: "absolute",
              top: 56,
              right: 20,
              width: 40,
              height: 40,
              borderRadius: 100,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={20} color="#fff" />
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
