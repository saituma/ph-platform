import React, { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, Switch, View, ScrollView } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Bell, Clock, Moon, Sun, Sunrise } from "lucide-react-native";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useRouter } from "expo-router";
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

export default function MealRemindersScreen() {
  const p = useAdminPastel();
  const { isDark } = useAppTheme();
  const router = useRouter();
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

  const toggle = useCallback(
    async (slot: MealSlot, value: boolean) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (value) {
        const granted = await requestMealNotificationPermission();
        if (!granted) {
          toast.info(
            "Notifications off",
            "Enable notifications in system settings to receive meal reminders.",
          );
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
    },
    [prefs],
  );

  const onTimeChange = useCallback(
    async (slot: MealSlot, date: Date | undefined) => {
      if (Platform.OS === "android") setTimePicker(null);
      if (!date) return;
      const next: MealReminderPrefs = {
        ...prefs[slot],
        hour: date.getHours(),
        minute: date.getMinutes(),
      };
      setPrefs((prev) => ({ ...prev, [slot]: next }));
      await setMealReminderPrefs(slot, next);
      if (next.enabled) {
        await scheduleMealReminder(slot, next);
      }
    },
    [prefs],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }} edges={["top"]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 16,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 100,
            backgroundColor: p.cardWhite,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <ArrowLeft size={20} color={p.textPrimary} />
        </Pressable>
        <Text
          style={{
            flex: 1,
            fontFamily: "Outfit-Bold",
            fontSize: 22,
            color: p.textPrimary,
          }}
        >
          Meal Reminders
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      >
        <View
          style={{
            backgroundColor: p.cardWhite,
            borderRadius: 22,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 12,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                backgroundColor: p.accentSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bell size={18} color={p.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: "Outfit-Bold",
                  fontSize: 16,
                  color: p.textPrimary,
                }}
              >
                Daily reminders
              </Text>
              <Text
                style={{
                  fontFamily: "Outfit-Regular",
                  fontSize: 12,
                  color: p.textMuted,
                  marginTop: 1,
                }}
              >
                Local alerts — fires even when app is closed
              </Text>
            </View>
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: p.divider,
              marginHorizontal: 16,
            }}
          />

          {MEAL_ROWS.map((row, idx) => {
            const pref = prefs[row.slot];
            const timeDate = new Date();
            timeDate.setHours(pref.hour, pref.minute, 0, 0);
            const timeLabel = timeDate.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            const IconComp = MEAL_ICONS[row.slot];

            return (
              <View key={row.slot}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 12,
                    paddingVertical: 14,
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: pref.enabled ? p.accentSoft : p.inputBg,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconComp
                      size={20}
                      color={pref.enabled ? p.accent : p.textMuted}
                    />
                  </View>

                  <View style={{ flex: 1, gap: 3 }}>
                    <Text
                      style={{
                        fontFamily: "Outfit-Bold",
                        fontSize: 15,
                        color: p.textPrimary,
                      }}
                    >
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
                        <Text
                          style={{
                            fontFamily: "Outfit-Regular",
                            fontSize: 13,
                            color: p.accent,
                          }}
                        >
                          {timeLabel}
                        </Text>
                      </Pressable>
                    ) : (
                      <Text
                        style={{
                          fontFamily: "Outfit-Regular",
                          fontSize: 13,
                          color: p.textMuted,
                        }}
                      >
                        Off
                      </Text>
                    )}
                  </View>

                  <Switch
                    value={pref.enabled}
                    onValueChange={(v) => void toggle(row.slot, v)}
                    trackColor={{ false: p.divider, true: p.accent }}
                    thumbColor={
                      pref.enabled ? p.buttonPrimaryText : p.textMuted
                    }
                    ios_backgroundColor={p.divider}
                  />
                </View>

                {timePicker === row.slot && (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                    <DateTimePicker
                      value={timeDate}
                      mode="time"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      {...(Platform.OS === "ios"
                        ? { themeVariant: isDark ? "dark" : "light" }
                        : {})}
                      onChange={(_, date) =>
                        void onTimeChange(row.slot, date)
                      }
                    />
                    {Platform.OS === "ios" ? (
                      <Pressable
                        onPress={() => setTimePicker(null)}
                        style={{
                          alignSelf: "flex-end",
                          paddingVertical: 8,
                          paddingHorizontal: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Outfit-Bold",
                            fontSize: 15,
                            color: p.accent,
                          }}
                        >
                          Done
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                )}

                {idx < MEAL_ROWS.length - 1 && (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: p.divider,
                      marginHorizontal: 12,
                    }}
                  />
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
