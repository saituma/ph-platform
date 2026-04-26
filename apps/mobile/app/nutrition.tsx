import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { NutritionPanel } from "@/components/programs/panels/NutritionPanel";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Platform, Pressable, Switch, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Text } from "@/components/ScaledText";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/constants/theme";
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

// ─── Meal Reminders Card ──────────────────────────────────────────────────────

const MEAL_ROWS: { slot: MealSlot; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { slot: "breakfast", label: "Breakfast", icon: "sunny-outline" },
  { slot: "lunch", label: "Lunch", icon: "partly-sunny-outline" },
  { slot: "dinner", label: "Dinner", icon: "moon-outline" },
];

type AllPrefs = Record<MealSlot, MealReminderPrefs>;

function MealRemindersCard({ isDark, colors }: { isDark: boolean; colors: Record<string, string> }) {
  const [prefs, setPrefs] = useState<AllPrefs>({
    breakfast: { enabled: false, hour: 8, minute: 0 },
    lunch: { enabled: false, hour: 12, minute: 30 },
    dinner: { enabled: false, hour: 18, minute: 30 },
  });
  const [timePicker, setTimePicker] = useState<MealSlot | null>(null);

  useEffect(() => {
    void getAllMealReminderPrefs().then(setPrefs);
  }, []);

  const cardBg = isDark ? "hsl(220, 8%, 12%)" : "hsl(220, 5%, 98%)";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  const labelColor = isDark ? "hsl(220, 5%, 55%)" : "hsl(220, 5%, 45%)";
  const titleColor = isDark ? "hsl(220, 5%, 92%)" : "hsl(220, 8%, 12%)";
  const subtitleColor = isDark ? "hsl(220, 5%, 52%)" : "hsl(220, 5%, 48%)";
  const iconBgOn = isDark ? "rgba(34,197,94,0.14)" : "rgba(34,197,94,0.12)";
  const iconBgOff = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)";
  const rowDivider = isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.06)";

  const toggle = useCallback(async (slot: MealSlot, value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (value) {
      const granted = await requestMealNotificationPermission();
      if (!granted) {
        Alert.alert(
          "Notifications off",
          "Enable notifications in system settings to receive meal reminders.",
        );
        return;
      }
    }
    const next: MealReminderPrefs = { ...prefs[slot], enabled: value };
    setPrefs((p) => ({ ...p, [slot]: next }));
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
    setPrefs((p) => ({ ...p, [slot]: next }));
    await setMealReminderPrefs(slot, next);
    if (next.enabled) {
      await scheduleMealReminder(slot, next);
    }
  }, [prefs]);

  return (
    <View
      style={{
        backgroundColor: cardBg,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: cardBorder,
        marginBottom: 16,
      }}
    >
      {/* Header */}
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
            backgroundColor: isDark ? "rgba(34,197,94,0.14)" : "rgba(34,197,94,0.12)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="notifications-outline" size={16} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: titleColor }}>
            Meal reminders
          </Text>
          <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 11, color: labelColor, marginTop: 1 }}>
            Daily local alerts — fires even when app is closed
          </Text>
        </View>
      </View>

      {/* Row divider */}
      <View style={{ height: 1, backgroundColor: rowDivider, marginHorizontal: 16 }} />

      {/* Meal rows — outer card radius 20, no padding → row radius 16 */}
      {MEAL_ROWS.map((row, idx) => {
        const p = prefs[row.slot];
        const timeDate = new Date();
        timeDate.setHours(p.hour, p.minute, 0, 0);
        const timeLabel = timeDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

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
              {/* Icon */}
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: p.enabled ? iconBgOn : iconBgOff,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name={row.icon}
                  size={19}
                  color={p.enabled ? colors.accent : (isDark ? "hsl(220,5%,55%)" : "hsl(220,5%,45%)")}
                />
              </View>

              {/* Label + time */}
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: titleColor }}>
                  {row.label}
                </Text>
                {p.enabled ? (
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
                    <Ionicons name="time-outline" size={13} color={colors.accent} />
                    <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.accent }}>
                      {timeLabel}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: subtitleColor }}>
                    Off
                  </Text>
                )}
              </View>

              {/* Toggle */}
              <Switch
                value={p.enabled}
                onValueChange={(v) => void toggle(row.slot, v)}
                trackColor={{
                  false: isDark ? "rgba(255,255,255,0.14)" : "rgba(15,23,42,0.14)",
                  true: colors.accent,
                }}
                thumbColor={p.enabled
                  ? isDark ? "hsl(220,5%,92%)" : "hsl(220,5%,98%)"
                  : isDark ? "hsl(220,5%,75%)" : "hsl(220,5%,96%)"}
                ios_backgroundColor={isDark ? "rgba(255,255,255,0.14)" : "rgba(15,23,42,0.14)"}
              />
            </View>

            {/* Time picker (shown inline under the row) */}
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
                    <Text style={{ fontFamily: fonts.heading3, fontSize: 15, color: colors.accent }}>
                      Done
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            )}

            {idx < MEAL_ROWS.length - 1 && (
              <View style={{ height: 1, backgroundColor: rowDivider, marginHorizontal: 12 }} />
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NutritionScreen() {
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const { appRole, capabilities } = useAppSelector((state) => state.user);
  const canLog = Boolean(capabilities?.nutrition);

  if (!canLog) {
    return (
      <SafeAreaView className="flex-1" edges={["top"]} style={{ backgroundColor: colors.background }}>
        <MoreStackHeader
          title="Nutrition & Wellness"
          subtitle="Log your daily data and metrics."
        />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-2xl font-clash font-bold text-app text-center mb-3">Nutrition logging</Text>
          <Text className="text-base font-outfit text-secondary text-center max-w-[280px]">
            This section isn't available for your account yet.
          </Text>
          <Pressable onPress={() => router.push("/(tabs)/programs")} className="mt-8 rounded-full px-8 py-3 bg-accent">
            <Text className="text-sm font-outfit font-semibold text-white">Open training</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <MoreStackHeader
        title="Nutrition & Wellness"
        subtitle="Log your daily data and metrics."
      />
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 12) + 32,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraHeight={Platform.OS === "ios" ? 120 : 160}
        extraScrollHeight={Platform.OS === "ios" ? 40 : 96}
        keyboardDismissMode="on-drag"
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <MealRemindersCard isDark={isDark} colors={colors} />
        </View>
        <View className="px-4 pt-2">
          <NutritionPanel appRole={appRole} />
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
