import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Modal, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { apiRequest } from "@/lib/api";
import {
  cancelNutritionReminderLocal,
  scheduleNutritionReminderLocal,
} from "@/lib/nutritionReminder";
import { useAppSelector } from "@/store/hooks";
import { Text, TextInput } from "@/components/ScaledText";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { useProgramPanel } from "./shared/useProgramPanel";
import { AppRole } from "@/lib/appRole";
import { useRouter } from "expo-router";

type NutritionPanelProps = {
  appRole: AppRole | null;
};

function logHasCoachResponse(log: any): boolean {
  const t =
    typeof log?.coachFeedback === "string" ? log.coachFeedback.trim() : "";
  const m =
    typeof log?.coachFeedbackMediaUrl === "string"
      ? log.coachFeedbackMediaUrl.trim()
      : "";
  return Boolean(t || m);
}

export function NutritionPanel({ appRole }: NutritionPanelProps) {
  const router = useRouter();
  const { token, athleteUserId, apiUserRole } = useAppSelector(
    (state) => state.user,
  );
  const { isDark, colors, shadows } = useProgramPanel();

  const isAdult =
    appRole === "adult_athlete" || appRole === "adult_athlete_team";

  const [activeTab, setActiveTab] = useState<"log" | "history" | "coach">(
    "log",
  );

  const [dateObj, setDateObj] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const dateKey = dateObj.toISOString().slice(0, 10);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logId, setLogId] = useState<number | null>(null);

  const canEditTargets =
    isAdult &&
    ["coach", "admin", "superAdmin"].includes(apiUserRole ?? "") &&
    typeof athleteUserId === "number" &&
    Number.isFinite(athleteUserId);

  const [targetsDraft, setTargetsDraft] = useState<{
    calories: string;
    protein: string;
    carbs: string;
    fats: string;
    micronutrientsGuidance: string;
  }>({
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    micronutrientsGuidance: "",
  });

  const [targetsSaving, setTargetsSaving] = useState(false);
  const [targetsStatus, setTargetsStatus] = useState<{
    tone: "error" | "success" | "info";
    message: string;
  } | null>(null);

  // Log States
  const [foodDiary, setFoodDiary] = useState("");
  const [breakfastChecked, setBreakfastChecked] = useState(false);
  const [breakfastDetails, setBreakfastDetails] = useState("");
  const [lunchChecked, setLunchChecked] = useState(false);
  const [lunchDetails, setLunchDetails] = useState("");
  const [dinnerChecked, setDinnerChecked] = useState(false);
  const [dinnerDetails, setDinnerDetails] = useState("");

  const [snackMorningChecked, setSnackMorningChecked] = useState(false);
  const [snackMorningDetails, setSnackMorningDetails] = useState("");
  const [snackAfternoonChecked, setSnackAfternoonChecked] = useState(false);
  const [snackAfternoonDetails, setSnackAfternoonDetails] = useState("");
  const [snackEveningChecked, setSnackEveningChecked] = useState(false);
  const [snackEveningDetails, setSnackEveningDetails] = useState("");
  const [waterIntake, setWaterIntake] = useState(0);
  const [steps, setSteps] = useState(0);
  const [sleepHours, setSleepHours] = useState(0);
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [pain, setPain] = useState<number | null>(null);

  const [coachFeedback, setCoachFeedback] = useState<string | null>(null);
  const [coachFeedbackMediaUrl, setCoachFeedbackMediaUrl] = useState<
    string | null
  >(null);

  const canManageReminders = apiUserRole === "athlete";
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(20, 0, 0, 0);
    return d;
  });
  const [reminderTimePickerOpen, setReminderTimePickerOpen] = useState(false);
  const [reminderEnableAfterPick, setReminderEnableAfterPick] = useState(false);
  const [reminderStatus, setReminderStatus] = useState<{
    tone: "error" | "success" | "info";
    message: string;
  } | null>(null);
  const [status, setStatus] = useState<{
    tone: "error" | "success" | "info";
    message: string;
  } | null>(null);

  const [coachLogs, setCoachLogs] = useState<any[]>([]);
  const [coachLogsLoading, setCoachLogsLoading] = useState(false);
  const [coachFilterOpen, setCoachFilterOpen] = useState(false);
  const [coachFilterPreset, setCoachFilterPreset] = useState<
    "1d" | "7d" | "30d" | "custom"
  >("30d");

  const toUtcDay = useCallback((d: Date) => {
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
  }, []);

  const [coachFromDate, setCoachFromDate] = useState<Date>(() => {
    const end = new Date();
    const endUtcDay = new Date(
      Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
    );
    const start = new Date(endUtcDay);
    start.setUTCDate(start.getUTCDate() - 29);
    return start;
  });
  const [coachToDate, setCoachToDate] = useState<Date>(() => {
    const end = new Date();
    return new Date(
      Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
    );
  });
  const [coachFromPickerOpen, setCoachFromPickerOpen] = useState(false);
  const [coachToPickerOpen, setCoachToPickerOpen] = useState(false);

  const parseSlot = useCallback((value: unknown) => {
    const raw = typeof value === "string" ? value.trim() : "";
    if (!raw) return { checked: false, details: "" };
    if (raw.toLowerCase() === "yes") return { checked: true, details: "" };
    return { checked: true, details: raw };
  }, []);

  const serializeSlot = useCallback((checked: boolean, details: string) => {
    if (!checked) return "";
    const d = details.trim();
    return d.length ? d : "yes";
  }, []);

  const getNutritionSummaryLines = useCallback((log: any): string[] => {
    const lines: string[] = [];
    const b = parseSlot(log?.breakfast);
    const l = parseSlot(log?.lunch);
    const d = parseSlot(log?.dinner);
    const sm = parseSlot(log?.snacksMorning);
    const sa = parseSlot(log?.snacksAfternoon);
    const se = parseSlot(log?.snacksEvening);
    const legacySnacksRaw =
      typeof log?.snacks === "string" ? log.snacks.trim() : "";

    if (b.checked) lines.push(`Breakfast: ${b.details || "Logged"}`);
    if (l.checked) lines.push(`Lunch: ${l.details || "Logged"}`);
    if (d.checked) lines.push(`Dinner: ${d.details || "Logged"}`);

    const anyNewSnack = sm.checked || sa.checked || se.checked;
    if (!anyNewSnack && legacySnacksRaw) {
      const legacy = parseSlot(legacySnacksRaw);
      if (legacy.checked)
        lines.push(`Snack (legacy): ${legacy.details || "Logged"}`);
    } else {
      if (sm.checked) lines.push(`Morning snack: ${sm.details || "Logged"}`);
      if (sa.checked) lines.push(`Afternoon snack: ${sa.details || "Logged"}`);
      if (se.checked) lines.push(`Evening snack: ${se.details || "Logged"}`);
    }

    const w = typeof log?.waterIntake === "number" ? log.waterIntake : 0;
    if (w > 0) lines.push(`Water: ${w}`);

    const s = typeof log?.steps === "number" ? log.steps : 0;
    if (s > 0) lines.push(`Steps: ${s}`);

    const sh = typeof log?.sleepHours === "number" ? log.sleepHours : 0;
    if (sh > 0) lines.push(`Sleep: ${sh}h`);
    if (typeof log?.mood === "number") lines.push(`Mood: ${log.mood}/5`);
    if (typeof log?.energy === "number") lines.push(`Energy: ${log.energy}/5`);
    if (typeof log?.pain === "number") lines.push(`Pain: ${log.pain}/5`);

    const diary =
      typeof log?.foodDiary === "string" ? log.foodDiary.trim() : "";
    if (diary) lines.push(`Food diary: ${diary}`);

    return lines;
  }, [parseSlot]);

  const logsWithCoachResponse = React.useMemo(
    () => coachLogs.filter((log) => logHasCoachResponse(log)),
    [coachLogs],
  );

  const getTimeLocalString = useCallback((d: Date) => {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }, []);

  const parseTimeLocalToDate = useCallback((timeLocal: string) => {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeLocal.trim());
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    return d;
  }, []);

  const getDeviceTimezone = useCallback(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return typeof tz === "string" && tz.trim().length ? tz : null;
    } catch {
      return null;
    }
  }, []);

  const fetchReminderSettings = useCallback(async () => {
    if (!token) return;
    if (!canManageReminders) return;

    setReminderLoading(true);
    setReminderStatus(null);
    try {
      const data = await apiRequest<{
        settings: {
          enabled: boolean | null;
          timeLocal: string | null;
          timezone: string | null;
        } | null;
      }>("/nutrition/reminder-settings", { token, suppressLog: true });

      const enabled = Boolean(data?.settings?.enabled);
      setReminderEnabled(enabled);
      const timeLocal =
        typeof data?.settings?.timeLocal === "string"
          ? data.settings.timeLocal
          : null;
      if (timeLocal) {
        const parsed = parseTimeLocalToDate(timeLocal);
        if (parsed) setReminderTime(parsed);
      }

      if (enabled && timeLocal) {
        const parsed = parseTimeLocalToDate(timeLocal);
        if (parsed) {
          void scheduleNutritionReminderLocal({
            hour: parsed.getHours(),
            minute: parsed.getMinutes(),
          });
        }
      }
    } catch (e: any) {
      setReminderStatus({
        tone: "error",
        message: e?.message ?? "Failed to load reminder settings.",
      });
    } finally {
      setReminderLoading(false);
    }
  }, [canManageReminders, parseTimeLocalToDate, token]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);

      // Fetch Log
      const logData = await apiRequest<{ logs: any[] }>(
        `/nutrition/logs?userId=${athleteUserId || "me"}&from=${encodeURIComponent(
          dateKey,
        )}&to=${encodeURIComponent(dateKey)}&limit=5`,
        { token, suppressLog: true },
      );
      const currentLog = logData.logs.find((l) => l.dateKey === dateKey);

      if (currentLog) {
        setLogId(currentLog.id);
        setFoodDiary(currentLog.foodDiary || "");

        const b = parseSlot(currentLog.breakfast);
        setBreakfastChecked(b.checked);
        setBreakfastDetails(b.details);

        const l = parseSlot(currentLog.lunch);
        setLunchChecked(l.checked);
        setLunchDetails(l.details);

        const d = parseSlot(currentLog.dinner);
        setDinnerChecked(d.checked);
        setDinnerDetails(d.details);

        const sm = parseSlot(currentLog.snacksMorning);
        const sa = parseSlot(currentLog.snacksAfternoon);
        const se = parseSlot(currentLog.snacksEvening);

        const legacySnacksRaw =
          typeof currentLog.snacks === "string" ? currentLog.snacks.trim() : "";
        const shouldFallbackToLegacy =
          !sm.checked &&
          !sa.checked &&
          !se.checked &&
          legacySnacksRaw.length > 0;

        if (shouldFallbackToLegacy) {
          const legacy = parseSlot(legacySnacksRaw);
          setSnackMorningChecked(legacy.checked);
          setSnackMorningDetails(legacy.details);
          setSnackAfternoonChecked(false);
          setSnackAfternoonDetails("");
          setSnackEveningChecked(false);
          setSnackEveningDetails("");
        } else {
          setSnackMorningChecked(sm.checked);
          setSnackMorningDetails(sm.details);
          setSnackAfternoonChecked(sa.checked);
          setSnackAfternoonDetails(sa.details);
          setSnackEveningChecked(se.checked);
          setSnackEveningDetails(se.details);
        }

        setWaterIntake(currentLog.waterIntake || 0);
        setSteps(typeof currentLog.steps === "number" ? currentLog.steps : 0);
        setSleepHours(
          typeof currentLog.sleepHours === "number" ? currentLog.sleepHours : 0,
        );
        setMood(currentLog.mood);
        setEnergy(currentLog.energy);
        setPain(currentLog.pain);
        setCoachFeedback(currentLog.coachFeedback);
        setCoachFeedbackMediaUrl(currentLog.coachFeedbackMediaUrl ?? null);
      } else {
        setLogId(null);
        setFoodDiary("");
        setBreakfastChecked(false);
        setBreakfastDetails("");
        setLunchChecked(false);
        setLunchDetails("");
        setDinnerChecked(false);
        setDinnerDetails("");
        setSnackMorningChecked(false);
        setSnackMorningDetails("");
        setSnackAfternoonChecked(false);
        setSnackAfternoonDetails("");
        setSnackEveningChecked(false);
        setSnackEveningDetails("");
        setWaterIntake(0);
        setSteps(0);
        setSleepHours(0);
        setMood(null);
        setEnergy(null);
        setPain(null);
        setCoachFeedback(null);
        setCoachFeedbackMediaUrl(null);
      }

      if (isAdult) {
        const targetData = await apiRequest<{ targets: any }>(
          `/nutrition/targets/${athleteUserId || "me"}`,
          { token, suppressLog: true },
        );
        const nextTargets = targetData.targets ?? null;
        setTargetsDraft({
          calories:
            typeof nextTargets?.calories === "number" &&
            Number.isFinite(nextTargets.calories)
              ? String(nextTargets.calories)
              : "",
          protein:
            typeof nextTargets?.protein === "number" &&
            Number.isFinite(nextTargets.protein)
              ? String(nextTargets.protein)
              : "",
          carbs:
            typeof nextTargets?.carbs === "number" &&
            Number.isFinite(nextTargets.carbs)
              ? String(nextTargets.carbs)
              : "",
          fats:
            typeof nextTargets?.fats === "number" &&
            Number.isFinite(nextTargets.fats)
              ? String(nextTargets.fats)
              : "",
          micronutrientsGuidance:
            typeof nextTargets?.micronutrientsGuidance === "string"
              ? nextTargets.micronutrientsGuidance
              : "",
        });
      }
    } catch (err: any) {
      console.warn("Failed to fetch nutrition data", err);
    } finally {
      setLoading(false);
    }
  }, [token, dateKey, athleteUserId, isAdult, parseSlot]);

  const parseTargetNumber = useCallback((raw: string) => {
    const cleaned = raw.trim();
    if (!cleaned.length) return null;
    const n = Number(cleaned);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.trunc(n));
  }, []);

  const handleSaveTargets = useCallback(async () => {
    if (!token) return;
    if (!canEditTargets) return;
    if (typeof athleteUserId !== "number" || !Number.isFinite(athleteUserId)) {
      setTargetsStatus({
        tone: "error",
        message: "Select an athlete before saving targets.",
      });
      return;
    }

    setTargetsSaving(true);
    setTargetsStatus(null);
    try {
      const body = {
        calories: parseTargetNumber(targetsDraft.calories),
        protein: parseTargetNumber(targetsDraft.protein),
        carbs: parseTargetNumber(targetsDraft.carbs),
        fats: parseTargetNumber(targetsDraft.fats),
        micronutrientsGuidance: targetsDraft.micronutrientsGuidance.trim()
          .length
          ? targetsDraft.micronutrientsGuidance.trim()
          : null,
      };

      await apiRequest(`/nutrition/targets/${athleteUserId}`, {
        method: "PUT",
        token,
        body,
      });

      setTargetsStatus({ tone: "success", message: "Targets saved." });
      setTimeout(() => setTargetsStatus(null), 3000);
      void fetchData();
    } catch (err: any) {
      setTargetsStatus({
        tone: "error",
        message: err?.message ?? "Failed to save targets.",
      });
    } finally {
      setTargetsSaving(false);
    }
  }, [
    athleteUserId,
    canEditTargets,
    fetchData,
    parseTargetNumber,
    targetsDraft,
    token,
  ]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    void fetchReminderSettings();
  }, [fetchReminderSettings]);

  const formatDateKey = useCallback(
    (d: Date) => d.toISOString().slice(0, 10),
    [],
  );

  const applyPresetToDates = useCallback(
    (preset: "1d" | "7d" | "30d") => {
      const endUtcDay = toUtcDay(new Date());
      const start = new Date(endUtcDay);
      if (preset === "1d") start.setUTCDate(start.getUTCDate());
      if (preset === "7d") start.setUTCDate(start.getUTCDate() - 6);
      if (preset === "30d") start.setUTCDate(start.getUTCDate() - 29);
      setCoachFromDate(start);
      setCoachToDate(endUtcDay);
    },
    [toUtcDay],
  );

  const fetchCoachLogs = useCallback(async () => {
    if (!token) return;
    try {
      setCoachLogsLoading(true);
      const fromKey = formatDateKey(coachFromDate);
      const toKey = formatDateKey(coachToDate);
      const qs = new URLSearchParams();
      qs.set("userId", String(athleteUserId || "me"));
      qs.set("from", fromKey);
      qs.set("to", toKey);
      qs.set("limit", "500");
      const data = await apiRequest<{ logs: any[] }>(
        `/nutrition/logs?${qs.toString()}`,
        { token, suppressLog: true },
      );
      const nextLogs = Array.isArray(data.logs) ? data.logs.slice() : [];
      nextLogs.sort((a, b) => {
        const aKey = typeof a?.dateKey === "string" ? a.dateKey : "";
        const bKey = typeof b?.dateKey === "string" ? b.dateKey : "";
        if (aKey !== bKey) return bKey.localeCompare(aKey);
        const aId = typeof a?.id === "number" ? a.id : 0;
        const bId = typeof b?.id === "number" ? b.id : 0;
        return bId - aId;
      });
      setCoachLogs(nextLogs);
    } catch (e) {
      console.warn("[NutritionPanel] Failed to fetch coach logs", e);
      setCoachLogs([]);
    } finally {
      setCoachLogsLoading(false);
    }
  }, [athleteUserId, coachFromDate, coachToDate, formatDateKey, token]);

  useEffect(() => {
    if (activeTab !== "history" && activeTab !== "coach") return;
    void fetchCoachLogs();
  }, [activeTab, fetchCoachLogs]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setStatus(null);
    try {
      await apiRequest(`/nutrition/logs`, {
        method: "POST",
        token,
        body: {
          athleteId: athleteUserId || undefined,
          dateKey,
          // Keep supporting legacy adult entries that were saved as freeform.
          foodDiary: foodDiary.trim().length ? foodDiary : undefined,
          breakfast: serializeSlot(breakfastChecked, breakfastDetails),
          lunch: serializeSlot(lunchChecked, lunchDetails),
          dinner: serializeSlot(dinnerChecked, dinnerDetails),
          snacksMorning: serializeSlot(
            snackMorningChecked,
            snackMorningDetails,
          ),
          snacksAfternoon: serializeSlot(
            snackAfternoonChecked,
            snackAfternoonDetails,
          ),
          snacksEvening: serializeSlot(
            snackEveningChecked,
            snackEveningDetails,
          ),
          waterIntake,
          steps,
          sleepHours,
          mood,
          energy,
          pain,
        },
      });
      setStatus({ tone: "success", message: "Saved successfully!" });
      setTimeout(() => setStatus(null), 3000);
      // Keep Coach Response tab in sync even if user switches immediately.
      void fetchCoachLogs();

      const isMeaningful =
        foodDiary.trim().length > 0 ||
        breakfastChecked ||
        lunchChecked ||
        dinnerChecked ||
        snackMorningChecked ||
        snackAfternoonChecked ||
        snackEveningChecked ||
        waterIntake > 0 ||
        steps > 0 ||
        sleepHours > 0 ||
        typeof mood === "number" ||
        typeof energy === "number" ||
        typeof pain === "number";

      const todayKey = new Date().toISOString().slice(0, 10);
      if (
        canManageReminders &&
        reminderEnabled &&
        isMeaningful &&
        dateKey === todayKey
      ) {
        void scheduleNutritionReminderLocal({
          hour: reminderTime.getHours(),
          minute: reminderTime.getMinutes(),
          forceTomorrow: true,
        });
      }
    } catch (err: any) {
      setStatus({ tone: "error", message: err.message || "Failed to save." });
    } finally {
      setSaving(false);
    }
  };

  const saveReminderSettings = useCallback(
    async (next: { enabled: boolean; timeLocal?: string | null }) => {
      if (!token) return;
      if (!canManageReminders) return;

      setReminderSaving(true);
      setReminderStatus(null);
      try {
        await apiRequest("/nutrition/reminder-settings", {
          method: "PUT",
          token,
          body: {
            enabled: next.enabled,
            timeLocal: next.enabled ? (next.timeLocal ?? null) : null,
            timezone: getDeviceTimezone(),
          },
        });

        if (!next.enabled) {
          setReminderEnabled(false);
          void cancelNutritionReminderLocal();
          setReminderStatus({ tone: "success", message: "Reminder disabled." });
          return;
        }

        if (next.timeLocal) {
          const parsed = parseTimeLocalToDate(next.timeLocal);
          if (parsed) {
            setReminderEnabled(true);
            setReminderTime(parsed);
            void scheduleNutritionReminderLocal({
              hour: parsed.getHours(),
              minute: parsed.getMinutes(),
            });
            setReminderStatus({
              tone: "success",
              message: "Reminder enabled.",
            });
            return;
          }
        }

        setReminderEnabled(true);
        setReminderStatus({
          tone: "info",
          message: "Reminder enabled. Pick a time to schedule locally.",
        });
      } catch (e: any) {
        setReminderStatus({
          tone: "error",
          message: e?.message ?? "Failed to update reminder settings.",
        });
        throw e;
      } finally {
        setReminderSaving(false);
      }
    },
    [canManageReminders, getDeviceTimezone, parseTimeLocalToDate, token],
  );

  const renderMetricScale = (
    label: string,
    value: number | null,
    setter: (val: number) => void,
  ) => (
    <View className="mb-4">
      <Text className="text-sm font-bold font-outfit text-app mb-2">
        {label} (1-5)
      </Text>
      <View className="flex-row justify-between">
        {[1, 2, 3, 4, 5].map((num) => (
          <TouchableOpacity
            key={num}
            onPress={() => setter(num)}
            className={`w-12 h-12 rounded-2xl items-center justify-center border`}
            style={{
              backgroundColor: value === num ? colors.accent : colors.card,
              borderColor:
                value === num
                  ? colors.accent
                  : isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(15,23,42,0.06)",
            }}
          >
            <Text
              className={`font-bold font-clash text-lg ${value === num ? "text-white" : "text-app"}`}
            >
              {num}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View className="gap-4">
      {/* Date Picker Header */}
      <View
        className="overflow-hidden rounded-3xl border px-6 py-5"
        style={{
          backgroundColor: isDark ? colors.card : "#F7FFF9",
          borderColor: isDark
            ? "rgba(255,255,255,0.08)"
            : "rgba(15,23,42,0.06)",
          ...(isDark ? shadows.none : shadows.md),
        }}
      >
        <Text className="text-2xl font-clash text-app font-bold">
          Daily Tracking
        </Text>
        <Text className="mt-2 text-sm font-outfit text-secondary leading-6">
          {isAdult
            ? "Check off your meals and rate your metrics relative to your targets."
            : "Check off your daily checklist and rate your metrics."}
        </Text>

        <TouchableOpacity
          onPress={() => setDatePickerOpen(true)}
          className="mt-5 flex-row items-center justify-between rounded-2xl border px-4 py-3"
          style={{
            backgroundColor: isDark
              ? "rgba(255,255,255,0.04)"
              : "rgba(15,23,42,0.04)",
            borderColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(15,23,42,0.06)",
          }}
        >
          <View>
            <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
              Entry Date
            </Text>
            <Text className="mt-1 text-sm font-outfit text-app">
              {dateObj.toLocaleDateString()}
            </Text>
          </View>
          <Feather name="calendar" size={18} color={colors.accent} />
        </TouchableOpacity>
        {datePickerOpen ? (
          <DateTimePicker
            value={dateObj}
            mode="date"
            display="default"
            onChange={(_, selected) => {
              setDatePickerOpen(false);
              if (selected) setDateObj(selected);
            }}
          />
        ) : null}
      </View>

      {/* Header Tabs */}
      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          onPress={() => setActiveTab("log")}
          className="flex-1 min-w-0 rounded-2xl border px-2 py-2.5 items-center justify-center"
          style={{
            backgroundColor: activeTab === "log" ? colors.accent : colors.card,
            borderColor:
              activeTab === "log"
                ? colors.accent
                : isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(15,23,42,0.06)",
          }}
        >
          <Text
            className={`text-[10px] font-outfit font-bold uppercase tracking-[0.8px] ${
              activeTab === "log" ? "text-white" : "text-app"
            }`}
            numberOfLines={1}
          >
            Log
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setActiveTab("history");
            if (coachFilterPreset !== "custom") {
              applyPresetToDates(coachFilterPreset);
            }
          }}
          className="flex-1 min-w-0 rounded-2xl border px-2 py-2.5 items-center justify-center"
          style={{
            backgroundColor:
              activeTab === "history" ? colors.accent : colors.card,
            borderColor:
              activeTab === "history"
                ? colors.accent
                : isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(15,23,42,0.06)",
          }}
        >
          <Text
            className={`text-[10px] font-outfit font-bold uppercase tracking-[0.8px] text-center ${
              activeTab === "history" ? "text-white" : "text-app"
            }`}
            numberOfLines={2}
          >
            Log history
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setActiveTab("coach");
            if (coachFilterPreset !== "custom") {
              applyPresetToDates(coachFilterPreset);
            }
          }}
          className="flex-1 min-w-0 rounded-2xl border px-2 py-2.5 items-center justify-center"
          style={{
            backgroundColor:
              activeTab === "coach" ? colors.accent : colors.card,
            borderColor:
              activeTab === "coach"
                ? colors.accent
                : isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(15,23,42,0.06)",
          }}
        >
          <Text
            className={`text-[10px] font-outfit font-bold uppercase tracking-[0.8px] text-center ${
              activeTab === "coach" ? "text-white" : "text-app"
            }`}
            numberOfLines={2}
          >
            Coach reply
          </Text>
        </TouchableOpacity>

        {activeTab === "history" || activeTab === "coach" ? (
          <TouchableOpacity
            onPress={() => setCoachFilterOpen(true)}
            className="h-11 w-11 shrink-0 items-center justify-center rounded-2xl border"
            style={{
              backgroundColor: colors.card,
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(15,23,42,0.06)",
            }}
          >
            <Feather name="sliders" size={18} color={colors.accent} />
          </TouchableOpacity>
        ) : null}
      </View>

      {activeTab === "log" ? (
        loading ? (
          <View className="items-center py-10">
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <View className="gap-4">
            {canManageReminders ? (
              <View
                className="rounded-3xl border p-5"
                style={{
                  backgroundColor: colors.card,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(15,23,42,0.06)",
                }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-bold font-outfit text-app">
                      Daily Reminder
                    </Text>
                    <Text className="mt-1 text-sm font-outfit text-secondary leading-6">
                      Get a reminder if you haven't logged today.
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={async () => {
                      if (reminderSaving) return;
                      if (!reminderEnabled) {
                        setReminderEnableAfterPick(true);
                        setReminderTimePickerOpen(true);
                        return;
                      }
                      try {
                        await saveReminderSettings({ enabled: false });
                      } catch {
                        // status already set
                      }
                    }}
                    className="rounded-2xl border px-4 py-3 items-center justify-center"
                    style={{
                      backgroundColor: reminderEnabled
                        ? colors.accent
                        : isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(15,23,42,0.04)",
                      borderColor: reminderEnabled
                        ? colors.accent
                        : isDark
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(15,23,42,0.06)",
                    }}
                  >
                    <Text
                      className={`text-[12px] font-outfit font-bold uppercase tracking-[1.2px] ${
                        reminderEnabled ? "text-white" : "text-app"
                      }`}
                    >
                      {reminderEnabled ? "On" : "Off"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View className="mt-4">
                  {reminderLoading ? (
                    <View className="py-2">
                      <ActivityIndicator size="small" color={colors.accent} />
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => {
                        setReminderEnableAfterPick(false);
                        setReminderTimePickerOpen(true);
                      }}
                      disabled={!reminderEnabled || reminderSaving}
                      className="rounded-2xl border px-4 py-3"
                      style={{
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(15,23,42,0.04)",
                        borderColor: isDark
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(15,23,42,0.06)",
                        opacity: reminderEnabled ? 1 : 0.6,
                      }}
                    >
                      <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                        Reminder time
                      </Text>
                      <Text className="mt-1 text-sm font-outfit text-app">
                        {reminderTime.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {reminderTimePickerOpen ? (
                  <DateTimePicker
                    value={reminderTime}
                    mode="time"
                    display="default"
                    onChange={async (_, selected) => {
                      setReminderTimePickerOpen(false);
                      if (!selected) {
                        setReminderEnableAfterPick(false);
                        return;
                      }
                      setReminderTime(selected);
                      if (!reminderEnabled && !reminderEnableAfterPick) return;

                      const timeLocal = getTimeLocalString(selected);
                      try {
                        await saveReminderSettings({
                          enabled: true,
                          timeLocal,
                        });
                        setReminderEnabled(true);
                      } catch {
                        // status already set
                      } finally {
                        setReminderEnableAfterPick(false);
                      }
                    }}
                  />
                ) : null}

                {reminderStatus ? (
                  <Text
                    className={`mt-3 text-center font-bold ${
                      reminderStatus.tone === "error"
                        ? "text-red-500"
                        : reminderStatus.tone === "success"
                          ? "text-emerald-500"
                          : "text-secondary"
                    }`}
                  >
                    {reminderStatus.message}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {isAdult ? (
              <View
                className="rounded-3xl border p-5"
                style={{
                  backgroundColor: colors.card,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(15,23,42,0.06)",
                }}
              >
                <Text className="text-xs font-outfit font-bold uppercase tracking-[1.2px] text-secondary">
                  Nutrition Targets
                </Text>
                <Text className="mt-2 text-sm font-outfit text-secondary leading-6">
                  {canEditTargets
                    ? "Set targets for this athlete."
                    : "Targets set by your coach."}
                </Text>

                <View className="mt-4 gap-4">
                  <View className="gap-2">
                    <Text className="text-sm font-bold font-outfit text-app">
                      Calories
                    </Text>
                    <TextInput
                      value={targetsDraft.calories}
                      onChangeText={(v) =>
                        setTargetsDraft((s) => ({
                          ...s,
                          calories: v.replace(/[^0-9]/g, ""),
                        }))
                      }
                      placeholder="e.g. 2600"
                      placeholderTextColor={colors.placeholder}
                      editable={canEditTargets}
                      keyboardType="number-pad"
                      className="rounded-2xl px-4 py-3 text-sm font-outfit text-app"
                      style={{
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(15,23,42,0.03)",
                      }}
                    />
                  </View>

                  <View className="gap-2">
                    <Text className="text-sm font-bold font-outfit text-app">
                      Protein (g)
                    </Text>
                    <TextInput
                      value={targetsDraft.protein}
                      onChangeText={(v) =>
                        setTargetsDraft((s) => ({
                          ...s,
                          protein: v.replace(/[^0-9]/g, ""),
                        }))
                      }
                      placeholder="e.g. 180"
                      placeholderTextColor={colors.placeholder}
                      editable={canEditTargets}
                      keyboardType="number-pad"
                      className="rounded-2xl px-4 py-3 text-sm font-outfit text-app"
                      style={{
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(15,23,42,0.03)",
                      }}
                    />
                  </View>

                  <View className="gap-2">
                    <Text className="text-sm font-bold font-outfit text-app">
                      Carbs (g)
                    </Text>
                    <TextInput
                      value={targetsDraft.carbs}
                      onChangeText={(v) =>
                        setTargetsDraft((s) => ({
                          ...s,
                          carbs: v.replace(/[^0-9]/g, ""),
                        }))
                      }
                      placeholder="e.g. 280"
                      placeholderTextColor={colors.placeholder}
                      editable={canEditTargets}
                      keyboardType="number-pad"
                      className="rounded-2xl px-4 py-3 text-sm font-outfit text-app"
                      style={{
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(15,23,42,0.03)",
                      }}
                    />
                  </View>

                  <View className="gap-2">
                    <Text className="text-sm font-bold font-outfit text-app">
                      Fats (g)
                    </Text>
                    <TextInput
                      value={targetsDraft.fats}
                      onChangeText={(v) =>
                        setTargetsDraft((s) => ({
                          ...s,
                          fats: v.replace(/[^0-9]/g, ""),
                        }))
                      }
                      placeholder="e.g. 80"
                      placeholderTextColor={colors.placeholder}
                      editable={canEditTargets}
                      keyboardType="number-pad"
                      className="rounded-2xl px-4 py-3 text-sm font-outfit text-app"
                      style={{
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(15,23,42,0.03)",
                      }}
                    />
                  </View>

                  <View className="gap-2">
                    <Text className="text-sm font-bold font-outfit text-app">
                      Micronutrient Guidance
                    </Text>
                    <TextInput
                      value={targetsDraft.micronutrientsGuidance}
                      onChangeText={(v) =>
                        setTargetsDraft((s) => ({
                          ...s,
                          micronutrientsGuidance: v,
                        }))
                      }
                      placeholder="e.g. Prioritize iron + vitamin C, omega-3s, magnesium..."
                      placeholderTextColor={colors.placeholder}
                      editable={canEditTargets}
                      multiline
                      className="rounded-2xl px-4 py-3 text-sm font-outfit text-app"
                      style={{
                        minHeight: 96,
                        textAlignVertical: "top",
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(15,23,42,0.03)",
                      }}
                    />
                  </View>

                  {canEditTargets ? (
                    <TouchableOpacity
                      onPress={handleSaveTargets}
                      disabled={targetsSaving}
                      className={`rounded-[24px] items-center py-4 ${targetsSaving ? "bg-accent/40" : "bg-accent"}`}
                    >
                      <Text className="text-white font-bold">
                        {targetsSaving ? "Saving..." : "Save Targets"}
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {targetsStatus ? (
                    <Text
                      className={`text-center font-bold ${targetsStatus.tone === "error" ? "text-red-500" : "text-emerald-500"}`}
                    >
                      {targetsStatus.message}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            <View
              className="rounded-3xl border p-5"
              style={{
                backgroundColor: colors.card,
                borderColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(15,23,42,0.06)",
              }}
            >
              <Text className="text-sm font-bold font-outfit text-app mb-3">
                Meal Checklist
              </Text>
              <View className="gap-4 mb-6">
                {/* Meals */}
                <View className="gap-3">
                  {[
                    {
                      label: "Breakfast",
                      checked: breakfastChecked,
                      setChecked: setBreakfastChecked,
                      details: breakfastDetails,
                      setDetails: setBreakfastDetails,
                    },
                    {
                      label: "Lunch",
                      checked: lunchChecked,
                      setChecked: setLunchChecked,
                      details: lunchDetails,
                      setDetails: setLunchDetails,
                    },
                    {
                      label: "Dinner",
                      checked: dinnerChecked,
                      setChecked: setDinnerChecked,
                      details: dinnerDetails,
                      setDetails: setDinnerDetails,
                    },
                  ].map((meal) => (
                    <View key={meal.label} className="gap-2">
                      <TouchableOpacity
                        onPress={() => meal.setChecked(!meal.checked)}
                        className="rounded-2xl px-4 py-3 flex-row items-center justify-between border"
                        style={{
                          backgroundColor: meal.checked
                            ? colors.accent
                            : colors.card,
                          borderColor: meal.checked
                            ? colors.accent
                            : isDark
                              ? "rgba(255,255,255,0.08)"
                              : "rgba(15,23,42,0.06)",
                        }}
                      >
                        <Text
                          className={`font-bold ${meal.checked ? "text-white" : "text-app"}`}
                        >
                          {meal.label}
                        </Text>
                        {meal.checked && <Feather name="check" color="white" />}
                      </TouchableOpacity>

                      {meal.checked ? (
                        <View
                          className="rounded-2xl border px-4 py-3"
                          style={{
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.04)"
                              : "rgba(15,23,42,0.03)",
                            borderColor: isDark
                              ? "rgba(255,255,255,0.08)"
                              : "rgba(15,23,42,0.06)",
                          }}
                        >
                          <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px] mb-2">
                            What did you eat?
                          </Text>
                          <TextInput
                            value={meal.details}
                            onChangeText={meal.setDetails}
                            placeholder="e.g., eggs, bread, fruit"
                            placeholderTextColor={colors.placeholder}
                            multiline
                            className="text-sm font-outfit text-app"
                            style={{
                              minHeight: 48,
                              textAlignVertical: "top",
                            }}
                          />
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>

                {/* Snacks */}
                <View className="gap-3">
                  <Text className="text-sm font-bold font-outfit text-app">
                    Snacks
                  </Text>

                  {[
                    {
                      label: "Morning snack",
                      checked: snackMorningChecked,
                      setChecked: setSnackMorningChecked,
                      details: snackMorningDetails,
                      setDetails: setSnackMorningDetails,
                    },
                    {
                      label: "Afternoon snack",
                      checked: snackAfternoonChecked,
                      setChecked: setSnackAfternoonChecked,
                      details: snackAfternoonDetails,
                      setDetails: setSnackAfternoonDetails,
                    },
                    {
                      label: "Evening snack",
                      checked: snackEveningChecked,
                      setChecked: setSnackEveningChecked,
                      details: snackEveningDetails,
                      setDetails: setSnackEveningDetails,
                    },
                  ].map((slot) => (
                    <View key={slot.label} className="gap-2">
                      <TouchableOpacity
                        onPress={() => slot.setChecked(!slot.checked)}
                        className="rounded-2xl px-4 py-3 flex-row items-center justify-between border"
                        style={{
                          backgroundColor: slot.checked
                            ? colors.accent
                            : colors.card,
                          borderColor: slot.checked
                            ? colors.accent
                            : isDark
                              ? "rgba(255,255,255,0.08)"
                              : "rgba(15,23,42,0.06)",
                        }}
                      >
                        <Text
                          className={`font-bold ${slot.checked ? "text-white" : "text-app"}`}
                        >
                          {slot.label}
                        </Text>
                        {slot.checked && <Feather name="check" color="white" />}
                      </TouchableOpacity>

                      {slot.checked ? (
                        <View
                          className="rounded-2xl border px-4 py-3"
                          style={{
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.04)"
                              : "rgba(15,23,42,0.03)",
                            borderColor: isDark
                              ? "rgba(255,255,255,0.08)"
                              : "rgba(15,23,42,0.06)",
                          }}
                        >
                          <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px] mb-2">
                            What did you eat?
                          </Text>
                          <TextInput
                            value={slot.details}
                            onChangeText={slot.setDetails}
                            placeholder="e.g., banana, nuts, yogurt"
                            placeholderTextColor={colors.placeholder}
                            multiline
                            className="text-sm font-outfit text-app"
                            style={{
                              minHeight: 48,
                              textAlignVertical: "top",
                            }}
                          />
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>

              {renderMetricScale("Mood Tracker", mood, setMood)}
              {renderMetricScale("Energy Levels", energy, setEnergy)}
              {renderMetricScale("Pain Levels", pain, setPain)}
            </View>

            {isAdult ? (
              <View
                className="rounded-3xl border p-5"
                style={{
                  backgroundColor: colors.card,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(15,23,42,0.06)",
                }}
              >
                <Text className="text-sm font-bold font-outfit text-app mb-3">
                  Daily Habits
                </Text>

                <View
                  className="rounded-2xl border px-4 py-3 flex-row items-center"
                  style={{
                    borderColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(15,23,42,0.06)",
                  }}
                >
                  <View
                    className="w-6 h-6 rounded-full items-center justify-center mr-3"
                    style={{
                      backgroundColor:
                        waterIntake > 0
                          ? colors.accent
                          : isDark
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(15,23,42,0.04)",
                      borderWidth: 1,
                      borderColor:
                        waterIntake > 0
                          ? colors.accent
                          : isDark
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(15,23,42,0.06)",
                    }}
                  >
                    {waterIntake > 0 ? (
                      <Feather name="check" size={14} color="white" />
                    ) : null}
                  </View>

                  <Text className="flex-1 text-sm font-outfit text-app">
                    Water intake
                  </Text>

                  <View className="flex-row items-center gap-3">
                    <TouchableOpacity
                      onPress={() =>
                        setWaterIntake(Math.max(0, waterIntake - 1))
                      }
                      className="w-10 h-10 items-center justify-center rounded-2xl"
                      style={{
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(15,23,42,0.04)",
                      }}
                    >
                      <Feather name="minus" size={18} color={colors.accent} />
                    </TouchableOpacity>
                    <Text className="text-base font-clash font-bold text-app min-w-[28px] text-center">
                      {waterIntake}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setWaterIntake(waterIntake + 1)}
                      className="w-10 h-10 items-center justify-center rounded-2xl"
                      style={{
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(15,23,42,0.04)",
                      }}
                    >
                      <Feather name="plus" size={18} color={colors.accent} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View
                  className="mt-3 rounded-2xl border px-4 py-3 flex-row items-center"
                  style={{
                    borderColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(15,23,42,0.06)",
                  }}
                >
                  <View
                    className="w-6 h-6 rounded-full items-center justify-center mr-3"
                    style={{
                      backgroundColor:
                        steps > 0
                          ? colors.accent
                          : isDark
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(15,23,42,0.04)",
                      borderWidth: 1,
                      borderColor:
                        steps > 0
                          ? colors.accent
                          : isDark
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(15,23,42,0.06)",
                    }}
                  >
                    {steps > 0 ? (
                      <Feather name="check" size={14} color="white" />
                    ) : null}
                  </View>

                  <Text className="flex-1 text-sm font-outfit text-app">
                    Steps
                  </Text>

                  <TextInput
                    value={String(steps)}
                    onChangeText={(v) =>
                      setSteps(
                        Math.max(0, Number(v.replace(/[^0-9]/g, "")) || 0),
                      )
                    }
                    placeholder="0"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="number-pad"
                    className="rounded-2xl px-3 py-2 text-sm font-outfit text-app min-w-[90px] text-right"
                    style={{
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(15,23,42,0.03)",
                    }}
                  />
                </View>

                <View
                  className="mt-3 rounded-2xl border px-4 py-3 flex-row items-center"
                  style={{
                    borderColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(15,23,42,0.06)",
                  }}
                >
                  <View
                    className="w-6 h-6 rounded-full items-center justify-center mr-3"
                    style={{
                      backgroundColor:
                        sleepHours > 0
                          ? colors.accent
                          : isDark
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(15,23,42,0.04)",
                      borderWidth: 1,
                      borderColor:
                        sleepHours > 0
                          ? colors.accent
                          : isDark
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(15,23,42,0.06)",
                    }}
                  >
                    {sleepHours > 0 ? (
                      <Feather name="check" size={14} color="white" />
                    ) : null}
                  </View>

                  <Text className="flex-1 text-sm font-outfit text-app">
                    Sleep (hours)
                  </Text>

                  <TextInput
                    value={String(sleepHours)}
                    onChangeText={(v) =>
                      setSleepHours(
                        Math.max(0, Number(v.replace(/[^0-9]/g, "")) || 0),
                      )
                    }
                    placeholder="0"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="number-pad"
                    className="rounded-2xl px-3 py-2 text-sm font-outfit text-app min-w-[90px] text-right"
                    style={{
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(15,23,42,0.03)",
                    }}
                  />
                </View>
              </View>
            ) : null}

            {(coachFeedback || coachFeedbackMediaUrl) && (
              <View className="rounded-3xl border p-5 bg-emerald-500/10 border-emerald-400/30">
                <Text className="text-[10px] font-outfit font-bold uppercase text-emerald-600 dark:text-emerald-300 mb-2">
                  Coach Feedback
                </Text>
                {coachFeedback ? (
                  <Text className="text-sm font-outfit text-app leading-6">
                    {coachFeedback}
                  </Text>
                ) : null}
                {coachFeedbackMediaUrl ? (
                  <View className={coachFeedback ? "mt-3" : ""}>
                    <VideoPlayer
                      uri={coachFeedbackMediaUrl}
                      height={200}
                      useVideoResolution
                    />
                  </View>
                ) : null}
              </View>
            )}

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              className={`rounded-[24px] items-center py-4 ${saving ? "bg-accent/40" : "bg-accent"}`}
            >
              <Text className="text-white font-bold">
                {saving ? "Saving..." : "Save Daily Log"}
              </Text>
            </TouchableOpacity>
            {status && (
              <Text
                className={`text-center font-bold ${status.tone === "error" ? "text-red-500" : "text-emerald-500"}`}
              >
                {status.message}
              </Text>
            )}
          </View>
        )
      ) : (
        <View className="gap-4">
          <View
            className="rounded-3xl border px-5 py-4"
            style={{
              backgroundColor: colors.card,
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(15,23,42,0.06)",
            }}
          >
            <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
              Range
            </Text>
            <Text className="mt-1 text-sm font-outfit text-app">
              {formatDateKey(coachFromDate)} to {formatDateKey(coachToDate)}
            </Text>
          </View>

          {coachLogsLoading ? (
            <View className="items-center py-10">
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : activeTab === "history" ? (
            coachLogs.length === 0 ? (
              <View
                className="rounded-3xl border px-5 py-5"
                style={{
                  backgroundColor: colors.card,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(15,23,42,0.06)",
                }}
              >
                <Text className="text-sm font-outfit text-secondary">
                  No logs in this date range yet.
                </Text>
              </View>
            ) : (
              <View className="gap-4">
                {coachLogs.map((log) => {
                  const dateLabel =
                    typeof log?.dateKey === "string" ? log.dateKey : "";
                  const lines = getNutritionSummaryLines(log);
                  const coachText =
                    typeof log?.coachFeedback === "string"
                      ? log.coachFeedback.trim()
                      : "";
                  const coachMedia =
                    typeof log?.coachFeedbackMediaUrl === "string"
                      ? log.coachFeedbackMediaUrl.trim()
                      : "";
                  const hasCoach = logHasCoachResponse(log);
                  const canOpenDetail = Boolean(dateLabel);
                  const handleOpenDetail = () => {
                    if (!canOpenDetail) return;
                    const uid = athleteUserId || "me";
                    router.push(
                      `/nutrition/log/${encodeURIComponent(String(dateLabel))}?userId=${encodeURIComponent(String(uid))}` as any,
                    );
                  };

                  return (
                    <TouchableOpacity
                      key={String(log?.id ?? dateLabel)}
                      activeOpacity={0.9}
                      onPress={handleOpenDetail}
                      disabled={!canOpenDetail}
                      className="rounded-3xl border p-5 gap-3"
                      style={{
                        backgroundColor: colors.card,
                        borderColor: isDark
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(15,23,42,0.06)",
                        opacity: canOpenDetail ? 1 : 0.8,
                      }}
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-outfit font-bold text-app">
                          {dateLabel || "Log"}
                        </Text>
                        <View
                          className="rounded-full px-3 py-1.5"
                          style={{
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.08)"
                              : "rgba(15,23,42,0.06)",
                          }}
                        >
                          <Text
                            className="text-[10px] font-outfit font-bold uppercase tracking-[1.2px]"
                            style={{ color: colors.accent }}
                          >
                            Entry
                          </Text>
                        </View>
                      </View>

                      <View className="gap-1">
                        <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                          Your log
                        </Text>
                        {lines.length ? (
                          lines.map((t) => (
                            <Text
                              key={`${String(log?.id ?? dateLabel)}-${t}`}
                              className="text-sm font-outfit text-app"
                            >
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
                        className="gap-2 mt-1 pt-3 border-t"
                        style={{
                          borderColor: isDark
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(15,23,42,0.06)",
                        }}
                      >
                        <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                          Coach
                        </Text>
                        {hasCoach ? (
                          <View className="gap-2">
                            {coachText ? (
                              <Text
                                className="text-sm font-outfit text-app leading-6"
                                numberOfLines={6}
                              >
                                {coachText}
                              </Text>
                            ) : null}
                            {coachMedia ? (
                              <Text className="text-xs font-outfit text-secondary">
                                Video from coach — tap to open full detail.
                              </Text>
                            ) : null}
                          </View>
                        ) : (
                          <Text className="text-sm font-outfit text-secondary">
                            No coach reply yet for this day.
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )
          ) : logsWithCoachResponse.length === 0 ? (
            <View
              className="rounded-3xl border px-5 py-5"
              style={{
                backgroundColor: colors.card,
                borderColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(15,23,42,0.06)",
              }}
            >
              <Text className="text-sm font-outfit text-secondary">
                No coach replies in this date range yet. Your daily entries
                (with or without coach feedback) are in Log history.
              </Text>
            </View>
          ) : (
            <View className="gap-4">
              {logsWithCoachResponse.map((log) => {
                const dateLabel =
                  typeof log?.dateKey === "string" ? log.dateKey : "";
                const lines = getNutritionSummaryLines(log);
                const coachText =
                  typeof log?.coachFeedback === "string"
                    ? log.coachFeedback.trim()
                    : "";
                const coachMedia =
                  typeof log?.coachFeedbackMediaUrl === "string"
                    ? log.coachFeedbackMediaUrl.trim()
                    : "";

                const canOpenDetail = Boolean(dateLabel);
                const handleOpenDetail = () => {
                  if (!canOpenDetail) return;
                  const uid = athleteUserId || "me";
                  router.push(
                    `/nutrition/log/${encodeURIComponent(String(dateLabel))}?userId=${encodeURIComponent(String(uid))}` as any,
                  );
                };

                return (
                  <TouchableOpacity
                    key={String(log?.id ?? dateLabel)}
                    activeOpacity={0.9}
                    onPress={handleOpenDetail}
                    disabled={!canOpenDetail}
                    className="rounded-3xl border p-5 gap-3"
                    style={{
                      backgroundColor: colors.card,
                      borderColor: isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(15,23,42,0.06)",
                      opacity: canOpenDetail ? 1 : 0.8,
                    }}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-outfit font-bold text-app">
                        {dateLabel || "Log"}
                      </Text>
                      <View
                        className="rounded-full px-3 py-1.5"
                        style={{ backgroundColor: "rgba(34,197,94,0.10)" }}
                      >
                        <Text
                          className="text-[10px] font-outfit font-bold uppercase tracking-[1.2px]"
                          style={{ color: colors.accent }}
                        >
                          Coach
                        </Text>
                      </View>
                    </View>

                    <View className="gap-1">
                      <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                        Your log
                      </Text>
                      {lines.length ? (
                        lines.map((t) => (
                          <Text
                            key={`${String(log?.id ?? dateLabel)}-${t}`}
                            className="text-sm font-outfit text-app"
                          >
                            {t}
                          </Text>
                        ))
                      ) : (
                        <Text className="text-sm font-outfit text-secondary">
                          No details logged.
                        </Text>
                      )}
                    </View>

                    <View className="gap-2">
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
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Coach filter modal */}
      <Modal
        visible={coachFilterOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCoachFilterOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/50 p-5">
          <View
            className="rounded-[28px] border p-5 gap-4"
            style={{
              backgroundColor: colors.card,
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(15,23,42,0.06)",
            }}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-clash font-bold text-app">
                Filter
              </Text>
              <TouchableOpacity onPress={() => setCoachFilterOpen(false)}>
                <Feather name="x" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View className="flex-row gap-3">
              {[
                { key: "1d" as const, label: "1 day" },
                { key: "7d" as const, label: "7 days" },
                { key: "30d" as const, label: "30 days" },
              ].map((p) => (
                <TouchableOpacity
                  key={p.key}
                  onPress={() => {
                    setCoachFilterPreset(p.key);
                    applyPresetToDates(p.key);
                  }}
                  className="flex-1 rounded-2xl border px-3 py-3 items-center"
                  style={{
                    backgroundColor:
                      coachFilterPreset === p.key ? colors.accent : colors.card,
                    borderColor:
                      coachFilterPreset === p.key
                        ? colors.accent
                        : isDark
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(15,23,42,0.06)",
                  }}
                >
                  <Text
                    className={`text-[11px] font-outfit font-bold uppercase tracking-[1.1px] ${
                      coachFilterPreset === p.key ? "text-white" : "text-app"
                    }`}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => setCoachFilterPreset("custom")}
              className="rounded-2xl border px-4 py-3"
              style={{
                backgroundColor:
                  coachFilterPreset === "custom" ? colors.accent : colors.card,
                borderColor:
                  coachFilterPreset === "custom"
                    ? colors.accent
                    : isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(15,23,42,0.06)",
              }}
            >
              <Text
                className={`text-[12px] font-outfit font-bold uppercase tracking-[1.2px] ${
                  coachFilterPreset === "custom" ? "text-white" : "text-app"
                }`}
              >
                Custom dates
              </Text>
            </TouchableOpacity>

            {coachFilterPreset === "custom" ? (
              <View className="gap-3">
                <TouchableOpacity
                  onPress={() => setCoachFromPickerOpen(true)}
                  className="rounded-2xl border px-4 py-3"
                  style={{
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(15,23,42,0.03)",
                    borderColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(15,23,42,0.06)",
                  }}
                >
                  <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                    From
                  </Text>
                  <Text className="mt-1 text-sm font-outfit text-app">
                    {coachFromDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setCoachToPickerOpen(true)}
                  className="rounded-2xl border px-4 py-3"
                  style={{
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(15,23,42,0.03)",
                    borderColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(15,23,42,0.06)",
                  }}
                >
                  <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                    To
                  </Text>
                  <Text className="mt-1 text-sm font-outfit text-app">
                    {coachToDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {coachFromPickerOpen ? (
              <DateTimePicker
                value={coachFromDate}
                mode="date"
                display="default"
                onChange={(_, selected) => {
                  setCoachFromPickerOpen(false);
                  if (selected) setCoachFromDate(selected);
                }}
              />
            ) : null}
            {coachToPickerOpen ? (
              <DateTimePicker
                value={coachToDate}
                mode="date"
                display="default"
                onChange={(_, selected) => {
                  setCoachToPickerOpen(false);
                  if (selected) setCoachToDate(selected);
                }}
              />
            ) : null}

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setCoachFilterOpen(false)}
                className="flex-1 rounded-2xl border px-4 py-4 items-center"
                style={{
                  backgroundColor: colors.card,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(15,23,42,0.06)",
                }}
              >
                <Text className="text-[12px] font-outfit font-bold uppercase tracking-[1.2px] text-app">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setCoachFilterOpen(false);
                  void fetchCoachLogs();
                }}
                className="flex-1 rounded-2xl px-4 py-4 items-center"
                style={{ backgroundColor: colors.accent }}
              >
                <Text className="text-[12px] font-outfit font-bold uppercase tracking-[1.2px] text-white">
                  Apply
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
