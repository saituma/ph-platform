import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text, TextInput } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { apiRequest } from "@/lib/api";
import { VIDEO_PICK_PRESERVE_NATIVE_RESOLUTION } from "@/lib/media/videoPickerNativeResolution";
import { requestGlobalTabChange } from "@/context/ActiveTabContext";
import { setAdminMessagesNavTarget } from "@/lib/admin/adminMessagesNav";
import { useAppSelector } from "@/store/hooks";
import { useMediaUpload } from "@/hooks/messages/useMediaUpload";
import type { PendingAttachment } from "@/types/admin-messages";
import { BuiltinCamera } from "@/components/media/BuiltinCamera";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { NavigationRecoveryBoundary } from "@/components/NavigationRecoveryBoundary";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
  TouchableOpacity,
  ActivityIndicator,
  InteractionManager,
  Modal,
} from "react-native";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import {
  useAdminPastel,
  AdminScreen,
  AdminHeader,
  AdminButton,
  AdminEmptyState,
} from "@/components/admin/AdminUI";
import {
  Activity,
  ArrowUpRight,
  X,
  Video,
  Upload,
  Play,
  ChevronLeft,
  Search,
  VideoOff,
} from "lucide-react-native";

import { ADMIN_TAB_ROUTES } from "../tabs";

/** Matches web `video-review/athletes/[athleteId]` section filters */
const VIDEO_SECTION_TABS = [
  { value: "all", label: "All" },
  { value: "program", label: "Program" },
  { value: "screening", label: "Movement Screening" },
  { value: "warmup", label: "Warmups" },
  { value: "cooldown", label: "Cool Downs" },
  { value: "stretching", label: "Stretching" },
  { value: "mobility", label: "Mobility" },
  { value: "recovery", label: "Recovery" },
  { value: "offseason", label: "Off Season" },
  { value: "inseason", label: "In Season" },
  { value: "nutrition", label: "Athlete Platform" },
] as const;
const ADMIN_RESPONSE_MAX_DURATION_SECONDS = 60;
const ADMIN_RESPONSE_MAX_BYTES = 90 * 1024 * 1024;

const ATHLETE_CARD_COLORS = ["cardSage", "cardPeach", "cardLavender", "cardMint"] as const;

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

