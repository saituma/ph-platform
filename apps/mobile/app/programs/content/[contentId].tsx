import React, { useEffect, useState, useCallback } from "react";
import { ActivityIndicator, Linking, Pressable, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { VideoPlayer, isYoutubeUrl, YouTubeEmbed } from "@/components/media/VideoPlayer";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
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

type ContentItem = {
  title: string;
  body: string;
  videoUrl?: string | null;
  metadata?: ExerciseMetadata | null;
};

// Detect external video hosting
function isExternalVideoUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes("youtube.com") ||
    lower.includes("youtu.be") ||
    lower.includes("vimeo.com") ||
    lower.includes("loom.com") ||
    lower.includes("streamable.com") ||
    lower.includes("drive.google.com")
  );
}

function isGoogleDriveUrl(url: string): boolean {
  return url.toLowerCase().includes("drive.google.com");
}

function ExternalLinkButton({ url, label }: { url: string; label: string }) {
  const { isDark } = useAppTheme();
  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(url).catch(() => undefined)}
      className="rounded-2xl bg-white/10 px-5 py-4 flex-row items-center gap-3"
      style={isDark ? Shadows.none : Shadows.sm}
    >
      <Feather name="external-link" size={18} color="#FFFFFF" />
      <View className="flex-1">
        <Text className="text-sm font-outfit text-white font-semibold">{label}</Text>
        <Text className="text-[11px] font-outfit text-white/80 mt-0.5" numberOfLines={1}>{url}</Text>
      </View>
      <Feather name="chevron-right" size={16} color="#94A3B8" />
    </TouchableOpacity>
  );
}

function MediaSection({ url, title }: { url: string; title?: string }) {
  if (isYoutubeUrl(url)) {
    return <YouTubeEmbed url={url} />;
  }

  if (isGoogleDriveUrl(url)) {
    return <ExternalLinkButton url={url} label="Open in Google Drive" />;
  }

  if (isExternalVideoUrl(url)) {
    const lower = url.toLowerCase();
    let label = "Open Video";
    if (lower.includes("vimeo.com")) label = "Open in Vimeo";
    else if (lower.includes("loom.com")) label = "Open in Loom";
    else if (lower.includes("streamable.com")) label = "Open in Streamable";
    return <ExternalLinkButton url={url} label={label} />;
  }

  return (
    <View className="rounded-3xl overflow-hidden bg-white/5">
      <VideoPlayer uri={url} title={title} />
    </View>
  );
}

