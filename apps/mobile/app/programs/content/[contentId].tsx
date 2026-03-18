import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Linking, Modal, Pressable, TouchableOpacity, View } from "react-native";
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
import { SafeMaskedView, Transition } from "@/components/navigation/TransitionStack";
import { VideoUploadPanel } from "@/components/programs/ProgramPanels";
import { useRole } from "@/context/RoleContext";
import { canAccessTier } from "@/lib/planAccess";
import { useAgeExperience } from "@/context/AgeExperienceContext";

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
  allowVideoUpload?: boolean | null;
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
      <VideoPlayer uri={url} title={title} useVideoResolution />
    </View>
  );
}

export default function ProgramContentDetailScreen() {
  const { contentId, sharedBoundTag } = useLocalSearchParams<{ contentId: string; sharedBoundTag?: string }>();
  const router = useRouter();
  const { token } = useAppSelector((state) => state.user);
  const { role } = useRole();
  const programTier = useAppSelector((state) => state.user.programTier);
  const { isDark, colors } = useAppTheme();
  const { isSectionHidden } = useAgeExperience();
  const athleteUserId = useAppSelector((state) => state.user.athleteUserId);
  const managedAthletes = useAppSelector((state) => state.user.managedAthletes);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState<ContentItem | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const lastLoadedRef = useRef<string | null>(null);
  const loadingRef = useRef(false);
  const load = useCallback(async (force = false) => {
    if (!token || !contentId) {
      setIsLoading(false);
      setError("Content not available.");
      return;
    }
    const key = `${token}:${contentId}`;
    if (!force && lastLoadedRef.current === key) {
      return;
    }
    if (loadingRef.current) return;
    loadingRef.current = true;
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
        allowVideoUpload: data.item.allowVideoUpload ?? false,
        metadata: data.item.metadata ?? null,
      });
      setError(null);
      lastLoadedRef.current = key;
    } catch (err: any) {
      setError(err?.message ?? "Failed to load content.");
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [contentId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const meta = (item?.metadata ?? {}) as ExerciseMetadata;
  const hasExercise = !!(meta.sets || meta.reps || meta.duration || meta.restSeconds);
  const activeAthlete = useMemo(() => {
    if (!managedAthletes.length) return null;
    return managedAthletes.find((athlete) => athlete.id === athleteUserId || athlete.userId === athleteUserId) ?? managedAthletes[0];
  }, [athleteUserId, managedAthletes]);
  const surfaceColor = isDark ? colors.cardElevated : "#F7FFF9";
  const mutedSurface = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.84)";
  const accentSurface = isDark ? "rgba(34,197,94,0.16)" : "rgba(34,197,94,0.10)";
  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  const canUploadVideos =
    role === "Athlete" &&
    canAccessTier(programTier ?? null, "PHP_Premium") &&
    !isSectionHidden("videoFeedback");
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

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <SafeMaskedView style={{ flex: 1 }}>
        <ThemedScrollView onRefresh={() => load(true)} contentContainerStyle={{ paddingBottom: 40 }}>
          <View className="px-6 pt-6">
            <Transition.View
              sharedBoundTag={sharedBoundTag}
              className="overflow-hidden rounded-[30px] border px-5 py-5 mb-6"
              style={{ backgroundColor: surfaceColor, borderColor: borderSoft, ...(isDark ? Shadows.none : Shadows.md) }}
            >
              <View className="absolute -right-10 -top-8 h-28 w-28 rounded-full" style={{ backgroundColor: accentSurface }} />
              <View className="flex-row items-center justify-between mb-4">
                <Pressable
                  onPress={handleBack}
                  className="h-11 w-11 items-center justify-center rounded-[18px]"
                  style={{ backgroundColor: mutedSurface }}
                >
                  <Feather name="arrow-left" size={20} color={colors.accent} />
                </Pressable>
                <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: mutedSurface }}>
                  <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.3px]" style={{ color: colors.accent }}>
                    Content detail
                  </Text>
                </View>
              </View>

              <Text className="text-[26px] font-telma-bold text-app font-bold">
                {item?.title ?? "Program Content"}
              </Text>
              <View className="mt-4 flex-row flex-wrap gap-2">
                {activeAthlete?.name ? (
                  <View className="rounded-full px-3 py-2" style={{ backgroundColor: accentSurface }}>
                    <Text className="text-[11px] font-outfit font-semibold" style={{ color: colors.accent }}>
                      Athlete: {activeAthlete.name}
                    </Text>
                  </View>
                ) : null}
                {activeAthlete?.age ? (
                  <View className="rounded-full px-3 py-2" style={{ backgroundColor: mutedSurface }}>
                    <Text className="text-[11px] font-outfit font-semibold" style={{ color: colors.text }}>
                      {activeAthlete.age} yrs
                    </Text>
                  </View>
                ) : null}
                {meta.category ? (
                  <View className="rounded-full px-3 py-2" style={{ backgroundColor: mutedSurface }}>
                    <Text className="text-[11px] font-outfit font-semibold" style={{ color: colors.text }}>
                      {meta.category}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Transition.View>

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
              <View className="rounded-[28px] px-6 py-6 gap-4" style={{ backgroundColor: surfaceColor, ...(isDark ? Shadows.none : Shadows.sm) }}>
                <Text className="text-2xl font-clash text-app font-bold">Overview</Text>

                {/* Exercise metadata badges */}
                {hasExercise && (
                  <View className="flex-row flex-wrap gap-2">
                    {meta.sets != null && (
                      <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: accentSurface }}>
                        <Text className="text-[11px] font-outfit" style={{ color: colors.accent }}>{meta.sets} sets</Text>
                      </View>
                    )}
                    {meta.reps != null && (
                      <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: accentSurface }}>
                        <Text className="text-[11px] font-outfit" style={{ color: colors.accent }}>{meta.reps} reps</Text>
                      </View>
                    )}
                    {meta.duration != null && (
                      <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: accentSurface }}>
                        <Text className="text-[11px] font-outfit" style={{ color: colors.accent }}>{meta.duration}s duration</Text>
                      </View>
                    )}
                    {meta.restSeconds != null && (
                      <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: accentSurface }}>
                        <Text className="text-[11px] font-outfit" style={{ color: colors.accent }}>{meta.restSeconds}s rest</Text>
                      </View>
                    )}
                    {meta.category && (
                      <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: mutedSurface }}>
                        <Text className="text-[11px] font-outfit font-semibold" style={{ color: colors.text }}>{meta.category}</Text>
                      </View>
                    )}
                    {meta.equipment && (
                      <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: mutedSurface }}>
                        <Text className="text-[11px] font-outfit" style={{ color: colors.text }}>🏋️ {meta.equipment}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Body content */}
                {item.body ? (
                  <MarkdownText
                    text={item.body}
                    baseStyle={{ fontSize: 15, lineHeight: 24, color: colors.text }}
                    headingStyle={{ fontSize: 18, lineHeight: 26, color: colors.text, fontWeight: "700" }}
                    subheadingStyle={{ fontSize: 16, lineHeight: 24, color: colors.text, fontWeight: "700" }}
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

        {item?.allowVideoUpload && canUploadVideos ? (
          <Pressable
            onPress={() => setShowUploadModal(true)}
            className="absolute bottom-6 right-6 h-14 w-14 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.accent, ...(isDark ? Shadows.none : Shadows.md) }}
          >
            <Feather name="plus" size={24} color="#ffffff" />
          </Pressable>
        ) : null}

        <Modal
          visible={showUploadModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowUploadModal(false)}
        >
          <View className="flex-1 justify-end" style={{ backgroundColor: isDark ? "rgba(34,197,94,0.18)" : "rgba(15,23,42,0.18)" }}>
            <View className="rounded-t-3xl p-4 pb-6" style={{ backgroundColor: surfaceColor }}>
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-lg font-clash text-app font-bold">
                  Training Video Upload
                </Text>
                <TouchableOpacity
                  onPress={() => setShowUploadModal(false)}
                  className="h-10 w-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: mutedSurface }}
                >
                  <Feather name="x" size={20} color={colors.accent} />
                </TouchableOpacity>
              </View>
              <VideoUploadPanel
                sectionContentId={Number.isFinite(Number(contentId)) ? Number(contentId) : null}
                sectionTitle={item?.title ?? null}
              />
            </View>
          </View>
        </Modal>
      </SafeMaskedView>
    </SafeAreaView>
  );
}
