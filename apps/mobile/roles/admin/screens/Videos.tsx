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
import { Alert, Modal, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

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

function SmallAction({
  label,
  tone,
  onPress,
  disabled,
}: {
  label: string;
  tone: "neutral" | "success" | "danger";
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors, isDark } = useAppTheme();
  const tint =
    tone === "success"
      ? colors.accent
      : tone === "danger"
        ? colors.danger
        : colors.text;
  const bg =
    tone === "success"
      ? isDark
        ? `${colors.accent}18`
        : `${colors.accent}12`
      : tone === "danger"
        ? isDark
          ? `${colors.danger}18`
          : `${colors.danger}10`
        : isDark
          ? "rgba(255,255,255,0.04)"
          : "rgba(15,23,42,0.04)";
  const border =
    tone === "success"
      ? isDark
        ? `${colors.accent}30`
        : `${colors.accent}24`
      : tone === "danger"
        ? isDark
          ? `${colors.danger}30`
          : `${colors.danger}24`
        : isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(15,23,42,0.06)";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 16,
          borderWidth: 1,
          backgroundColor: bg,
          borderColor: border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        className="text-[12px] font-outfit-semibold"
        style={{ color: tint }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
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

  const [videoDetailOpenId, setVideoDetailOpenId] = useState<number | null>(
    null,
  );
  const [videoDetailBusy, setVideoDetailBusy] = useState(false);
  const [videoDetailError, setVideoDetailError] = useState<string | null>(null);
  const [feedbackDraft, setFeedbackDraft] = useState("");

  const [responseVideoAttachment, setResponseVideoAttachment] =
    useState<PendingAttachment | null>(null);
  const [responseVideoBusy, setResponseVideoBusy] = useState(false);

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
    setResponseVideoBusy(false);
  }, [selectedVideo?.id, selectedVideo?.feedback]);

  const responseVideoLabel = useMemo(() => {
    if (!responseVideoAttachment) return "";
    if (responseVideoAttachment.fileName)
      return responseVideoAttachment.fileName;
    const uri = responseVideoAttachment.uri;
    const lastSlash = uri.lastIndexOf("/");
    return lastSlash >= 0 ? uri.slice(lastSlash + 1) : uri;
  }, [responseVideoAttachment]);

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

  const submitFeedback = useCallback(async () => {
    if (!token || !bootstrapReady) return;
    const idNum = selectedVideo?.id == null ? NaN : Number(selectedVideo.id);
    if (!Number.isFinite(idNum) || idNum <= 0) return;
    const trimmed = feedbackDraft.trim();
    if (!trimmed) {
      setVideoDetailError("Feedback is required.");
      return;
    }
    setVideoDetailBusy(true);
    setVideoDetailError(null);
    try {
      const res = await apiRequest<{ item?: any }>("/videos/review", {
        method: "POST",
        token,
        body: { uploadId: idNum, feedback: trimmed },
        skipCache: true,
      });
      setItems((prev) =>
        prev.map((v) => {
          const vId = v.id == null ? NaN : Number(v.id);
          if (!Number.isFinite(vId) || vId !== idNum) return v;
          return {
            ...v,
            feedback: res?.item?.feedback ?? trimmed,
            reviewedAt: res?.item?.reviewedAt ?? new Date().toISOString(),
          };
        }),
      );
    } catch (e) {
      setVideoDetailError(
        e instanceof Error ? e.message : "Failed to submit feedback",
      );
    } finally {
      setVideoDetailBusy(false);
    }
  }, [bootstrapReady, feedbackDraft, selectedVideo?.id, token]);

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
    },
    [],
  );

  const sendResponseVideo = useCallback(async () => {
    if (!token || !bootstrapReady) return;

    const userIdRaw = selectedVideo?.athleteUserId;
    const uploadIdRaw = selectedVideo?.id;

    const userId = userIdRaw == null ? NaN : Number(userIdRaw);
    const uploadId = uploadIdRaw == null ? NaN : Number(uploadIdRaw);

    if (!Number.isFinite(userId) || userId <= 0) {
      setVideoDetailError("This upload is missing the athlete user ID.");
      return;
    }
    if (!Number.isFinite(uploadId) || uploadId <= 0) {
      setVideoDetailError("This upload is missing an ID.");
      return;
    }
    if (!responseVideoAttachment) {
      setVideoDetailError("Choose or record a response video first.");
      return;
    }

    setResponseVideoBusy(true);
    setVideoDetailError(null);
    try {
      const uploaded = await uploadAttachment(responseVideoAttachment);
      if (uploaded.contentType !== "video") {
        throw new Error("Selected file is not a video.");
      }

      await apiRequest(`/admin/messages/${userId}`, {
        method: "POST",
        token,
        body: {
          contentType: "video",
          mediaUrl: uploaded.mediaUrl,
          videoUploadId: uploadId,
        },
        skipCache: true,
      });

      const feedback = feedbackDraft.trim() || "Coach sent a response video.";
      const res = await apiRequest<{ item?: any }>("/videos/review", {
        method: "POST",
        token,
        body: { uploadId, feedback },
        skipCache: true,
      });

      setItems((prev) =>
        prev.map((v) => {
          const vId = v.id == null ? NaN : Number(v.id);
          if (!Number.isFinite(vId) || vId !== uploadId) return v;
          return {
            ...v,
            feedback: res?.item?.feedback ?? feedback,
            reviewedAt: res?.item?.reviewedAt ?? new Date().toISOString(),
          };
        }),
      );

      setResponseVideoAttachment(null);
      setVideoDetailOpenId(null);
    } catch (e) {
      setVideoDetailError(
        e instanceof Error ? e.message : "Failed to send response video",
      );
    } finally {
      setResponseVideoBusy(false);
    }
  }, [
    bootstrapReady,
    feedbackDraft,
    responseVideoAttachment,
    selectedVideo?.athleteUserId,
    selectedVideo?.id,
    token,
    uploadAttachment,
  ]);

  const headerLine = useMemo(() => {
    if (loading) return "Loading…";
    if (error) return "Error";
    return `${items.length} items`;
  }, [error, items.length, loading]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ThemedScrollView
        onRefresh={() => {
          void load(true);
        }}
      >
        <View className="pt-6 mb-4">
          <View className="flex-row items-center gap-3 overflow-hidden">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <View className="flex-1">
              <Text
                className="text-4xl font-telma-bold text-app tracking-tight"
                numberOfLines={1}
              >
                Videos
              </Text>
              <Text
                className="text-[12px] font-outfit text-secondary"
                numberOfLines={1}
              >
                {headerLine}
              </Text>
            </View>
          </View>
        </View>

        <View
          className="rounded-[28px] border p-5"
          style={{
            backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
            borderColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(15,23,42,0.06)",
            ...(isDark ? Shadows.none : Shadows.md),
          }}
        >
          {loading && items.length === 0 ? (
            <View className="gap-2">
              <Skeleton width="90%" height={14} />
              <Skeleton width="82%" height={14} />
              <Skeleton width="88%" height={14} />
            </View>
          ) : error ? (
            <Text selectable className="text-sm font-outfit text-red-400">
              {error}
            </Text>
          ) : items.length === 0 ? (
            <Text className="text-sm font-outfit text-secondary">
              No videos found.
            </Text>
          ) : (
            <View className="gap-3">
              {items.map((v, idx) => {
                const title =
                  typeof v.athleteName === "string" && v.athleteName.trim()
                    ? v.athleteName.trim()
                    : `Video ${String(v.id ?? idx)}`;
                const status = v.reviewedAt ? "Reviewed" : "Pending";
                const note = typeof v.notes === "string" ? v.notes : null;

                const idNum = v.id == null ? NaN : Number(v.id);

                return (
                  <Pressable
                    key={String(v.id ?? idx)}
                    className="rounded-2xl border px-4 py-3"
                    accessibilityRole="button"
                    onPress={() => {
                      if (Number.isFinite(idNum) && idNum > 0) {
                        setVideoDetailOpenId(idNum);
                      }
                    }}
                    style={{
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(15,23,42,0.03)",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(15,23,42,0.06)",
                    }}
                  >
                    <View className="flex-row items-center justify-between gap-3">
                      <Text
                        className="text-[13px] font-clash font-bold text-app flex-1"
                        numberOfLines={1}
                      >
                        {title}
                      </Text>
                      <Text
                        className="text-[11px] font-outfit text-secondary"
                        numberOfLines={1}
                      >
                        {status}
                      </Text>
                    </View>
                    {note ? (
                      <Text
                        className="text-[12px] font-outfit text-secondary mt-1"
                        numberOfLines={2}
                      >
                        {note}
                      </Text>
                    ) : null}
                    {v.createdAt ? (
                      <Text
                        selectable
                        className="text-[11px] font-outfit text-secondary mt-1"
                        numberOfLines={1}
                      >
                        {String(v.createdAt)}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <Modal
          visible={videoDetailOpenId != null}
          animationType="slide"
          presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
          onRequestClose={() => setVideoDetailOpenId(null)}
        >
          <View
            style={{
              flex: 1,
              paddingTop: insets.top,
              backgroundColor: isDark ? colors.background : "#FFFFFF",
            }}
          >
            <ThemedScrollView
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: 24 + insets.bottom,
              }}
            >
              <View className="pt-4 mb-4 flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text
                    className="text-2xl font-clash font-bold text-app"
                    numberOfLines={1}
                  >
                    {selectedVideo?.athleteName?.trim() || "Video"}
                  </Text>
                  <Text
                    className="text-[12px] font-outfit text-secondary"
                    numberOfLines={1}
                    selectable
                  >
                    Upload #{String(selectedVideo?.id ?? "—")}
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => setVideoDetailOpenId(null)}
                  style={({ pressed }) => [
                    {
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 999,
                      borderWidth: 1,
                      opacity: pressed ? 0.85 : 1,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(15,23,42,0.04)",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(15,23,42,0.08)",
                    },
                  ]}
                >
                  <Text className="text-[12px] font-outfit-semibold text-app">
                    Close
                  </Text>
                </Pressable>
              </View>

              {videoDetailError ? (
                <View className="mb-3">
                  <Text selectable className="text-sm font-outfit text-red-400">
                    {videoDetailError}
                  </Text>
                </View>
              ) : null}

              <View
                className="rounded-[28px] border p-5 mb-4"
                style={{
                  backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
                  borderColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(15,23,42,0.06)",
                  ...(isDark ? Shadows.none : Shadows.md),
                }}
              >
                <Text className="text-base font-clash font-bold text-app mb-3">
                  Details
                </Text>
                <Text
                  className="text-[12px] font-outfit text-secondary"
                  selectable
                >
                  Created: {formatIsoShort(selectedVideo?.createdAt ?? null)}
                </Text>
                <Text
                  className="text-[12px] font-outfit text-secondary"
                  selectable
                >
                  Reviewed: {formatIsoShort(selectedVideo?.reviewedAt ?? null)}
                </Text>
                {selectedVideo?.programSectionTitle ? (
                  <Text
                    className="text-[12px] font-outfit text-secondary"
                    selectable
                  >
                    Section: {String(selectedVideo.programSectionTitle)} (
                    {String(selectedVideo.programSectionType ?? "—")})
                  </Text>
                ) : null}
                {selectedVideo?.notes ? (
                  <Text
                    className="text-[12px] font-outfit text-secondary mt-2"
                    selectable
                  >
                    Notes: {String(selectedVideo.notes)}
                  </Text>
                ) : null}
                {selectedVideo?.videoUrl ? (
                  <View className="mt-3">
                    <View
                      className="overflow-hidden rounded-3xl border"
                      style={{
                        borderColor: isDark
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(15,23,42,0.08)",
                      }}
                    >
                      <VideoPlayer
                        uri={String(selectedVideo.videoUrl)}
                        height={220}
                        autoPlay={false}
                        initialMuted={false}
                        isLooping={false}
                      />
                    </View>
                  </View>
                ) : null}

                <View className={selectedVideo?.videoUrl ? "mt-2" : "mt-3"}>
                  <SmallAction
                    label="Reply in messages"
                    tone="neutral"
                    onPress={replyInMessages}
                    disabled={false}
                  />
                </View>
              </View>

              <View
                className="rounded-[28px] border p-5"
                style={{
                  backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
                  borderColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(15,23,42,0.06)",
                  ...(isDark ? Shadows.none : Shadows.md),
                }}
              >
                <Text className="text-base font-clash font-bold text-app mb-3">
                  Admin response
                </Text>
                <View
                  className="rounded-2xl border px-3 py-2"
                  style={{
                    borderColor: isDark
                      ? "rgba(255,255,255,0.10)"
                      : "rgba(15,23,42,0.10)",
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.03)"
                      : "rgba(15,23,42,0.03)",
                  }}
                >
                  <TextInput
                    value={feedbackDraft}
                    onChangeText={setFeedbackDraft}
                    placeholder="Write feedback to the athlete…"
                    placeholderTextColor={colors.textSecondary}
                    className="text-[13px] font-outfit text-app"
                    multiline
                  />
                </View>

                <View className="flex-row gap-2 mt-3">
                  <SmallAction
                    label={videoDetailBusy ? "Sending…" : "Send response"}
                    tone="success"
                    onPress={submitFeedback}
                    disabled={videoDetailBusy}
                  />
                </View>
              </View>

              <View
                className="rounded-[28px] border p-5 mt-4"
                style={{
                  backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
                  borderColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(15,23,42,0.06)",
                  ...(isDark ? Shadows.none : Shadows.md),
                }}
              >
                <Text className="text-base font-clash font-bold text-app mb-3">
                  Coach response video
                </Text>

                {responseVideoAttachment ? (
                  <View className="gap-2 mb-3">
                    <Text
                      className="text-[12px] font-outfit text-secondary"
                      numberOfLines={2}
                    >
                      Selected: {responseVideoLabel}
                    </Text>
                    <View
                      className="overflow-hidden rounded-3xl border"
                      style={{
                        borderColor: isDark
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(15,23,42,0.08)",
                      }}
                    >
                      <VideoPlayer
                        uri={responseVideoAttachment.uri}
                        height={200}
                        autoPlay={false}
                        initialMuted={false}
                        isLooping={false}
                      />
                    </View>
                  </View>
                ) : (
                  <Text className="text-[12px] font-outfit text-secondary mb-3">
                    Choose or record a video to send to the athlete.
                  </Text>
                )}

                <View className="flex-row flex-wrap gap-2">
                  <SmallAction
                    label="Choose video"
                    tone="neutral"
                    onPress={() => {
                      void pickResponseVideo("library");
                    }}
                    disabled={responseVideoBusy}
                  />
                  <SmallAction
                    label="Record video"
                    tone="neutral"
                    onPress={() => {
                      void pickResponseVideo("camera");
                    }}
                    disabled={responseVideoBusy}
                  />
                  <SmallAction
                    label={
                      responseVideoBusy ? "Sending…" : "Send response video"
                    }
                    tone="success"
                    onPress={() => {
                      void sendResponseVideo();
                    }}
                    disabled={responseVideoBusy || !responseVideoAttachment}
                  />
                </View>
              </View>
            </ThemedScrollView>
          </View>
        </Modal>
      </ThemedScrollView>
    </View>
  );
}