export default function ProgramContentDetailScreen() {
  const { contentId } = useLocalSearchParams<{ contentId: string }>();
  const router = useRouter();
  const { token, programTier } = useAppSelector((state) => state.user);
  const { isDark, colors } = useAppTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState<ContentItem | null>(null);
  const load = useCallback(async () => {
    if (!token || !contentId) {
      setIsLoading(false);
      setError("Content not available.");
      return;
    }
    try {
      setIsLoading(true);
      const data = await apiRequest<{ item?: any }>(`/program-section-content/${contentId}`, { token });
      if (!data.item) {
        setItem(null);
        setError("Content not found.");
        return;
      }
      setItem({
        title: data.item.title ?? "Program Content",
        body: data.item.body ?? "",
        videoUrl: data.item.videoUrl ?? null,
        metadata: data.item.metadata ?? null,
      });
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load content.");
    } finally {
      setIsLoading(false);
    }
  }, [contentId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const meta = (item?.metadata ?? {}) as ExerciseMetadata;
  const hasExercise = !!(meta.sets || meta.reps || meta.duration || meta.restSeconds);

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <ThemedScrollView onRefresh={load} contentContainerStyle={{ paddingBottom: 40 }}>
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
            <View className="rounded-3xl bg-[#2F8F57] px-6 py-6 items-center" style={isDark ? Shadows.none : Shadows.sm}>
              <ActivityIndicator color="#FFFFFF" />
              <Text className="text-sm font-outfit text-white mt-2">Loading content...</Text>
            </View>
          ) : error ? (
            <View className="rounded-3xl bg-[#2F8F57] px-6 py-6" style={isDark ? Shadows.none : Shadows.sm}>
              <Text className="text-sm font-outfit text-white text-center">{error}</Text>
            </View>
          ) : item ? (
            <View className="gap-4">
              {/* Main content card */}
              <View className="rounded-3xl bg-[#2F8F57] px-6 py-6 gap-4" style={isDark ? Shadows.none : Shadows.sm}>
                <Text className="text-2xl font-clash text-white font-bold">{item.title}</Text>

                {/* Exercise metadata badges */}
                {hasExercise && (
                  <View className="flex-row flex-wrap gap-2">
                    {meta.sets != null && (
                      <View className="rounded-full bg-white/15 px-3 py-1.5">
                        <Text className="text-[11px] font-outfit text-white">{meta.sets} sets</Text>
                      </View>
                    )}
                    {meta.reps != null && (
                      <View className="rounded-full bg-white/15 px-3 py-1.5">
                        <Text className="text-[11px] font-outfit text-white">{meta.reps} reps</Text>
                      </View>
                    )}
                    {meta.duration != null && (
                      <View className="rounded-full bg-white/15 px-3 py-1.5">
                        <Text className="text-[11px] font-outfit text-white">{meta.duration}s duration</Text>
                      </View>
                    )}
                    {meta.restSeconds != null && (
                      <View className="rounded-full bg-white/15 px-3 py-1.5">
                        <Text className="text-[11px] font-outfit text-white">{meta.restSeconds}s rest</Text>
                      </View>
                    )}
                    {meta.category && (
                      <View className="rounded-full bg-white/25 px-3 py-1.5">
                        <Text className="text-[11px] font-outfit text-white font-semibold">{meta.category}</Text>
                      </View>
                    )}
                    {meta.equipment && (
                      <View className="rounded-full bg-white/15 px-3 py-1.5">
                        <Text className="text-[11px] font-outfit text-white">🏋️ {meta.equipment}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Body content */}
                {item.body ? (
                  <MarkdownText
                    text={item.body}
                    baseStyle={{ fontSize: 15, lineHeight: 24, color: "#FFFFFF" }}
                    headingStyle={{ fontSize: 18, lineHeight: 26, color: "#FFFFFF", fontWeight: "700" }}
                    subheadingStyle={{ fontSize: 16, lineHeight: 24, color: "#FFFFFF", fontWeight: "700" }}
                    listItemStyle={{ paddingLeft: 6 }}
                  />
                ) : null}
              </View>

              {/* Coaching Cues */}
              {meta.cues ? (
                <View className="rounded-3xl bg-[#2F8F57] px-6 py-5 gap-3" style={isDark ? Shadows.none : Shadows.sm}>
                  <View className="flex-row items-center gap-2">
                    <View className="h-8 w-8 rounded-full bg-white/20 items-center justify-center">
                      <Feather name="message-circle" size={14} color="#FFFFFF" />
                    </View>
                    <Text className="text-[12px] font-outfit text-white uppercase tracking-[2px] font-bold">
                      Coaching Cues
                    </Text>
                  </View>
                  <Text className="text-[15px] font-outfit text-white leading-[24px]">{meta.cues}</Text>
                </View>
              ) : null}

              {/* Progression / Regression */}
              {(meta.progression || meta.regression) ? (
                <View className="flex-row gap-4">
                  {meta.progression ? (
                    <View className="flex-1 rounded-3xl bg-[#22C55E] px-5 py-5 gap-3" style={isDark ? Shadows.none : Shadows.sm}>
                      <View className="flex-row items-center gap-2">
                        <View className="h-8 w-8 rounded-full bg-white/30 items-center justify-center">
                          <Feather name="trending-up" size={14} color="#FFFFFF" />
                        </View>
                        <Text className="text-[11px] font-outfit text-white uppercase tracking-[1.5px] font-bold">
                          Progression
                        </Text>
                      </View>
                      <Text className="text-[14px] font-outfit text-white leading-relaxed">{meta.progression}</Text>
                    </View>
                  ) : null}
                  {meta.regression ? (
                     <View className="flex-1 rounded-3xl bg-[#F97316] px-5 py-5 gap-3" style={isDark ? Shadows.none : Shadows.sm}>
                       <View className="flex-row items-center gap-2">
                         <View className="h-8 w-8 rounded-full bg-white/30 items-center justify-center">
                           <Feather name="trending-down" size={14} color="#FFFFFF" />
                         </View>
                         <Text className="text-[11px] font-outfit text-white uppercase tracking-[1.5px] font-bold">
                           Regression
                         </Text>
                       </View>
                       <Text className="text-[14px] font-outfit text-white leading-relaxed">{meta.regression}</Text>
                     </View>
                   ) : null}
                 </View>
               ) : null}
 
               {/* Media */}
               {item.videoUrl ? (
                 <View className="mt-1">
                   <MediaSection url={item.videoUrl} title={item.title} />
                 </View>
               ) : null}


             </View>
           ) : null}
         </View>
       </ThemedScrollView>
     </SafeAreaView>
   );
 }
