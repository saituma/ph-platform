import React, { useEffect, useMemo } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { SkeletonTrainingContentScreen } from "@/components/ui/legacy-skeleton";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, ExternalLink, ChevronRight, Calendar, Clock } from "lucide-react-native";

import { Text } from "@/components/ScaledText";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { VideoPlayer, isYoutubeUrl } from "@/components/media/VideoPlayer";
import { useAppSelector } from "@/store/hooks";
import { useAdminPastel } from "@/components/admin/AdminUI";
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
  p,
}: {
  url: string;
  label: string;
  p: ReturnType<typeof useAdminPastel>;
}) {
  return (
    <Pressable
      onPress={() => Linking.openURL(url).catch(() => undefined)}
      style={{
        borderRadius: 22, backgroundColor: p.cardWhite, paddingHorizontal: 20, paddingVertical: 16,
        flexDirection: "row", alignItems: "center", gap: 12,
      }}
    >
      <ExternalLink size={18} color={p.accent} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontFamily: "Outfit-Bold", color: p.textPrimary }}>{label}</Text>
        <Text style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: p.textMuted, marginTop: 2 }} numberOfLines={1}>
          {url}
        </Text>
      </View>
      <ChevronRight size={16} color={p.textMuted} />
    </Pressable>
  );
});

function MediaSection({ url, title, p }: { url: string; title?: string; p: ReturnType<typeof useAdminPastel> }) {
  if (isYoutubeUrl(url)) {
    return (
      <View style={{ borderRadius: 22, overflow: "hidden", backgroundColor: p.inputBg }}>
        <VideoPlayer uri={url} title={title} ignoreTabFocus />
      </View>
    );
  }
  if (isExternalNonInlineUrl(url)) {
    return <ExternalLinkButton url={url} label="Open in Google Drive" p={p} />;
  }
  if (isExternalVideoUrl(url)) {
    return (
      <View style={{ borderRadius: 22, overflow: "hidden", backgroundColor: p.inputBg }}>
        <VideoPlayer uri={url} title={title} ignoreTabFocus />
      </View>
    );
  }
  return (
    <View style={{ borderRadius: 22, overflow: "hidden", backgroundColor: p.inputBg }}>
      <VideoPlayer uri={url} title={title} ignoreTabFocus />
    </View>
  );
}

export default function TrainingOtherDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useAppSafeAreaInsets();
  const p = useAdminPastel();

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

  const metadata = (item?.metadata ?? {}) as Record<string, unknown>;
  const scheduleDay = typeof metadata.scheduleDay === "string" ? (metadata.scheduleDay as string) : null;
  const scheduleTime = typeof metadata.scheduleTime === "string" ? (metadata.scheduleTime as string) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }}>
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
          style={{
            overflow: "hidden", borderRadius: 22, paddingHorizontal: 20, paddingVertical: 20,
            backgroundColor: p.cardWhite,
          }}
        >
          <View
            style={{
              position: "absolute", right: -40, top: -32, height: 112, width: 112,
              borderRadius: 56, backgroundColor: p.accentSoft,
            }}
          />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <Pressable
              onPress={() => router.back()}
              style={{
                height: 44, width: 44, alignItems: "center", justifyContent: "center",
                borderRadius: 18, backgroundColor: p.inputBg,
              }}
              accessibilityLabel="Go back"
              hitSlop={8}
            >
              <ArrowLeft size={20} color={p.accent} />
            </Pressable>
            <View
              style={{ borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: p.inputBg }}
            >
              <Text
                style={{ fontSize: 10, fontFamily: "Outfit-Bold", textTransform: "uppercase", letterSpacing: 1.3, color: p.accent }}
              >
                {item?.groupLabel ?? "Training"}
              </Text>
            </View>
          </View>

          {isLoading && !item ? (
            <SkeletonTrainingContentScreen />
          ) : !item ? (
            <Text style={{ fontSize: 18, fontFamily: "Outfit-Regular", color: p.textPrimary }}>
              {error ?? "This content is not available."}
            </Text>
          ) : (
            <>
              <Text
                style={{ fontSize: 28, fontFamily: "Outfit-Bold", color: p.textPrimary }}
              >
                {item.title}
              </Text>

              {(item.scheduleNote || scheduleDay || scheduleTime) ? (
                <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {item.scheduleNote ? (
                    <View
                      style={{
                        borderRadius: 100, paddingHorizontal: 12, paddingVertical: 8,
                        flexDirection: "row", alignItems: "center", gap: 8,
                        backgroundColor: p.accentSoft,
                      }}
                    >
                      <Calendar size={12} color={p.accent} />
                      <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: p.accent }}>
                        {item.scheduleNote}
                      </Text>
                    </View>
                  ) : null}
                  {scheduleDay ? (
                    <View
                      style={{ borderRadius: 100, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: p.inputBg }}
                    >
                      <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
                        {scheduleDay}
                      </Text>
                    </View>
                  ) : null}
                  {scheduleTime ? (
                    <View
                      style={{
                        borderRadius: 100, paddingHorizontal: 12, paddingVertical: 8,
                        flexDirection: "row", alignItems: "center", gap: 6,
                        backgroundColor: p.inputBg,
                      }}
                    >
                      <Clock size={11} color={p.textPrimary} />
                      <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
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
              style={{ fontSize: 10, fontFamily: "Outfit-Bold", textTransform: "uppercase", letterSpacing: 1.3, marginBottom: 8, marginLeft: 4, color: p.textSecondary }}
            >
              Video
            </Text>
            <MediaSection url={item.videoUrl} title={item.title} p={p} />
          </View>
        ) : null}

        {/* Body */}
        {item ? (
          <View>
            <Text
              style={{ fontSize: 10, fontFamily: "Outfit-Bold", textTransform: "uppercase", letterSpacing: 1.3, marginBottom: 8, marginLeft: 4, color: p.textSecondary }}
            >
              Details
            </Text>
            <View
              style={{
                borderRadius: 22, paddingHorizontal: 20, paddingVertical: 20,
                backgroundColor: p.cardWhite,
              }}
            >
              {item.body?.trim() ? (
                <MarkdownText text={item.body} />
              ) : (
                <Text
                  style={{ fontSize: 14, fontFamily: "Outfit-Regular", fontStyle: "italic", color: p.textSecondary }}
                >
                  No additional details for this item.
                </Text>
              )}
            </View>
          </View>
        ) : null}

        {/* Error footer */}
        {!isLoading && !item && error ? (
          <View
            style={{
              borderRadius: 22, paddingHorizontal: 20, paddingVertical: 20,
              backgroundColor: p.inputBg,
            }}
          >
            <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
              {error}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
