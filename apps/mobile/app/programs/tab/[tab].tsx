import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { getSessionTypesForTab } from "@/constants/program-details";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";

type ProgramSectionContent = {
  id: number;
  sectionType: string;
  title: string;
  body: string;
  videoUrl?: string | null;
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

  const activeAthleteAge = useMemo(() => {
    if (!managedAthletes.length) return null;
    const selected =
      managedAthletes.find((athlete) => athlete.id === athleteUserId) ??
      managedAthletes[0];
    return selected?.age ?? null;
  }, [managedAthletes, athleteUserId]);

  const [items, setItems] = useState<ProgramSectionContent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <Text className="text-lg text-white">←</Text>
          </Pressable>
          <Text className="text-lg font-clash text-white font-bold">
            {tabName || "Program Section"}
          </Text>
          <View className="w-10" />
        </View>

        {isLoading ? (
          <View className="mt-6 rounded-3xl border border-white/10 bg-white/5 px-4 py-4">
            <Text className="text-sm font-outfit text-white/80">Loading content…</Text>
          </View>
        ) : error ? (
          <View className="mt-6 rounded-3xl border border-white/10 bg-white/5 px-4 py-4">
            <Text className="text-sm font-outfit text-white/80">{error}</Text>
          </View>
        ) : items.length === 0 ? (
          <View className="mt-6 rounded-3xl border border-white/10 bg-white/5 px-4 py-4">
            <Text className="text-sm font-outfit text-white/80">
              No content available for this section yet.
            </Text>
          </View>
        ) : (
          <View className="mt-6 gap-4">
            {items.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/programs/content/${item.id}`)}
                className="rounded-3xl bg-input px-4 py-4 shadow-sm"
              >
                <Text className="text-base font-clash text-app font-bold">
                  {item.title}
                </Text>
                <Text className="text-xs font-outfit text-secondary mt-2">
                  Tap to view details and videos.
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </ThemedScrollView>
  );
}
