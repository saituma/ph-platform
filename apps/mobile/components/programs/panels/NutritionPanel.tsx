import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Modal, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { Text, TextInput } from "@/components/ScaledText";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { useProgramPanel } from "./shared/useProgramPanel";
import { AppRole } from "@/lib/appRole";

type NutritionPanelProps = {
  appRole: AppRole | null;
};

export function NutritionPanel({ appRole }: NutritionPanelProps) {
  const { token, athleteUserId } = useAppSelector((state) => state.user);
  const { isDark, colors, shadows } = useProgramPanel();

  const isAdult =
    appRole === "adult_athlete" || appRole === "adult_athlete_team";

  const [activeTab, setActiveTab] = useState<"log" | "coach">("log");

  const [dateObj, setDateObj] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const dateKey = dateObj.toISOString().slice(0, 10);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logId, setLogId] = useState<number | null>(null);

  // Targets (Adult only)
  const [targets, setTargets] = useState<{
    calories?: number;
    protein?: number;
    carbs?: number;
    fats?: number;
    micronutrientsGuidance?: string;
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
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [pain, setPain] = useState<number | null>(null);

  const [coachFeedback, setCoachFeedback] = useState<string | null>(null);
  const [coachFeedbackMediaUrl, setCoachFeedbackMediaUrl] = useState<
    string | null
  >(null);
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
  const [coachFromDate, setCoachFromDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d;
  });
  const [coachToDate, setCoachToDate] = useState<Date>(() => new Date());
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
        setTargets(targetData.targets);
      }
    } catch (err: any) {
      console.warn("Failed to fetch nutrition data", err);
    } finally {
      setLoading(false);
    }
  }, [token, dateKey, athleteUserId, isAdult, parseSlot]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const formatDateKey = useCallback((d: Date) => d.toISOString().slice(0, 10), []);

  const applyPresetToDates = useCallback((preset: "1d" | "7d" | "30d") => {
    const end = new Date();
    const start = new Date(end);
    if (preset === "1d") start.setDate(start.getDate());
    if (preset === "7d") start.setDate(start.getDate() - 6);
    if (preset === "30d") start.setDate(start.getDate() - 29);
    setCoachFromDate(start);
    setCoachToDate(end);
  }, []);

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
      setCoachLogs(Array.isArray(data.logs) ? data.logs : []);
    } catch (e) {
      console.warn("[NutritionPanel] Failed to fetch coach logs", e);
      setCoachLogs([]);
    } finally {
      setCoachLogsLoading(false);
    }
  }, [athleteUserId, coachFromDate, coachToDate, formatDateKey, token]);

  useEffect(() => {
    if (activeTab !== "coach") return;
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
          foodDiary: isAdult ? foodDiary : undefined,
          breakfast: !isAdult
            ? serializeSlot(breakfastChecked, breakfastDetails)
            : undefined,
          lunch: !isAdult ? serializeSlot(lunchChecked, lunchDetails) : undefined,
          dinner: !isAdult
            ? serializeSlot(dinnerChecked, dinnerDetails)
            : undefined,
          snacksMorning: !isAdult
            ? serializeSlot(snackMorningChecked, snackMorningDetails)
            : undefined,
          snacksAfternoon: !isAdult
            ? serializeSlot(snackAfternoonChecked, snackAfternoonDetails)
            : undefined,
          snacksEvening: !isAdult
            ? serializeSlot(snackEveningChecked, snackEveningDetails)
            : undefined,
          waterIntake: !isAdult ? waterIntake : undefined,
          mood: !isAdult ? mood : undefined,
          energy: !isAdult ? energy : undefined,
          pain: !isAdult ? pain : undefined,
        },
      });
      setStatus({ tone: "success", message: "Saved successfully!" });
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      setStatus({ tone: "error", message: err.message || "Failed to save." });
    } finally {
      setSaving(false);
    }
  };

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
          {isAdult ? "Food Diary" : "Daily Tracking"}
        </Text>
        <Text className="mt-2 text-sm font-outfit text-secondary leading-6">
          {isAdult
            ? "Log your nutrition relative to your targets."
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
      <View className="flex-row items-center gap-3">
        <TouchableOpacity
          onPress={() => setActiveTab("log")}
          className="flex-1 rounded-2xl border px-4 py-3 items-center"
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
            className={`text-[12px] font-outfit font-bold uppercase tracking-[1.2px] ${
              activeTab === "log" ? "text-white" : "text-app"
            }`}
          >
            Log
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setActiveTab("coach");
            if (coachFilterPreset !== "custom") {
              // Re-anchor presets to "today" when switching to Coach Response.
              applyPresetToDates(coachFilterPreset);
            }
          }}
          className="flex-1 rounded-2xl border px-4 py-3 items-center"
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
            className={`text-[12px] font-outfit font-bold uppercase tracking-[1.2px] ${
              activeTab === "coach" ? "text-white" : "text-app"
            }`}
          >
            Coach Response
          </Text>
        </TouchableOpacity>

        {activeTab === "coach" ? (
          <TouchableOpacity
            onPress={() => setCoachFilterOpen(true)}
            className="h-12 w-12 items-center justify-center rounded-2xl border"
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
            {isAdult && targets && (
            <View
              className="rounded-3xl border p-5"
              style={{
                backgroundColor: colors.card,
                borderColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(15,23,42,0.06)",
              }}
            >
              <Text className="text-xs font-outfit font-bold uppercase tracking-[1.2px] text-secondary mb-3">
                Coach Targets
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <View className="w-[48%] rounded-xl bg-app/5 p-3">
                  <Text className="text-xs text-secondary mb-1">Calories</Text>
                  <Text className="text-lg font-clash font-bold">
                    {targets.calories || "N/A"}
                  </Text>
                </View>
                <View className="w-[48%] rounded-xl bg-app/5 p-3">
                  <Text className="text-xs text-secondary mb-1">Protein</Text>
                  <Text className="text-lg font-clash font-bold">
                    {targets.protein ? `${targets.protein}g` : "N/A"}
                  </Text>
                </View>
                <View className="w-[48%] rounded-xl bg-app/5 p-3">
                  <Text className="text-xs text-secondary mb-1">Carbs</Text>
                  <Text className="text-lg font-clash font-bold">
                    {targets.carbs ? `${targets.carbs}g` : "N/A"}
                  </Text>
                </View>
                <View className="w-[48%] rounded-xl bg-app/5 p-3">
                  <Text className="text-xs text-secondary mb-1">Fats</Text>
                  <Text className="text-lg font-clash font-bold">
                    {targets.fats ? `${targets.fats}g` : "N/A"}
                  </Text>
                </View>
              </View>
              {targets.micronutrientsGuidance ? (
                <View className="mt-3 bg-app/5 p-3 rounded-xl">
                  <Text className="text-xs text-secondary mb-1">
                    Micronutrients Guidance
                  </Text>
                  <Text className="text-sm">
                    {targets.micronutrientsGuidance}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

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
                Food Diary
              </Text>
              <TextInput
                value={foodDiary}
                onChangeText={setFoodDiary}
                placeholder="Log your meals, macros hit, and notes here..."
                placeholderTextColor={colors.placeholder}
                multiline
                className="rounded-2xl px-4 py-3 text-sm font-outfit text-app"
                style={{
                  minHeight: 150,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(15,23,42,0.03)",
                }}
              />
            </View>
          ) : (
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
                        {slot.checked && (
                          <Feather name="check" color="white" />
                        )}
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

              <Text className="text-sm font-bold font-outfit text-app mb-3">
                Water Intake (Glasses)
              </Text>
              <View className="flex-row items-center gap-4 mb-6">
                <TouchableOpacity
                  onPress={() => setWaterIntake(Math.max(0, waterIntake - 1))}
                  className="w-12 h-12 bg-app/5 items-center justify-center rounded-2xl"
                >
                  <Feather name="minus" size={20} color={colors.accent} />
                </TouchableOpacity>
                <Text className="text-3xl font-clash font-bold flex-1 text-center">
                  {waterIntake}
                </Text>
                <TouchableOpacity
                  onPress={() => setWaterIntake(waterIntake + 1)}
                  className="w-12 h-12 bg-app/5 items-center justify-center rounded-2xl"
                >
                  <Feather name="plus" size={20} color={colors.accent} />
                </TouchableOpacity>
              </View>

              {renderMetricScale("Mood Tracker", mood, setMood)}
              {renderMetricScale("Energy Levels", energy, setEnergy)}
              {renderMetricScale("Pain Levels", pain, setPain)}
            </View>
          )}

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
          ) : coachLogs.length === 0 ? (
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
                No logs found for this range.
              </Text>
            </View>
          ) : (
            <View className="gap-4">
              {coachLogs.map((log) => {
                const dateLabel =
                  typeof log?.dateKey === "string" ? log.dateKey : "";

                const lines: string[] = [];
                if (isAdult) {
                  const diary =
                    typeof log?.foodDiary === "string" ? log.foodDiary.trim() : "";
                  if (diary) lines.push(`Food diary: ${diary}`);
                } else {
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

                  const anyNewSnack =
                    sm.checked || sa.checked || se.checked;
                  if (!anyNewSnack && legacySnacksRaw) {
                    const legacy = parseSlot(legacySnacksRaw);
                    if (legacy.checked)
                      lines.push(`Snack (legacy): ${legacy.details || "Logged"}`);
                  } else {
                    if (sm.checked)
                      lines.push(`Morning snack: ${sm.details || "Logged"}`);
                    if (sa.checked)
                      lines.push(`Afternoon snack: ${sa.details || "Logged"}`);
                    if (se.checked)
                      lines.push(`Evening snack: ${se.details || "Logged"}`);
                  }

                  const w =
                    typeof log?.waterIntake === "number" ? log.waterIntake : 0;
                  if (w > 0) lines.push(`Water: ${w}`);
                  if (typeof log?.mood === "number") lines.push(`Mood: ${log.mood}/5`);
                  if (typeof log?.energy === "number") lines.push(`Energy: ${log.energy}/5`);
                  if (typeof log?.pain === "number") lines.push(`Pain: ${log.pain}/5`);
                }

                const coachText =
                  typeof log?.coachFeedback === "string"
                    ? log.coachFeedback.trim()
                    : "";
                const coachMedia =
                  typeof log?.coachFeedbackMediaUrl === "string"
                    ? log.coachFeedbackMediaUrl.trim()
                    : "";

                return (
                  <View
                    key={String(log?.id ?? dateLabel)}
                    className="rounded-3xl border p-5 gap-3"
                    style={{
                      backgroundColor: colors.card,
                      borderColor: isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(15,23,42,0.06)",
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
                            key={t}
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
                  </View>
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
