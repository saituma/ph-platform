import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text, TextInput } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/api";
import { useAdminUsers } from "@/hooks/admin/useAdminUsers";
import { useMediaUpload } from "@/hooks/messages/useMediaUpload";
import { useAppSelector } from "@/store/hooks";
import type { PendingAttachment } from "@/types/admin-messages";
import type { AdminUser } from "@/types/admin";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type NutritionLog = {
  id: number;
  userId: number;
  dateKey: string;
  athleteType: string;
  breakfast?: string | null;
  snacks?: string | null;
  lunch?: string | null;
  dinner?: string | null;
  waterIntake?: number | null;
  mood?: number | null;
  energy?: number | null;
  pain?: number | null;
  foodDiary?: string | null;
  coachFeedback?: string | null;
  coachFeedbackMediaUrl?: string | null;
  coachFeedbackMediaType?: string | null;
  updatedAt?: string;
};

function SmallAction({
  label,
  onPress,
  tone,
  disabled,
}: {
  label: string;
  onPress: () => void;
  tone: "neutral" | "success" | "danger";
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
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function AdminNutritionScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);

  const {
    users,
    loading: usersLoading,
    error: usersError,
    load: loadUsers,
  } = useAdminUsers(token, Boolean(bootstrapReady));

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const selectedUser: AdminUser | null = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId],
  );

  const { uploadAttachment } = useMediaUpload(token);

  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const selectedLog = useMemo(
    () => logs.find((l) => l.id === selectedLogId) ?? null,
    [logs, selectedLogId],
  );

  const [feedbackDraft, setFeedbackDraft] = useState("");
  const [responseVideo, setResponseVideo] = useState<PendingAttachment | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const cardStyle = {
    backgroundColor: isDark ? colors.cardElevated : "#FFFFFF",
    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
    ...(isDark ? Shadows.none : Shadows.md),
  };

  const innerCardStyle = {
    backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
    borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
  };

  const loadLogsForUser = useCallback(
    async (userId: number, forceRefresh = false) => {
      if (!token || !bootstrapReady) return;
      setLogsLoading(true);
      setLogsError(null);
      try {
        const res = await apiRequest<{ logs: NutritionLog[] }>(
          `/nutrition/logs?userId=${userId}&limit=50`,
          {
            token,
            forceRefresh,
            skipCache: forceRefresh,
            suppressStatusCodes: [403],
          },
        );
        setLogs(Array.isArray(res?.logs) ? res.logs : []);
      } catch (e) {
        setLogsError(e instanceof Error ? e.message : "Failed to load logs");
      } finally {
        setLogsLoading(false);
      }
    },
    [bootstrapReady, token],
  );

  useEffect(() => {
    if (!selectedUserId) return;
    void loadLogsForUser(selectedUserId, true);
    setSelectedLogId(null);
    setFeedbackDraft("");
    setResponseVideo(null);
    setSaveError(null);
  }, [loadLogsForUser, selectedUserId]);

  useEffect(() => {
    if (!selectedLog) return;
    setFeedbackDraft(selectedLog.coachFeedback ?? "");
    setResponseVideo(null);
    setSaveError(null);
  }, [selectedLog]);

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

      setResponseVideo({
        uri: asset.uri,
        fileName: asset.fileName ?? "nutrition-response.mp4",
        mimeType: asset.mimeType ?? "video/mp4",
        sizeBytes: asset.fileSize ?? 0,
        isImage: false,
      });
    },
    [],
  );

  const submitFeedback = useCallback(async () => {
    if (!token || !bootstrapReady) return;
    if (!selectedUserId || !selectedLog) return;

    setSaving(true);
    setSaveError(null);
    try {
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;

      if (responseVideo) {
        const uploaded = await uploadAttachment(responseVideo);
        if (uploaded.contentType !== "video") {
          throw new Error("Selected file is not a video.");
        }
        mediaUrl = uploaded.mediaUrl;
        mediaType = "video";
      }

      const body: Record<string, any> = { feedback: feedbackDraft };
      if (mediaUrl) {
        body.mediaUrl = mediaUrl;
        body.mediaType = mediaType;
      }

      const res = await apiRequest<{ log?: NutritionLog }>(
        `/nutrition/logs/${selectedLog.id}/feedback`,
        {
          method: "POST",
          token,
          body,
          skipCache: true,
        },
      );

      const updated = res?.log;
      setLogs((prev) =>
        prev.map((l) =>
          l.id === selectedLog.id ? { ...l, ...(updated ?? {}) } : l,
        ),
      );
      setResponseVideo(null);
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "Failed to submit feedback",
      );
    } finally {
      setSaving(false);
    }
  }, [
    bootstrapReady,
    feedbackDraft,
    responseVideo,
    selectedLog,
    selectedUserId,
    token,
    uploadAttachment,
  ]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ThemedScrollView>
        <View className="pt-6 mb-4 px-6">
          <View className="flex-row items-center gap-3">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <View className="flex-1">
              <Text className="text-4xl font-telma-bold text-app tracking-tight">
                Nutrition
              </Text>
              <Text className="text-[12px] font-outfit text-secondary">
                Select a user to view logs and respond.
              </Text>
            </View>
          </View>
        </View>

        <View className="px-6">
          <View className="rounded-[28px] border p-5" style={cardStyle}>
            {usersLoading && users.length === 0 ? (
              <View className="gap-3">
                <Skeleton width="100%" height={60} />
                <Skeleton width="100%" height={60} />
              </View>
            ) : usersError ? (
              <Text className="text-red-400 font-outfit text-center">
                {usersError}
              </Text>
            ) : users.length === 0 ? (
              <Text className="text-secondary font-outfit text-center">
                No users found.
              </Text>
            ) : (
              <View className="gap-3">
                {users.map((u) => (
                  <Pressable
                    key={u.id}
                    onPress={() => u.id && setSelectedUserId(u.id)}
                    className="rounded-2xl border px-4 py-3"
                    style={innerCardStyle}
                  >
                    <Text className="text-sm font-clash font-bold text-app">
                      {u.name || "(no name)"}
                    </Text>
                    <Text
                      className="text-xs font-outfit text-secondary"
                      numberOfLines={1}
                    >
                      {u.email}
                    </Text>
                    <View className="flex-row gap-2 mt-1">
                      <Text className="text-[10px] font-outfit text-secondary uppercase tracking-wider">
                        Role: {u.role}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      </ThemedScrollView>

      <Modal
        visible={selectedUserId != null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedUserId(null)}
      >
        <View
          className="flex-1"
          style={{
            backgroundColor: isDark ? "rgba(0,0,0,0.7)" : "rgba(15,23,42,0.45)",
          }}
        >
          <View
            className="mt-auto rounded-t-[28px] border p-5"
            style={{
              backgroundColor: colors.card,
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(15,23,42,0.06)",
              paddingBottom: insets.bottom + 16,
            }}
          >
            <View className="flex-row items-start justify-between gap-3 mb-4">
              <View className="flex-1">
                <Text
                  className="text-2xl font-clash font-bold text-app"
                  numberOfLines={1}
                >
                  {selectedUser?.name || "Nutrition logs"}
                </Text>
                <Text
                  className="text-xs font-outfit text-secondary"
                  numberOfLines={1}
                >
                  {selectedUser?.email}
                </Text>
              </View>
              <SmallAction
                label="Close"
                tone="neutral"
                onPress={() => setSelectedUserId(null)}
              />
            </View>

            <ThemedScrollView>
              {logsLoading ? (
                <View className="gap-3">
                  <Skeleton width="100%" height={50} />
                  <Skeleton width="100%" height={50} />
                </View>
              ) : logsError ? (
                <Text className="text-red-400 font-outfit">{logsError}</Text>
              ) : logs.length === 0 ? (
                <Text className="text-secondary font-outfit">No logs yet.</Text>
              ) : (
                <View className="gap-3">
                  {logs.map((l) => {
                    const hasFeedback = Boolean(
                      l.coachFeedback?.trim() || l.coachFeedbackMediaUrl,
                    );
                    const selected = l.id === selectedLogId;
                    return (
                      <Pressable
                        key={l.id}
                        onPress={() => setSelectedLogId(l.id)}
                        className="rounded-2xl border px-4 py-3"
                        style={{
                          ...innerCardStyle,
                          borderColor: selected
                            ? colors.accent
                            : (innerCardStyle as any).borderColor,
                        }}
                      >
                        <View className="flex-row items-center justify-between">
                          <Text className="text-sm font-clash font-bold text-app">
                            {l.dateKey}
                          </Text>
                          {hasFeedback ? (
                            <Text className="text-[10px] font-outfit-semibold text-accent uppercase tracking-wider">
                              Replied
                            </Text>
                          ) : (
                            <Text className="text-[10px] font-outfit text-secondary uppercase tracking-wider">
                              No reply
                            </Text>
                          )}
                        </View>
                        <Text
                          className="text-xs font-outfit text-secondary"
                          numberOfLines={1}
                        >
                          {l.athleteType === "adult"
                            ? "Food diary"
                            : "Daily tracking"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {selectedLog ? (
                <View className="mt-5 gap-3">
                  <View
                    className="rounded-2xl border p-4"
                    style={innerCardStyle}
                  >
                    <Text className="text-sm font-outfit-semibold text-app mb-2">
                      Log details
                    </Text>
                    {selectedLog.athleteType === "adult" ? (
                      <Text className="text-sm font-outfit text-secondary">
                        {selectedLog.foodDiary?.trim()
                          ? selectedLog.foodDiary
                          : "(no entry)"}
                      </Text>
                    ) : (
                      <View className="gap-1">
                        <Text className="text-xs font-outfit text-secondary">
                          Breakfast: {selectedLog.breakfast ? "Yes" : "No"}
                        </Text>
                        <Text className="text-xs font-outfit text-secondary">
                          Lunch: {selectedLog.lunch ? "Yes" : "No"}
                        </Text>
                        <Text className="text-xs font-outfit text-secondary">
                          Snacks: {selectedLog.snacks ? "Yes" : "No"}
                        </Text>
                        <Text className="text-xs font-outfit text-secondary">
                          Dinner: {selectedLog.dinner ? "Yes" : "No"}
                        </Text>
                        <Text className="text-xs font-outfit text-secondary">
                          Water: {selectedLog.waterIntake ?? 0}
                        </Text>
                        <Text className="text-xs font-outfit text-secondary">
                          Mood: {selectedLog.mood ?? "—"}
                        </Text>
                        <Text className="text-xs font-outfit text-secondary">
                          Energy: {selectedLog.energy ?? "—"}
                        </Text>
                        <Text className="text-xs font-outfit text-secondary">
                          Pain: {selectedLog.pain ?? "—"}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View
                    className="rounded-2xl border p-4"
                    style={innerCardStyle}
                  >
                    <Text className="text-sm font-outfit-semibold text-app mb-2">
                      Admin response
                    </Text>
                    <TextInput
                      value={feedbackDraft}
                      onChangeText={setFeedbackDraft}
                      placeholder="Write feedback (optional)"
                      placeholderTextColor={colors.placeholder}
                      multiline
                      className="rounded-2xl px-4 py-3 text-sm font-outfit text-app"
                      style={{
                        minHeight: 110,
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(15,23,42,0.03)",
                      }}
                    />

                    {selectedLog.coachFeedbackMediaUrl ? (
                      <View className="mt-3">
                        <Text className="text-xs font-outfit text-secondary mb-2">
                          Current response video
                        </Text>
                        <VideoPlayer
                          uri={selectedLog.coachFeedbackMediaUrl}
                          height={180}
                          useVideoResolution
                        />
                      </View>
                    ) : null}

                    {responseVideo ? (
                      <View className="mt-3">
                        <Text className="text-xs font-outfit text-secondary mb-2">
                          New response video (preview)
                        </Text>
                        <VideoPlayer
                          uri={responseVideo.uri}
                          height={180}
                          disableCache
                        />
                      </View>
                    ) : null}

                    <View className="flex-row gap-2 mt-3">
                      <SmallAction
                        label="Record video"
                        tone="neutral"
                        onPress={() => void pickResponseVideo("camera")}
                        disabled={saving}
                      />
                      <SmallAction
                        label="Choose video"
                        tone="neutral"
                        onPress={() => void pickResponseVideo("library")}
                        disabled={saving}
                      />
                      {responseVideo ? (
                        <SmallAction
                          label="Clear"
                          tone="danger"
                          onPress={() => setResponseVideo(null)}
                          disabled={saving}
                        />
                      ) : null}
                    </View>

                    {saveError ? (
                      <Text className="text-xs font-outfit text-red-400 mt-2">
                        {saveError}
                      </Text>
                    ) : null}

                    <View className="mt-3">
                      <SmallAction
                        label={saving ? "Sending..." : "Send response"}
                        tone="success"
                        onPress={() => void submitFeedback()}
                        disabled={saving}
                      />
                    </View>
                  </View>
                </View>
              ) : null}
            </ThemedScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
