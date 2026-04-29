import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { apiRequest } from "@/lib/api";
import { getParentContentCache } from "@/lib/parentContentCache";
import { useAppSelector } from "@/store/hooks";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Linking, TouchableOpacity, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { isYoutubeUrl, VideoPlayer } from "@/components/media/VideoPlayer";
import * as WebBrowser from "expo-web-browser";
import { Text } from "@/components/ScaledText";
import { useAgeExperience } from "@/context/AgeExperienceContext";
import { AgeGate } from "@/components/AgeGate";

import { MarkdownText } from "@/components/ui/MarkdownText";

function AutoImage({
  uri,
  borderRadius = 0,
  style,
}: {
  uri: string;
  borderRadius?: number;
  style?: object;
}) {
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  return (
    <ExpoImage
      source={{ uri }}
      style={[{ width: "100%", aspectRatio, borderRadius }, style]}
      contentFit="cover"
      onLoad={(e) => {
        const { width, height } = e.source;
        if (width > 0 && height > 0) setAspectRatio(width / height);
      }}
    />
  );
}

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
  const { isSectionHidden } = useAgeExperience();

  const cached = Number.isFinite(Number(idValue))
    ? getParentContentCache(Number(idValue))
    : null;
  const [item, setItem] = useState<ParentCourseItem | null>(
    cached as ParentCourseItem | null,
  );
  const [isLoading, setIsLoading] = useState(!cached);

  const lockedTitle = "Parent platform locked";
  const lockedMessage = "Parent education content is restricted for this age.";

  if (isSectionHidden("parentPlatform")) {
    return <AgeGate title={lockedTitle} message={lockedMessage} />;
  }

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
        const data = await apiRequest<{ item: ParentCourseItem }>(
          `/content/parent-courses/${idValue}`,
          { token },
        );
        if (mounted) {
          setItem(data.item ?? null);
        }
      } catch {
        if (mounted) setItem(null);
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
  const isImageUrl = (url?: string) =>
    typeof url === "string" &&
    (/\.(jpg|jpeg|png|gif|webp|heic|avif|bmp)(\?|#|$)/i.test(url) ||
      url.startsWith("data:image/"));

  const isLocked = false;
  const hasParentProgramAccess = true;

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ThemedScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 40,
        }}
      >
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity
            onPress={() => router.replace("/parent-platform")}
            className="h-10 w-10 items-center justify-center bg-secondary rounded-2xl"
          >
            <Feather name="arrow-left" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text className="text-2xl font-clash text-app font-bold">
            Parent Course
          </Text>
          <View className="w-10" />
        </View>

        {isLoading ? (
          <View className="gap-3">
            {[1, 2, 3].map((row) => (
              <View
                key={row}
                className="rounded-3xl border border-app/10 bg-input px-4 py-3"
              >
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
                <AutoImage uri={item.coverImage} borderRadius={16} style={{ marginBottom: 16 }} />
              ) : null}
              <View className="flex-row flex-wrap items-center gap-2 mb-3">
                {item.category ? (
                  <View className="px-3 py-1 rounded-full bg-secondary/10 border border-app/10">
                    <Text className="text-[10px] font-outfit text-secondary uppercase tracking-[1.2px]">
                      {item.category}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text className="text-3xl font-telma-bold text-app">
                {item.title}
              </Text>
              <Text className="text-base font-outfit text-secondary leading-relaxed mt-3">
                {item.summary}
              </Text>
              {item.description ? (
                <Text className="text-base font-outfit text-secondary leading-relaxed mt-3">
                  {item.description}
                </Text>
              ) : null}
            </View>

            <View className="space-y-3">
              <Text className="text-xl font-clash text-app">
                Course Modules
              </Text>
              {modules.length ? (
                modules.map((module) => (
                  <View
                    key={module.id}
                    className="rounded-[24px] border border-app/10 bg-app px-5 py-4"
                  >
                    <View className="flex-row flex-wrap items-center justify-between gap-2">
                      <View className="flex-row items-center gap-2">
                        <View className="h-9 w-9 rounded-2xl bg-secondary/10 items-center justify-center">
                          <Feather
                            name="book"
                            size={16}
                            color={colors.textSecondary}
                          />
                        </View>
                        <View>
                          <Text className="text-base font-outfit text-app font-semibold">
                            {module.title}
                          </Text>
                          <Text className="text-[10px] font-outfit text-secondary uppercase tracking-[1.2px]">
                            {module.type}
                            {module.preview ? " • Preview" : ""}
                          </Text>
                        </View>
                      </View>
                      {(module.type === "pdf" || isPdfUrl(module.mediaUrl)) &&
                      module.mediaUrl ? (
                        <TouchableOpacity
                          onPress={() => openDocument(module.mediaUrl)}
                          className="rounded-2xl bg-accent px-4 py-2"
                        >
                          <Text className="text-white text-xs font-outfit font-bold">
                            Open PDF
                          </Text>
                        </TouchableOpacity>
                      ) : module.mediaUrl &&
                        !isImageUrl(module.mediaUrl) &&
                        !isVideoUrl(module.mediaUrl) &&
                        !isYoutubeUrl(module.mediaUrl) ? (
                        <TouchableOpacity
                          onPress={() => openMedia(module.mediaUrl)}
                          className="rounded-2xl bg-accent px-4 py-2"
                        >
                          <Text className="text-white text-xs font-outfit font-bold">
                            Open File
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    {(module.type === "video" ||
                      isYoutubeUrl(module.mediaUrl) ||
                      isVideoUrl(module.mediaUrl)) &&
                    module.mediaUrl ? (
                      <View className="mt-3">
                        {isYoutubeUrl(module.mediaUrl) ? (
                          <View className="rounded-3xl overflow-hidden bg-white/5">
                            <VideoPlayer
                              uri={module.mediaUrl}
                              ignoreTabFocus
                            />
                          </View>
                        ) : isImageDataUrl(module.mediaUrl) ? (
                          <View className="rounded-2xl border border-app/10 bg-input px-4 py-4">
                            <Text className="text-sm font-outfit text-secondary">
                              Video file not detected. Please upload an .mp4
                              or YouTube link.
                            </Text>
                          </View>
                        ) : (
                          <VideoPlayer
                            uri={module.mediaUrl}
                            title={module.title}
                            useVideoResolution
                            ignoreTabFocus
                          />
                        )}
                      </View>
                    ) : null}
                    {isImageUrl(module.mediaUrl) ? (
                      <View className="mt-3 rounded-2xl overflow-hidden">
                        <AutoImage uri={module.mediaUrl!} borderRadius={16} />
                      </View>
                    ) : null}
                    {module.content ? (
                      <Text className="text-base font-outfit text-secondary leading-relaxed mt-3">
                        {module.content}
                      </Text>
                    ) : null}
                  </View>
                ))
              ) : (
                <View className="rounded-3xl border border-dashed border-app/20 p-4">
                  <Text className="text-base font-outfit text-secondary">
                    No modules available.
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View className="rounded-3xl border border-dashed border-app/20 p-4">
            <Text className="text-base font-outfit text-secondary">
              Course not found.
            </Text>
          </View>
        )}
      </ThemedScrollView>
    </SafeAreaView>
  );
}
