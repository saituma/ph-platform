import { NutritionDashboard } from "@/components/nutrition/NutritionDashboard";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, Switch, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Text } from "@/components/ScaledText";
import { Bell, Clock, Lock, Moon, Sun, Sunrise } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import {
  type MealSlot,
  type MealReminderPrefs,
  getAllMealReminderPrefs,
  setMealReminderPrefs,
  scheduleMealReminder,
  cancelMealReminder,
  requestMealNotificationPermission,
} from "@/lib/nutritionMealReminders";
import { useAppToast } from "@/hooks/useAppToast";

const MEAL_ICONS: Record<MealSlot, React.FC<any>> = {
  breakfast: Sunrise,
  lunch: Sun,
  dinner: Moon,
};

const MEAL_ROWS: { slot: MealSlot; label: string }[] = [
  { slot: "breakfast", label: "Breakfast" },
  { slot: "lunch", label: "Lunch" },
  { slot: "dinner", label: "Dinner" },
];

type AllPrefs = Record<MealSlot, MealReminderPrefs>;

function MealRemindersCard() {
  const p = useAdminPastel();
  const { isDark } = useAppTheme();
  const toast = useAppToast();
  const [prefs, setPrefs] = useState<AllPrefs>({
    breakfast: { enabled: false, hour: 8, minute: 0 },
    lunch: { enabled: false, hour: 12, minute: 30 },
    dinner: { enabled: false, hour: 18, minute: 30 },
  });
  const [timePicker, setTimePicker] = useState<MealSlot | null>(null);

  useEffect(() => {
    void getAllMealReminderPrefs().then(setPrefs);
  }, []);

  const toggle = useCallback(async (slot: MealSlot, value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (value) {
      const granted = await requestMealNotificationPermission();
      if (!granted) {
        toast.info("Notifications off", "Enable notifications in system settings to receive meal reminders.");
        return;
      }
    }
    const next: MealReminderPrefs = { ...prefs[slot], enabled: value };
    setPrefs((prev) => ({ ...prev, [slot]: next }));
    await setMealReminderPrefs(slot, next);
    if (value) {
      await scheduleMealReminder(slot, next);
    } else {
      await cancelMealReminder(slot);
    }
  }, [prefs]);

  const onTimeChange = useCallback(async (slot: MealSlot, date: Date | undefined) => {
    if (Platform.OS === "android") setTimePicker(null);
    if (!date) return;
    const next: MealReminderPrefs = { ...prefs[slot], hour: date.getHours(), minute: date.getMinutes() };
    setPrefs((prev) => ({ ...prev, [slot]: next }));
    await setMealReminderPrefs(slot, next);
    if (next.enabled) {
      await scheduleMealReminder(slot, next);
    }
  }, [prefs]);

  return (
    <View
      style={{
        backgroundColor: p.cardWhite,
        borderRadius: 22,
        marginBottom: 16,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 10,
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
          <Bell size={16} color={p.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.textPrimary }}>
            Meal reminders
          </Text>
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textMuted, marginTop: 1 }}>
            Daily local alerts — fires even when app is closed
          </Text>
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: p.divider, marginHorizontal: 16 }} />

      {MEAL_ROWS.map((row, idx) => {
        const pref = prefs[row.slot];
        const timeDate = new Date();
        timeDate.setHours(pref.hour, pref.minute, 0, 0);
        const timeLabel = timeDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const IconComp = MEAL_ICONS[row.slot];

        return (
          <View key={row.slot}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                paddingVertical: 12,
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: pref.enabled ? p.accentSoft : p.inputBg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconComp
                  size={19}
                  color={pref.enabled ? p.accent : p.textMuted}
                />
              </View>

              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.textPrimary }}>
                  {row.label}
                </Text>
                {pref.enabled ? (
                  <Pressable
                    onPress={() => setTimePicker(row.slot)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      alignSelf: "flex-start",
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Clock size={13} color={p.accent} />
                    <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.accent }}>
                      {timeLabel}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textMuted }}>
                    Off
                  </Text>
                )}
              </View>

              <Switch
                value={pref.enabled}
                onValueChange={(v) => void toggle(row.slot, v)}
                trackColor={{
                  false: p.divider,
                  true: p.accent,
                }}
                thumbColor={pref.enabled ? p.buttonPrimaryText : p.textMuted}
                ios_backgroundColor={p.divider}
              />
            </View>

            {timePicker === row.slot && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                <DateTimePicker
                  value={timeDate}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  {...(Platform.OS === "ios" ? { themeVariant: isDark ? "dark" : "light" } : {})}
                  onChange={(_, date) => void onTimeChange(row.slot, date)}
                />
                {Platform.OS === "ios" ? (
                  <Pressable
                    onPress={() => setTimePicker(null)}
                    style={{ alignSelf: "flex-end", paddingVertical: 8, paddingHorizontal: 4 }}
                  >
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 15, color: p.accent }}>
                      Done
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            )}

            {idx < MEAL_ROWS.length - 1 && (
              <View style={{ height: 1, backgroundColor: p.divider, marginHorizontal: 12 }} />
            )}
          </View>
        );
      })}
    </View>
  );
}

export default function NutritionScreen() {
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const p = useAdminPastel();
  const { capabilities } = useAppSelector((state) => state.user);
  const canLog = Boolean(capabilities?.nutrition);

  if (!canLog) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              backgroundColor: p.accentSoft,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Lock size={24} color={p.accent} />
          </View>
          <Text style={{ fontSize: 24, fontFamily: "Outfit-Bold", color: p.textPrimary, textAlign: "center", marginBottom: 12 }}>
            Nutrition Tracking
          </Text>
          <Text style={{ fontSize: 15, fontFamily: "Outfit-Regular", color: p.textSecondary, textAlign: "center", maxWidth: 280, lineHeight: 22 }}>
            This section isn't available for your account yet.
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/programs")}
            style={({ pressed }) => ({
              marginTop: 32,
              borderRadius: 100,
              paddingHorizontal: 32,
              paddingVertical: 14,
              backgroundColor: p.accent,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ fontSize: 14, fontFamily: "Outfit-Bold", color: p.buttonPrimaryText }}>
              Open Programs
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }} edges={["top"]}>
      <NutritionDashboard />
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 12) }}>
        {/* Meal reminders accessible from a collapsible section at bottom */}
      </View>
    </SafeAreaView>
  );
}
