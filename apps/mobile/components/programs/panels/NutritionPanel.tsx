import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { Text, TextInput } from "@/components/ScaledText";
import { useProgramPanel } from "./shared/useProgramPanel";
import { AppRole } from "@/lib/appRole";

type NutritionPanelProps = {
  appRole: AppRole | null;
};

export function NutritionPanel({ appRole }: NutritionPanelProps) {
  const { token, athleteUserId } = useAppSelector((state) => state.user);
  const { isDark, colors, shadows } = useProgramPanel();
  
  const isAdult = appRole === "adult_athlete" || appRole === "adult_athlete_team";

  const [dateObj, setDateObj] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  const dateKey = dateObj.toISOString().slice(0, 10);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logId, setLogId] = useState<number | null>(null);

  // Targets (Adult only)
  const [targets, setTargets] = useState<{ calories?: number, protein?: number, carbs?: number, fats?: number, micronutrientsGuidance?: string } | null>(null);

  // Log States
  const [foodDiary, setFoodDiary] = useState("");
  const [breakfast, setBreakfast] = useState(false);
  const [lunch, setLunch] = useState(false);
  const [dinner, setDinner] = useState(false);
  const [snacks, setSnacks] = useState(false);
  const [waterIntake, setWaterIntake] = useState(0);
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [pain, setPain] = useState<number | null>(null);
  
  const [coachFeedback, setCoachFeedback] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: "error" | "success" | "info"; message: string } | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      
      // Fetch Log
      const logData = await apiRequest<{ logs: any[] }>(`/nutrition/logs?userId=${athleteUserId || "me"}`, { token, suppressLog: true });
      const currentLog = logData.logs.find(l => l.dateKey === dateKey);
      
      if (currentLog) {
        setLogId(currentLog.id);
        setFoodDiary(currentLog.foodDiary || "");
        setBreakfast(!!currentLog.breakfast);
        setLunch(!!currentLog.lunch);
        setDinner(!!currentLog.dinner);
        setSnacks(!!currentLog.snacks);
        setWaterIntake(currentLog.waterIntake || 0);
        setMood(currentLog.mood);
        setEnergy(currentLog.energy);
        setPain(currentLog.pain);
        setCoachFeedback(currentLog.coachFeedback);
      } else {
        setLogId(null);
        setFoodDiary("");
        setBreakfast(false);
        setLunch(false);
        setDinner(false);
        setSnacks(false);
        setWaterIntake(0);
        setMood(null);
        setEnergy(null);
        setPain(null);
        setCoachFeedback(null);
      }

      if (isAdult) {
        const targetData = await apiRequest<{ targets: any }>(`/nutrition/targets/${athleteUserId || "me"}`, { token, suppressLog: true });
        setTargets(targetData.targets);
      }

    } catch (err: any) {
      console.warn("Failed to fetch nutrition data", err);
    } finally {
      setLoading(false);
    }
  }, [token, dateKey, athleteUserId, isAdult]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

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
          breakfast: !isAdult ? (breakfast ? "yes" : "") : undefined,
          lunch: !isAdult ? (lunch ? "yes" : "") : undefined,
          dinner: !isAdult ? (dinner ? "yes" : "") : undefined,
          snacks: !isAdult ? (snacks ? "yes" : "") : undefined,
          waterIntake: !isAdult ? waterIntake : undefined,
          mood: !isAdult ? mood : undefined,
          energy: !isAdult ? energy : undefined,
          pain: !isAdult ? pain : undefined,
        }
      });
      setStatus({ tone: "success", message: "Saved successfully!" });
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      setStatus({ tone: "error", message: err.message || "Failed to save." });
    } finally {
      setSaving(false);
    }
  };

  const renderMetricScale = (label: string, value: number | null, setter: (val: number) => void) => (
    <View className="mb-4">
      <Text className="text-sm font-bold font-outfit text-app mb-2">{label} (1-5)</Text>
      <View className="flex-row justify-between">
        {[1, 2, 3, 4, 5].map((num) => (
          <TouchableOpacity 
            key={num} 
            onPress={() => setter(num)}
            className={`w-12 h-12 rounded-2xl items-center justify-center border`}
            style={{ 
              backgroundColor: value === num ? colors.accent : colors.card,
              borderColor: value === num ? colors.accent : (isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)")
            }}
          >
            <Text className={`font-bold font-clash text-lg ${value === num ? "text-white" : "text-app"}`}>{num}</Text>
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
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
          ...(isDark ? shadows.none : shadows.md),
        }}
      >
        <Text className="text-2xl font-clash text-app font-bold">
          {isAdult ? "Food Diary" : "Daily Tracking"}
        </Text>
        <Text className="mt-2 text-sm font-outfit text-secondary leading-6">
          {isAdult ? "Log your nutrition relative to your targets." : "Check off your daily checklist and rate your metrics."}
        </Text>

        <TouchableOpacity
          onPress={() => setDatePickerOpen(true)}
          className="mt-5 flex-row items-center justify-between rounded-2xl border px-4 py-3"
          style={{
            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
          }}
        >
          <View>
            <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">Entry Date</Text>
            <Text className="mt-1 text-sm font-outfit text-app">{dateObj.toLocaleDateString()}</Text>
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

      {loading ? (
        <View className="items-center py-10"><ActivityIndicator size="large" color={colors.accent} /></View>
      ) : (
        <View className="gap-4">
          
          {isAdult && targets && (
             <View className="rounded-3xl border p-5" style={{ backgroundColor: colors.card, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)" }}>
               <Text className="text-xs font-outfit font-bold uppercase tracking-[1.2px] text-secondary mb-3">Coach Targets</Text>
               <View className="flex-row flex-wrap gap-2">
                 <View className="w-[48%] rounded-xl bg-app/5 p-3"><Text className="text-xs text-secondary mb-1">Calories</Text><Text className="text-lg font-clash font-bold">{targets.calories || "N/A"}</Text></View>
                 <View className="w-[48%] rounded-xl bg-app/5 p-3"><Text className="text-xs text-secondary mb-1">Protein</Text><Text className="text-lg font-clash font-bold">{targets.protein ? `${targets.protein}g` : "N/A"}</Text></View>
                 <View className="w-[48%] rounded-xl bg-app/5 p-3"><Text className="text-xs text-secondary mb-1">Carbs</Text><Text className="text-lg font-clash font-bold">{targets.carbs ? `${targets.carbs}g` : "N/A"}</Text></View>
                 <View className="w-[48%] rounded-xl bg-app/5 p-3"><Text className="text-xs text-secondary mb-1">Fats</Text><Text className="text-lg font-clash font-bold">{targets.fats ? `${targets.fats}g` : "N/A"}</Text></View>
               </View>
               {targets.micronutrientsGuidance ? (
                 <View className="mt-3 bg-app/5 p-3 rounded-xl">
                   <Text className="text-xs text-secondary mb-1">Micronutrients Guidance</Text>
                   <Text className="text-sm">{targets.micronutrientsGuidance}</Text>
                 </View>
               ) : null}
             </View>
          )}

          {isAdult ? (
            <View className="rounded-3xl border p-5" style={{ backgroundColor: colors.card, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)" }}>
              <Text className="text-sm font-bold font-outfit text-app mb-3">Food Diary</Text>
              <TextInput
                value={foodDiary}
                onChangeText={setFoodDiary}
                placeholder="Log your meals, macros hit, and notes here..."
                placeholderTextColor={colors.placeholder}
                multiline
                className="rounded-2xl px-4 py-3 text-sm font-outfit text-app"
                style={{ minHeight: 150, backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)" }}
              />
            </View>
          ) : (
            <View className="rounded-3xl border p-5" style={{ backgroundColor: colors.card, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)" }}>
              <Text className="text-sm font-bold font-outfit text-app mb-3">Meal Checklist</Text>
              <View className="flex-row flex-wrap gap-3 mb-6">
                {[ 
                  { label: "Breakfast", val: breakfast, set: setBreakfast },
                  { label: "Lunch", val: lunch, set: setLunch },
                  { label: "Snacks", val: snacks, set: setSnacks },
                  { label: "Dinner", val: dinner, set: setDinner }
                ].map(meal => (
                  <TouchableOpacity 
                    key={meal.label}
                    onPress={() => meal.set(!meal.val)}
                    className={`rounded-2xl px-4 py-3 min-w-[45%] flex-row items-center justify-between border`}
                    style={{ 
                      backgroundColor: meal.val ? colors.accent : colors.card,
                      borderColor: meal.val ? colors.accent : (isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)")
                     }}
                  >
                    <Text className={`font-bold ${meal.val ? "text-white" : "text-app"}`}>{meal.label}</Text>
                    {meal.val && <Feather name="check" color="white" />}
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-sm font-bold font-outfit text-app mb-3">Water Intake (Glasses)</Text>
              <View className="flex-row items-center gap-4 mb-6">
                 <TouchableOpacity onPress={() => setWaterIntake(Math.max(0, waterIntake - 1))} className="w-12 h-12 bg-app/5 items-center justify-center rounded-2xl"><Feather name="minus" size={20} color={colors.accent} /></TouchableOpacity>
                 <Text className="text-3xl font-clash font-bold flex-1 text-center">{waterIntake}</Text>
                 <TouchableOpacity onPress={() => setWaterIntake(waterIntake + 1)} className="w-12 h-12 bg-app/5 items-center justify-center rounded-2xl"><Feather name="plus" size={20} color={colors.accent} /></TouchableOpacity>
              </View>

              {renderMetricScale("Mood Tracker", mood, setMood)}
              {renderMetricScale("Energy Levels", energy, setEnergy)}
              {renderMetricScale("Pain Levels", pain, setPain)}
            </View>
          )}

          {coachFeedback && (
            <View className="rounded-3xl border p-5 bg-emerald-500/10 border-emerald-400/30">
              <Text className="text-[10px] font-outfit font-bold uppercase text-emerald-600 dark:text-emerald-300 mb-2">Coach Feedback</Text>
              <Text className="text-sm font-outfit text-app leading-6">{coachFeedback}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className={`rounded-[24px] items-center py-4 ${saving ? "bg-accent/40" : "bg-accent"}`}
          >
            <Text className="text-white font-bold">{saving ? "Saving..." : "Save Daily Log"}</Text>
          </TouchableOpacity>
          {status && (
            <Text className={`text-center font-bold ${status.tone === "error" ? "text-red-500" : "text-emerald-500"}`}>{status.message}</Text>
          )}
        </View>
      )}
    </View>
  );
}
