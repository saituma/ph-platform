import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ProgramPanelStatusBadge } from "@/components/programs/panels/shared/ProgramPanelStatusBadge";

type Entry = {
  id: number;
  date?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
  meals?: Record<string, string> | null;
  feedback?: string | null;
  reviewedAt?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "Today";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Today";
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function formatMeals(mealData?: Record<string, string> | null) {
  if (!mealData) return [];
  return Object.entries(mealData)
    .filter(([, value]) => value && value.trim())
    .map(([key, value]) => ({
      label: key.replace(/^\w/, (c) => c.toUpperCase()),
      value,
    }));
}

export default function FoodDiaryEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAppSelector((state) => state.user);
  const { colors, isDark } = useAppTheme();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEntry = useCallback(async () => {
    if (!token || !id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest<{ items: any[] }>("/food-diary", { token, suppressLog: true });
      const items = data.items ?? [];
      const found = items.find((item) => String(item.id) === String(id));
      setEntry(found ?? null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load entry.");
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    void loadEntry();
  }, [loadEntry]);

  const meals = entry ? formatMeals(entry.meals) : [];

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <View className="flex-row items-center border-b px-4 py-3" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)" }}>
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2 -ml-2">
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-app flex-1">Food diary entry</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center p-6">
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-app text-center">{error}</Text>
        </View>
      ) : !entry ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-app text-center">Entry not found.</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View className="flex-row items-center justify-between gap-3 mb-4">
            <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.4px]">
              {formatDate(entry.date)}
            </Text>
            <ProgramPanelStatusBadge
              label={entry.reviewedAt ? "Reviewed" : "Awaiting review"}
              variant={entry.reviewedAt ? "success" : "default"}
            />
          </View>

          {meals.length > 0 ? (
            <View className="mb-4 gap-3">
              <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.2px] text-secondary">
                Meals
              </Text>
              {meals.map((meal) => (
                <View
                  key={meal.label}
                  className="rounded-2xl border p-4"
                  style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)" }}
                >
                  <Text className="text-[10px] font-outfit text-secondary uppercase tracking-[1.2px]">
                    {meal.label}
                  </Text>
                  <Text className="text-sm font-outfit text-app mt-1">{meal.value}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {entry.notes ? (
            <View className="mb-4">
              <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.2px] text-secondary mb-2">
                Notes
              </Text>
              <Text className="text-sm font-outfit text-app">{entry.notes}</Text>
            </View>
          ) : null}

          {entry.photoUrl ? (
            <View className="mb-4">
              <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.2px] text-secondary mb-2">
                Photo
              </Text>
              <Image
                source={{ uri: entry.photoUrl }}
                className="w-full rounded-2xl"
                style={{ aspectRatio: 4 / 3 }}
                resizeMode="cover"
              />
            </View>
          ) : null}

          {entry.feedback ? (
            <View
              className="rounded-2xl border px-4 py-3"
              style={{ borderColor: "rgba(52, 211, 153, 0.3)", backgroundColor: "rgba(16, 185, 129, 0.1)" }}
            >
              <Text className="text-[10px] font-outfit text-emerald-300 uppercase tracking-[1.2px]">
                Coach response
              </Text>
              <Text className="text-sm font-outfit text-app mt-1">{entry.feedback}</Text>
              {entry.reviewedAt ? (
                <Text className="text-xs font-outfit text-secondary mt-2">
                  {new Date(entry.reviewedAt).toLocaleString()}
                </Text>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
