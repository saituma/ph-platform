import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import {
  View,
  Pressable,
  Animated,
  AppState,
  Image,
  ActivityIndicator,
  Linking,
  Dimensions,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { Text, TextInput } from "@/components/ScaledText";
import { useRole } from "@/context/RoleContext";
import { useSocket } from "@/context/SocketContext";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { useProgramPanel } from "./shared/useProgramPanel";
import { ProgramPanelCard } from "./shared/ProgramPanelCard";
import { ProgramPanelStatusBadge } from "./shared/ProgramPanelStatusBadge";

interface VideoItem {
  id: string;
  videoUrl: string;
  feedback: string | null;
  notes?: string;
  createdAt: string;
  programSectionContentId?: number | null;
}

interface CoachResponse {
  id: string;
  mediaUrl: string;
  text: string;
  createdAt: string | null;
  videoUploadId: number;
}

interface SelectedVideo {
  uri: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
}

interface OptimisticUpload {
  id: string;
  uri: string;
  progress: number;
  fileName: string;
  notes?: string;
  width?: number;
  height?: number;
  publicUrl?: string;
  submittedAt?: string;
}

export function VideoUploadPanel({
  refreshToken = 0,
  sectionContentId,
  sectionTitle,
}: {
  refreshToken?: number;
  sectionContentId?: number | null;
  sectionTitle?: string | null;
}) {
  const { token, profile, athleteUserId } = useAppSelector(
    (state) => state.user,
  );
  const { role } = useRole();
  const {
    isDark,
    colors,
    shadows,
    formatDate,
    formatBytes,
    scheduleLocalNotification,
  } = useProgramPanel();

  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preparingVideo, setPreparingVideo] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [videoItems, setVideoItems] = useState<VideoItem[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [coachResponses, setCoachResponses] = useState<CoachResponse[]>([]);

  const previousVideoItemsRef = useRef<
    { id: string; feedback: string | null }[]
  >([]);
  const previousCoachResponsesRef = useRef<string[]>([]);

  const [selectedVideo, setSelectedVideo] = useState<SelectedVideo | null>(
    null,
  );
  const previewAspectRatio =
    selectedVideo?.width && selectedVideo?.height
      ? selectedVideo.width / selectedVideo.height
      : undefined;
  const previewHeight = selectedVideo?.height ?? 240;
  const [optimisticUploads, setOptimisticUploads] = useState<
    OptimisticUpload[]
  >([]);

  const [reelPreview, setReelPreview] = useState<{
    id: string;
    uri: string;
    title?: string;
  } | null>(null);

  const { socket } = useSocket();
  const VIDEO_MAX_MB = 200;
  const VIDEO_MAX_BYTES = VIDEO_MAX_MB * 1024 * 1024;
  const canUploadForSection = Boolean(sectionContentId);

  const pendingKey = useMemo(() => {
    const base = athleteUserId ?? profile.id ?? "me";
    return sectionContentId
      ? `video-upload:pending:${base}:section:${sectionContentId}`
      : `video-upload:pending:${base}`;
  }, [athleteUserId, profile.id, sectionContentId]);

  const videoItemIdsRef = useRef<Set<number>>(new Set());

  // Persist optimistic uploads
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(pendingKey);
        if (!raw || cancelled) return;
        const items = JSON.parse(raw) as OptimisticUpload[];
        if (Array.isArray(items) && items.length) {
          setOptimisticUploads((prev) =>
            prev.length
              ? prev
              : items.map((u) => ({ ...u, progress: u.progress ?? 1 })),
          );
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [pendingKey]);

  useEffect(() => {
    const persist = async () => {
      try {
        const toStore = optimisticUploads
          .filter((u) => u.publicUrl)
          .map((u) => ({
            id: u.id,
            uri: u.publicUrl ?? u.uri,
            progress: u.progress ?? 1,
            fileName: u.fileName,
            notes: u.notes,
            width: u.width,
            height: u.height,
            publicUrl: u.publicUrl,
            submittedAt: u.submittedAt,
          }));
        await AsyncStorage.setItem(pendingKey, JSON.stringify(toStore));
      } catch {}
    };
    void persist();
  }, [optimisticUploads, pendingKey]);

  // Data Loading
  const loadVideos = useCallback(
    async (forceRefresh = false) => {
      if (!token) return;
      try {
        setLoadingVideos(true);
        const headers = athleteUserId
          ? { "X-Acting-User-Id": String(athleteUserId) }
          : undefined;
        const query = sectionContentId ? `?sectionContentId=${sectionContentId}` : "";
        const data = await apiRequest<any>(`/videos${query}`, {
          token,
          headers,
          suppressLog: true,
          forceRefresh,
        });
        const items = (data.items ?? []) as VideoItem[];
        setVideoItems(items);
        videoItemIdsRef.current = new Set(
          items
            .map((item) => Number(item.id))
            .filter((value) => Number.isFinite(value)),
        );

        setOptimisticUploads((prev) =>
          prev.filter(
            (upload) =>
              !upload.publicUrl ||
              !items.some(
                (item: VideoItem) => item.videoUrl === upload.publicUrl,
              ),
          ),
        );

        const previousById = new Map(
          previousVideoItemsRef.current.map((item) => [item.id, item]),
        );

        const newlyReviewed = items.filter(
          (item: VideoItem) =>
            item?.id &&
            item?.feedback &&
            previousById.has(item.id) &&
            !previousById.get(item.id)?.feedback,
        );

        if (newlyReviewed.length) {
          await scheduleLocalNotification(
            "Coach feedback",
            "Your video review has new feedback.",
            { type: "video-feedback" },
          );
        }

        previousVideoItemsRef.current = items.map((item: VideoItem) => ({
          id: item.id,
          feedback: item.feedback ?? null,
        }));
      } catch {
      } finally {
        setLoadingVideos(false);
      }
    },
    [athleteUserId, scheduleLocalNotification, token],
  );

  const loadCoachResponses = useCallback(
    async (forceRefresh = false) => {
      if (!token) return;
      try {
        setLoadingResponses(true);
        const effectiveUserId = athleteUserId
          ? Number(athleteUserId)
          : Number(profile.id);
        const headers = athleteUserId
          ? { "X-Acting-User-Id": String(athleteUserId) }
          : undefined;

        const data = await apiRequest<any>("/messages", {
          token,
          headers,
          suppressLog: true,
          forceRefresh,
        });

        let items = (data.messages ?? [])
          .filter(
            (msg: any) =>
              msg.contentType === "video" &&
              msg.mediaUrl &&
              Number(msg.senderId) !== effectiveUserId &&
              Number.isFinite(msg.videoUploadId),
          )
          .map((msg: any) => ({
            id: String(msg.id),
            mediaUrl: msg.mediaUrl,
            text: msg.content,
            createdAt: msg.createdAt ?? null,
            videoUploadId: msg.videoUploadId ?? undefined,
          }));

        if (sectionContentId && videoItemIdsRef.current.size) {
          const allowed = videoItemIdsRef.current;
          items = items.filter((item: CoachResponse) =>
            Number.isFinite(item.videoUploadId) && allowed.has(Number(item.videoUploadId))
          );
        }

        setCoachResponses(items);

        const previousIds = new Set(previousCoachResponsesRef.current);
        const newItems = items.filter(
          (item: CoachResponse) => item?.id && !previousIds.has(item.id),
        );

        if (newItems.length) {
          await scheduleLocalNotification(
            "Coach response video",
            "Your coach sent a response video.",
            { type: "coach-response-video" },
          );
        }
        previousCoachResponsesRef.current = items.map(
          (item: CoachResponse) => item.id,
        );
      } catch {
      } finally {
        setLoadingResponses(false);
      }
    },
    [athleteUserId, profile.id, scheduleLocalNotification, token],
  );

  useEffect(() => {
    void loadVideos();
    void loadCoachResponses();
  }, [loadCoachResponses, loadVideos, refreshToken]);

  // Socket Handling
  useEffect(() => {
    if (!socket) return;
    const handleVideoReviewed = (updatedUpload: any) => {
      setVideoItems((prev) =>
        prev.map((item) =>
          item.id === updatedUpload.id ? { ...item, ...updatedUpload } : item,
        ),
      );
    };
    const effectiveUserId = athleteUserId
      ? Number(athleteUserId)
      : Number(profile.id);
    const handleMessageNew = (message: any) => {
      if (!message) return;
      if (message.contentType !== "video") return;
      if (!message.mediaUrl) return;
      if (!Number.isFinite(Number(message.videoUploadId))) return;
      if (Number(message.senderId) === effectiveUserId) return;

      const id = String(message.id);
      setCoachResponses((prev) => {
        if (prev.some((item) => item.id === id)) return prev;
        const next = [
          ...prev,
          {
            id,
            mediaUrl: message.mediaUrl,
            text: message.content ?? "",
            createdAt: message.createdAt ?? null,
            videoUploadId: message.videoUploadId ?? undefined,
          },
        ];
        previousCoachResponsesRef.current = next.map((item) => item.id);
        return next;
      });
    };
    socket.on("video:reviewed", handleVideoReviewed);
    socket.on("message:new", handleMessageNew);
    return () => {
      socket.off("video:reviewed", handleVideoReviewed);
      socket.off("message:new", handleMessageNew);
    };
  }, [socket, athleteUserId, profile.id]);

  // Memoized Derived Data
  const awaitingVideos = useMemo(
    () => videoItems.filter((item) => !item.feedback),
    [videoItems],
  );
  const reviewedVideos = useMemo(
    () => videoItems.filter((item) => Boolean(item.feedback)),
    [videoItems],
  );

  // Media Selection & Upload
  const pickVideo = async (source: "library" | "camera") => {
    if (!token) return;
    if (!canUploadForSection) {
      setStatus("Select a training section to upload a video.");
      return;
    }
    setStatus(null);
    try {
      setPreparingVideo(true);
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted)
          throw new Error("Camera permission is required.");
      } else {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted)
          throw new Error("Media library permission is required.");
      }

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Videos,
              quality: 0.9,
              allowsEditing: false,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Videos,
              quality: 0.9,
              allowsEditing: false,
            });

      if (result.canceled || !result.assets?.[0]?.uri) return;
      const asset = result.assets[0];
      const uri = asset.uri;
      const fileName = uri.split("/").pop() ?? `upload-${Date.now()}.mp4`;
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const sizeBytes = fileInfo.exists ? fileInfo.size : 0;

      if (sizeBytes > VIDEO_MAX_BYTES)
        throw new Error(`Video exceeds ${VIDEO_MAX_MB}MB limit.`);

      setSelectedVideo({
        uri,
        fileName,
        contentType: asset.mimeType || "video/mp4",
        sizeBytes,
        width: asset.width,
        height: asset.height,
      });

      setStatus("Preview your video and confirm before sending.");
    } catch (error: any) {
      setStatus(error?.message ?? "Video selection failed.");
    } finally {
      setPreparingVideo(false);
    }
  };

  const handleSubmitVideo = async () => {
    if (!token || !selectedVideo) return;
    if (!canUploadForSection) {
      setStatus("Select a training section to upload a video.");
      return;
    }
    Alert.alert(
      "Confirm Send",
      "Send this video and notes to your coach for review?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: async () => {
            const tempId = `temp-${Date.now()}`;
            const uploadNotes = notes.trim();
            let currentVideo: SelectedVideo | null = selectedVideo;

            try {
              setUploading(true);
              setStatus(null);
              const headers = athleteUserId
                ? { "X-Acting-User-Id": String(athleteUserId) }
                : undefined;

              setOptimisticUploads((prev) => [
                {
                  id: tempId,
                  uri: selectedVideo.uri,
                  progress: 0,
                  fileName: selectedVideo.fileName,
                  notes: uploadNotes || undefined,
                  width: selectedVideo.width,
                  height: selectedVideo.height,
                },
                ...prev,
              ]);
              setSelectedVideo(null);
              setNotes("");

              const blob = await (await fetch(currentVideo.uri)).blob();

              const presign = await apiRequest<{
                uploadUrl: string;
                publicUrl: string;
              }>("/media/presign", {
                method: "POST",
                token,
                headers,
                body: {
                  folder: "video-uploads",
                  fileName: currentVideo.fileName,
                  contentType: currentVideo.contentType,
                  sizeBytes: currentVideo.sizeBytes,
                },
              });

              await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("PUT", presign.uploadUrl);
                xhr.setRequestHeader("Content-Type", currentVideo.contentType);

                xhr.upload.onprogress = (event) => {
                  if (event.lengthComputable) {
                    setOptimisticUploads((prev) =>
                      prev.map((u) =>
                        u.id === tempId
                          ? { ...u, progress: event.loaded / event.total }
                          : u,
                      ),
                    );
                  }
                };

                xhr.onload = () =>
                  xhr.status >= 200 && xhr.status < 300
                    ? resolve(true)
                    : reject(new Error(`Status ${xhr.status}`));
                xhr.onerror = () => reject(new Error("Storage upload failed"));
                xhr.send(blob);
              });

              await apiRequest("/videos", {
                method: "POST",
                token,
                headers,
                body: {
                  videoUrl: presign.publicUrl,
                  notes: uploadNotes || undefined,
                  programSectionContentId: sectionContentId ?? undefined,
                },
              });

              await scheduleLocalNotification(
                "Video uploaded",
                "Your video was submitted for review.",
                { type: "video-upload" },
              );

              await loadVideos();

              setOptimisticUploads((prev) =>
                prev.map((u) =>
                  u.id === tempId
                    ? {
                        ...u,
                        progress: 1,
                        publicUrl: presign.publicUrl,
                        uri: presign.publicUrl,
                        submittedAt: new Date().toISOString(),
                      }
                    : u,
                ),
              );
              setStatus("Video submitted for coach review.");
            } catch (error: any) {
              setOptimisticUploads((prev) =>
                prev.filter((u) => u.id !== tempId),
              );
              setStatus(error?.message ?? "Upload failed.");
              setSelectedVideo(currentVideo);
            } finally {
              setUploading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ProgramPanelCard className="p-0">
      {/* Header */}
      <View className="px-5 pt-6 pb-5">
        <View className="flex-row items-center justify-between">
          <View>
            <Text
              className="text-[11px] font-outfit font-semibold uppercase tracking-[1.8px]"
              style={{ color: colors.textSecondary }}
            >
              Premium Review
            </Text>
            <Text
              className="mt-1 text-3xl font-telma-bold font-bold tracking-tight"
              style={{ color: colors.text }}
            >
              Video Review
            </Text>
          </View>
          <ProgramPanelStatusBadge label="Coach Review" variant="default" />
        </View>
        {sectionTitle ? (
          <Text
            className="mt-3 text-xs font-outfit uppercase tracking-widest"
            style={{ color: colors.textSecondary }}
          >
            Uploading for: {sectionTitle}
          </Text>
        ) : null}
        <Text
          className="mt-2 text-sm font-outfit leading-6"
          style={{ color: colors.textSecondary }}
        >
          One focused clip per upload. Tell your coach exactly what to look for.
        </Text>
      </View>

      {!canUploadForSection ? (
        <View
          className="mx-5 mb-6 rounded-3xl p-4 border"
          style={{
            backgroundColor: colors.warningSoft,
            borderColor: colors.warning,
          }}
        >
          <Text className="text-sm font-outfit" style={{ color: colors.warning }}>
            Select a training module with video uploads enabled to start.
          </Text>
        </View>
      ) : null}

      {/* Quick Tips Banner */}
      <View
        className="mx-5 mb-6 rounded-3xl p-5 border"
        style={{
          backgroundColor: colors.cardElevated,
          borderColor: colors.border,
        }}
      >
        <View className="flex-row items-center gap-3 mb-4">
          <View
            className="h-10 w-10 rounded-2xl items-center justify-center"
            style={{ backgroundColor: colors.accentLight }}
          >
            <Feather name="target" size={20} color={colors.accent} />
          </View>
          <Text
            className="text-sm font-outfit font-semibold uppercase tracking-[1.6px]"
            style={{ color: colors.text }}
          >
            Keep it focused
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {["Full rep visible", "Good lighting", "< 200 MB"].map((tip) => (
            <View
              key={tip}
              className="rounded-xl px-3 py-1.5 border"
              style={{
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              }}
            >
              <Text
                className="text-xs font-outfit font-medium"
                style={{ color: colors.textSecondary }}
              >
                {tip}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Notes Input */}
      <View
        className="mx-5 mb-6 rounded-3xl p-5 border"
        style={{
          backgroundColor: colors.inputBackground,
          borderColor: colors.border,
        }}
      >
        <Text
          className="text-[11px] font-outfit font-semibold uppercase tracking-[1.4px] mb-2"
          style={{ color: colors.textSecondary }}
        >
          Coach Notes
        </Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="What should your coach focus on? (optional)"
          placeholderTextColor={colors.placeholder}
          multiline
          className="text-base font-outfit min-h-[100px]"
          style={{
            backgroundColor: "transparent",
            color: colors.text,
            textAlignVertical: "top", // ensure alignment for multiline
          }}
        />
      </View>

      {/* Upload / Record Buttons */}
      <View className="flex-row gap-4 px-5 mb-6">
        <TouchableOpacity
          onPress={() => pickVideo("camera")}
          disabled={uploading || !canUploadForSection}
          className="flex-1 rounded-3xl py-5 items-center border"
          style={{
            backgroundColor: colors.accent,
            borderColor: colors.accent,
          }}
        >
          <Feather name="video" size={22} color="#ffffff" />
          <Text
            className="mt-3 text-sm font-outfit font-bold uppercase tracking-[1.6px]"
            style={{ color: "#ffffff" }}
          >
            Record
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => pickVideo("library")}
          disabled={uploading || !canUploadForSection}
          className="flex-1 rounded-3xl py-5 items-center border"
          style={{
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
          }}
        >
          <Feather name="upload" size={22} color={colors.accent} />
          <Text
            className="mt-3 text-sm font-outfit font-semibold uppercase tracking-[1.4px]"
            style={{ color: colors.text }}
          >
            Upload
          </Text>
        </TouchableOpacity>
      </View>

      <Text
        className="mx-5 mb-6 text-xs font-outfit"
        style={{ color: colors.textSecondary, opacity: 0.8 }}
      >
        Max video size: {VIDEO_MAX_MB}MB.
      </Text>

      {/* Submit CTA */}
      {selectedVideo && (
        <TouchableOpacity
          onPress={handleSubmitVideo}
          disabled={uploading}
          className={`mx-5 mb-8 rounded-3xl py-5 items-center flex-row justify-center gap-3 ${
            uploading ? "opacity-60" : ""
          }`}
          style={{ backgroundColor: colors.accent }}
        >
          {uploading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Feather name="send" size={20} color="#ffffff" />
          )}
          <Text className="text-base font-outfit font-bold text-white tracking-[1.2px] uppercase">
            {uploading ? "Sending..." : "Send to Coach"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Video Preview */}
      {selectedVideo && !preparingVideo && (
        <View
          className="mx-5 mb-8 rounded-3xl overflow-hidden border"
          style={{
            backgroundColor: colors.cardElevated,
            borderColor: colors.border,
            ...shadows.md,
          }}
        >
          <View
            className="p-5 border-b"
            style={{ borderBottomColor: colors.separator }}
          >
            <Text
              className="text-base font-outfit font-semibold uppercase tracking-[1.6px]"
              style={{ color: colors.text }}
            >
              Preview Clip
            </Text>
          </View>
          <VideoPlayer
            uri={selectedVideo.uri}
            cinematic={false}
            height={previewHeight}
            contentFitOverride="contain"
            showLoadingOverlay
            ignoreTabFocus
            initialAspectRatio={previewAspectRatio}
          />
          <View className="p-5 flex-row items-center justify-between">
            <View className="flex-row gap-3">
              <View
                className="rounded-xl px-3 py-1.5 border"
                style={{
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                }}
              >
                <Text
                  className="text-xs font-outfit font-medium"
                  style={{ color: colors.textSecondary }}
                >
                  MP4
                </Text>
              </View>
              <View
                className="rounded-xl px-3 py-1.5 border"
                style={{
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                }}
              >
                <Text
                  className="text-xs font-outfit font-medium"
                  style={{ color: colors.textSecondary }}
                >
                  {formatBytes(selectedVideo.sizeBytes)}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setSelectedVideo(null)}>
              <Feather name="trash-2" size={22} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Upload History */}
      <View className="px-5">
        <Text
          className="text-2xl font-telma-bold font-bold mb-4 tracking-tight"
          style={{ color: colors.text }}
        >
          Your Uploads
        </Text>
        <ScrollView
          className="max-h-[520px]"
          refreshControl={
            <RefreshControl
              tintColor={colors.tint}
              refreshing={loadingVideos || loadingResponses}
              onRefresh={() => {
                void loadVideos(true);
                void loadCoachResponses(true);
              }}
            />
          }
        >
          {loadingVideos &&
          videoItems.length === 0 &&
          optimisticUploads.length === 0 ? (
            <Text
              className="text-center py-10"
              style={{ color: colors.textSecondary }}
            >
              Loading...
            </Text>
          ) : videoItems.length === 0 && optimisticUploads.length === 0 ? (
            <Text
              className="text-center py-10 italic"
              style={{ color: colors.textSecondary }}
            >
              No videos yet. Start recording or uploading.
            </Text>
          ) : (
            <View className="space-y-6 pb-10">
              {/* Awaiting Review */}
              {(awaitingVideos.length > 0 || optimisticUploads.length > 0) && (
                <View>
                  <View className="flex-row items-center justify-between mb-4">
                    <Text
                      className="text-[11px] font-outfit font-bold uppercase tracking-[2px]"
                      style={{ color: colors.warning }}
                    >
                      Awaiting Review
                    </Text>
                    <View
                      className="rounded-full px-3 py-1"
                      style={{ backgroundColor: colors.warningSoft }}
                    >
                      <Text
                        className="text-[11px] font-bold"
                        style={{ color: colors.warning }}
                      >
                        {awaitingVideos.length + optimisticUploads.length}
                      </Text>
                    </View>
                  </View>

                  {optimisticUploads.map((u) => (
                    <TouchableOpacity
                      key={u.id}
                      onPress={() =>
                        setReelPreview({
                          id: u.id,
                          uri: u.uri,
                          title: "Uploading preview",
                        })
                      }
                      className="rounded-3xl overflow-hidden mb-4 border"
                      style={{
                        backgroundColor: colors.cardElevated,
                        borderColor: colors.border,
                        ...shadows.sm,
                      }}
                    >
                      <View className="h-56 bg-black/80 items-center justify-center relative">
                        <Feather
                          name="play-circle"
                          size={64}
                          color="#ffffff"
                          style={{ opacity: 0.8 }}
                        />
                      </View>
                      <View className="p-5">
                        <Text
                          className="text-sm font-outfit font-semibold mb-1"
                          style={{ color: colors.text }}
                        >
                          {u.progress < 1 ? "Uploading..." : "Submitted"}
                        </Text>
                        <Text
                          className="text-sm"
                          style={{ color: colors.textSecondary }}
                        >
                          {u.notes || "No notes"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}

                  {awaitingVideos.map((item: VideoItem) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() =>
                        setReelPreview({
                          id: item.id,
                          uri: item.videoUrl,
                          title: "Awaiting review",
                        })
                      }
                      className="rounded-3xl overflow-hidden mb-4 border"
                      style={{
                        backgroundColor: colors.cardElevated,
                        borderColor: colors.border,
                        ...shadows.sm,
                      }}
                    >
                      <View className="h-56 bg-black/80 items-center justify-center">
                        <Feather
                          name="play-circle"
                          size={64}
                          color="#ffffff"
                          style={{ opacity: 0.8 }}
                        />
                      </View>
                      <View className="p-5">
                        <Text
                          className="text-sm font-outfit font-semibold mb-1"
                          style={{ color: colors.text }}
                        >
                          Awaiting Feedback
                        </Text>
                        <Text
                          className="text-sm"
                          style={{ color: colors.textSecondary }}
                        >
                          {item.notes || "No notes added"}
                        </Text>
                        <Text
                          className="text-[11px] mt-2 uppercase tracking-[1.2px]"
                          style={{ color: colors.textSecondary, opacity: 0.7 }}
                        >
                          {formatDate(item.createdAt)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Reviewed */}
              {reviewedVideos.length > 0 && (
                <View>
                  <View className="flex-row items-center justify-between mb-4">
                    <Text
                      className="text-[11px] font-outfit font-bold uppercase tracking-[2px]"
                      style={{ color: colors.success }}
                    >
                      Reviewed
                    </Text>
                    <View
                      className="rounded-full px-3 py-1"
                      style={{ backgroundColor: colors.successSoft }}
                    >
                      <Text
                        className="text-[11px] font-bold"
                        style={{ color: colors.success }}
                      >
                        {reviewedVideos.length}
                      </Text>
                    </View>
                  </View>

                  {reviewedVideos.map((item: VideoItem) => (
                    // Attach coach replies that match this upload
                    // (videoUploadId is numeric in CoachResponse)
                    // Map to simple lookup for rendering below.
                    <TouchableOpacity
                      key={item.id}
                      onPress={() =>
                        setReelPreview({
                          id: item.id,
                          uri: item.videoUrl,
                          title: "Reviewed video",
                        })
                      }
                      className="rounded-3xl overflow-hidden mb-4 border"
                      style={{
                        backgroundColor: colors.cardElevated,
                        borderColor: colors.border,
                        ...shadows.sm,
                      }}
                    >
                      <View className="h-56 bg-black/80 items-center justify-center">
                        <Feather
                          name="play-circle"
                          size={64}
                          color="#ffffff"
                          style={{ opacity: 0.8 }}
                        />
                      </View>
                      <View className="p-5">
                        <Text
                          className="text-sm font-outfit font-semibold mb-2"
                          style={{ color: colors.text }}
                        >
                          Coach Feedback
                        </Text>
                        <Text
                          className="text-sm leading-6"
                          style={{ color: colors.textSecondary }}
                        >
                          {item.feedback}
                        </Text>
                        {coachResponses
                          .filter(
                            (resp) =>
                              resp.videoUploadId != null &&
                              String(resp.videoUploadId) === String(item.id),
                          )
                          .map((resp) => (
                            <TouchableOpacity
                              key={resp.id}
                              onPress={() =>
                                setReelPreview({
                                  id: resp.id,
                                  uri: resp.mediaUrl,
                                  title: "Coach reply",
                                })
                              }
                              className="mt-4 rounded-2xl overflow-hidden border"
                              style={{
                                backgroundColor: colors.backgroundSecondary,
                                borderColor: colors.border,
                              }}
                            >
                              <View className="h-40 bg-black/80 items-center justify-center">
                                <Feather
                                  name="play-circle"
                                  size={48}
                                  color="#ffffff"
                                  style={{ opacity: 0.8 }}
                                />
                              </View>
                              <View className="p-4">
                                <Text
                                  className="text-[11px] font-outfit font-semibold uppercase tracking-[1.6px] mb-1"
                                  style={{ color: colors.text }}
                                >
                                  Coach Reply
                                </Text>
                                {resp.text ? (
                                  <Text
                                    className="text-sm"
                                    style={{ color: colors.textSecondary }}
                                  >
                                    {resp.text}
                                  </Text>
                                ) : (
                                  <Text
                                    className="text-sm italic"
                                    style={{ color: colors.textSecondary }}
                                  >
                                    Video response
                                  </Text>
                                )}
                                {resp.createdAt && (
                                  <Text
                                    className="text-[11px] mt-2 uppercase tracking-[1.2px]"
                                    style={{
                                      color: colors.textSecondary,
                                      opacity: 0.7,
                                    }}
                                  >
                                    {formatDate(resp.createdAt)}
                                  </Text>
                                )}
                              </View>
                            </TouchableOpacity>
                          ))}
                        {item.notes && (
                          <Text
                            className="text-xs mt-3 italic"
                            style={{
                              color: colors.textSecondary,
                              opacity: 0.8,
                            }}
                          >
                            Notes: {item.notes}
                          </Text>
                        )}
                        <Text
                          className="text-[11px] mt-3 uppercase tracking-[1.2px]"
                          style={{ color: colors.textSecondary, opacity: 0.7 }}
                        >
                          {formatDate(item.createdAt)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Full-screen Preview Modal */}
      <Modal
        visible={Boolean(reelPreview)}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setReelPreview(null)}
      >
        <View className="flex-1 bg-black">
          {reelPreview && (
            <VideoPlayer
              key={reelPreview.uri}
              uri={reelPreview.uri}
              cacheKey={reelPreview.id}
              height={screenHeight}
              contentFitOverride="cover"
              immersive
              autoPlay
              initialMuted={false}
              ignoreTabFocus
              hideTopChrome
              hideCenterControls
            />
          )}
          <View className="absolute bottom-10 left-6 right-6">
            <TouchableOpacity
              onPress={() => setReelPreview(null)}
              className="bg-black/60 rounded-full px-6 py-3 flex-row items-center justify-center gap-2 border border-white/20"
            >
              <Feather name="chevron-left" size={20} color="white" />
              <Text className="text-base font-outfit text-white">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ProgramPanelCard>
  );
}
