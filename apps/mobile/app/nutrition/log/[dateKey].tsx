import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { Text } from "@/components/ScaledText";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { apiRequest } from "@/lib/api";
import { useNutritionTheme } from "@/components/nutrition/theme";
import { queryKeys } from "@/lib/queryKeys";
import { useAppSelector } from "@/store/hooks";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { SkeletonNutritionLogScreen } from "@/components/ui/legacy-skeleton";
import { SafeAreaView } from "react-native-safe-area-context";
import { X } from "lucide-react-native";

function parseSlot(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return { checked: false, details: "" };
  if (raw.toLowerCase() === "yes") return { checked: true, details: "" };
  return { checked: true, details: raw };
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
    if (typeof userId === "string" && userId.trim().length)
      return userId.trim();
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
      // Return null (not undefined) so TanStack Query treats it as loaded-but-empty
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

  const coachText =
    typeof log?.coachFeedback === "string" ? log.coachFeedback.trim() : "";
  const coachMedia =
    typeof log?.coachFeedbackMediaUrl === "string"
      ? log.coachFeedbackMediaUrl.trim()
      : "";

  const lines = useMemo(() => {
    if (!log) return [];
    const out: string[] = [];
    const diary =
      typeof log?.foodDiary === "string" ? log.foodDiary.trim() : "";

    const b = parseSlot(log?.breakfast);
    const l = parseSlot(log?.lunch);
    const d = parseSlot(log?.dinner);
    const sm = parseSlot(log?.snacksMorning);
    const sa = parseSlot(log?.snacksAfternoon);
    const se = parseSlot(log?.snacksEvening);
    const legacySnacksRaw =
      typeof log?.snacks === "string" ? log.snacks.trim() : "";

    if (b.checked) out.push(`Breakfast: ${b.details || "Logged"}`);
    if (l.checked) out.push(`Lunch: ${l.details || "Logged"}`);
    if (d.checked) out.push(`Dinner: ${d.details || "Logged"}`);

    const anyNewSnack = sm.checked || sa.checked || se.checked;
    if (!anyNewSnack && legacySnacksRaw) {
      const legacy = parseSlot(legacySnacksRaw);
      if (legacy.checked)
        out.push(`Snack (legacy): ${legacy.details || "Logged"}`);
    } else {
      if (sm.checked) out.push(`Morning snack: ${sm.details || "Logged"}`);
      if (sa.checked) out.push(`Afternoon snack: ${sa.details || "Logged"}`);
      if (se.checked) out.push(`Evening snack: ${se.details || "Logged"}`);
    }

    const w = typeof log?.waterIntake === "number" ? log.waterIntake : 0;
    if (w > 0) out.push(`Water: ${w}`);

    if (log?.athleteType === "adult") {
      const steps = typeof log?.steps === "number" ? log.steps : 0;
      const sleepHours =
        typeof log?.sleepHours === "number" ? log.sleepHours : 0;
      out.push(`Steps: ${steps}`);
      out.push(`Sleep: ${sleepHours}h`);
    }
    if (typeof log?.mood === "number") out.push(`Mood: ${log.mood}/5`);
    if (typeof log?.energy === "number") out.push(`Energy: ${log.energy}/5`);
    if (typeof log?.pain === "number") out.push(`Pain: ${log.pain}/5`);

    if (diary) out.push(`Food diary: ${diary}`);
    return out;
  }, [log]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }} edges={["top"]}>
      <MoreStackHeader
        title="Nutrition Log"
        subtitle={String(dateKey ?? "")}
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

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, gap: 16, paddingBottom: 40 }}>
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
              onPress={() => router.replace("/nutrition" as any)}
              style={{ borderRadius: 100, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: p.buttonPrimary }}
            >
              <Text
                style={{ fontSize: 14, fontFamily: "Outfit-Bold", textAlign: "center", color: p.buttonPrimaryText }}
              >
                Log today's nutrition
              </Text>
            </TouchableOpacity>
          </View>
        ) : error ? (
          <View
            style={{
              borderRadius: 22,
              paddingHorizontal: 20,
              paddingVertical: 20,
              backgroundColor: p.cardPeach,
            }}
          >
            <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary }}>{error}</Text>
          </View>
        ) : (
          <>
            <View
              style={{
                borderRadius: 22,
                padding: 20,
                gap: 8,
                backgroundColor: p.cardWhite,
              }}
            >
              <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: p.textMuted, textTransform: "uppercase", letterSpacing: 1.2 }}>
                Your log
              </Text>
              {lines.length ? (
                lines.map((t) => (
                  <Text key={t} style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textPrimary }}>
                    {t}
                  </Text>
                ))
              ) : (
                <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
                  No details logged.
                </Text>
              )}
            </View>

            <View
              style={{
                borderRadius: 22,
                padding: 20,
                gap: 12,
                backgroundColor: p.cardWhite,
              }}
            >
              <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: p.textMuted, textTransform: "uppercase", letterSpacing: 1.2 }}>
                Coach response
              </Text>
              {coachText ? (
                <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textPrimary, lineHeight: 24 }}>
                  {coachText}
                </Text>
              ) : (
                <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
                  No coach response yet.
                </Text>
              )}
              {coachMedia ? (
                <View style={{ borderRadius: 22, overflow: "hidden", backgroundColor: p.inputBg }}>
                  <VideoPlayer
                    uri={coachMedia}
                    height={200}
                    useVideoResolution
                  />
                </View>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
