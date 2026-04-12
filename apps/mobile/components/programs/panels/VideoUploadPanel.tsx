import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { View, Modal, TouchableOpacity, Dimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useAppSelector } from "@/store/hooks";
import { Text } from "@/components/ScaledText";
import {
  UICard,
  UISectionHeader,
  UITextArea,
  UIButton,
} from "@/components/ui/hero";
import { useSocket } from "@/context/SocketContext";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { useProgramPanel } from "./shared/useProgramPanel";
import { ProgramPanelCard } from "./shared/ProgramPanelCard";
import { ProgramPanelStatusBadge } from "./shared/ProgramPanelStatusBadge";

import {
  VideoItem,
  SelectedVideo,
  OptimisticUpload,
} from "@/types/video-upload";
import { useOptimisticVideos } from "@/hooks/programs/useOptimisticVideos";
import { useVideoHistory } from "@/hooks/programs/useVideoHistory";
import { useVideoUploadLogic } from "@/hooks/programs/useVideoUploadLogic";
import { VideoHistoryList } from "./VideoHistoryList";
import { VideoPickerControls } from "./VideoPickerControls";

const VIDEO_MAX_MB = 200;
const VIDEO_MAX_BYTES = VIDEO_MAX_MB * 1024 * 1024;

export function VideoUploadPanel({
  refreshToken = 0,
  sectionContentId,
  sectionTitle,
  autoPickSource,
  onUploaded,
}: {
  refreshToken?: number;
  sectionContentId?: number | null;
  sectionTitle?: string | null;
  autoPickSource?: "camera" | "library" | null;
  onUploaded?: (payload: {
    sectionContentId?: number | null;
    publicUrl: string;
  }) => void;
}) {
  const { token, profile, athleteUserId } = useAppSelector(
    (state) => state.user,
  );
  const { colors, isDark, formatDate, scheduleLocalNotification } =
    useProgramPanel();
  const { socket } = useSocket();

  const optimisticOwnerId = athleteUserId ?? profile.id ?? undefined;
  const { optimisticUploads, setOptimisticUploads } = useOptimisticVideos(
    optimisticOwnerId,
    sectionContentId,
  );
  const {
    videoItems,
    coachResponses,
    loadVideos,
    loadCoachResponses,
    setVideoItems,
    setCoachResponses,
  } = useVideoHistory(token, athleteUserId, sectionContentId);
  const { uploadVideo, isUploading, status, setStatus } = useVideoUploadLogic(
    token,
    athleteUserId,
  );

  const [notes, setNotes] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<SelectedVideo | null>(
    null,
  );
  const [reelPreview, setReelPreview] = useState<{
    uri: string;
    title?: string;
  } | null>(null);

  useEffect(() => {
    // Force refresh to avoid serving cached /messages when a coach has just
    // sent a response video via the admin portal.
    loadVideos(true);
    loadCoachResponses(true);
  }, [refreshToken, loadVideos, loadCoachResponses]);

  useFocusEffect(
    useCallback(() => {
      loadVideos(true);
      loadCoachResponses(true);
    }, [loadVideos, loadCoachResponses]),
  );

  useEffect(() => {
    if (!socket) return;
    const handleReviewed = (updated: any) => {
      setVideoItems((prev) =>
        prev.map((item) =>
          item.id === updated.id ? { ...item, ...updated } : item,
        ),
      );

      // Coach response videos are delivered via direct messages.
      // When a review happens, refresh responses so the athlete sees the video (not just the text feedback).
      loadCoachResponses(true);
    };

    const handleMessageNew = (message: any) => {
      if (
        message?.contentType !== "video" ||
        !message?.mediaUrl ||
        !Number(message?.videoUploadId)
      ) {
        return;
      }

      const next = {
        id: String(message.id),
        mediaUrl: message.mediaUrl,
        text: message.content,
        createdAt: message.createdAt ?? null,
        videoUploadId: Number(message.videoUploadId),
      };

      setCoachResponses((prev) => {
        if (prev.some((item) => item.id === next.id)) return prev;
        return [next, ...prev];
      });
    };

    socket.on("video:reviewed", handleReviewed);
    socket.on("message:new", handleMessageNew);
    return () => {
      socket.off("video:reviewed", handleReviewed);
      socket.off("message:new", handleMessageNew);
    };
  }, [socket, loadCoachResponses]);

  const pickVideo = async (source: "library" | "camera") => {
    try {
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) return;

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: "videos",
              quality: 0.9,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: "videos",
              quality: 0.9,
            });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      if (fileInfo.exists && fileInfo.size > VIDEO_MAX_BYTES) {
        setStatus(`Video exceeds ${VIDEO_MAX_MB}MB limit.`);
        return;
      }

      setSelectedVideo({
        uri: asset.uri,
        fileName: asset.uri.split("/").pop() ?? "video.mp4",
        contentType: asset.mimeType || "video/mp4",
        sizeBytes: fileInfo.exists ? fileInfo.size : 0,
      });
    } catch (e) {
      setStatus("Failed to pick video.");
    }
  };

  const handleUpload = async () => {
    if (!selectedVideo) return;
    const tempId = `temp-${Date.now()}`;
    const currentVideo = selectedVideo;
    const uploadNotes = notes;

    setOptimisticUploads((prev) => [
      {
        id: tempId,
        uri: currentVideo.uri,
        progress: 0,
        fileName: currentVideo.fileName,
        notes: uploadNotes,
      },
      ...prev,
    ]);

    setSelectedVideo(null);
    setNotes("");

    try {
      const publicUrl = await uploadVideo({
        video: currentVideo,
        notes: uploadNotes,
        sectionContentId,
        onProgress: (p) => {
          setOptimisticUploads((prev) =>
            prev.map((u) => (u.id === tempId ? { ...u, progress: p } : u)),
          );
        },
      });

      if (publicUrl) {
        onUploaded?.({ sectionContentId, publicUrl });
        scheduleLocalNotification("Video uploaded", "Submitted for review.");
        loadVideos();
      }
    } catch (e) {
      setOptimisticUploads((prev) => prev.filter((u) => u.id !== tempId));
      setSelectedVideo(currentVideo);
      setNotes(uploadNotes);
    }
  };

  const coachResponsesByUploadId = useMemo(() => {
    const map = new Map<string, any[]>();
    coachResponses.forEach((res) => {
      const key = String(res.videoUploadId);
      const items = map.get(key) ?? [];
      items.push(res);
      map.set(key, items);
    });
    return map;
  }, [coachResponses]);

  return (
    <ProgramPanelCard className="p-0">
      <View className="px-5 pt-6 pb-5">
        <UISectionHeader
          eyebrow="Premium Review"
          title="Video Review"
          description="Submit a clip for coach feedback."
          rightSlot={
            <ProgramPanelStatusBadge label="Coach Review" variant="default" />
          }
        />
      </View>

      <View className="mx-5 mb-6 rounded-3xl p-5 bg-card border border-border">
        <Text className="text-[11px] font-outfit font-semibold uppercase tracking-[1.4px] mb-2 text-secondary">
          Coach Notes
        </Text>
        <UITextArea
          value={notes}
          onChangeText={setNotes}
          placeholder="What should your coach look for?"
        />
      </View>

      <VideoPickerControls onPick={pickVideo} disabled={isUploading} />

      {status && (
        <View className="mx-5 my-4 p-3 rounded-2xl bg-accent/10">
          <Text className="text-sm font-outfit text-accent text-center">
            {status}
          </Text>
        </View>
      )}

      <View className="mt-8">
        <UISectionHeader title="Your Clips" className="px-5 mb-4" />
        <VideoHistoryList
          videoItems={videoItems}
          optimisticUploads={optimisticUploads}
          coachResponsesByUploadId={coachResponsesByUploadId}
          onVideoPress={(uri, title) => setReelPreview({ uri, title })}
          formatDate={(d) => formatDate(d) ?? ""}
        />
      </View>

      {/* CONFIRM UPLOAD MODAL */}
      <Modal visible={!!selectedVideo} transparent animationType="fade">
        <View className="flex-1 justify-center p-6 bg-black/80">
          <View className="bg-card rounded-[32px] p-6">
            <Text className="text-xl font-clash font-bold text-app mb-4">
              Confirm Upload
            </Text>
            {selectedVideo && (
              <VideoPlayer uri={selectedVideo.uri} height={200} />
            )}
            <View className="flex-row gap-3 mt-6">
              <UIButton
                className="flex-1"
                variant="secondary"
                onPress={() => setSelectedVideo(null)}
              >
                Cancel
              </UIButton>
              <UIButton className="flex-1" onPress={handleUpload}>
                Send to Coach
              </UIButton>
            </View>
          </View>
        </View>
      </Modal>

      {/* REEL PREVIEW MODAL */}
      <Modal visible={!!reelPreview} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-card rounded-t-[32px] p-5 pb-8">
            <View className="flex-row justify-between mb-4">
              <Text className="text-xl font-clash font-bold text-app">
                {reelPreview?.title || "Preview"}
              </Text>
              <TouchableOpacity onPress={() => setReelPreview(null)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {reelPreview && (
              <VideoPlayer uri={reelPreview.uri} useVideoResolution />
            )}
          </View>
        </View>
      </Modal>
    </ProgramPanelCard>
  );
}
