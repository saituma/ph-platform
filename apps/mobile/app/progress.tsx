import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Switch,
  Alert,
  StyleSheet,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";
import { BarChart3, Calendar, Clock, Dumbbell, PlusCircle, Ruler, Scale, Trash2 } from "lucide-react-native";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
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
import { useAppToast } from "@/hooks/useAppToast";

type Tab = "strength" | "weight" | "measure";

function parseIsoToLocalDate(iso: string): Date {
  const parts = iso.split("-").map((pt) => parseInt(pt, 10));
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
  const p = useAdminPastel();
  const { isDark } = useAppTheme();
  const toast = useAppToast();

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
      const prefs = await getProgressReminderPrefs();
      setReminderOn(prefs.enabled);
      const d = new Date();
      d.setHours(prefs.hour, prefs.minute, 0, 0);
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
          toast.warning("Missing info", "Add exercise name and weight (kg).");
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
          toast.warning("Missing info", "Enter body weight in kg.");
          return;
        }
        insertBodyWeight({ date_iso: dateIso, weight_kg: w, notes });
      } else {
        const cm = parseFloat(measCm.replace(",", "."));
        if (!isFinite(cm)) {
          toast.warning("Missing info", "Enter measurement in cm.");
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
      toast.error("Could not save", e instanceof Error ? e.message : "Unknown error");
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
        toast.info("Notifications off", "Enable notifications in system settings to get progress reminders.");
        return;
      }
    }
    await syncProgressWeeklyReminder(next);
  };

  const TAB_ICONS: Record<Tab, React.FC<any>> = {
    strength: Dumbbell,
    weight: Scale,
    measure: Ruler,
  };

  const tabBtn = (key: Tab, label: string) => {
    const on = tab === key;
    const Icon = TAB_ICONS[key];
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
          borderRadius: 100,
          backgroundColor: on ? p.accent : "transparent",
        }}
      >
        <Icon size={18} color={on ? p.buttonPrimaryText : p.textSecondary} />
        <Text
          style={{
            fontFamily: "Outfit-Bold",
            fontSize: 12,
            color: on ? p.buttonPrimaryText : p.textSecondary,
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }} edges={["top"]}>
      <MoreStackHeader
        title="Progress"
        subtitle="Track strength, weight, and measurements — stored on this device for now."
      />
      <View style={{ flex: 1, backgroundColor: p.pageBg }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, backgroundColor: p.accentSoft }}>
          <Text
            style={{
              fontFamily: "Outfit-Regular",
              fontSize: 14,
              color: p.textSecondary,
              lineHeight: 20,
            }}
          >
            Track strength, weight, and measurements over time. Stored on this device for now — sync
            coming later.
          </Text>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 120,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              flexDirection: "row",
              padding: 4,
              borderRadius: 100,
              backgroundColor: p.inputBg,
              marginBottom: 20,
              marginTop: 16,
            }}
          >
            {tabBtn("strength", "Strength")}
            {tabBtn("weight", "Weight")}
            {tabBtn("measure", "Body")}
          </View>

          <View
            style={{
              borderRadius: 22,
              padding: 16,
              marginBottom: 20,
              backgroundColor: p.cardWhite,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 10, color: p.textMuted, textTransform: "uppercase", letterSpacing: 1.4 }}>
                LAST {tab === "strength" ? "LIFTS" : tab === "weight" ? "WEIGH-INS" : "MEASUREMENTS"}
              </Text>
              <BarChart3 size={18} color={p.accent} />
            </View>
            {tab === "strength" && strengthSeries.length > 0 ? (
              <SparkBars
                values={strengthSeries}
                color={p.accent}
                secondary={p.accentSoft}
              />
            ) : tab === "weight" && weightSeries.length > 0 ? (
              <SparkBars
                values={weightSeries}
                color={p.info}
                secondary={p.infoSoft}
              />
            ) : tab === "measure" && measureSeries.length > 0 ? (
              <SparkBars
                values={measureSeries}
                color={p.warning}
                secondary={p.warningSoft}
              />
            ) : (
              <View style={{ height: 72, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ fontFamily: "Outfit-Regular", color: p.textMuted, fontSize: 13 }}>
                  Add entries to see your trend
                </Text>
              </View>
            )}
          </View>

          <View
            style={{
              borderRadius: 22,
              padding: 16,
              marginBottom: 20,
              backgroundColor: p.cardWhite,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: p.textPrimary }}>
                  Daily reminder
                </Text>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textSecondary, marginTop: 4 }}>
                  Gentle nudge to log progress (local only)
                </Text>
              </View>
              <Switch
                value={reminderOn}
                onValueChange={(v) => {
                  setReminderOn(v);
                  void persistReminder(v);
                }}
                trackColor={{ false: p.divider, true: p.accent }}
                thumbColor={reminderOn ? p.buttonPrimaryText : p.textMuted}
                ios_backgroundColor={p.divider}
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
                  borderRadius: 100,
                  backgroundColor: p.accentSoft,
                }}
              >
                <Clock size={18} color={p.accent} />
                <Text style={{ fontFamily: "Outfit-Regular", color: p.accent }}>
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
              fontFamily: "Outfit-Bold",
              fontSize: 11,
              color: p.textMuted,
              marginBottom: 12,
              letterSpacing: 2,
              textTransform: "uppercase",
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
                  borderBottomColor: p.divider,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Outfit-Bold", color: p.textPrimary }}>{s.exercise_name}</Text>
                  <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textSecondary, marginTop: 2 }}>
                    {s.date_iso} - {s.weight_kg} kg
                    {s.reps != null ? ` - ${s.reps} reps` : ""}
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
                  <Trash2 size={20} color={p.textMuted} />
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
                  borderBottomColor: p.divider,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 22, color: p.textPrimary }}>
                    {w.weight_kg} <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular" }}>kg</Text>
                  </Text>
                  <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textSecondary }}>{w.date_iso}</Text>
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
                  <Trash2 size={20} color={p.textMuted} />
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
                  borderBottomColor: p.divider,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Outfit-Bold", color: p.textPrimary }}>{m.label}</Text>
                  <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textSecondary, marginTop: 2 }}>
                    {m.date_iso} - {m.value_cm} cm
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
                  <Trash2 size={20} color={p.textMuted} />
                </Pressable>
              </View>
            ))}

          {((tab === "strength" && strength.length === 0) ||
            (tab === "weight" && weights.length === 0) ||
            (tab === "measure" && measures.length === 0)) && (
            <Text style={{ fontFamily: "Outfit-Regular", color: p.textMuted, textAlign: "center", marginTop: 24 }}>
              No entries yet — tap Add below
            </Text>
          )}
        </ScrollView>
        </KeyboardAvoidingView>

        <Pressable
          onPress={openAdd}
          style={{
            position: "absolute",
            left: 20,
            right: 20,
            bottom: insets.bottom + 16,
            height: 54,
            borderRadius: 100,
            backgroundColor: p.accent,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
          }}
        >
          <PlusCircle size={22} color={p.buttonPrimaryText} />
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: p.buttonPrimaryText }}>Add entry</Text>
        </Pressable>

        <AdaptiveSheet
          visible={modalOpen}
          variant="bottom"
          onClose={() => {
            Keyboard.dismiss();
            setModalOpen(false);
          }}
          cardStyle={{ backgroundColor: p.pageBg }}
        >
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  showsVerticalScrollIndicator
                  nestedScrollEnabled
                  contentContainerStyle={{ paddingBottom: 28 }}
                >
                  <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: p.divider, alignSelf: "center", marginBottom: 16 }} />
                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 20, color: p.textPrimary, marginBottom: 16 }}>
                    {tab === "strength" ? "Log lift" : tab === "weight" ? "Body weight" : "Measurement"}
                  </Text>

                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: p.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1.4 }}>DATE</Text>
                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      setShowEntryDatePick((v) => !v);
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderRadius: 16,
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                      marginBottom: showEntryDatePick && Platform.OS === "ios" ? 8 : 14,
                      backgroundColor: p.inputBg,
                    }}
                  >
                    <Text style={{ fontFamily: "Outfit-Regular", fontSize: 16, color: p.textPrimary }}>
                      {formatIsoToDisplay(dateIso)}
                    </Text>
                    <Calendar size={22} color={p.accent} />
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
                          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: p.accent }}>Done</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}

            {tab === "strength" ? (
              <>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: p.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1.4 }}>EXERCISE</Text>
                <TextInput
                  value={exName}
                  onChangeText={setExName}
                  placeholder="e.g. Back squat"
                  placeholderTextColor={p.textMuted}
                  style={{
                    borderRadius: 16,
                    padding: 12,
                    color: p.textPrimary,
                    marginBottom: 12,
                    backgroundColor: p.inputBg,
                    fontFamily: "Outfit-Regular",
                  }}
                />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: p.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1.4 }}>KG</Text>
                    <TextInput
                      keyboardType="decimal-pad"
                      value={liftKg}
                      onChangeText={setLiftKg}
                      placeholder="80"
                      placeholderTextColor={p.textMuted}
                      style={{
                        borderRadius: 16,
                        padding: 12,
                        color: p.textPrimary,
                        backgroundColor: p.inputBg,
                        fontFamily: "Outfit-Regular",
                      }}
                    />
                  </View>
                  <View style={{ width: 72 }}>
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: p.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1.4 }}>REPS</Text>
                    <TextInput
                      keyboardType="number-pad"
                      value={reps}
                      onChangeText={setReps}
                      placeholder="5"
                      placeholderTextColor={p.textMuted}
                      style={{
                        borderRadius: 16,
                        padding: 12,
                        color: p.textPrimary,
                        backgroundColor: p.inputBg,
                        fontFamily: "Outfit-Regular",
                      }}
                    />
                  </View>
                  <View style={{ width: 72 }}>
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: p.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1.4 }}>SETS</Text>
                    <TextInput
                      keyboardType="number-pad"
                      value={sets}
                      onChangeText={setSets}
                      placeholder="3"
                      placeholderTextColor={p.textMuted}
                      style={{
                        borderRadius: 16,
                        padding: 12,
                        color: p.textPrimary,
                        backgroundColor: p.inputBg,
                        fontFamily: "Outfit-Regular",
                      }}
                    />
                  </View>
                </View>
              </>
            ) : null}

            {tab === "weight" ? (
              <>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: p.textMuted, marginBottom: 6, marginTop: 4, textTransform: "uppercase", letterSpacing: 1.4 }}>WEIGHT (KG)</Text>
                <TextInput
                  keyboardType="decimal-pad"
                  value={bwKg}
                  onChangeText={setBwKg}
                  placeholder="72.5"
                  placeholderTextColor={p.textMuted}
                  style={{
                    borderRadius: 16,
                    padding: 12,
                    color: p.textPrimary,
                    backgroundColor: p.inputBg,
                    fontFamily: "Outfit-Regular",
                  }}
                />
              </>
            ) : null}

            {tab === "measure" ? (
              <>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: p.textMuted, marginBottom: 8, marginTop: 4, textTransform: "uppercase", letterSpacing: 1.4 }}>AREA</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
                  {MEASURE_PRESETS.map((preset) => (
                    <Pressable
                      key={preset.kind}
                      onPress={() => {
                        setMeasKind(preset.kind);
                        if (preset.kind !== "other") setMeasLabel("");
                      }}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 100,
                        backgroundColor: measKind === preset.kind ? p.accent : p.inputBg,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Outfit-Regular",
                          fontSize: 13,
                          color: measKind === preset.kind ? p.buttonPrimaryText : p.textPrimary,
                        }}
                      >
                        {preset.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {measKind === "other" ? (
                  <TextInput
                    value={measLabel}
                    onChangeText={setMeasLabel}
                    placeholder="Label"
                    placeholderTextColor={p.textMuted}
                    style={{
                      borderRadius: 16,
                      padding: 12,
                      color: p.textPrimary,
                      marginBottom: 12,
                      backgroundColor: p.inputBg,
                      fontFamily: "Outfit-Regular",
                    }}
                  />
                ) : null}
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: p.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1.4 }}>CM</Text>
                <TextInput
                  keyboardType="decimal-pad"
                  value={measCm}
                  onChangeText={setMeasCm}
                  placeholder="82"
                  placeholderTextColor={p.textMuted}
                  style={{
                    borderRadius: 16,
                    padding: 12,
                    color: p.textPrimary,
                    backgroundColor: p.inputBg,
                    fontFamily: "Outfit-Regular",
                  }}
                />
              </>
            ) : null}

            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: p.textMuted, marginBottom: 6, marginTop: 12, textTransform: "uppercase", letterSpacing: 1.4 }}>NOTES (OPTIONAL)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="How it felt..."
              placeholderTextColor={p.textMuted}
              multiline
              style={{
                borderRadius: 16,
                padding: 12,
                color: p.textPrimary,
                minHeight: 72,
                textAlignVertical: "top",
                backgroundColor: p.inputBg,
                fontFamily: "Outfit-Regular",
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
                  borderRadius: 100,
                  backgroundColor: p.inputBg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontFamily: "Outfit-Bold", color: p.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  saveEntry();
                }}
                style={{
                  flex: 1,
                  height: 50,
                  borderRadius: 100,
                  backgroundColor: p.accent,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontFamily: "Outfit-Bold", color: p.buttonPrimaryText }}>Save</Text>
              </Pressable>
            </View>
                </ScrollView>
        </AdaptiveSheet>
      </View>
    </SafeAreaView>
  );
}
