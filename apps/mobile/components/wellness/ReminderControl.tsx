import React, { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, Switch, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Bell } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import {
  applyWellnessReminder,
  getWellnessReminderPrefs,
  type WellnessReminderKind,
  type WellnessReminderPrefs,
} from "@/lib/wellnessReminders";

function fmtTime(hour: number, minute: number) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Self-contained daily local-reminder control for a wellness screen (wellbeing/sleep). */
export function ReminderControl({ kind }: { kind: WellnessReminderKind }) {
  const p = useAdminPastel();
  const { isDark } = useAppTheme();
  const [prefs, setPrefs] = useState<WellnessReminderPrefs | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    let alive = true;
    void getWellnessReminderPrefs(kind).then((p) => {
      if (alive) setPrefs(p);
    });
    return () => {
      alive = false;
    };
  }, [kind]);

  const update = useCallback(
    async (next: WellnessReminderPrefs) => {
      setPrefs(next);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await applyWellnessReminder(kind, next);
    },
    [kind],
  );

  if (!prefs) return null;

  const timeDate = new Date();
  timeDate.setHours(prefs.hour, prefs.minute, 0, 0);

  return (
    <View style={{ backgroundColor: p.cardWhite, borderRadius: 24, padding: 20, gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: p.accentSoft, alignItems: "center", justifyContent: "center" }}>
          <Bell size={18} color={p.accent} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: p.textPrimary }}>Daily reminder</Text>
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textMuted, marginTop: 1 }}>
            {prefs.enabled ? `Every day at ${fmtTime(prefs.hour, prefs.minute)}` : "Off"}
          </Text>
        </View>
        <Switch
          value={prefs.enabled}
          onValueChange={(enabled) => void update({ ...prefs, enabled })}
          trackColor={{ false: p.divider, true: p.accent }}
          ios_backgroundColor={p.divider}
        />
      </View>

      {prefs.enabled ? (
        <Pressable
          onPress={() => setShowPicker((s) => !s)}
          style={({ pressed }) => ({
            marginTop: 12,
            alignSelf: "flex-start",
            borderRadius: 100,
            backgroundColor: p.accentSoft,
            paddingVertical: 8,
            paddingHorizontal: 16,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.accent }}>
            {fmtTime(prefs.hour, prefs.minute)}
          </Text>
        </Pressable>
      ) : null}

      {prefs.enabled && showPicker ? (
        <View>
          <DateTimePicker
            value={timeDate}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            {...(Platform.OS === "ios" ? { themeVariant: isDark ? "dark" : "light" } : {})}
            onChange={(_, date) => {
              if (Platform.OS !== "ios") setShowPicker(false);
              if (date) void update({ ...prefs, hour: date.getHours(), minute: date.getMinutes() });
            }}
          />
          {Platform.OS === "ios" ? (
            <Pressable onPress={() => setShowPicker(false)} style={{ alignSelf: "flex-end", paddingVertical: 8, paddingHorizontal: 8 }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.accent }}>Done</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
