import React, { useCallback, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Moon, Clock, Star, FileText, Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { fonts } from "@/constants/theme";
import type { SleepLogInput } from "./useSleepData";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function timeToMinutes(h: number, m: number): number {
  return h * 60 + m;
}

function calcSleepMinutes(bedH: number, bedM: number, wakeH: number, wakeM: number): number {
  const bed = timeToMinutes(bedH, bedM);
  const wake = timeToMinutes(wakeH, wakeM);
  return wake > bed ? wake - bed : 1440 - bed + wake;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

interface SleepLogSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onSave: (input: SleepLogInput) => Promise<void>;
}

export const SleepLogSheet = React.memo(function SleepLogSheet({
  sheetRef,
  onSave,
}: SleepLogSheetProps) {
  const p = useAdminPastel();
  const { isDark } = useAppTheme();

  const [bedTime, setBedTime] = useState(new Date(2000, 0, 1, 22, 30));
  const [wakeTime, setWakeTime] = useState(new Date(2000, 0, 1, 6, 45));
  const [quality, setQuality] = useState(3);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showBedPicker, setShowBedPicker] = useState(false);
  const [showWakePicker, setShowWakePicker] = useState(false);

  const snapPoints = useMemo(() => ["75%"], []);

  const totalMin = calcSleepMinutes(
    bedTime.getHours(),
    bedTime.getMinutes(),
    wakeTime.getHours(),
    wakeTime.getMinutes(),
  );
  const totalHrs = (totalMin / 60).toFixed(1);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await onSave({
        dateKey: todayKey(),
        totalMinutes: totalMin,
        bedTime: `${pad(bedTime.getHours())}:${pad(bedTime.getMinutes())}`,
        wakeTime: `${pad(wakeTime.getHours())}:${pad(wakeTime.getMinutes())}`,
        quality,
        notes: notes.trim() || null,
      });
      sheetRef.current?.dismiss();
    } finally {
      setSaving(false);
    }
  }, [saving, onSave, totalMin, bedTime, wakeTime, quality, notes, sheetRef]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      backgroundStyle={{ backgroundColor: p.cardWhite, borderRadius: 28 }}
      handleIndicatorStyle={{ backgroundColor: p.textMuted, width: 36 }}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView style={styles.container}>
        <Text style={[styles.title, { color: p.textPrimary }]}>Log Sleep</Text>

        {/* Bed Time */}
        <Pressable
          style={[styles.timeRow, { backgroundColor: isDark ? p.inputBg : "#F8FAF7" }]}
          onPress={() => { setShowBedPicker(!showBedPicker); setShowWakePicker(false); }}
        >
          <View style={styles.timeRowLeft}>
            <Moon size={18} color={p.accent} />
            <Text style={[styles.timeLabel, { color: p.textPrimary }]}>Bed Time</Text>
          </View>
          <Text style={[styles.timeValue, { color: p.accent }]}>
            {pad(bedTime.getHours())}:{pad(bedTime.getMinutes())}
          </Text>
        </Pressable>
        {showBedPicker && (
          <DateTimePicker
            value={bedTime}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            {...(Platform.OS === "ios" ? { themeVariant: isDark ? "dark" : "light" } : {})}
            onChange={(_, date) => {
              if (Platform.OS === "android") setShowBedPicker(false);
              if (date) setBedTime(date);
            }}
          />
        )}

        {/* Wake Time */}
        <Pressable
          style={[styles.timeRow, { backgroundColor: isDark ? p.inputBg : "#F8FAF7" }]}
          onPress={() => { setShowWakePicker(!showWakePicker); setShowBedPicker(false); }}
        >
          <View style={styles.timeRowLeft}>
            <Clock size={18} color={p.warning} />
            <Text style={[styles.timeLabel, { color: p.textPrimary }]}>Wake Time</Text>
          </View>
          <Text style={[styles.timeValue, { color: p.warning }]}>
            {pad(wakeTime.getHours())}:{pad(wakeTime.getMinutes())}
          </Text>
        </Pressable>
        {showWakePicker && (
          <DateTimePicker
            value={wakeTime}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            {...(Platform.OS === "ios" ? { themeVariant: isDark ? "dark" : "light" } : {})}
            onChange={(_, date) => {
              if (Platform.OS === "android") setShowWakePicker(false);
              if (date) setWakeTime(date);
            }}
          />
        )}

        {/* Total */}
        <View style={[styles.totalRow, { borderColor: p.divider }]}>
          <Text style={[styles.totalLabel, { color: p.textMuted }]}>Total Sleep</Text>
          <Text style={[styles.totalValue, { color: p.textPrimary }]}>{totalHrs}h</Text>
        </View>

        {/* Quality */}
        <View style={styles.qualitySection}>
          <Text style={[styles.sectionLabel, { color: p.textSecondary }]}>Quality</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setQuality(n);
                }}
                hitSlop={8}
              >
                <Star
                  size={28}
                  color={n <= quality ? p.accent : p.textMuted}
                  fill={n <= quality ? p.accent : "transparent"}
                  strokeWidth={1.5}
                />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Save */}
        <Pressable
          style={[styles.saveBtn, { backgroundColor: p.accent }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Check size={18} color={p.buttonPrimaryText} strokeWidth={3} />
          <Text style={[styles.saveBtnText, { color: p.buttonPrimaryText }]}>
            {saving ? "Saving..." : "Save Sleep Log"}
          </Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
  title: {
    fontFamily: fonts.heading1,
    fontSize: 22,
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  timeRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  timeLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  timeValue: {
    fontFamily: fonts.statNumber,
    fontSize: 18,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  totalLabel: {
    fontFamily: fonts.labelMedium,
    fontSize: 14,
  },
  totalValue: {
    fontFamily: fonts.heroNumber,
    fontSize: 24,
  },
  qualitySection: {
    gap: 8,
    paddingTop: 4,
  },
  sectionLabel: {
    fontFamily: fonts.labelBold,
    fontSize: 13,
    letterSpacing: 0.3,
  },
  starsRow: {
    flexDirection: "row",
    gap: 12,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 100,
    marginTop: 8,
  },
  saveBtnText: {
    fontFamily: fonts.accentBold,
    fontSize: 16,
  },
});
