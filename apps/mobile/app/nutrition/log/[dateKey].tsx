import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { Text } from "@/components/ScaledText";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { apiRequest } from "@/lib/api";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSelector } from "@/store/hooks";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { SkeletonNutritionLogScreen } from "@/components/ui/Skeleton";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

function parseSlot(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return { checked: false, details: "" };
  if (raw.toLowerCase() === "yes") return { checked: true, details: "" };
  return { checked: true, details: raw };
}

export default function NutritionLogDetailScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
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

  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setError("Not signed in.");
      setLog(null);
      setLoading(false);
      return;
    }
    const dk = String(dateKey ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dk)) {
      setError("Invalid date.");
      setLog(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const qs = new URLSearchParams();
      qs.set("userId", effectiveUserId);
      qs.set("from", dk);
      qs.set("to", dk);
      qs.set("limit", "5");
      const data = await apiRequest<{ logs: any[] }>(
        `/nutrition/logs?${qs.toString()}`,
        { token, suppressLog: true },
      );
      const row = (data.logs ?? []).find((l) => l?.dateKey === dk) ?? null;
      setLog(row);
      if (!row) setError("Log not found.");
    } catch (e: any) {
      setError(e?.message ?? "Failed to load log.");
      setLog(null);
    } finally {
      setLoading(false);
    }
  }, [dateKey, effectiveUserId, token]);

  useEffect(() => {
    void load();
  }, [load]);

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
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <MoreStackHeader
        title="Nutrition Log"
        subtitle={String(dateKey ?? "")}
        rightSlot={
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace("/nutrition");
            }}
            className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <Feather name="x" size={20} color="#fff" />
          </TouchableOpacity>
        }
      />

      <View className="px-4 pt-3 gap-4">
        {loading ? (
          <SkeletonNutritionLogScreen />
        ) : error === "Log not found." ? (
          <View
            className="rounded-3xl border px-5 py-6 gap-4 items-center"
            style={{
              backgroundColor: colors.card,
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(15,23,42,0.06)",
            }}
          >
            <Text className="text-sm font-outfit text-secondary text-center">
              No nutrition log for this day yet.
            </Text>
            <TouchableOpacity
              onPress={() => router.replace("/nutrition" as any)}
              className="rounded-2xl px-6 py-3"
              style={{ backgroundColor: colors.accent }}
            >
              <Text
                className="text-sm font-outfit font-semibold text-center"
                style={{ color: "#fff" }}
              >
                Log today's nutrition
              </Text>
            </TouchableOpacity>
          </View>
        ) : error ? (
          <View
            className="rounded-3xl border px-5 py-5"
            style={{
              backgroundColor: colors.card,
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(15,23,42,0.06)",
            }}
          >
            <Text className="text-sm font-outfit text-secondary">{error}</Text>
          </View>
        ) : (
          <>
            <View
              className="rounded-3xl border p-5 gap-2"
              style={{
                backgroundColor: colors.card,
                borderColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(15,23,42,0.06)",
              }}
            >
              <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                Your log
              </Text>
              {lines.length ? (
                lines.map((t) => (
                  <Text key={t} className="text-sm font-outfit text-app">
                    {t}
                  </Text>
                ))
              ) : (
                <Text className="text-sm font-outfit text-secondary">
                  No details logged.
                </Text>
              )}
            </View>

            <View
              className="rounded-3xl border p-5 gap-3"
              style={{
                backgroundColor: colors.card,
                borderColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(15,23,42,0.06)",
              }}
            >
              <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                Coach response
              </Text>
              {coachText ? (
                <Text className="text-sm font-outfit text-app leading-6">
                  {coachText}
                </Text>
              ) : (
                <Text className="text-sm font-outfit text-secondary">
                  No coach response yet.
                </Text>
              )}
              {coachMedia ? (
                <View className="rounded-3xl overflow-hidden bg-black">
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
      </View>
    </SafeAreaView>
  );
}
