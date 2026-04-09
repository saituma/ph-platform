import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text, TextInput } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, Modal, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

  const [items, setItems] = useState<AdminVideoItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [videoDetailOpenId, setVideoDetailOpenId] = useState<number | null>(
    null,
  );
  const [videoDetailBusy, setVideoDetailBusy] = useState(false);
  const [videoDetailError, setVideoDetailError] = useState<string | null>(null);
  const [feedbackDraft, setFeedbackDraft] = useState("");

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
  }, [selectedVideo?.id, selectedVideo?.feedback]);

  const openVideoUrl = useCallback(async () => {
    const url = selectedVideo?.videoUrl;
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Unable to open link", url);
    }
  }, [selectedVideo?.videoUrl]);

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

  const headerLine = useMemo(() => {
    if (loading) return "Loading…";
    if (error) return "Error";
    return `${items.length} items`;
  }, [error, items.length, loading]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ThemedScrollView onRefresh={() => load(true)}>
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
                    <SmallAction
                      label="Open video"
                      tone="neutral"
                      onPress={openVideoUrl}
                      disabled={false}
                    />
                  </View>
                ) : null}
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
            </ThemedScrollView>
          </View>
        </Modal>
      </ThemedScrollView>
    </View>
  );
}
