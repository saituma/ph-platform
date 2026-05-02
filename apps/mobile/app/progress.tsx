import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
  Switch,
  Alert,
  StyleSheet,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { fonts, radius, Shadows } from "@/constants/theme";
import {
  initProgressDb,
  insertStrength,
  insertBodyWeight,
  insertMeasurement,
  listStrength,
  listBodyWeights,
  listMeasurements,
  deleteStrength,
  deleteBodyWeight,
  deleteMeasurement,
  type StrengthEntry,
  type BodyWeightEntry,
  type MeasurementEntry,
  type MeasurementKind,
} from "@/lib/sqliteProgress";
import {
  getProgressReminderPrefs,
  setProgressReminderPrefs,
} from "@/lib/progressPreferences";
import {
  requestProgressNotificationPermission,
  syncProgressWeeklyReminder,
} from "@/lib/progressReminders";
import { AdaptiveSheet } from "@/components/native/AdaptiveSheet";

type Tab = "strength" | "weight" | "measure";

function parseIsoToLocalDate(iso: string): Date {
  const parts = iso.split("-").map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatIsoToDisplay(iso: string): string {
  const d = parseIsoToLocalDate(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function dateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const MEASURE_PRESETS: { kind: MeasurementKind; label: string }[] = [
  { kind: "chest", label: "Chest" },
  { kind: "waist", label: "Waist" },
  { kind: "hips", label: "Hips" },
  { kind: "arm", label: "Arm" },
  { kind: "thigh", label: "Thigh" },
  { kind: "calf", label: "Calf" },
  { kind: "neck", label: "Neck" },
  { kind: "other", label: "Custom" },
];

function SparkBars({
  values,
  color,
  secondary,
}: {
  values: number[];
  color: string;
  secondary: string;
}) {
  const slice = values.slice(0, 14).reverse();
  const max = Math.max(...slice, 1);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", height: 72, gap: 4 }}>
      {slice.map((v, i) => {
        const h = Math.max(6, (v / max) * 64);
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: h,
              borderRadius: 6,
              backgroundColor: i === slice.length - 1 ? color : secondary,
            }}
          />
        );
      })}
    </View>
  );
}

