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
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { Text } from "@/components/ScaledText";
import {
  UIButton,
  UICard,
  UIChip,
  UIEmptyState,
  UISectionHeader,
  UITextArea,
} from "@/components/ui/hero";
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

type UploadPhase = "presign" | "uploading" | "finalizing";

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
  const {
    isDark,
    colors,
    shadows,
    formatDate,
    formatBytes,
    scheduleLocalNotification,
  } = useProgramPanel();

  const { height: screenHeight } = Dimensions.get("window");

  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase | null>(null);
  const [uploadingPreviewUri, setUploadingPreviewUri] = useState<string | null>(null);
  const [uploadByteProgressUnknown, setUploadByteProgressUnknown] = useState(false);
  const uploadByteUnknownRef = useRef(false);
  const [preparingVideo, setPreparingVideo] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [videoItems, setVideoItems] = useState<VideoItem[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [coachResponses, setCoachResponses] = useState<CoachResponse[]>([]);

  const previousVideoItemsRef = useRef<
    { id: string; feedback: string | null }[]
  >([]);
  const previousCoachResponsesRef = useRef<string[]>([]);

  const [selectedVideo, setSelectedVideo] = useState<SelectedVideo | null>(
    null,
  );
  const previewHeight = selectedVideo?.height ?? 240;
  const [optimisticUploads, setOptimisticUploads] = useState<
    OptimisticUpload[]
  >([]);

  const [reelPreview, setReelPreview] = useState<{
    id: string;
    uri: string;
    title?: string;
  } | null>(null);
  const uploadProgressRef = useRef<{ value: number; ts: number }>({
    value: 0,
    ts: 0,
  });

  const { socket } = useSocket();
  const VIDEO_MAX_MB = 200;
  const VIDEO_MAX_BYTES = VIDEO_MAX_MB * 1024 * 1024;
  const canUploadForSection = true;

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
    [athleteUserId, scheduleLocalNotification, sectionContentId, token],
  );

  const loadCoachResponses = useCallback(
    async (forceRefresh = false) => {
      if (!token) return;
      try {
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
      }
    },
    [athleteUserId, profile.id, scheduleLocalNotification, sectionContentId, token],
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
  const coachResponsesByUploadId = useMemo(() => {
    const map = new Map<string, CoachResponse[]>();
    coachResponses.forEach((response) => {
      const key = String(response.videoUploadId);
      const items = map.get(key) ?? [];
      items.push(response);
      map.set(key, items);
    });
    return map;
  }, [coachResponses]);
  const totalUploads = videoItems.length + optimisticUploads.length;
  const feedbackReadyCount = reviewedVideos.length + coachResponses.length;

  const inFlightOptimistic = useMemo(
    () => optimisticUploads.find((u) => !u.publicUrl),
    [optimisticUploads],
  );
  const showUploadBanner = uploading;
  const bannerProgress = inFlightOptimistic?.progress ?? 0;

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
    const tempId = `temp-${Date.now()}`;
    const uploadNotes = notes.trim();
    const currentVideo = selectedVideo;

    const updateOptimisticProgress = (nextProgress: number, force = false) => {
      const clamped = Math.max(0, Math.min(1, nextProgress));
      const now = Date.now();
      const shouldSkip =
        !force &&
        clamped > 0 &&
        clamped < 1 &&
        now - uploadProgressRef.current.ts < 120 &&
        Math.abs(clamped - uploadProgressRef.current.value) < 0.03;

      if (shouldSkip) return;

      uploadProgressRef.current = { value: clamped, ts: now };
      setOptimisticUploads((prev) =>
        prev.map((u) =>
          u.id === tempId ? { ...u, progress: clamped } : u,
        ),
      );
    };

    try {
      setUploading(true);
      setUploadPhase("presign");
      setUploadingPreviewUri(currentVideo.uri);
      uploadByteUnknownRef.current = false;
      setUploadByteProgressUnknown(false);
      setStatus("Preparing upload...");
      const headers = athleteUserId
        ? { "X-Acting-User-Id": String(athleteUserId) }
        : undefined;

      setOptimisticUploads((prev) => [
        {
          id: tempId,
          uri: currentVideo.uri,
          progress: 0,
          fileName: currentVideo.fileName,
          notes: uploadNotes || undefined,
          width: currentVideo.width,
          height: currentVideo.height,
        },
        ...prev,
      ]);
      updateOptimisticProgress(0, true);
      setSelectedVideo(null);
      setNotes("");

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

      setUploadPhase("uploading");
      setStatus("Uploading video...");
      uploadProgressRef.current = { value: 0, ts: Date.now() };

      const uploadTask = FileSystem.createUploadTask(
        presign.uploadUrl,
        currentVideo.uri,
        {
          httpMethod: "PUT",
          headers: {
            "Content-Type": currentVideo.contentType,
          },
        },
        (progress) => {
          const total = progress.totalBytesExpectedToSend;
          if (!total || total <= 0) {
            if (!uploadByteUnknownRef.current) {
              uploadByteUnknownRef.current = true;
              setUploadByteProgressUnknown(true);
            }
            updateOptimisticProgress(0, true);
            return;
          }
          if (uploadByteUnknownRef.current) {
            uploadByteUnknownRef.current = false;
            setUploadByteProgressUnknown(false);
          }
          updateOptimisticProgress(progress.totalBytesSent / total);
        },
      );

      const uploadResult = await uploadTask.uploadAsync();
      if (!uploadResult || uploadResult.status < 200 || uploadResult.status >= 300) {
        throw new Error(
          uploadResult ? `Upload failed (${uploadResult.status}).` : "Upload failed.",
        );
      }

      updateOptimisticProgress(1, true);
      uploadByteUnknownRef.current = false;
      setUploadByteProgressUnknown(false);
      setUploadPhase("finalizing");
      setStatus("Finalizing upload...");

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

      void scheduleLocalNotification(
        "Video uploaded",
        "Your video was submitted for review.",
        { type: "video-upload" },
      );
      void loadVideos();
    } catch (error: any) {
      setOptimisticUploads((prev) => prev.filter((u) => u.id !== tempId));
      setStatus(error?.message ?? "Upload failed.");
      setSelectedVideo(currentVideo);
      setNotes(uploadNotes);
    } finally {
      uploadByteUnknownRef.current = false;
      setUploadByteProgressUnknown(false);
      setUploadPhase(null);
      setUploadingPreviewUri(null);
      setUploading(false);
    }
  };

  return (
    <ProgramPanelCard className="p-0">
      {/* Header */}
      <View className="px-5 pt-6 pb-5">
        <UISectionHeader
          eyebrow="Premium Review"
          title="Video Review"
          description="One focused clip per upload. Tell your coach exactly what to look for."
          rightSlot={<ProgramPanelStatusBadge label="Coach Review" variant="default" />}
        />
        {sectionTitle ? (
          <Text
            className="mt-3 text-xs font-outfit uppercase tracking-widest"
            style={{ color: colors.textSecondary }}
          >
            Uploading for: {sectionTitle}
          </Text>
        ) : null}
      </View>

      {!canUploadForSection ? (
        <View
          className="mx-5 mb-6 rounded-3xl p-4"
          style={{
            backgroundColor: colors.warningSoft,
            shadowColor: isDark ? "#00000000" : "#f59e0b",
            shadowOpacity: isDark ? 0 : 0.08,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: isDark ? 0 : 2,
          }}
        >
          <Text className="text-sm font-outfit" style={{ color: colors.warning }}>
            Select a training module with video uploads enabled to start.
          </Text>
        </View>
      ) : null}

      <View className="mx-5 mb-6 gap-4">
        <UICard className="rounded-3xl px-5 py-5">
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text
                className="text-[11px] font-outfit font-semibold uppercase tracking-[1.6px]"
                style={{ color: colors.textSecondary }}
              >
                Session Snapshot
              </Text>
              <Text
                className="mt-1 font-clash text-2xl"
                style={{ color: colors.text }}
              >
                Upload with clarity
              </Text>
              <Text
                className="mt-2 font-outfit text-sm leading-6"
                style={{ color: colors.textSecondary }}
              >
                Coaches give better feedback when the rep is visible, the goal is obvious, and your note is specific.
              </Text>
            </View>
            <View
              className="h-12 w-12 items-center justify-center rounded-[20px]"
              style={{ backgroundColor: colors.accentLight }}
            >
              <Feather name="zap" size={20} color={colors.accent} />
            </View>
          </View>

          <View className="mt-5 flex-row flex-wrap gap-3">
            <View
              className="min-w-[31%] flex-1 rounded-[22px] border px-4 py-4"
              style={{
                backgroundColor: colors.backgroundSecondary,
                borderColor: "transparent",
                shadowColor: isDark ? "#00000000" : "#0f172a",
                shadowOpacity: isDark ? 0 : 0.04,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: isDark ? 0 : 2,
              }}
            >
              <Text className="font-clash text-2xl" style={{ color: colors.text }}>
                {totalUploads}
              </Text>
              <Text className="mt-1 font-outfit text-[11px] uppercase tracking-[1.3px]" style={{ color: colors.textSecondary }}>
                Total Uploads
              </Text>
            </View>
            <View
              className="min-w-[31%] flex-1 rounded-[22px] border px-4 py-4"
              style={{
                backgroundColor: colors.warningSoft,
                borderColor: "transparent",
                shadowColor: isDark ? "#00000000" : "#f59e0b",
                shadowOpacity: isDark ? 0 : 0.06,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: isDark ? 0 : 2,
              }}
            >
              <Text className="font-clash text-2xl" style={{ color: colors.warning }}>
                {awaitingVideos.length + optimisticUploads.length}
              </Text>
              <Text className="mt-1 font-outfit text-[11px] uppercase tracking-[1.3px]" style={{ color: colors.warning }}>
                Waiting
              </Text>
            </View>
            <View
              className="min-w-[31%] flex-1 rounded-[22px] border px-4 py-4"
              style={{
                backgroundColor: colors.successSoft,
                borderColor: "transparent",
                shadowColor: isDark ? "#00000000" : "#10b981",
                shadowOpacity: isDark ? 0 : 0.06,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: isDark ? 0 : 2,
              }}
            >
              <Text className="font-clash text-2xl" style={{ color: colors.success }}>
                {feedbackReadyCount}
              </Text>
              <Text className="mt-1 font-outfit text-[11px] uppercase tracking-[1.3px]" style={{ color: colors.success }}>
                Feedback Items
              </Text>
            </View>
          </View>
        </UICard>

        <UICard className="rounded-3xl px-5 py-5">
          <View className="mb-4 flex-row items-center gap-3">
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
              <UIChip
                key={tip}
                label={tip}
                className="rounded-xl px-3 py-1.5"
                textClassName="text-xs font-medium normal-case tracking-normal"
              />
            ))}
          </View>
        </UICard>
      </View>

      {/* Notes Input */}
      <View
        className="mx-5 mb-6 rounded-3xl p-5"
        style={{
          backgroundColor: colors.inputBackground,
          shadowColor: isDark ? "#00000000" : "#0f172a",
          shadowOpacity: isDark ? 0 : 0.08,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: isDark ? 0 : 4,
        }}
      >
        <Text
          className="text-[11px] font-outfit font-semibold uppercase tracking-[1.4px] mb-2"
          style={{ color: colors.textSecondary }}
        >
          Coach Notes
        </Text>
        <UITextArea
          value={notes}
          onChangeText={setNotes}
          placeholder="What should your coach focus on? (optional)"
          placeholderTextColor={colors.placeholder}
          className="text-base"
        />
      </View>

      {/* Upload / Record Buttons */}
      <View className="px-5 mb-6">
        <Text
          className="mb-3 text-[11px] font-outfit font-semibold uppercase tracking-[1.4px]"
          style={{ color: colors.textSecondary }}
        >
          Choose capture mode
        </Text>
        <View className="flex-row gap-4">
        <UIButton
          onPress={() => pickVideo("camera")}
          isDisabled={uploading || !canUploadForSection}
          className="flex-1 items-center rounded-3xl py-5"
          style={{
            backgroundColor: isDark ? colors.accent : "#f0fdf4",
            shadowColor: isDark ? "#00000000" : "#166534",
            shadowOpacity: isDark ? 0 : 0.14,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: isDark ? 0 : 6,
          }}
        >
          <View
            className="h-12 w-12 items-center justify-center rounded-[20px]"
            style={{
              backgroundColor: isDark
                ? "rgba(255,255,255,0.15)"
                : "#166534",
            }}
          >
            <Feather name="video" size={22} color="#ffffff" />
          </View>
          <Text
            className="mt-3 text-sm font-outfit font-bold uppercase tracking-[1.6px]"
            style={{ color: isDark ? "#ffffff" : "#14532d" }}
          >
            Record
          </Text>
          <Text
            className="mt-1 text-center font-outfit text-xs"
            style={{
              color: isDark
                ? "rgba(255,255,255,0.78)"
                : "rgba(20,83,45,0.82)",
            }}
          >
            Capture a new rep right now
          </Text>
        </UIButton>
        <UIButton
          onPress={() => pickVideo("library")}
          variant="secondary"
          isDisabled={uploading || !canUploadForSection}
          className="flex-1 items-center rounded-3xl py-5"
        >
          <View className="h-12 w-12 items-center justify-center rounded-[20px]" style={{ backgroundColor: colors.accentLight }}>
            <Feather name="upload" size={22} color={colors.accent} />
          </View>
          <Text
            className="mt-3 text-sm font-outfit font-semibold uppercase tracking-[1.4px]"
            style={{ color: colors.text }}
          >
            Upload
          </Text>
          <Text className="mt-1 text-center font-outfit text-xs" style={{ color: colors.textSecondary }}>
            Choose a clip from your library
          </Text>
        </UIButton>
        </View>
      </View>

      <Text
        className="mx-5 mb-6 text-xs font-outfit"
        style={{ color: colors.textSecondary, opacity: 0.8 }}
      >
        Max video size: {VIDEO_MAX_MB}MB.
      </Text>
      {status ? (
        <View
          className="mx-5 mb-6 rounded-2xl px-4 py-3"
          style={{
            backgroundColor: status.toLowerCase().includes("failed")
              ? colors.dangerSoft
              : colors.accentLight,
            shadowColor: isDark
              ? "#00000000"
              : status.toLowerCase().includes("failed")
                ? "#ef4444"
                : "#22c55e",
            shadowOpacity: isDark ? 0 : 0.07,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: isDark ? 0 : 2,
          }}
        >
          <Text
            className="font-outfit text-sm"
            style={{
              color: status.toLowerCase().includes("failed")
                ? colors.danger
                : colors.accent,
            }}
          >
            {status}
          </Text>
        </View>
      ) : null}

      {showUploadBanner ? (
        <UICard
          className="mx-5 mb-5 overflow-hidden rounded-[26px] px-4 py-3"
          style={{
            backgroundColor: colors.cardElevated,
            borderColor: colors.border,
            ...shadows.md,
          }}
        >
          <View className="flex-row items-center gap-3">
            <View
              className="h-12 w-12 overflow-hidden rounded-2xl items-center justify-center"
              style={{ backgroundColor: isDark ? "#0b0b0b" : colors.heroSurfaceMuted }}
            >
              {uploadingPreviewUri ? (
                <VideoPlayer
                  uri={uploadingPreviewUri}
                  height={48}
                  autoPlay={false}
                  shouldPlay={false}
                  initialMuted
                  ignoreTabFocus
                  showLoadingOverlay={false}
                  useVideoResolution={false}
                  contentFitOverride="cover"
                  hideCenterControls
                  hideTopChrome
                />
              ) : (
                <Feather name="film" size={26} color={colors.accent} />
              )}
            </View>
            <View className="flex-1">
              <Text className="font-outfit text-[13px] font-semibold" style={{ color: colors.text }}>
                {uploadPhase === "presign"
                  ? "Getting upload link…"
                  : uploadPhase === "finalizing"
                    ? "Saving to your coach…"
                    : uploadByteProgressUnknown
                      ? "Uploading…"
                      : "Uploading to secure storage…"}
              </Text>
              {uploadByteProgressUnknown && uploadPhase === "uploading" ? (
                <Text className="mt-0.5 font-outfit text-[11px]" style={{ color: colors.textSecondary }}>
                  Progress will appear when your device reports file size.
                </Text>
              ) : null}
              {uploadByteProgressUnknown && uploadPhase === "uploading" ? (
                <View className="mt-2 flex-row items-center gap-2">
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text className="font-outfit text-[11px]" style={{ color: colors.textSecondary }}>
                    Working…
                  </Text>
                </View>
              ) : (
                <View
                  className="mt-2 h-1.5 w-full overflow-hidden rounded-full"
                  style={{ backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)" }}
                >
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(0, Math.round(bannerProgress * 100)))}%`,
                      backgroundColor: colors.accent,
                    }}
                  />
                </View>
              )}
              {!uploadByteProgressUnknown || uploadPhase !== "uploading" ? (
                <Text className="mt-1.5 font-outfit text-[11px] font-semibold" style={{ color: colors.accent }}>
                  {uploadPhase === "finalizing"
                    ? "Almost done"
                    : uploadPhase === "presign"
                      ? "Starting…"
                      : `${Math.round(bannerProgress * 100)}%`}
                </Text>
              ) : null}
            </View>
          </View>
        </UICard>
      ) : null}

      {/* Video Preview — above send so users review the clip first */}
      {selectedVideo && !preparingVideo && (
        <UICard
          className="mx-5 mb-6 overflow-hidden rounded-3xl px-0 py-0"
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
            <View className="flex-row items-center justify-between gap-3">
              <View>
                <Text
                  className="text-base font-outfit font-semibold uppercase tracking-[1.6px]"
                  style={{ color: colors.text }}
                >
                  Preview Clip
                </Text>
                <Text className="mt-1 font-outfit text-sm" style={{ color: colors.textSecondary }}>
                  Tap the video to open full screen before you send.
                </Text>
              </View>
              <UIChip label="Ready to send" color="accent" />
            </View>
          </View>
          <VideoPlayer
            uri={selectedVideo.uri}
            height={Math.min(previewHeight, 260)}
            autoPlay={false}
            shouldPlay={false}
            initialMuted
            ignoreTabFocus
            previewOnly
            onPreviewPress={() =>
              setReelPreview({
                id: selectedVideo.fileName,
                uri: selectedVideo.uri,
                title: "Selected clip",
              })
            }
            showLoadingOverlay
            useVideoResolution={false}
            contentFitOverride="contain"
            hideTopChrome
          />
          <View className="p-5 flex-row items-center justify-between">
            <View className="flex-row gap-3">
              <UIChip label="MP4" className="rounded-xl px-3 py-1.5" textClassName="text-xs font-medium normal-case tracking-normal" />
              <UIChip
                label={formatBytes(selectedVideo.sizeBytes)}
                className="rounded-xl px-3 py-1.5"
                textClassName="text-xs font-medium normal-case tracking-normal"
              />
            </View>
            <UIButton onPress={() => setSelectedVideo(null)} variant="ghost" className="min-h-0 rounded-2xl px-2 py-2">
              <Feather name="trash-2" size={22} color={colors.danger} />
            </UIButton>
          </View>
        </UICard>
      )}

      {/* Submit CTA — strong green when a clip is ready */}
      {selectedVideo && (
        <UIButton
          onPress={handleSubmitVideo}
          isDisabled={uploading}
          className={`mx-5 mb-8 flex-row items-center justify-center gap-3 rounded-3xl py-5 ${
            uploading ? "opacity-60" : ""
          }`}
          style={{
            backgroundColor: isDark ? colors.accent : "#166534",
            borderColor: isDark ? colors.accent : "#166534",
            shadowColor: isDark ? "#00000000" : "#166534",
            shadowOpacity: isDark ? 0 : 0.2,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: isDark ? 0 : 6,
          }}
        >
          {uploading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Feather name="send" size={20} color="#ffffff" />
          )}
          <Text className="text-base font-outfit font-bold text-white tracking-[1.2px] uppercase">
            {uploading ? "Sending..." : "Send to Coach"}
          </Text>
        </UIButton>
      )}

      {/* Upload History */}
      <View className="px-5">
        <Text
          className="text-2xl font-telma-bold font-bold mb-4 tracking-tight"
          style={{ color: colors.text }}
        >
          Your Uploads
        </Text>
        <View>
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
            <UIEmptyState
              className="mb-4"
              title="No videos yet"
              description="Start recording or uploading to create your review thread."
            />
          ) : (
            <View className="space-y-6 pb-10">
              {/* Awaiting Review */}
              {(awaitingVideos.length > 0 || optimisticUploads.length > 0) && (
                <View>
                  <View className="mb-4 flex-row items-center justify-between">
                    <Text
                      className="text-[11px] font-outfit font-bold uppercase tracking-[2px]"
                      style={{ color: colors.warning }}
                    >
                      Awaiting Review
                    </Text>
                    <UIChip
                      label={String(awaitingVideos.length + optimisticUploads.length)}
                      color="warning"
                    />
                  </View>

                  {optimisticUploads.map((u) => (
                    <UICard
                      key={u.id}
                      className="mb-4 overflow-hidden rounded-3xl px-0 py-0"
                      style={{
                        backgroundColor: colors.cardElevated,
                        borderColor: colors.border,
                        ...shadows.sm,
                      }}
                    >
                      <Pressable
                        onPress={() =>
                          setReelPreview({
                            id: u.id,
                            uri: u.uri,
                            title: "Uploading preview",
                          })
                        }
                      >
                        <View
                          className="h-56 items-center justify-center relative"
                          style={{ backgroundColor: isDark ? "#0b0b0b" : colors.heroSurfaceMuted }}
                        >
                          <Feather
                            name="play-circle"
                            size={64}
                            color={isDark ? "#ffffff" : colors.text}
                            style={{ opacity: isDark ? 0.8 : 0.68 }}
                          />
                        </View>
                      </Pressable>
                      <View className="p-5">
                        <View className="mb-3 flex-row items-start justify-between gap-3">
                          <View className="flex-1">
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
                          <UIChip
                            label={u.progress < 1 ? `${Math.round(u.progress * 100)}%` : "Pending"}
                            color="warning"
                          />
                        </View>
                      </View>
                    </UICard>
                  ))}

                  {awaitingVideos.map((item: VideoItem) => (
                    <UICard
                      key={item.id}
                      className="mb-4 overflow-hidden rounded-3xl px-0 py-0"
                      style={{
                        backgroundColor: colors.cardElevated,
                        borderColor: colors.border,
                        ...shadows.sm,
                      }}
                    >
                      <Pressable
                        onPress={() =>
                          setReelPreview({
                            id: item.id,
                            uri: item.videoUrl,
                            title: "Awaiting review",
                          })
                        }
                      >
                        <View
                          className="h-56 items-center justify-center"
                          style={{ backgroundColor: isDark ? "#0b0b0b" : colors.heroSurfaceMuted }}
                        >
                          <Feather
                            name="play-circle"
                            size={64}
                            color={isDark ? "#ffffff" : colors.text}
                            style={{ opacity: isDark ? 0.8 : 0.68 }}
                          />
                        </View>
                      </Pressable>
                      <View className="p-5">
                        <View className="mb-3 flex-row items-start justify-between gap-3">
                          <View className="flex-1">
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
                          </View>
                          <UIChip label="Waiting" color="warning" />
                        </View>
                        <View className="flex-row items-center justify-between">
                          <Text
                            className="text-[11px] uppercase tracking-[1.2px]"
                            style={{ color: colors.textSecondary, opacity: 0.7 }}
                          >
                            {formatDate(item.createdAt)}
                          </Text>
                          <UIChip label="Tap to preview" />
                        </View>
                      </View>
                    </UICard>
                  ))}
                </View>
              )}

              {/* Reviewed */}
              {reviewedVideos.length > 0 && (
                <View>
                  <View className="mb-4 flex-row items-center justify-between">
                    <Text
                      className="text-[11px] font-outfit font-bold uppercase tracking-[2px]"
                      style={{ color: colors.success }}
                    >
                      Reviewed
                    </Text>
                    <UIChip
                      label={String(reviewedVideos.length)}
                      color="success"
                    />
                  </View>

                  {reviewedVideos.map((item: VideoItem) => (
                    <UICard
                      key={item.id}
                      className="mb-4 overflow-hidden rounded-3xl px-0 py-0"
                      style={{
                        backgroundColor: colors.cardElevated,
                        borderColor: colors.border,
                        ...shadows.sm,
                      }}
                    >
                      <Pressable
                        onPress={() =>
                          setReelPreview({
                            id: item.id,
                            uri: item.videoUrl,
                            title: "Reviewed video",
                          })
                        }
                      >
                        <View
                          className="h-56 items-center justify-center"
                          style={{ backgroundColor: isDark ? "#0b0b0b" : colors.heroSurfaceMuted }}
                        >
                          <Feather
                            name="play-circle"
                            size={64}
                            color={isDark ? "#ffffff" : colors.text}
                            style={{ opacity: isDark ? 0.8 : 0.68 }}
                          />
                        </View>
                      </Pressable>
                      <View className="p-5">
                        <View className="mb-3 flex-row items-start justify-between gap-3">
                          <View className="flex-1">
                            <Text
                              className="text-sm font-outfit font-semibold mb-2"
                              style={{ color: colors.text }}
                            >
                              Coach Feedback
                            </Text>
                          </View>
                          <UIChip label="Reviewed" color="success" />
                        </View>
                        <Text
                          className="text-sm leading-6"
                          style={{ color: colors.textSecondary }}
                        >
                          {item.feedback}
                        </Text>
                        {(coachResponsesByUploadId.get(String(item.id)) ?? []).map((resp) => (
                          <UICard
                            key={resp.id}
                            className="mt-4 overflow-hidden rounded-2xl px-0 py-0"
                            style={{
                              backgroundColor: colors.backgroundSecondary,
                              borderColor: colors.border,
                            }}
                          >
                            <Pressable
                              onPress={() =>
                                setReelPreview({
                                  id: resp.id,
                                  uri: resp.mediaUrl,
                                  title: "Coach reply",
                                })
                              }
                            >
                              <View
                                className="h-40 items-center justify-center"
                                style={{ backgroundColor: isDark ? "#0b0b0b" : colors.heroSurfaceMuted }}
                              >
                                <Feather
                                  name="play-circle"
                                  size={48}
                                  color={isDark ? "#ffffff" : colors.text}
                                  style={{ opacity: isDark ? 0.8 : 0.68 }}
                                />
                              </View>
                            </Pressable>
                            <View className="p-4">
                              <View className="mb-2 flex-row items-center justify-between gap-3">
                                <Text
                                  className="text-[11px] font-outfit font-semibold uppercase tracking-[1.6px]"
                                  style={{ color: colors.text }}
                                >
                                  Coach Reply
                                </Text>
                                <UIChip label="Video response" color="accent" />
                              </View>
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
                          </UICard>
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
                        <View className="mt-3 flex-row items-center justify-between">
                          <Text
                            className="text-[11px] uppercase tracking-[1.2px]"
                            style={{ color: colors.textSecondary, opacity: 0.7 }}
                          >
                            {formatDate(item.createdAt)}
                          </Text>
                          <UIChip label="Tap to replay" />
                        </View>
                      </View>
                    </UICard>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
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
