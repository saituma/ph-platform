import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { getSessionTypesForTab } from "@/constants/program-details";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Feather } from "@expo/vector-icons";
import { Shadows } from "@/constants/theme";

type ExerciseMetadata = {
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  restSeconds?: number | null;
  cues?: string | null;
  progression?: string | null;
  regression?: string | null;
  category?: string | null;
  equipment?: string | null;
};

type ProgramSectionContent = {
  id: number;
  sectionType: string;
  title: string;
  body: string;
  videoUrl?: string | null;
  metadata?: ExerciseMetadata | null;
  order?: number | null;
  updatedAt?: string | null;
};

export default function ProgramTabDetailScreen() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const tabName = useMemo(() => {
    const raw = Array.isArray(tab) ? tab[0] : tab;
    return raw ? decodeURIComponent(String(raw)) : "";
  }, [tab]);
  const token = useAppSelector((state) => state.user.token);
  const athleteUserId = useAppSelector((state) => state.user.athleteUserId);
  const managedAthletes = useAppSelector((state) => state.user.managedAthletes);
  const { colors, isDark } = useAppTheme();

  const activeAthleteAge = useMemo(() => {
    if (!managedAthletes.length) return null;
    const selected =
      managedAthletes.find(
        (athlete) =>
          athlete.id === athleteUserId || athlete.userId === athleteUserId,
      ) ??
      managedAthletes[0];
    return selected?.age ?? null;
  }, [managedAthletes, athleteUserId]);

  const [items, setItems] = useState<ProgramSectionContent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentAthlete = useMemo(() => {
    if (!managedAthletes.length) return null;
    return managedAthletes.find((athlete) => athlete.id === athleteUserId || athlete.userId === athleteUserId) ?? managedAthletes[0];
  }, [athleteUserId, managedAthletes]);
  const surfaceColor = isDark ? colors.cardElevated : "#F7FFF9";
  const mutedSurface = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.84)";
  const accentSurface = isDark ? "rgba(34,197,94,0.16)" : "rgba(34,197,94,0.10)";
  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  useEffect(() => {
    if (router.canGoBack()) return;
    router.replace("/(tabs)");
  }, [router]);
  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)/programs");
  }, [router]);

  const loadContent = useCallback(async () => {
    if (!token || !tabName) return;
    const types = getSessionTypesForTab(tabName);
    if (types.length === 0) {
      setItems([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const responses = await Promise.all(
        types.map((type) =>
          apiRequest<{ items: ProgramSectionContent[] }>(
            `/program-section-content?sectionType=${encodeURIComponent(
              String(type),
            )}${activeAthleteAge !== null ? `&age=${encodeURIComponent(String(activeAthleteAge))}` : ""}`,
            { token },
          ),
        ),
      );
      const merged = responses
        .flatMap((res) => res.items ?? [])
        .filter((item) => item && item.id);
      merged.sort((a, b) => {
        const orderA = Number.isFinite(a.order) ? (a.order as number) : 9999;
        const orderB = Number.isFinite(b.order) ? (b.order as number) : 9999;
        if (orderA !== orderB) return orderA - orderB;
        return String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""));
      });
      setItems(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load content.");
    } finally {
      setIsLoading(false);
    }
  }, [token, tabName, activeAthleteAge]);

  useEffect(() => {
    void loadContent();
  }, [loadContent]);

  return (
    <ThemedScrollView
      onRefresh={loadContent}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View className="px-6 pt-6">
        <View
          className="overflow-hidden rounded-[30px] border px-5 py-5"
          style={{ backgroundColor: surfaceColor, borderColor: borderSoft, ...(isDark ? Shadows.none : Shadows.md) }}
        >
          <View className="absolute -right-10 -top-8 h-28 w-28 rounded-full" style={{ backgroundColor: accentSurface }} />
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={handleBack}
              className="h-11 w-11 items-center justify-center rounded-[18px]"
              style={{ backgroundColor: mutedSurface }}
            >
              <Feather name="arrow-left" size={20} color={colors.accent} />
            </Pressable>
            <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: mutedSurface }}>
              <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.3px]" style={{ color: colors.accent }}>
                Tab detail
              </Text>
            </View>
          </View>

          <Text className="mt-4 text-[26px] font-telma-bold text-app font-bold">
            {tabName || "Program Section"}
          </Text>
          <View className="mt-4 flex-row flex-wrap gap-2">
            {currentAthlete?.name ? (
              <View className="rounded-full px-3 py-2" style={{ backgroundColor: accentSurface }}>
                <Text className="text-[11px] font-outfit font-semibold" style={{ color: colors.accent }}>
                  Athlete: {currentAthlete.name}
                </Text>
              </View>
            ) : null}
            {currentAthlete?.age ? (
              <View className="rounded-full px-3 py-2" style={{ backgroundColor: mutedSurface }}>
                <Text className="text-[11px] font-outfit font-semibold" style={{ color: colors.text }}>
                  {currentAthlete.age} yrs
                </Text>
              </View>
            ) : null}
            <View className="rounded-full px-3 py-2" style={{ backgroundColor: mutedSurface }}>
              <Text className="text-[11px] font-outfit font-semibold" style={{ color: colors.text }}>
                {items.length} items
              </Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View className="mt-6 rounded-3xl px-4 py-4" style={{ backgroundColor: surfaceColor }}>
            <Text className="text-sm font-outfit text-secondary">Loading content…</Text>
          </View>
        ) : error ? (
          <View className="mt-6 rounded-3xl px-4 py-4" style={{ backgroundColor: surfaceColor }}>
            <Text className="text-sm font-outfit text-secondary">{error}</Text>
          </View>
        ) : items.length === 0 ? (
          <View className="mt-6 rounded-3xl px-4 py-4" style={{ backgroundColor: surfaceColor }}>
            <Text className="text-sm font-outfit text-secondary">
              No content available for this section yet.
            </Text>
          </View>
        ) : (
          <View className="mt-6 gap-4">
            {items.map((item) => {
              const meta = (item.metadata ?? {}) as ExerciseMetadata;
              const hasExercise = !!(meta.sets || meta.reps || meta.duration || meta.restSeconds);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(`/programs/content/${item.id}`)}
                  className="rounded-[28px] px-4 py-4 gap-2"
                  style={{ backgroundColor: surfaceColor, ...(isDark ? Shadows.none : Shadows.sm) }}
                >
                  <Text className="text-base font-clash text-app font-bold">
                    {item.title}
                  </Text>
                  {hasExercise && (
                    <View className="flex-row flex-wrap gap-1.5">
                      {meta.sets != null && (
                        <View className="rounded-full bg-accent/20 px-2.5 py-0.5">
                          <Text className="text-[10px] font-outfit text-accent">{meta.sets} sets</Text>
                        </View>
                      )}
                      {meta.reps != null && (
                        <View className="rounded-full bg-accent/20 px-2.5 py-0.5">
                          <Text className="text-[10px] font-outfit text-accent">{meta.reps} reps</Text>
                        </View>
                      )}
                      {meta.duration != null && (
                        <View className="rounded-full bg-accent/20 px-2.5 py-0.5">
                          <Text className="text-[10px] font-outfit text-accent">{meta.duration}s</Text>
                        </View>
                      )}
                      {meta.restSeconds != null && (
                        <View className="rounded-full bg-accent/20 px-2.5 py-0.5">
                          <Text className="text-[10px] font-outfit text-accent">{meta.restSeconds}s rest</Text>
                        </View>
                      )}
                      {meta.category && (
                        <View className="rounded-full bg-accent/30 px-2.5 py-0.5">
                          <Text className="text-[10px] font-outfit text-accent font-semibold">{meta.category}</Text>
                        </View>
                      )}
                    </View>
                  )}
                  <Text className="text-xs font-outfit text-secondary mt-1">
                    Tap to view details{item.videoUrl ? ' and video' : ''}.
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </ThemedScrollView>
  );
}