export default function ProgressScreen() {
  const insets = useAppSafeAreaInsets();
  const { colors, isDark } = useAppTheme();

  const [tab, setTab] = useState<Tab>("strength");
  const [strength, setStrength] = useState<StrengthEntry[]>([]);
  const [weights, setWeights] = useState<BodyWeightEntry[]>([]);
  const [measures, setMeasures] = useState<MeasurementEntry[]>([]);

  const [reminderOn, setReminderOn] = useState(true);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePick, setShowTimePick] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [showEntryDatePick, setShowEntryDatePick] = useState(false);
  const [dateIso, setDateIso] = useState(() => new Date().toISOString().slice(0, 10));

  const [exName, setExName] = useState("");
  const [liftKg, setLiftKg] = useState("");
  const [reps, setReps] = useState("");
  const [sets, setSets] = useState("");
  const [bwKg, setBwKg] = useState("");
  const [measCm, setMeasCm] = useState("");
  const [measKind, setMeasKind] = useState<MeasurementKind>("waist");
  const [measLabel, setMeasLabel] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(() => {
    initProgressDb();
    setStrength(listStrength(40));
    setWeights(listBodyWeights(60));
    setMeasures(listMeasurements(40));
  }, []);

  useEffect(() => {
    load();
    void (async () => {
      const p = await getProgressReminderPrefs();
      setReminderOn(p.enabled);
      const d = new Date();
      d.setHours(p.hour, p.minute, 0, 0);
      setReminderTime(d);
    })();
  }, [load]);

  const strengthSeries = useMemo(
    () => strength.slice(0, 14).map((s) => s.weight_kg),
    [strength],
  );
  const weightSeries = useMemo(
    () => weights.slice(0, 14).map((w) => w.weight_kg),
    [weights],
  );
  const measureSeries = useMemo(
    () => measures.slice(0, 14).map((m) => m.value_cm),
    [measures],
  );

  const openAdd = () => {
    setDateIso(new Date().toISOString().slice(0, 10));
    setExName("");
    setLiftKg("");
    setReps("");
    setSets("");
    setBwKg("");
    setMeasCm("");
    setMeasKind("waist");
    setMeasLabel("");
    setNotes("");
    setShowEntryDatePick(false);
    setModalOpen(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const saveEntry = () => {
    try {
      if (tab === "strength") {
        const w = parseFloat(liftKg.replace(",", "."));
        if (!exName.trim() || !isFinite(w)) {
          Alert.alert("Missing info", "Add exercise name and weight (kg).");
          return;
        }
        insertStrength({
          date_iso: dateIso,
          exercise_name: exName,
          weight_kg: w,
          reps: reps.trim() ? parseInt(reps, 10) : null,
          sets: sets.trim() ? parseInt(sets, 10) : null,
          notes,
        });
      } else if (tab === "weight") {
        const w = parseFloat(bwKg.replace(",", "."));
        if (!isFinite(w)) {
          Alert.alert("Missing info", "Enter body weight in kg.");
          return;
        }
        insertBodyWeight({ date_iso: dateIso, weight_kg: w, notes });
      } else {
        const cm = parseFloat(measCm.replace(",", "."));
        if (!isFinite(cm)) {
          Alert.alert("Missing info", "Enter measurement in cm.");
          return;
        }
        const preset = MEASURE_PRESETS.find((m) => m.kind === measKind);
        const label =
          measKind === "other" && measLabel.trim()
            ? measLabel.trim()
            : preset?.label ?? "Measurement";
        insertMeasurement({
          date_iso: dateIso,
          kind: measKind,
          label,
          value_cm: cm,
          notes,
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalOpen(false);
      load();
    } catch (e) {
      Alert.alert("Could not save", e instanceof Error ? e.message : "Unknown error");
    }
  };

  const persistReminder = async (enabled: boolean, time?: Date) => {
    const t = time ?? reminderTime;
    const next = await setProgressReminderPrefs({
      enabled,
      hour: t.getHours(),
      minute: t.getMinutes(),
    });
    if (enabled) {
      const ok = await requestProgressNotificationPermission();
      if (!ok) {
        setReminderOn(false);
        await setProgressReminderPrefs({ enabled: false });
        Alert.alert(
          "Notifications off",
          "Enable notifications in system settings to get progress reminders.",
        );
        return;
      }
    }
    await syncProgressWeeklyReminder(next);
  };

  const tabBtn = (key: Tab, label: string, icon: keyof typeof Ionicons.glyphMap) => {
    const on = tab === key;
    return (
      <Pressable
        onPress={() => {
          setTab(key);
          Haptics.selectionAsync();
        }}
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          paddingVertical: 12,
          borderRadius: radius.pill,
          backgroundColor: on ? colors.accent : "transparent",
        }}
      >
        <Ionicons name={icon} size={18} color={on ? colors.textInverse : colors.textSecondary} />
        <Text
          style={{
            fontFamily: fonts.labelMedium,
            fontSize: 12,
            color: on ? colors.textInverse : colors.textSecondary,
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  const glass = isDark ? "rgba(20,20,28,0.92)" : "#FFFFFF";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <MoreStackHeader
        title="Progress"
        subtitle="Track strength, weight, and measurements — stored on this device for now."
      />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LinearGradient
          colors={
            isDark
              ? ["rgba(34,197,94,0.18)", "transparent"]
              : ["rgba(34,197,94,0.12)", "transparent"]
          }
          style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}
        >
          <Text
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 14,
              color: colors.textSecondary,
              lineHeight: 20,
            }}
          >
            Track strength, weight, and measurements over time. Stored on this device for now — sync
            coming later.
          </Text>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 120,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              flexDirection: "row",
              padding: 4,
              borderRadius: radius.pill,
              backgroundColor: isDark ? colors.heroSurfaceMuted : colors.backgroundSecondary,
              marginBottom: 20,
              ...(!isDark ? Shadows.sm : {}),
            }}
          >
            {tabBtn("strength", "Strength", "barbell-outline")}
            {tabBtn("weight", "Weight", "body-outline")}
            {tabBtn("measure", "Body", "resize-outline")}
          </View>

          <View
            style={{
              borderRadius: radius.xxl,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
              padding: 16,
              marginBottom: 20,
              backgroundColor: glass,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ fontFamily: fonts.labelCaps, fontSize: 10, color: colors.textSecondary }}>
                LAST {tab === "strength" ? "LIFTS" : tab === "weight" ? "WEIGH-INS" : "MEASUREMENTS"}
              </Text>
              <Ionicons name="analytics-outline" size={18} color={colors.accent} />
            </View>
            {tab === "strength" && strengthSeries.length > 0 ? (
              <SparkBars
                values={strengthSeries}
                color={colors.accent}
                secondary={colors.accentLight}
              />
            ) : tab === "weight" && weightSeries.length > 0 ? (
              <SparkBars
                values={weightSeries}
                color={colors.cyan}
                secondary={isDark ? "rgba(34,211,238,0.35)" : "rgba(6,182,212,0.35)"}
              />
            ) : tab === "measure" && measureSeries.length > 0 ? (
              <SparkBars
                values={measureSeries}
                color={colors.purple}
                secondary={isDark ? "rgba(167,139,250,0.4)" : "rgba(124,58,237,0.35)"}
              />
            ) : (
              <View style={{ height: 72, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ fontFamily: fonts.bodyRegular, color: colors.textDim, fontSize: 13 }}>
                  Add entries to see your trend
                </Text>
              </View>
            )}
          </View>

          <View
            style={{
              borderRadius: radius.xl,
              padding: 16,
              marginBottom: 20,
              backgroundColor: glass,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontFamily: fonts.heading3, fontSize: 16, color: colors.textPrimary }}>
                  Daily reminder
                </Text>
                <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                  Gentle nudge to log progress (local only)
                </Text>
              </View>
              <Switch
                value={reminderOn}
                onValueChange={(v) => {
                  setReminderOn(v);
                  void persistReminder(v);
                }}
              />
            </View>
            {reminderOn ? (
              <Pressable
                onPress={() => setShowTimePick(true)}
                style={{
                  marginTop: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  alignSelf: "flex-start",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: radius.pill,
                  backgroundColor: colors.accentLight,
                }}
              >
                <Ionicons name="time-outline" size={18} color={colors.accent} />
                <Text style={{ fontFamily: fonts.bodyMedium, color: colors.accent }}>
                  {reminderTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </Pressable>
            ) : null}
            {showTimePick ? (
              <DateTimePicker
                value={reminderTime}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, d) => {
                  setShowTimePick(Platform.OS === "ios");
                  if (d) {
                    setReminderTime(d);
                    void persistReminder(true, d);
                  }
                }}
              />
            ) : null}
          </View>

          <Text
            style={{
              fontFamily: fonts.labelCaps,
              fontSize: 11,
              color: colors.textSecondary,
              marginBottom: 12,
              letterSpacing: 2,
            }}
          >
            RECENT
          </Text>

          {tab === "strength" &&
            strength.map((s) => (
              <View
                key={s.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.borderSubtle,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.heading3, color: colors.textPrimary }}>{s.exercise_name}</Text>
                  <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                    {s.date_iso} · {s.weight_kg} kg
                    {s.reps != null ? ` · ${s.reps} reps` : ""}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    Alert.alert("Delete entry?", undefined, [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => {
                          deleteStrength(s.id);
                          load();
                        },
                      },
                    ]);
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.textDim} />
                </Pressable>
              </View>
            ))}

          {tab === "weight" &&
            weights.map((w) => (
              <View
                key={w.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.borderSubtle,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.heroDisplay, fontSize: 22, color: colors.textPrimary }}>
                    {w.weight_kg} <Text style={{ fontSize: 14, fontFamily: fonts.bodyMedium }}>kg</Text>
                  </Text>
                  <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textSecondary }}>{w.date_iso}</Text>
                </View>
                <Pressable
                  onPress={() => {
                    Alert.alert("Delete entry?", undefined, [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => {
                          deleteBodyWeight(w.id);
                          load();
                        },
                      },
                    ]);
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.textDim} />
                </Pressable>
              </View>
            ))}

          {tab === "measure" &&
            measures.map((m) => (
              <View
                key={m.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 14,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.borderSubtle,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.heading3, color: colors.textPrimary }}>{m.label}</Text>
                  <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                    {m.date_iso} · {m.value_cm} cm
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    Alert.alert("Delete entry?", undefined, [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => {
                          deleteMeasurement(m.id);
                          load();
                        },
                      },
                    ]);
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.textDim} />
                </Pressable>
              </View>
            ))}

          {((tab === "strength" && strength.length === 0) ||
            (tab === "weight" && weights.length === 0) ||
            (tab === "measure" && measures.length === 0)) && (
            <Text style={{ fontFamily: fonts.bodyRegular, color: colors.textDim, textAlign: "center", marginTop: 24 }}>
              No entries yet — tap Add below
            </Text>
          )}
        </ScrollView>

        <Pressable
          onPress={openAdd}
          style={{
            position: "absolute",
            left: 20,
            right: 20,
            bottom: insets.bottom + 16,
            height: 54,
            borderRadius: radius.pill,
            backgroundColor: colors.accent,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            ...(isDark ? {} : Shadows.md),
            borderWidth: isDark ? 1 : 0,
            borderColor: isDark ? "rgba(255,255,255,0.14)" : "transparent",
          }}
        >
          <Ionicons name="add-circle-outline" size={22} color={colors.textInverse} />
          <Text style={{ fontFamily: fonts.heading2, fontSize: 16, color: colors.textInverse }}>Add entry</Text>
        </Pressable>

        <AdaptiveSheet
          visible={modalOpen}
          variant="bottom"
          onClose={() => {
            Keyboard.dismiss();
            setModalOpen(false);
          }}
          cardStyle={{ backgroundColor: colors.background }}
        >
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  showsVerticalScrollIndicator
                  nestedScrollEnabled
                  contentContainerStyle={{ paddingBottom: 28 }}
                >
                  <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderMid, alignSelf: "center", marginBottom: 16 }} />
                  <Text style={{ fontFamily: fonts.heading2, fontSize: 20, color: colors.textPrimary, marginBottom: 16 }}>
                    {tab === "strength" ? "Log lift" : tab === "weight" ? "Body weight" : "Measurement"}
                  </Text>

                  <Text style={{ fontFamily: fonts.labelMedium, fontSize: 11, color: colors.textSecondary, marginBottom: 6 }}>DATE</Text>
                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      setShowEntryDatePick((v) => !v);
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderWidth: 1,
                      borderColor: colors.borderSubtle,
                      borderRadius: radius.lg,
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                      marginBottom: showEntryDatePick && Platform.OS === "ios" ? 8 : 14,
                      backgroundColor: isDark ? colors.surfaceHigh : colors.backgroundSecondary,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.textPrimary }}>
                      {formatIsoToDisplay(dateIso)}
                    </Text>
                    <Ionicons name="calendar-outline" size={22} color={colors.accent} />
                  </Pressable>
                  {showEntryDatePick ? (
                    <View style={{ marginBottom: 14 }}>
                      <DateTimePicker
                        value={parseIsoToLocalDate(dateIso)}
                        mode="date"
                        display={Platform.OS === "ios" ? "inline" : "default"}
                        {...(Platform.OS === "ios" ? { themeVariant: isDark ? "dark" : "light" } : {})}
                        onChange={(event, d) => {
                          if (Platform.OS === "android") {
                            setShowEntryDatePick(false);
                            if (event.type === "dismissed") return;
                          }
                          if (d) setDateIso(dateToIso(d));
                        }}
                      />
                      {Platform.OS === "ios" ? (
                        <Pressable
                          onPress={() => setShowEntryDatePick(false)}
                          style={{
                            alignSelf: "flex-end",
                            marginTop: 8,
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                          }}
                        >
                          <Text style={{ fontFamily: fonts.heading3, fontSize: 16, color: colors.accent }}>Done</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}

            {tab === "strength" ? (
              <>
                <Text style={{ fontFamily: fonts.labelMedium, fontSize: 11, color: colors.textSecondary, marginBottom: 6 }}>EXERCISE</Text>
                <TextInput
                  value={exName}
                  onChangeText={setExName}
                  placeholder="e.g. Back squat"
                  placeholderTextColor={colors.textDim}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.borderSubtle,
                    borderRadius: radius.lg,
                    padding: 12,
                    color: colors.textPrimary,
                    marginBottom: 12,
                  }}
                />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.labelMedium, fontSize: 11, color: colors.textSecondary, marginBottom: 6 }}>KG</Text>
                    <TextInput
                      keyboardType="decimal-pad"
                      value={liftKg}
                      onChangeText={setLiftKg}
                      placeholder="80"
                      placeholderTextColor={colors.textDim}
                      style={{
                        borderWidth: 1,
                        borderColor: colors.borderSubtle,
                        borderRadius: radius.lg,
                        padding: 12,
                        color: colors.textPrimary,
                      }}
                    />
                  </View>
                  <View style={{ width: 72 }}>
                    <Text style={{ fontFamily: fonts.labelMedium, fontSize: 11, color: colors.textSecondary, marginBottom: 6 }}>REPS</Text>
                    <TextInput
                      keyboardType="number-pad"
                      value={reps}
                      onChangeText={setReps}
                      placeholder="5"
                      placeholderTextColor={colors.textDim}
                      style={{
                        borderWidth: 1,
                        borderColor: colors.borderSubtle,
                        borderRadius: radius.lg,
                        padding: 12,
                        color: colors.textPrimary,
                      }}
                    />
                  </View>
                  <View style={{ width: 72 }}>
                    <Text style={{ fontFamily: fonts.labelMedium, fontSize: 11, color: colors.textSecondary, marginBottom: 6 }}>SETS</Text>
                    <TextInput
                      keyboardType="number-pad"
                      value={sets}
                      onChangeText={setSets}
                      placeholder="3"
                      placeholderTextColor={colors.textDim}
                      style={{
                        borderWidth: 1,
                        borderColor: colors.borderSubtle,
                        borderRadius: radius.lg,
                        padding: 12,
                        color: colors.textPrimary,
                      }}
                    />
                  </View>
                </View>
              </>
            ) : null}

            {tab === "weight" ? (
              <>
                <Text style={{ fontFamily: fonts.labelMedium, fontSize: 11, color: colors.textSecondary, marginBottom: 6, marginTop: 4 }}>WEIGHT (KG)</Text>
                <TextInput
                  keyboardType="decimal-pad"
                  value={bwKg}
                  onChangeText={setBwKg}
                  placeholder="72.5"
                  placeholderTextColor={colors.textDim}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.borderSubtle,
                    borderRadius: radius.lg,
                    padding: 12,
                    color: colors.textPrimary,
                  }}
                />
              </>
            ) : null}

            {tab === "measure" ? (
              <>
                <Text style={{ fontFamily: fonts.labelMedium, fontSize: 11, color: colors.textSecondary, marginBottom: 8, marginTop: 4 }}>AREA</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
                  {MEASURE_PRESETS.map((p) => (
                    <Pressable
                      key={p.kind}
                      onPress={() => {
                        setMeasKind(p.kind);
                        if (p.kind !== "other") setMeasLabel("");
                      }}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: radius.pill,
                        backgroundColor: measKind === p.kind ? colors.accent : colors.surfaceHigh,
                        borderWidth: 1,
                        borderColor: measKind === p.kind ? colors.accent : colors.borderSubtle,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.bodyMedium,
                          fontSize: 13,
                          color: measKind === p.kind ? colors.textInverse : colors.textPrimary,
                        }}
                      >
                        {p.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {measKind === "other" ? (
                  <TextInput
                    value={measLabel}
                    onChangeText={setMeasLabel}
                    placeholder="Label"
                    placeholderTextColor={colors.textDim}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.borderSubtle,
                      borderRadius: radius.lg,
                      padding: 12,
                      color: colors.textPrimary,
                      marginBottom: 12,
                    }}
                  />
                ) : null}
                <Text style={{ fontFamily: fonts.labelMedium, fontSize: 11, color: colors.textSecondary, marginBottom: 6 }}>CM</Text>
                <TextInput
                  keyboardType="decimal-pad"
                  value={measCm}
                  onChangeText={setMeasCm}
                  placeholder="82"
                  placeholderTextColor={colors.textDim}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.borderSubtle,
                    borderRadius: radius.lg,
                    padding: 12,
                    color: colors.textPrimary,
                  }}
                />
              </>
            ) : null}

            <Text style={{ fontFamily: fonts.labelMedium, fontSize: 11, color: colors.textSecondary, marginBottom: 6, marginTop: 12 }}>NOTES (OPTIONAL)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="How it felt…"
              placeholderTextColor={colors.textDim}
              multiline
              style={{
                borderWidth: 1,
                borderColor: colors.borderSubtle,
                borderRadius: radius.lg,
                padding: 12,
                color: colors.textPrimary,
                minHeight: 72,
                textAlignVertical: "top",
              }}
            />

            <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  setModalOpen(false);
                }}
                style={{
                  flex: 1,
                  height: 50,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: colors.borderSubtle,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontFamily: fonts.heading3, color: colors.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  saveEntry();
                }}
                style={{
                  flex: 1,
                  height: 50,
                  borderRadius: radius.pill,
                  backgroundColor: colors.accent,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontFamily: fonts.heading3, color: colors.textInverse }}>Save</Text>
              </Pressable>
            </View>
                </ScrollView>
        </AdaptiveSheet>
      </View>
    </SafeAreaView>
  );
}
