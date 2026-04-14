import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text, TextInput } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/api";
import { requestGlobalTabChange } from "@/context/ActiveTabContext";
import { setAdminMessagesNavTarget } from "@/lib/admin/adminMessagesNav";
import { useAppSelector } from "@/store/hooks";
import { useMediaUpload } from "@/hooks/messages/useMediaUpload";
import type { PendingAttachment } from "@/types/admin-messages";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { NavigationRecoveryBoundary } from "@/components/NavigationRecoveryBoundary";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, View, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@/components/ui/theme-icons";

import { ADMIN_TAB_ROUTES } from "../tabs";

type AdminVideoItem = Record<string, any> & {
  id?: number | string;
  athleteId?: number | null;
  athleteUserId?: number | null;
  athleteName?: string | null;
  videoUrl?: string | null;
  createdAt?: string | null;
  notes?: string | null;
  feedback?: string | null;
  reviewedAt?: string | null;
  programSectionContentId?: number | null;
  programSectionTitle?: string | null;
  programSectionType?: string | null;
};

function formatIsoShort(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return String(value);
  return d.toLocaleString();
}

function ActionButton({
  label,
  onPress,
  tone = "accent",
  size = "md",
  disabled,
  loading,
  icon,
}: {
  label: string;
  onPress: () => void;
  tone?: "neutral" | "success" | "danger" | "accent";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  icon?: any;
}) {
  const { colors, isDark } = useAppTheme();
  
  const bg = tone === "accent" || tone === "success" ? "#22C55E" : 
             tone === "danger" ? "#EF4444" : 
             isDark ? "rgba(255,255,255,0.15)" : "#F1F5F9";

  const textColor = (tone === "neutral" && !isDark) ? "#0F172A" : "#FFFFFF";

  const height = size === "sm" ? 44 : size === "md" ? 58 : 66;
  const px = size === "sm" ? 16 : size === "md" ? 28 : 36;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      onPress={onPress}
      style={{
        height,
        paddingHorizontal: px,
        borderRadius: 16,
        backgroundColor: bg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        opacity: (disabled || loading) ? 0.6 : 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.3 : 0.1,
        shadowRadius: 8,
        elevation: 4,
      }}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <>
          {icon && <Feather name={icon} size={size === "sm" ? 18 : 22} color={textColor} style={{ marginRight: 10 }} />}
          <Text
            className="font-outfit-bold uppercase tracking-[1.5px]"
            style={{ color: textColor, fontSize: size === "sm" ? 13 : 15 }}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export default function AdminVideosScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);

  const { uploadAttachment } = useMediaUpload(token);

  const [items, setItems] = useState<AdminVideoItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [videoDetailOpenId, setVideoDetailOpenId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoDetailError, setVideoDetailError] = useState<string | null>(null);
  const [feedbackDraft, setFeedbackDraft] = useState("");

  const [responseVideoAttachment, setResponseVideoAttachment] = useState<PendingAttachment | null>(null);

  const load = useCallback(
    async (forceRefresh: boolean) => {
      if (!token || !bootstrapReady) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ items?: AdminVideoItem[] }>(
          "/admin/videos?limit=50",
          {
            token,
            suppressStatusCodes: [403],
            skipCache: forceRefresh,
            forceRefresh,
          },
        );
        setItems(Array.isArray(res?.items) ? res.items : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load videos");
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [bootstrapReady, token],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const selectedVideo = useMemo(() => {
    if (videoDetailOpenId == null) return null;
    return (
      items.find((v) => {
        const idNum = typeof v.id === "number" ? v.id : Number(v.id);
        return Number.isFinite(idNum) && idNum === videoDetailOpenId;
      }) ?? null
    );
  }, [items, videoDetailOpenId]);

  useEffect(() => {
    setVideoDetailError(null);
    if (selectedVideo?.feedback)
      setFeedbackDraft(String(selectedVideo.feedback));
    else setFeedbackDraft("");

    setResponseVideoAttachment(null);
    setIsSubmitting(false);
  }, [selectedVideo?.id, selectedVideo?.feedback]);

  const replyInMessages = useCallback(() => {
    const userId =
      selectedVideo?.athleteUserId == null
        ? NaN
        : Number(selectedVideo.athleteUserId);
    const uploadId = selectedVideo?.id == null ? NaN : Number(selectedVideo.id);
    const nameRaw =
      typeof selectedVideo?.athleteName === "string"
        ? selectedVideo.athleteName.trim()
        : "";

    if (!Number.isFinite(userId) || userId <= 0) {
      Alert.alert(
        "Unable to reply",
        "This upload is missing the athlete user ID.",
      );
      return;
    }
    if (!Number.isFinite(uploadId) || uploadId <= 0) {
      Alert.alert("Unable to reply", "This upload is missing an ID.");
      return;
    }

    setVideoDetailOpenId(null);

    setAdminMessagesNavTarget({
      userId,
      name: nameRaw,
      videoUploadId: uploadId,
    });

    const messagesIndex = ADMIN_TAB_ROUTES.findIndex(
      (tab) => tab.key === "admin-messages",
    );
    requestGlobalTabChange(messagesIndex >= 0 ? messagesIndex : 0);
  }, [
    selectedVideo?.athleteName,
    selectedVideo?.athleteUserId,
    selectedVideo?.id,
  ]);

  const pickResponseVideo = useCallback(
    async (source: "camera" | "library") => {
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) return;

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Videos,
              cameraType: ImagePicker.CameraType.front,
              quality: 1,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Videos,
              quality: 1,
            });

      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];

      setResponseVideoAttachment({
        uri: asset.uri,
        fileName: asset.fileName ?? "response-video.mp4",
        mimeType: asset.mimeType ?? "video/mp4",
        sizeBytes: asset.fileSize ?? 0,
        isImage: false,
      });
      // #region agent log
      fetch("http://127.0.0.1:7392/ingest/3e8b9f8d-6d0f-4ca7-943c-7327a18df494", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "f7e5bb",
        },
        body: JSON.stringify({
          sessionId: "f7e5bb",
          location: "Videos.tsx:pickResponseVideo",
          message: "picked response video asset",
          data: {
            hypothesisId: "H4",
            source,
            uriPrefix: String(asset.uri ?? "").slice(0, 64),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    },
    [],
  );

  const submitUnifiedResponse = useCallback(async () => {
    if (!token || !bootstrapReady || !selectedVideo) return;

    const idNum = selectedVideo.id == null ? NaN : Number(selectedVideo.id);
    const userId = selectedVideo.athleteUserId == null ? NaN : Number(selectedVideo.athleteUserId);

    if (!Number.isFinite(idNum) || idNum <= 0) return;

    const trimmedFeedback = feedbackDraft.trim();
    if (!trimmedFeedback && !responseVideoAttachment) {
      setVideoDetailError("Please provide text feedback or a video response.");
      return;
    }

    setIsSubmitting(true);
    setVideoDetailError(null);

    try {
      // #region agent log
      fetch("http://127.0.0.1:7392/ingest/3e8b9f8d-6d0f-4ca7-943c-7327a18df494", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "f7e5bb",
        },
        body: JSON.stringify({
          sessionId: "f7e5bb",
          location: "Videos.tsx:submitUnifiedResponse",
          message: "submit unified response start",
          data: {
            hypothesisId: "H4",
            hasAttachment: !!responseVideoAttachment,
            hasFeedback: trimmedFeedback.length > 0,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      let finalFeedback = trimmedFeedback;

      // 1. If there's a video, upload it and send as message
      if (responseVideoAttachment && Number.isFinite(userId) && userId > 0) {
        const uploaded = await uploadAttachment(responseVideoAttachment);
        if (uploaded.contentType !== "video") {
          throw new Error("Selected file is not a video.");
        }

        // Send video message
        await apiRequest(`/admin/messages/${userId}`, {
          method: "POST",
          token,
          body: {
            contentType: "video",
            mediaUrl: uploaded.mediaUrl,
            videoUploadId: idNum,
          },
          skipCache: true,
        });

        if (!finalFeedback) {
          finalFeedback = "Coach sent a response video.";
        }
      }

      // 2. Submit the review (text feedback)
      const res = await apiRequest<{ item?: any }>("/videos/review", {
        method: "POST",
        token,
        body: { uploadId: idNum, feedback: finalFeedback },
        skipCache: true,
      });

      // 3. Update local state
      setItems((prev) =>
        prev.map((v) => {
          const vId = v.id == null ? NaN : Number(v.id);
          if (!Number.isFinite(vId) || vId !== idNum) return v;
          return {
            ...v,
            feedback: res?.item?.feedback ?? finalFeedback,
            reviewedAt: res?.item?.reviewedAt ?? new Date().toISOString(),
          };
        }),
      );

      // Success!
      setVideoDetailOpenId(null);
    } catch (e) {
      setVideoDetailError(
        e instanceof Error ? e.message : "Failed to send response",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [bootstrapReady, feedbackDraft, responseVideoAttachment, selectedVideo, token, uploadAttachment]);

  const headerLine = useMemo(() => {
    if (loading) return "Loading…";
    if (error) return "Error";
    return `${items.length} items`;
  }, [error, items.length, loading]);

  const cardStyle = {
    backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
    borderRadius: 32,
    ...(isDark ? Shadows.none : Shadows.md),
  };

  return (
    <NavigationRecoveryBoundary message="Finishing video selection…">
      <View style={{ flex: 1 }}>
        <ThemedScrollView onRefresh={() => void load(true)}>
          <View style={{ height: insets.top }} />
        <View className="pt-10 mb-8 px-6">
          <View className="flex-row items-center gap-3">
            <View className="h-8 w-1.5 rounded-full bg-accent" />
            <View className="flex-1">
              <Text
                className="text-5xl font-telma-bold text-app tracking-tight"
                numberOfLines={1}
              >
                Videos
              </Text>
              <Text className="text-base font-outfit text-textSecondary">
                {headerLine}
              </Text>
            </View>
          </View>
        </View>

        <View className="px-6 pb-32">
          {loading && items.length === 0 ? (
            <View className="gap-4">
              <Skeleton width="100%" height={80} borderRadius={24} />
              <Skeleton width="100%" height={80} borderRadius={24} />
              <Skeleton width="100%" height={80} borderRadius={24} />
            </View>
          ) : error ? (
            <View className="p-8 rounded-[32px] bg-red-500/10 border border-red-500/20">
              <Text selectable className="text-sm font-outfit text-red-400 text-center">
                {error}
              </Text>
            </View>
          ) : items.length === 0 ? (
            <View className="py-20 items-center justify-center border border-dashed border-app/20 rounded-[32px]">
              <Feather name="video-off" size={32} color={colors.textSecondary} />
              <Text className="text-textSecondary font-outfit mt-4 text-base">
                No videos found.
              </Text>
            </View>
          ) : (
            <View className="gap-4">
              {items.map((v, idx) => {
                const title =
                  typeof v.athleteName === "string" && v.athleteName.trim()
                    ? v.athleteName.trim()
                    : `Video ${String(v.id ?? idx)}`;
                const status = v.reviewedAt ? "Reviewed" : "Pending";
                const note = typeof v.notes === "string" ? v.notes : null;

                const idNum = v.id == null ? NaN : Number(v.id);

                return (
                  <TouchableOpacity
                    key={String(v.id ?? idx)}
                    activeOpacity={0.9}
                    onPress={() => {
                      if (Number.isFinite(idNum) && idNum > 0) {
                        setVideoDetailOpenId(idNum);
                      }
                    }}
                    className="rounded-[32px] border p-6"
                    style={cardStyle}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <Text
                        className="text-xl font-clash font-bold text-app flex-1 mr-4"
                        numberOfLines={1}
                      >
                        {title}
                      </Text>
                      <View className={`px-3 py-1 rounded-full ${v.reviewedAt ? 'bg-success/10' : 'bg-amber-500/10'}`}>
                        <Text className={`text-[10px] font-outfit-bold uppercase tracking-wider ${v.reviewedAt ? 'text-success' : 'text-amber-600'}`}>
                          {status}
                        </Text>
                      </View>
                    </View>
                    
                    {note && (
                      <Text
                        className="text-sm font-outfit text-textSecondary mb-3 leading-relaxed"
                        numberOfLines={2}
                      >
                        {note}
                      </Text>
                    )}
                    
                    <View className="flex-row items-center gap-2 mt-2 pt-4 border-t border-app/5">
                      <Feather name="clock" size={12} color={colors.textSecondary} />
                      <Text className="text-xs font-outfit text-textSecondary uppercase tracking-widest">
                        {formatIsoShort(v.createdAt)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ThemedScrollView>

      {videoDetailOpenId != null && (
        <View style={[StyleSheet.absoluteFillObject, { zIndex: 1000 }]} pointerEvents="auto">
          {/* Dim backdrop */}
          <Pressable
            style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.38)" }]}
            onPress={() => setVideoDetailOpenId(null)}
          />

          <SafeAreaView style={{ flex: 1, justifyContent: "flex-end" }}>
            {/* Sheet */}
            <View
              style={{
                flex: 1,
                backgroundColor: colors.background,
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                overflow: "hidden",
                borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)",
                borderTopWidth: StyleSheet.hairlineWidth,
              }}
            >
              {/* Header */}
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <TouchableOpacity
                  onPress={() => setVideoDetailOpenId(null)}
                  activeOpacity={0.8}
                  style={{
                    height: 40,
                    width: 40,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)",
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)",
                  }}
                >
                  <Feather name="x" size={20} color={colors.text} />
                </TouchableOpacity>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text className="text-xl font-clash font-bold text-app" numberOfLines={1}>
                    {selectedVideo?.athleteName?.trim() || "Video Detail"}
                  </Text>
                  <Text className="text-[11px] font-outfit-bold text-textSecondary uppercase tracking-widest mt-1" selectable>
                    Upload #{String(selectedVideo?.id ?? "—")}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={replyInMessages}
                  activeOpacity={0.85}
                  style={{
                    height: 40,
                    paddingHorizontal: 12,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 8,
                    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)",
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)",
                  }}
                >
                  <Feather name="message-square" size={16} color={colors.text} />
                  <Text className="text-[12px] font-outfit-bold text-app uppercase tracking-wider">Messages</Text>
                </TouchableOpacity>
              </View>

              {/* Content */}
              <ThemedScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  paddingTop: 16,
                  paddingBottom: 104 + insets.bottom,
                }}
              >
                  {videoDetailError ? (
                    <View className="mb-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                      <Text selectable className="text-sm font-outfit text-red-400 text-center">
                        {videoDetailError}
                      </Text>
                    </View>
                  ) : null}

                  {/* Athlete Submission */}
                  <View
                    style={[
                      {
                        backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
                        borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)",
                        borderWidth: StyleSheet.hairlineWidth,
                        borderRadius: 24,
                        overflow: "hidden",
                      },
                      isDark ? Shadows.none : Shadows.sm,
                    ]}
                  >
                    <View style={{ padding: 16, gap: 10 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View style={{ height: 10, width: 10, borderRadius: 999, backgroundColor: colors.accent }} />
                        <Text className="text-sm font-outfit-bold text-app uppercase tracking-widest">
                          Athlete submission
                        </Text>
                      </View>

                      <View style={{ gap: 4 }}>
                        <Text className="text-xs font-outfit text-textSecondary">
                          Created {formatIsoShort(selectedVideo?.createdAt ?? null)}
                        </Text>
                        {selectedVideo?.programSectionTitle ? (
                          <Text className="text-xs font-outfit text-textSecondary">
                            {selectedVideo.programSectionTitle} ({selectedVideo.programSectionType ?? "—"})
                          </Text>
                        ) : null}
                      </View>

                      {selectedVideo?.notes ? (
                        <View
                          style={{
                            padding: 14,
                            borderRadius: 18,
                            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
                            borderWidth: StyleSheet.hairlineWidth,
                            borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.06)",
                          }}
                        >
                          <Text className="text-base font-outfit text-app leading-relaxed italic">
                            “{selectedVideo.notes}”
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                      {selectedVideo?.videoUrl ? (
                        <View
                          style={{
                            borderRadius: 20,
                            overflow: "hidden",
                            borderWidth: StyleSheet.hairlineWidth,
                            borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)",
                          }}
                        >
                          <VideoPlayer
                            uri={String(selectedVideo.videoUrl)}
                            height={240}
                            autoPlay={false}
                            initialMuted={false}
                            isLooping={false}
                          />
                        </View>
                      ) : (
                        <View
                          style={{
                            height: 240,
                            borderRadius: 20,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
                            borderWidth: StyleSheet.hairlineWidth,
                            borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)",
                            borderStyle: "dashed",
                          }}
                        >
                          <Feather name="video-off" size={26} color={colors.textSecondary} />
                          <Text className="mt-2 text-sm font-outfit text-textSecondary">
                            Video not available
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Unified Response Block */}
                  <View style={{ marginTop: 16, gap: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 4 }}>
                      <View style={{ height: 10, width: 10, borderRadius: 999, backgroundColor: colors.accent }} />
                      <Text className="text-sm font-outfit-bold text-app uppercase tracking-widest">
                        Coach response
                      </Text>
                    </View>

                    <View
                      style={[
                        {
                          backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
                          borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)",
                          borderWidth: StyleSheet.hairlineWidth,
                          borderRadius: 24,
                          padding: 16,
                        },
                        isDark ? Shadows.none : Shadows.sm,
                      ]}
                    >
                      <Text className="text-xs font-outfit-bold text-textSecondary uppercase tracking-widest mb-3">
                        Feedback
                      </Text>
                      <View
                        style={{
                          borderRadius: 18,
                          backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
                          borderWidth: StyleSheet.hairlineWidth,
                          borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)",
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                          minHeight: 140,
                        }}
                      >
                        <TextInput
                          value={feedbackDraft}
                          onChangeText={setFeedbackDraft}
                          placeholder="Provide technical feedback or guidance…"
                          placeholderTextColor={colors.placeholder}
                          className="text-base font-outfit text-app flex-1"
                          textAlignVertical="top"
                          multiline
                        />
                      </View>
                    </View>

                    <View
                      style={[
                        {
                          backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
                          borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)",
                          borderWidth: StyleSheet.hairlineWidth,
                          borderRadius: 24,
                          padding: 16,
                        },
                        isDark ? Shadows.none : Shadows.sm,
                      ]}
                    >
                      <Text className="text-xs font-outfit-bold text-textSecondary uppercase tracking-widest mb-3">
                        Video response (optional)
                      </Text>

                      {responseVideoAttachment ? (
                        <View
                          style={{
                            borderRadius: 18,
                            overflow: "hidden",
                            borderWidth: StyleSheet.hairlineWidth,
                            borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)",
                          }}
                        >
                          <VideoPlayer
                            uri={responseVideoAttachment.uri}
                            height={220}
                            autoPlay={false}
                            initialMuted={false}
                            isLooping={false}
                          />
                          <TouchableOpacity
                            onPress={() => setResponseVideoAttachment(null)}
                            activeOpacity={0.85}
                            style={{
                              position: "absolute",
                              top: 12,
                              right: 12,
                              height: 40,
                              width: 40,
                              borderRadius: 999,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: "rgba(0,0,0,0.62)",
                            }}
                          >
                            <Feather name="trash-2" size={18} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={{ flexDirection: "row", gap: 12 }}>
                          <TouchableOpacity
                            onPress={() => void pickResponseVideo("camera")}
                            activeOpacity={0.8}
                            style={{
                              flex: 1,
                              height: 56,
                              borderRadius: 18,
                              alignItems: "center",
                              justifyContent: "center",
                              flexDirection: "row",
                              gap: 10,
                              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
                              borderWidth: StyleSheet.hairlineWidth,
                              borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)",
                            }}
                          >
                            <Feather name="video" size={18} color={colors.text} />
                            <Text className="text-[12px] font-outfit-bold text-app uppercase tracking-wider">
                              Record
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => void pickResponseVideo("library")}
                            activeOpacity={0.8}
                            style={{
                              flex: 1,
                              height: 56,
                              borderRadius: 18,
                              alignItems: "center",
                              justifyContent: "center",
                              flexDirection: "row",
                              gap: 10,
                              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
                              borderWidth: StyleSheet.hairlineWidth,
                              borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)",
                            }}
                          >
                            <Feather name="upload" size={18} color={colors.text} />
                            <Text className="text-[12px] font-outfit-bold text-app uppercase tracking-wider">
                              Upload
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
              </ThemedScrollView>

              {/* Sticky action bar */}
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  paddingHorizontal: 16,
                  paddingTop: 12,
                  paddingBottom: 12 + insets.bottom,
                  backgroundColor: isDark ? "rgba(0,0,0,0.88)" : "rgba(255,255,255,0.92)",
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)",
                }}
              >
                <ActionButton
                  label="Send response"
                  onPress={submitUnifiedResponse}
                  loading={isSubmitting}
                  tone="accent"
                  size="lg"
                  icon="send"
                  disabled={!feedbackDraft.trim() && !responseVideoAttachment}
                />
              </View>
            </View>
          </SafeAreaView>
        </View>
      )}
      </View>
    </NavigationRecoveryBoundary>
  );
}
