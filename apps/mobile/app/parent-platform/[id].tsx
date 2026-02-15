import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { apiRequest } from "@/lib/api";
import { getParentContentCache } from "@/lib/parentContentCache";
import { useAppSelector } from "@/store/hooks";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Image, Linking, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { isYoutubeUrl, VideoPlayer, YouTubeEmbed } from "@/components/media/VideoPlayer";
import * as WebBrowser from "expo-web-browser";

type ParentCourseModule = {
  id: string;
  title: string;
  type: "article" | "video" | "pdf" | "faq";
  content?: string;
  mediaUrl?: string;
  order: number;
  preview?: boolean;
};

type ParentCourseItem = {
  id: number;
  title: string;
  summary: string;
  description?: string | null;
  coverImage?: string | null;
  category?: string | null;
  programTier?: string | null;
  modules: ParentCourseModule[];
  isPreview?: boolean;
};

export default function ParentCourseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const idValue = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { colors } = useAppTheme();
  const { token } = useAppSelector((state) => state.user);
  const cached = Number.isFinite(Number(idValue)) ? getParentContentCache(Number(idValue)) : null;
  const [item, setItem] = useState<ParentCourseItem | null>(cached as ParentCourseItem | null);
  const [isLoading, setIsLoading] = useState(!cached);

  const modules = useMemo(() => {
    return (item?.modules ?? [])
      .map((module, index) => ({
        ...module,
        order: Number.isFinite(module.order) ? module.order : index,
      }))
      .sort((a, b) => a.order - b.order);
  }, [item]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!token || !idValue) return;
      try {
        const data = await Promise.race([
          apiRequest<{ item: ParentCourseItem }>(`/content/parent-courses/${idValue}`, { token }),
          new Promise<{ item: ParentCourseItem }>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 6000)
          ),
        ]);
        if (mounted) setItem(data.item ?? null);
      } catch {
        if (mounted && !item) setItem(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [idValue, token]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    return () => clearTimeout(timeout);
  }, []);

  const openMedia = (url?: string) => {
    if (!url) return;
    Linking.openURL(url).catch(() => undefined);
  };

  const openDocument = async (url?: string) => {
    if (!url) return;
    try {
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
    } catch {
      Linking.openURL(url).catch(() => undefined);
    }
  };

  const isPdfUrl = (url?: string) =>
    typeof url === "string" && /\.pdf(\?|#|$)/i.test(url);
  const isVideoUrl = (url?: string) =>
    typeof url === "string" && /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(url);
  const isImageDataUrl = (url?: string) =>
    typeof url === "string" && url.startsWith("data:image/");

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ThemedScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}>
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)/parent-platform")}
            className="h-10 w-10 items-center justify-center bg-secondary rounded-full"
          >
            <Feather name="arrow-left" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text className="text-xl font-clash text-app font-bold">Parent Course</Text>
          <View className="w-10" />
        </View>

        {isLoading ? (
          <View className="gap-3">
            {[1, 2, 3].map((row) => (
              <View key={row} className="rounded-3xl border border-app/10 bg-input px-4 py-3">
                <View className="h-4 w-40 rounded-full bg-secondary/20" />
                <View className="h-3 w-full rounded-full bg-secondary/20 mt-3" />
                <View className="h-3 w-2/3 rounded-full bg-secondary/20 mt-3" />
              </View>
            ))}
          </View>
        ) : item ? (
          <View className="space-y-6">
            <View className="rounded-[28px] border border-app/10 bg-input px-6 py-5">
              {item.coverImage ? (
                <Image
                  source={{ uri: item.coverImage }}
                  className="h-40 w-full rounded-2xl mb-4"
                  resizeMode="cover"
                />
              ) : null}
              <View className="flex-row flex-wrap items-center gap-2 mb-3">
                {item.category ? (
                  <View className="px-3 py-1 rounded-full bg-secondary/10 border border-app/10">
                    <Text className="text-[11px] font-outfit text-secondary uppercase tracking-[1.2px]">
                      {item.category}
                    </Text>
                  </View>
                ) : null}
                {item.programTier ? (
                  <View className="px-3 py-1 rounded-full bg-accent/15 border border-accent/20">
                    <Text className="text-[11px] font-outfit text-accent uppercase tracking-[1.2px]">
                      {item.programTier.replace("_", " ")}
                    </Text>
                  </View>
                ) : null}
                {item.isPreview ? (
                  <View className="px-3 py-1 rounded-full bg-amber-100 border border-amber-200">
                    <Text className="text-[11px] font-outfit text-amber-900 uppercase tracking-[1.2px]">
                      Preview access
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text className="text-3xl font-clash text-app">{item.title}</Text>
              <Text className="text-base font-outfit text-secondary leading-relaxed mt-3">
                {item.summary}
              </Text>
              {item.description ? (
                <Text className="text-sm font-outfit text-secondary leading-relaxed mt-3">
                  {item.description}
                </Text>
              ) : null}
            </View>

            <View className="space-y-3">
              <Text className="text-lg font-clash text-app">Course Modules</Text>
              {modules.length ? (
                modules.map((module) => (
                  <View key={module.id} className="rounded-[24px] border border-app/10 bg-app px-5 py-4">
                    <View className="flex-row flex-wrap items-center justify-between gap-2">
                      <View className="flex-row items-center gap-2">
                        <View className="h-9 w-9 rounded-2xl bg-secondary/10 items-center justify-center">
                          <Feather name="book" size={16} color={colors.textSecondary} />
                        </View>
                        <View>
                          <Text className="text-base font-outfit text-app font-semibold">{module.title}</Text>
                          <Text className="text-xs font-outfit text-secondary uppercase">
                            {module.type}
                            {module.preview ? " • Preview" : ""}
                          </Text>
                        </View>
                      </View>
                      {(module.type === "pdf" || isPdfUrl(module.mediaUrl)) && module.mediaUrl ? (
                        <TouchableOpacity
                          onPress={() => openDocument(module.mediaUrl)}
                          className="rounded-full bg-accent px-4 py-2"
                        >
                          <Text className="text-white text-xs font-outfit">Open PDF</Text>
                        </TouchableOpacity>
                      ) : module.mediaUrl ? (
                        <TouchableOpacity
                          onPress={() => openMedia(module.mediaUrl)}
                          className="rounded-full bg-accent px-4 py-2"
                        >
                          <Text className="text-white text-xs font-outfit">Open File</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    {(module.type === "video" || isYoutubeUrl(module.mediaUrl) || isVideoUrl(module.mediaUrl)) &&
                    module.mediaUrl ? (
                      <View className="mt-3">
                        {isYoutubeUrl(module.mediaUrl) ? (
                          <YouTubeEmbed url={module.mediaUrl} />
                        ) : isImageDataUrl(module.mediaUrl) ? (
                          <View className="rounded-2xl border border-app/10 bg-input px-4 py-4">
                            <Text className="text-sm font-outfit text-secondary">
                              Video file not detected. Please upload an .mp4 or YouTube link.
                            </Text>
                          </View>
                        ) : (
                          <VideoPlayer uri={module.mediaUrl} title={module.title} />
                        )}
                      </View>
                    ) : null}
                    {module.content ? (
                      <Text className="text-sm font-outfit text-secondary leading-relaxed mt-3">
                        {module.content}
                      </Text>
                    ) : null}
                  </View>
                ))
              ) : (
                <View className="rounded-3xl border border-dashed border-app/20 p-4">
                  <Text className="text-sm font-outfit text-secondary">No modules available.</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View className="rounded-3xl border border-dashed border-app/20 p-4">
            <Text className="text-sm font-outfit text-secondary">Course not found.</Text>
          </View>
        )}
      </ThemedScrollView>
    </SafeAreaView>
  );
}
