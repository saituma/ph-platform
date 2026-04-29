import React, { useEffect, useMemo } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { Text } from "@/components/ScaledText";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { VideoPlayer, isYoutubeUrl } from "@/components/media/VideoPlayer";
import { useAppSelector } from "@/store/hooks";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useTeamWorkspace } from "@/hooks/programs/useTeamWorkspace";

type OtherItem = {
  id: number;
  title: string;
  body: string;
  scheduleNote?: string | null;
  videoUrl?: string | null;
  metadata?: Record<string, unknown> | null;
};

function isExternalNonInlineUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes("drive.google.com");
}

function isExternalVideoUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes("youtube.com") ||
    lower.includes("youtu.be") ||
    lower.includes("vimeo.com") ||
    lower.includes("loom.com") ||
    lower.includes("streamable.com")
  );
}

const ExternalLinkButton = React.memo(function ExternalLinkButton({
  url,
  label,
  isDark,
}: {
  url: string;
  label: string;
  isDark: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(url).catch(() => undefined)}
      className="rounded-2xl bg-white/10 px-5 py-4 flex-row items-center gap-3"
      style={isDark ? Shadows.none : Shadows.sm}
    >
      <Feather name="external-link" size={18} color="#FFFFFF" />
      <View className="flex-1">
        <Text className="text-sm font-outfit text-white font-semibold">{label}</Text>
        <Text className="text-[11px] font-outfit text-white/80 mt-0.5" numberOfLines={1}>
          {url}
        </Text>
      </View>
      <Feather name="chevron-right" size={16} color="#94A3B8" />
    </TouchableOpacity>
  );
});

function MediaSection({ url, title, isDark }: { url: string; title?: string; isDark: boolean }) {
  if (isYoutubeUrl(url)) {
    return (
      <View className="rounded-3xl overflow-hidden bg-white/5">
        <VideoPlayer uri={url} title={title} ignoreTabFocus />
      </View>
    );
  }
  if (isExternalNonInlineUrl(url)) {
    return <ExternalLinkButton url={url} label="Open in Google Drive" isDark={isDark} />;
  }
  if (isExternalVideoUrl(url)) {
    return (
      <View className="rounded-3xl overflow-hidden bg-white/5">
        <VideoPlayer uri={url} title={title} ignoreTabFocus />
      </View>
    );
  }
  return (
    <View className="rounded-3xl overflow-hidden bg-white/5">
      <VideoPlayer uri={url} title={title} ignoreTabFocus />
    </View>
  );
}

