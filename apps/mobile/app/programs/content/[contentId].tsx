import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";

export default function ProgramContentDetailScreen() {
  const { contentId } = useLocalSearchParams<{ contentId: string }>();
  const router = useRouter();
  const { token } = useAppSelector((state) => state.user);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState<{ title: string; body: string; videoUrl?: string | null } | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!token || !contentId) {
        if (active) {
          setIsLoading(false);
          setError("Content not available.");
        }
        return;
      }
      try {
        setIsLoading(true);
        const data = await apiRequest<{ item?: any }>(`/program-section-content/${contentId}`, { token });
        if (!active) return;
        if (!data.item) {
          setItem(null);
          setError("Content not found.");
          return;
        }
        setItem({
          title: data.item.title ?? "Program Content",
          body: data.item.body ?? "",
          videoUrl: data.item.videoUrl ?? null,
        });
        setError(null);
      } catch (err: any) {
        if (!active) return;
        setError(err?.message ?? "Failed to load content.");
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [contentId, token]);

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ThemedScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-6 pt-6">
          <View className="flex-row items-center justify-between mb-6">
            <Pressable
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center bg-secondary rounded-full"
            >
              <Feather name="arrow-left" size={20} color="#94A3B8" />
            </Pressable>
            <View className="w-10" />
          </View>

          {isLoading ? (
            <View className="rounded-3xl bg-[#1F6F45] px-6 py-6 shadow-sm items-center">
              <ActivityIndicator color="#2F8F57" />
              <Text className="text-sm font-outfit text-white mt-2">Loading content...</Text>
            </View>
          ) : error ? (
            <View className="rounded-3xl bg-[#1F6F45] px-6 py-6 shadow-sm">
              <Text className="text-sm font-outfit text-white text-center">{error}</Text>
            </View>
          ) : item ? (
            <View className="rounded-3xl bg-[#1F6F45] px-6 py-6 shadow-sm gap-4">
              <Text className="text-2xl font-clash text-white font-bold">{item.title}</Text>
              {item.body ? (
                <MarkdownText
                  text={item.body}
                  baseStyle={{ fontSize: 15, lineHeight: 24, color: "#FFFFFF" }}
                  headingStyle={{ fontSize: 18, lineHeight: 26, color: "#FFFFFF", fontWeight: "700" }}
                  subheadingStyle={{ fontSize: 16, lineHeight: 24, color: "#FFFFFF", fontWeight: "700" }}
                  listItemStyle={{ paddingLeft: 6 }}
                />
              ) : null}
              {item.videoUrl ? (
                <View className="mt-2 rounded-3xl overflow-hidden bg-white/5">
                  <VideoPlayer uri={item.videoUrl} title={item.title} />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </ThemedScrollView>
    </SafeAreaView>
  );
}