export default function AdminVideosScreen() {
  const pal = useAdminPastel();
  const insets = useAppSafeAreaInsets();
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
  const [builtinCameraVisible, setBuiltinCameraVisible] = useState(false);

  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);
  const [athleteSearch, setAthleteSearch] = useState("");
  const [sectionTab, setSectionTab] = useState<string>("all");

  const load = useCallback(
    async (forceRefresh: boolean) => {
      if (!token || !bootstrapReady) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ items?: AdminVideoItem[] }>(
          "/admin/videos?limit=200",
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

  const athleteRows = useMemo(() => {
    const m = new Map<number, { name: string; count: number }>();
    for (const it of items) {
      const aid = Number(it.athleteId);
      if (!Number.isFinite(aid) || aid <= 0) continue;
      const name =
        typeof it.athleteName === "string" && it.athleteName.trim()
          ? it.athleteName.trim()
          : `Athlete #${aid}`;
      const prev = m.get(aid);
      if (!prev) m.set(aid, { name, count: 1 });
      else prev.count += 1;
    }
    return [...m.entries()]
      .map(([athleteId, v]) => ({ athleteId, name: v.name, count: v.count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const filteredAthleteRows = useMemo(() => {
    const q = athleteSearch.trim().toLowerCase();
    if (!q) return athleteRows;
    return athleteRows.filter((a) => a.name.toLowerCase().includes(q));
  }, [athleteRows, athleteSearch]);

  const videosForAthlete = useMemo(() => {
    if (selectedAthleteId == null) return [];
    return items.filter((v) => Number(v.athleteId) === selectedAthleteId);
  }, [items, selectedAthleteId]);

  const filteredVideos = useMemo(() => {
    if (sectionTab === "all") return videosForAthlete;
    return videosForAthlete.filter(
      (v) => (v.programSectionType ?? "program") === sectionTab,
    );
  }, [videosForAthlete, sectionTab]);

  const selectedAthleteName = useMemo(() => {
    if (selectedAthleteId == null) return null;
    return athleteRows.find((a) => a.athleteId === selectedAthleteId)?.name ?? null;
  }, [athleteRows, selectedAthleteId]);

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
    setSectionTab("all");
  }, [selectedAthleteId]);

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
      if (source === "camera") {
        InteractionManager.runAfterInteractions(() => {
          setTimeout(() => setBuiltinCameraVisible(true), 80);
        });
        return;
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) return;

      const result = await ImagePicker.launchImageLibraryAsync(
        VIDEO_PICK_PRESERVE_NATIVE_RESOLUTION,
      );

      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];

      const durationSeconds =
        typeof asset.duration === "number" && Number.isFinite(asset.duration)
          ? Math.round(asset.duration / 1000)
          : null;
      if (durationSeconds != null && durationSeconds > ADMIN_RESPONSE_MAX_DURATION_SECONDS) {
        setVideoDetailError(
          `Video is ${durationSeconds}s. Keep response clips at ${ADMIN_RESPONSE_MAX_DURATION_SECONDS}s or less.`,
        );
        return;
      }

      const info = await FileSystem.getInfoAsync(asset.uri);
      const sizeBytes = info.exists ? info.size : (asset.fileSize ?? 0);
      if (info.exists && sizeBytes > ADMIN_RESPONSE_MAX_BYTES) {
        setVideoDetailError("Response video exceeds 90MB limit. Please pick a shorter clip.");
        return;
      }

      setResponseVideoAttachment({
        uri: asset.uri,
        fileName: asset.fileName ?? "response-video.mp4",
        mimeType: asset.mimeType ?? "video/mp4",
        sizeBytes,
        isImage: false,
      });
    },
    [],
  );

  const handleBuiltinCameraRecorded = useCallback(
    async (asset: { uri: string; duration: number; width: number; height: number }) => {
      setBuiltinCameraVisible(false);

      if (
        Number.isFinite(asset.duration) &&
        asset.duration > ADMIN_RESPONSE_MAX_DURATION_SECONDS
      ) {
        setVideoDetailError(
          `Video is ${asset.duration}s. Keep clips at ${ADMIN_RESPONSE_MAX_DURATION_SECONDS}s or less.`,
        );
        return;
      }

      const info = await FileSystem.getInfoAsync(asset.uri);
      const sizeBytes = info.exists ? info.size : 0;
      if (info.exists && sizeBytes > ADMIN_RESPONSE_MAX_BYTES) {
        setVideoDetailError(
          "Response video exceeds 90MB limit. Please record a shorter clip.",
        );
        return;
      }

      const uriLower = asset.uri.toLowerCase();
      setResponseVideoAttachment({
        uri: asset.uri,
        fileName: asset.uri.split("/").pop() ?? "response-video.mp4",
        mimeType: uriLower.endsWith(".mov") ? "video/quicktime" : "video/mp4",
        sizeBytes,
        isImage: false,
      });
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
      let finalFeedback = trimmedFeedback;
      let coachVideoUrl: string | undefined;

      if (responseVideoAttachment && Number.isFinite(userId) && userId > 0) {
        const uploaded = await uploadAttachment(responseVideoAttachment);
        if (uploaded.contentType !== "video") {
          throw new Error("Selected file is not a video.");
        }
        coachVideoUrl = uploaded.mediaUrl;

        // Still send a message for immediate notification
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

      const res = await apiRequest<{ item?: any }>("/videos/review", {
        method: "POST",
        token,
        body: {
          uploadId: idNum,
          feedback: finalFeedback,
          coachVideoUrl
        },
        skipCache: true,
      });

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

      // Success Confirmation
      Alert.alert(
        "Feedback Sent",
        "Your feedback and video have been linked directly to the athlete's session.",
        [
          { text: "OK" }
        ]
      );

      setVideoDetailOpenId(null);
    } catch (e) {
      setVideoDetailError(
        e instanceof Error ? e.message : "Failed to send response",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [bootstrapReady, feedbackDraft, responseVideoAttachment, selectedVideo, token, uploadAttachment]);

  const sectionLabelByValue = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of VIDEO_SECTION_TABS) m.set(t.value, t.label);
    return m;
  }, []);

  return (
    <NavigationRecoveryBoundary message="Finishing video selection…">
      <View style={{ flex: 1, backgroundColor: pal.pageBg }}>
        <ThemedScrollView
          onRefresh={() => void load(true)}
          contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        >
          {/* Header */}
          <View style={{ paddingHorizontal: 24, paddingTop: insets.top + 20, marginBottom: 28 }}>
            <AdminHeader title="Video Review" subtitle={`${athleteRows.length} athletes with uploads`} />
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, paddingHorizontal: 24 }}>
              <Activity size={16} color={pal.accent} />
              <Text style={{ color: pal.textMuted, fontFamily: "Outfit-Regular", fontSize: 13, marginLeft: 8 }}>
                {athleteRows.length} Athletes Indexed
              </Text>
              {loading && <ActivityIndicator size="small" color={pal.accent} style={{ marginLeft: 12 }} />}
            </View>
          </View>

          <View style={{ paddingHorizontal: 20 }}>
            {error ? (
              <View style={{
                padding: 20,
                backgroundColor: pal.danger + "15",
                borderRadius: 28,
              }}>
                <Text style={{ color: pal.danger, fontFamily: "Outfit-Bold", textAlign: "center", fontSize: 14 }}>
                  {error}
                </Text>
              </View>
            ) : items.length === 0 && !loading ? (
              <View style={{
                paddingVertical: 60,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pal.cardWhite,
                borderRadius: 28,
              }}>
                <VideoOff size={36} color={pal.textMuted} style={{ opacity: 0.4 }} />
                <Text style={{ color: pal.textMuted, fontFamily: "Outfit-Bold", marginTop: 16, fontSize: 16 }}>
                  No Videos Found
                </Text>
              </View>
            ) : selectedAthleteId == null ? (
              <View>
                {/* Search Bar */}
                <View style={{
                  backgroundColor: pal.cardWhite,
                  borderRadius: 28,
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  marginBottom: 20,
                  flexDirection: "row",
                  alignItems: "center",
                  shadowColor: pal.shadow,
                  shadowOpacity: 1,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 2,
                }}>
                  <Search size={18} color={pal.textMuted} />
                  <TextInput
                    value={athleteSearch}
                    onChangeText={setAthleteSearch}
                    placeholder="Search athletes..."
                    placeholderTextColor={pal.textMuted}
                    style={{
                      flex: 1,
                      color: pal.textPrimary,
                      fontFamily: "Outfit-Regular",
                      fontSize: 15,
                      marginLeft: 12,
                      paddingVertical: 0,
                    }}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                </View>

                {/* Athlete List */}
                <View style={{ gap: 12 }}>
                  {filteredAthleteRows.map((row, idx) => {
                    const colorKey = ATHLETE_CARD_COLORS[idx % ATHLETE_CARD_COLORS.length];
                    const cardColor = pal[colorKey];
                    return (
                      <Pressable
                        key={row.athleteId}
                        onPress={() => setSelectedAthleteId(row.athleteId)}
                        style={({ pressed }) => ({
                          backgroundColor: cardColor,
                          padding: 20,
                          borderRadius: 28,
                          flexDirection: "row",
                          alignItems: "center",
                          shadowColor: pal.shadow,
                          shadowOpacity: 1,
                          shadowRadius: 10,
                          shadowOffset: { width: 0, height: 3 },
                          elevation: 3,
                          opacity: pressed ? 0.9 : 1,
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        })}
                      >
                        <View style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: pal.accent + "20",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 14,
                        }}>
                          <Text style={{ color: pal.accent, fontFamily: "Outfit-Bold", fontSize: 14 }}>
                            {String(idx + 1).padStart(2, "0")}
                          </Text>
                        </View>
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <Text style={{ color: pal.textPrimary, fontFamily: "Outfit-Bold", fontSize: 17 }}>
                            {row.name}
                          </Text>
                          <Text style={{ color: pal.textSecondary, fontFamily: "Outfit-Regular", fontSize: 13, marginTop: 2 }}>
                            {row.count} Uploads
                          </Text>
                        </View>
                        <ArrowUpRight size={20} color={pal.accent} style={{ opacity: 0.6 }} />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View>
                {/* Back button */}
                <Pressable
                  onPress={() => setSelectedAthleteId(null)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 20,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <ChevronLeft size={18} color={pal.accent} />
                  <Text style={{ color: pal.accent, fontFamily: "Outfit-Bold", fontSize: 14, marginLeft: 6 }}>
                    Back to Athletes
                  </Text>
                </Pressable>

                {/* Athlete Name */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ color: pal.textPrimary, fontSize: 28, fontFamily: "Outfit-Bold" }}>
                    {selectedAthleteName}
                  </Text>
                  <Text style={{ color: pal.textSecondary, fontFamily: "Outfit-Regular", fontSize: 13, marginTop: 4 }}>
                    Video Review History
                  </Text>
                </View>

                {/* Section Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
                  <View style={{ flexDirection: "row", gap: 8, paddingRight: 20 }}>
                    {VIDEO_SECTION_TABS.map((tab) => {
                      const active = sectionTab === tab.value;
                      return (
                        <Pressable
                          key={tab.value}
                          onPress={() => setSectionTab(tab.value)}
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            backgroundColor: active ? pal.accent : pal.cardWhite,
                            borderRadius: 100,
                            shadowColor: pal.shadow,
                            shadowOpacity: active ? 0 : 1,
                            shadowRadius: 6,
                            shadowOffset: { width: 0, height: 2 },
                            elevation: active ? 0 : 2,
                          }}
                        >
                          <Text style={{
                            color: active ? "#FFFFFF" : pal.textSecondary,
                            fontFamily: "Outfit-Bold",
                            fontSize: 12,
                          }}>
                            {tab.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Video Cards */}
                <View style={{ gap: 12 }}>
                  {filteredVideos.map((v, idx) => {
                    const reviewed = Boolean(v.reviewedAt);
                    const topic = v.programSectionTitle || "Video Upload";
                    const colorKey = ATHLETE_CARD_COLORS[idx % ATHLETE_CARD_COLORS.length];
                    const cardColor = pal[colorKey];
                    return (
                      <Pressable
                        key={v.id || idx}
                        onPress={() => v.id && setVideoDetailOpenId(Number(v.id))}
                        style={({ pressed }) => ({
                          backgroundColor: cardColor,
                          padding: 20,
                          borderRadius: 28,
                          shadowColor: pal.shadow,
                          shadowOpacity: 1,
                          shadowRadius: 10,
                          shadowOffset: { width: 0, height: 3 },
                          elevation: 3,
                          opacity: pressed ? 0.9 : 1,
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        })}
                      >
                        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                          <View style={{ flex: 1, marginRight: 12 }}>
                            <Text style={{ color: pal.textPrimary, fontFamily: "Outfit-Bold", fontSize: 16, lineHeight: 22 }}>
                              {topic}
                            </Text>
                            <Text style={{ color: pal.textSecondary, fontFamily: "Outfit-Regular", fontSize: 12, marginTop: 4 }}>
                              {v.programSectionType || "Core"}
                            </Text>
                          </View>
                          <View style={{
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            backgroundColor: reviewed ? pal.success + "20" : pal.warning + "20",
                            borderRadius: 100,
                          }}>
                            <Text style={{
                              color: reviewed ? pal.success : pal.warning,
                              fontFamily: "Outfit-Bold",
                              fontSize: 11,
                            }}>
                              {reviewed ? "Reviewed" : "Awaiting"}
                            </Text>
                          </View>
                        </View>

                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTopWidth: 1, borderTopColor: pal.divider }}>
                          <Text style={{ color: pal.textMuted, fontFamily: "Outfit-Regular", fontSize: 12 }}>
                            {formatIsoShort(v.createdAt)}
                          </Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Text style={{ color: pal.accent, fontFamily: "Outfit-Bold", fontSize: 12 }}>
                              Review
                            </Text>
                            <ArrowUpRight size={14} color={pal.accent} />
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </ThemedScrollView>

        {/* Video Detail Modal */}
        <Modal
          visible={videoDetailOpenId != null}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setVideoDetailOpenId(null)}
        >
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
          <View style={{ flex: 1, backgroundColor: pal.pageBg }}>
            {/* Handle indicator */}
            <View style={{
              width: 40,
              height: 4,
              backgroundColor: pal.divider,
              borderRadius: 2,
              alignSelf: "center",
              marginTop: 12,
              marginBottom: 16,
            }} />

            <ThemedScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 + insets.bottom }}>
              {/* Modal Header */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ color: pal.textSecondary, fontFamily: "Outfit-Regular", fontSize: 13, marginBottom: 6 }}>
                  Video Detail
                </Text>
                <Text style={{ color: pal.textPrimary, fontSize: 28, fontFamily: "Outfit-Bold", lineHeight: 34 }}>
                  {selectedVideo?.athleteName}
                </Text>
                <Text style={{ color: pal.textMuted, fontFamily: "Outfit-Regular", fontSize: 13, marginTop: 4 }}>
                  Thread #{selectedVideo?.id}
                </Text>
              </View>

              {/* Error */}
              {videoDetailError && (
                <View style={{
                  marginBottom: 16,
                  padding: 16,
                  backgroundColor: pal.danger + "15",
                  borderRadius: 20,
                }}>
                  <Text style={{ color: pal.danger, fontFamily: "Outfit-Bold", fontSize: 13 }}>
                    {videoDetailError}
                  </Text>
                </View>
              )}

              {/* Athlete Upload Card */}
              <View style={{
                backgroundColor: pal.cardWhite,
                borderRadius: 28,
                padding: 20,
                marginBottom: 20,
                shadowColor: pal.shadow,
                shadowOpacity: 1,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 3 },
                elevation: 3,
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                  <View style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: pal.accent,
                    marginRight: 10,
                  }} />
                  <Text style={{ color: pal.textPrimary, fontFamily: "Outfit-Bold", fontSize: 15 }}>
                    Athlete Upload
                  </Text>
                </View>

                {selectedVideo?.videoUrl ? (
                  <View style={{ marginBottom: 16, borderRadius: 20, overflow: "hidden" }}>
                    <VideoPlayer uri={selectedVideo.videoUrl} height={240} />
                  </View>
                ) : (
                  <View style={{
                    height: 200,
                    backgroundColor: pal.cardLavender,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 20,
                    marginBottom: 16,
                  }}>
                    <VideoOff size={28} color={pal.textMuted} style={{ opacity: 0.5 }} />
                  </View>
                )}

                {selectedVideo?.notes && (
                  <View style={{
                    backgroundColor: pal.cardSage,
                    padding: 16,
                    borderRadius: 16,
                    borderLeftWidth: 3,
                    borderLeftColor: pal.accent,
                  }}>
                    <Text style={{ color: pal.textPrimary, fontFamily: "Outfit-Regular", fontSize: 14, lineHeight: 22, fontStyle: "italic" }}>
                      "{selectedVideo.notes}"
                    </Text>
                  </View>
                )}
              </View>

              {/* Coach Feedback Section */}
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                  <View style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: pal.accent,
                    marginRight: 10,
                  }} />
                  <Text style={{ color: pal.textPrimary, fontFamily: "Outfit-Bold", fontSize: 15 }}>
                    Coach Feedback
                  </Text>
                </View>

                {/* Feedback Input */}
                <View style={{
                  backgroundColor: pal.cardWhite,
                  borderRadius: 24,
                  padding: 18,
                  marginBottom: 12,
                  shadowColor: pal.shadow,
                  shadowOpacity: 1,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 2,
                }}>
                  <TextInput
                    value={feedbackDraft}
                    onChangeText={setFeedbackDraft}
                    placeholder="Enter your feedback..."
                    placeholderTextColor={pal.textMuted}
                    style={{
                      color: pal.textPrimary,
                      fontFamily: "Outfit-Regular",
                      fontSize: 15,
                      minHeight: 100,
                    }}
                    multiline
                    textAlignVertical="top"
                  />
                </View>

                {/* Response Video Preview */}
                {responseVideoAttachment && (
                  <View style={{ marginBottom: 12, position: "relative" }}>
                    <View style={{ borderRadius: 20, overflow: "hidden", borderWidth: 2, borderColor: pal.accent }}>
                      <VideoPlayer
                        uri={responseVideoAttachment.uri}
                        height={200}
                        autoPlay={false}
                      />
                    </View>
                    <Pressable
                      onPress={() => setResponseVideoAttachment(null)}
                      style={({ pressed }) => ({
                        position: "absolute",
                        top: 12,
                        right: 12,
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: pal.cardWhite,
                        alignItems: "center",
                        justifyContent: "center",
                        shadowColor: pal.shadow,
                        shadowOpacity: 1,
                        shadowRadius: 6,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 3,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <X size={18} color={pal.textPrimary} />
                    </Pressable>
                  </View>
                )}

                {/* Record / Upload Buttons */}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pressable
                    onPress={() => void pickResponseVideo("camera")}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 56,
                      backgroundColor: responseVideoAttachment ? pal.accentSoft : pal.cardWhite,
                      borderRadius: 28,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 10,
                      shadowColor: pal.shadow,
                      shadowOpacity: 1,
                      shadowRadius: 6,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 2,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Video size={18} color={responseVideoAttachment ? pal.accent : pal.textSecondary} />
                    <Text style={{ color: responseVideoAttachment ? pal.accent : pal.textSecondary, fontFamily: "Outfit-Bold", fontSize: 13 }}>
                      Record
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void pickResponseVideo("library")}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 56,
                      backgroundColor: pal.cardWhite,
                      borderRadius: 28,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 10,
                      shadowColor: pal.shadow,
                      shadowOpacity: 1,
                      shadowRadius: 6,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 2,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Upload size={18} color={pal.textSecondary} />
                    <Text style={{ color: pal.textSecondary, fontFamily: "Outfit-Bold", fontSize: 13 }}>
                      Upload
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Submit Button */}
              <Pressable
                onPress={submitUnifiedResponse}
                disabled={isSubmitting || (!feedbackDraft.trim() && !responseVideoAttachment)}
                style={({ pressed }) => ({
                  height: 58,
                  backgroundColor: pal.accent,
                  borderRadius: 28,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: (isSubmitting || (!feedbackDraft.trim() && !responseVideoAttachment)) ? 0.5 : pressed ? 0.85 : 1,
                  shadowColor: pal.accent,
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 4,
                })}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ color: "#FFFFFF", fontFamily: "Outfit-Bold", fontSize: 16 }}>
                    Send Feedback
                  </Text>
                )}
              </Pressable>
            </ThemedScrollView>
          </View>
          </KeyboardAvoidingView>
        </Modal>

        <BuiltinCamera
          visible={builtinCameraVisible}
          maxDurationSeconds={60}
          onCancel={() => setBuiltinCameraVisible(false)}
          onRecorded={(asset) => {
            void handleBuiltinCameraRecorded(asset);
          }}
        />
      </View>
    </NavigationRecoveryBoundary>
  );
}