export default function TrainingOtherDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useAppSafeAreaInsets();
  const { colors, isDark } = useAppTheme();

  const token = useAppSelector((s) => s.user.token);
  const athleteUserId = useAppSelector((s) => s.user.athleteUserId);
  const managedAthletes = useAppSelector((s) => s.user.managedAthletes);
  const activeAthlete = useMemo(() => {
    return (
      managedAthletes.find((a) => a.id === athleteUserId || a.userId === athleteUserId) ??
      managedAthletes[0] ??
      null
    );
  }, [athleteUserId, managedAthletes]);

  const { workspace, isLoading, error, load } = useTeamWorkspace(token, activeAthlete?.age ?? null);

  useEffect(() => {
    if (token) void load();
  }, [token, load]);

  const targetId = Number(id);
  const item: (OtherItem & { groupLabel: string }) | null = useMemo(() => {
    if (!workspace || !Number.isFinite(targetId)) return null;
    for (const group of workspace.others ?? []) {
      const found = group.items.find((it: any) => Number(it?.id) === targetId);
      if (found) return { ...(found as OtherItem), groupLabel: group.label };
    }
    return null;
  }, [workspace, targetId]);

  const surfaceColor = isDark ? colors.cardElevated : "#F7FFF9";
  const mutedSurface = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.84)";
  const accentSurface = isDark ? "rgba(34,197,94,0.16)" : "rgba(34,197,94,0.10)";
  const borderSoft = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  const mutedSurfaceSoft = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)";

  const metadata = (item?.metadata ?? {}) as Record<string, unknown>;
  const scheduleDay = typeof metadata.scheduleDay === "string" ? (metadata.scheduleDay as string) : null;
  const scheduleTime = typeof metadata.scheduleTime === "string" ? (metadata.scheduleTime as string) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 48,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero header */}
        <View
          className="overflow-hidden rounded-[30px] border px-5 py-5"
          style={{
            backgroundColor: surfaceColor,
            borderColor: borderSoft,
            ...(isDark ? Shadows.none : Shadows.md),
          }}
        >
          <View
            className="absolute -right-10 -top-8 h-28 w-28 rounded-full"
            style={{ backgroundColor: accentSurface }}
          />

          <View className="flex-row items-center justify-between mb-4">
            <Pressable
              onPress={() => router.back()}
              className="h-11 w-11 items-center justify-center rounded-[18px]"
              style={{ backgroundColor: mutedSurface }}
              accessibilityLabel="Go back"
              hitSlop={8}
            >
              <Feather name="arrow-left" size={20} color={colors.accent} />
            </Pressable>
            <View
              className="rounded-full px-3 py-1.5"
              style={{ backgroundColor: mutedSurface }}
            >
              <Text
                className="text-[10px] font-outfit font-bold uppercase tracking-[1.3px]"
                style={{ color: colors.accent }}
              >
                {item?.groupLabel ?? "Training"}
              </Text>
            </View>
          </View>

          {isLoading && !item ? (
            <View style={{ paddingVertical: 24 }}>
              <ActivityIndicator />
            </View>
          ) : !item ? (
            <Text className="text-lg font-outfit" style={{ color: colors.text }}>
              {error ?? "This content is not available."}
            </Text>
          ) : (
            <>
              <Text
                className="text-3xl font-telma-bold font-bold"
                style={{ color: colors.text }}
              >
                {item.title}
              </Text>

              {(item.scheduleNote || scheduleDay || scheduleTime) ? (
                <View className="mt-4 flex-row flex-wrap gap-2">
                  {item.scheduleNote ? (
                    <View
                      className="rounded-full px-3 py-2 flex-row items-center gap-2"
                      style={{ backgroundColor: accentSurface }}
                    >
                      <Feather name="calendar" size={12} color={colors.accent} />
                      <Text
                        className="text-[11px] font-outfit font-semibold"
                        style={{ color: colors.accent }}
                      >
                        {item.scheduleNote}
                      </Text>
                    </View>
                  ) : null}
                  {scheduleDay ? (
                    <View
                      className="rounded-full px-3 py-2"
                      style={{ backgroundColor: mutedSurface }}
                    >
                      <Text
                        className="text-[11px] font-outfit font-semibold"
                        style={{ color: colors.text }}
                      >
                        {scheduleDay}
                      </Text>
                    </View>
                  ) : null}
                  {scheduleTime ? (
                    <View
                      className="rounded-full px-3 py-2 flex-row items-center gap-1.5"
                      style={{ backgroundColor: mutedSurface }}
                    >
                      <Feather name="clock" size={11} color={colors.text} />
                      <Text
                        className="text-[11px] font-outfit font-semibold"
                        style={{ color: colors.text }}
                      >
                        {scheduleTime}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </>
          )}
        </View>

        {/* Video */}
        {item?.videoUrl ? (
          <View>
            <Text
              className="text-[10px] font-outfit font-bold uppercase tracking-[1.3px] mb-2 ml-1"
              style={{ color: colors.textSecondary }}
            >
              Video
            </Text>
            <MediaSection url={item.videoUrl} title={item.title} isDark={isDark} />
          </View>
        ) : null}

        {/* Body */}
        {item ? (
          <View>
            <Text
              className="text-[10px] font-outfit font-bold uppercase tracking-[1.3px] mb-2 ml-1"
              style={{ color: colors.textSecondary }}
            >
              Details
            </Text>
            <View
              className="rounded-[24px] border px-5 py-5"
              style={{
                backgroundColor: surfaceColor,
                borderColor: borderSoft,
                ...(isDark ? Shadows.none : Shadows.sm),
              }}
            >
              {item.body?.trim() ? (
                <MarkdownText text={item.body} />
              ) : (
                <Text
                  className="text-sm font-outfit italic"
                  style={{ color: colors.textSecondary }}
                >
                  No additional details for this item.
                </Text>
              )}
            </View>
          </View>
        ) : null}

        {/* Error footer (when item not found but workspace loaded) */}
        {!isLoading && !item && error ? (
          <View
            className="rounded-[24px] border px-5 py-5"
            style={{
              backgroundColor: mutedSurfaceSoft,
              borderColor: borderSoft,
            }}
          >
            <Text className="text-sm font-outfit" style={{ color: colors.textSecondary }}>
              {error}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
