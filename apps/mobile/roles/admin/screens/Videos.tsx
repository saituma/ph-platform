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
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Modal, Platform, Pressable, View, TouchableOpacity, ActivityIndicator } from "react-native";
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
              cameraType: ImagePicker.CameraType.Front,
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
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ThemedScrollView
        onRefresh={() => {
          void load(true);
        }}
      >
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

        <Modal
          visible={videoDetailOpenId != null}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setVideoDetailOpenId(null)}
        >
          {videoDetailOpenId != null && (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
              <View className="px-6 py-6 flex-row items-center justify-between border-b border-app/5">
                <View className="flex-1 pr-3">
                  <Text
                    className="text-2xl font-clash font-bold text-app"
                    numberOfLines={1}
                  >
                    {selectedVideo?.athleteName?.trim() || "Video Detail"}
                  </Text>
                  <Text
                    className="text-[11px] font-outfit-bold text-accent uppercase tracking-widest mt-1"
                    selectable
                  >
                    Upload #{String(selectedVideo?.id ?? "—")}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setVideoDetailOpenId(null)}
                  className="h-12 w-12 items-center justify-center rounded-full bg-secondary/10 border border-app/5"
                >
                  <Feather name="x" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ThemedScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingBottom: 60 + insets.bottom,
                }}
              >
                <View className="p-6">
                  {videoDetailError ? (
                    <View className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                      <Text selectable className="text-sm font-outfit text-red-400 text-center">
                        {videoDetailError}
                      </Text>
                    </View>
                  ) : null}

                  <View className="rounded-[36px] border p-8 mb-8" style={cardStyle}>
                    <View className="flex-row items-center gap-2 mb-6">
                      <View className="h-4 w-1 rounded-full bg-accent" />
                      <Text className="text-lg font-clash font-bold text-app uppercase tracking-wider">
                        Athlete Submission
                      </Text>
                    </View>

                    <View className="gap-2 mb-6">
                      <Text className="text-xs font-outfit text-textSecondary uppercase tracking-widest">
                        Created: {formatIsoShort(selectedVideo?.createdAt ?? null)}
                      </Text>
                      {selectedVideo?.programSectionTitle && (
                        <Text className="text-xs font-outfit text-textSecondary uppercase tracking-widest">
                          Section: {selectedVideo.programSectionTitle} ({selectedVideo.programSectionType ?? "—"})
                        </Text>
                      )}
                    </View>

                    {selectedVideo?.notes && (
                      <View className="p-5 rounded-[22px] bg-secondary/5 border border-app/5 mb-6">
                        <Text className="text-base font-outfit text-app leading-relaxed italic">
                          "{selectedVideo.notes}"
                        </Text>
                      </View>
                    )}

                    {selectedVideo?.videoUrl ? (
                      <View className="rounded-[28px] overflow-hidden border border-app/10 shadow-sm">
                        <VideoPlayer
                          uri={String(selectedVideo.videoUrl)}
                          height={240}
                          autoPlay={false}
                          initialMuted={false}
                          isLooping={false}
                        />
                      </View>
                    ) : (
                      <View className="h-[240px] rounded-[28px] bg-secondary/5 items-center justify-center border border-dashed border-app/20">
                        <Feather name="video-off" size={32} color={colors.textSecondary} />
                        <Text className="mt-2 text-sm font-outfit text-textSecondary">Video not available</Text>
                      </View>
                    )}

                    <TouchableOpacity 
                      onPress={replyInMessages}
                      className="mt-8 h-14 rounded-[18px] bg-secondary/10 flex-row items-center justify-center gap-3 border border-app/5"
                    >
                      <Feather name="message-square" size={18} color={colors.text} />
                      <Text className="font-outfit-bold text-app uppercase tracking-wider">Open in Messages</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Unified Response Block */}
                  <View className="rounded-[36px] border p-8" style={cardStyle}>
                    <View className="flex-row items-center gap-2 mb-6">
                      <View className="h-4 w-1 rounded-full bg-accent" />
                      <Text className="text-lg font-clash font-bold text-app uppercase tracking-wider">
                        Coach Response
                      </Text>
                    </View>

                    <View 
                      className="rounded-[22px] border px-5 py-4 mb-6 min-h-[140px]"
                      style={{
                        backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)",
                        borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
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

                    <View className="mb-8">
                      <Text className="text-[11px] font-outfit-bold text-textSecondary uppercase tracking-[2px] mb-4 ml-1">
                        Video Response (Optional)
                      </Text>
                      
                      {responseVideoAttachment ? (
                        <View className="mb-6 rounded-[24px] overflow-hidden border border-app/10 relative shadow-sm">
                          <VideoPlayer
                            uri={responseVideoAttachment.uri}
                            height={220}
                            autoPlay={false}
                            initialMuted={false}
                            isLooping={false}
                          />
                          <TouchableOpacity 
                            onPress={() => setResponseVideoAttachment(null)}
                            className="absolute top-4 right-4 bg-black/60 h-10 w-10 items-center justify-center rounded-full"
                          >
                            <Feather name="trash-2" size={18} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View className="flex-row gap-4">
                          <TouchableOpacity 
                            onPress={() => void pickResponseVideo("camera")}
                            activeOpacity={0.7}
                            className="flex-1 h-16 rounded-[20px] border border-app/10 items-center justify-center bg-card flex-row gap-2"
                          >
                            <Feather name="video" size={20} color={colors.text} />
                            <Text className="font-outfit-bold text-app uppercase tracking-wider">Record</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={() => void pickResponseVideo("library")}
                            activeOpacity={0.7}
                            className="flex-1 h-16 rounded-[20px] border border-app/10 items-center justify-center bg-card flex-row gap-2"
                          >
                            <Feather name="upload" size={20} color={colors.text} />
                            <Text className="font-outfit-bold text-app uppercase tracking-wider">Upload</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    <ActionButton 
                      label="Send Full Response" 
                      onPress={submitUnifiedResponse} 
                      loading={isSubmitting}
                      tone="accent"
                      size="lg"
                      icon="send"
                    />
                  </View>
                </View>
              </ThemedScrollView>
            </SafeAreaView>
          )}
        </Modal>
      </ThemedScrollView>
    </View>
  );
}
