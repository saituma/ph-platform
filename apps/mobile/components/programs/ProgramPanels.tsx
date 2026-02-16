import React, { useEffect, useState } from "react";
import { Alert, Image, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ResizeMode, Video } from "expo-av";

import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";

export function PhysioReferralPanel({ discount }: { discount?: string }) {
  return (
    <View className="rounded-3xl border border-app/10 bg-input px-6 py-5">
      <Text className="text-lg font-clash text-app mb-2">Physio Referral</Text>
      <Text className="text-sm font-outfit text-secondary">
        Access our trusted physio partners for injuries and recovery support.
      </Text>
      <View className="mt-4 rounded-2xl border border-app/10 bg-white/5 px-4 py-3">
        <Text className="text-xs font-outfit text-secondary">
          {discount ? `Discount: ${discount}` : "Standard referral (no discount)."}
        </Text>
      </View>
      <TouchableOpacity className="mt-4 rounded-full bg-accent px-4 py-3">
        <Text className="text-white text-sm font-outfit">Open Referral Link</Text>
      </TouchableOpacity>
    </View>
  );
}

export function ParentEducationPanel({ onOpen }: { onOpen: () => void }) {
  return (
    <View className="rounded-3xl border border-app/10 bg-input px-6 py-5">
      <Text className="text-lg font-clash text-app mb-2">Parent Education Hub</Text>
      <Text className="text-sm font-outfit text-secondary">
        Explore curated courses on growth, recovery, nutrition, and mindset.
      </Text>
      <TouchableOpacity onPress={onOpen} className="mt-4 rounded-full bg-accent px-4 py-3">
        <Text className="text-white text-sm font-outfit">Open Parent Education</Text>
      </TouchableOpacity>
    </View>
  );
}

export function BookingsPanel({ onOpen }: { onOpen: () => void }) {
  return (
    <View className="rounded-3xl border border-app/10 bg-input px-6 py-5">
      <Text className="text-lg font-clash text-app mb-2">Bookings</Text>
      <Text className="text-sm font-outfit text-secondary">
        Book one-to-one sessions, lift lab visits, or role model meetings.
      </Text>
      <TouchableOpacity onPress={onOpen} className="mt-4 rounded-full bg-accent px-4 py-3">
        <Text className="text-white text-sm font-outfit">Go to Bookings</Text>
      </TouchableOpacity>
    </View>
  );
}

export function FoodDiaryPanel() {
  const [entry, setEntry] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [entries, setEntries] = useState<{ id: string; text: string; photo?: string }[]>([]);

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    if (!entry.trim()) return;
    setEntries((prev) => [
      { id: `${Date.now()}`, text: entry.trim(), photo: photo ?? undefined },
      ...prev,
    ]);
    setEntry("");
    setPhoto(null);
  };

  return (
    <View className="gap-4">
      <View className="rounded-3xl border border-app/10 bg-input px-6 py-5">
        <Text className="text-lg font-clash text-app mb-2">Food Diary</Text>
        <Text className="text-sm font-outfit text-secondary">
          Log meals and snacks to support training and recovery.
        </Text>
        <TextInput
          value={entry}
          onChangeText={setEntry}
          placeholder="Breakfast, lunch, snacks..."
          placeholderTextColor="#9CA3AF"
          multiline
          className="mt-4 rounded-2xl border border-app/10 bg-white/5 px-4 py-3 text-sm font-outfit text-app"
          style={{ minHeight: 90 }}
        />
        {photo ? (
          <Image source={{ uri: photo }} className="mt-4 h-28 w-full rounded-2xl" resizeMode="cover" />
        ) : null}
        <View className="mt-4 flex-row gap-3">
          <TouchableOpacity onPress={handlePickPhoto} className="flex-1 rounded-full border border-app px-4 py-3">
            <Text className="text-app text-xs font-outfit text-center">Add Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} className="flex-1 rounded-full bg-accent px-4 py-3">
            <Text className="text-white text-xs font-outfit text-center">Save Entry</Text>
          </TouchableOpacity>
        </View>
      </View>

      {entries.length ? (
        <View className="gap-3">
          {entries.map((item) => (
            <View key={item.id} className="rounded-3xl border border-app/10 bg-input px-5 py-4">
              <Text className="text-sm font-outfit text-app">{item.text}</Text>
              {item.photo ? (
                <Image source={{ uri: item.photo }} className="mt-3 h-24 w-full rounded-2xl" resizeMode="cover" />
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function VideoUploadPanel({ refreshToken = 0 }: { refreshToken?: number }) {
  const { token } = useAppSelector((state) => state.user);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [videoItems, setVideoItems] = useState<
    Array<{ id: number; videoUrl: string; notes?: string | null; createdAt?: string | null; feedback?: string | null }>
  >([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{
    uri: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
  } | null>(null);

  const loadVideos = async () => {
    if (!token) return;
    try {
      setLoadingVideos(true);
      const data = await apiRequest<{ items: Array<{ id: number; videoUrl: string; notes?: string | null; createdAt?: string | null; feedback?: string | null }> }>(
        "/videos",
        { token, suppressLog: true }
      );
      setVideoItems(data.items ?? []);
    } catch {
      // keep upload flow resilient if history fetch fails
    } finally {
      setLoadingVideos(false);
    }
  };

  useEffect(() => {
    void loadVideos();
  }, [token, refreshToken]);

  const awaitingVideos = videoItems.filter((item) => !item.feedback);
  const reviewedVideos = videoItems.filter((item) => Boolean(item.feedback));
  const formatDate = (value?: string | null) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString();
  };

  const handlePickVideo = async () => {
    if (!token) return;
    setStatus(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const fileName = uri.split("/").pop() ?? `upload-${Date.now()}.mp4`;
    const contentType = asset.mimeType || "video/mp4";
    const maxSizeBytes = 200 * 1024 * 1024;

    try {
      const blob = await (await fetch(uri)).blob();
      const sizeBytes = blob.size;
      if (!sizeBytes || sizeBytes > maxSizeBytes) {
        throw new Error("Video exceeds 200MB limit.");
      }
      setSelectedVideo({ uri, fileName, contentType, sizeBytes });
      setStatus("Preview your video and confirm before sending.");
    } catch (error: any) {
      setStatus(error?.message ?? "Upload failed.");
    }
  };

  const handleSubmitVideo = async () => {
    if (!token || !selectedVideo) return;
    Alert.alert(
      "Confirm Send",
      "Send this video and notes to your coach for review?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: async () => {
            try {
              setUploading(true);
              setStatus(null);
              const blob = await (await fetch(selectedVideo.uri)).blob();

              const presign = await apiRequest<{ uploadUrl: string; publicUrl: string }>("/media/presign", {
                method: "POST",
                token,
                body: {
                  folder: "video-uploads",
                  fileName: selectedVideo.fileName,
                  contentType: selectedVideo.contentType,
                  sizeBytes: selectedVideo.sizeBytes,
                },
              });
              const uploadRes = await fetch(presign.uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": selectedVideo.contentType },
                body: blob,
              });
              if (!uploadRes.ok) throw new Error("Upload failed");

              await apiRequest("/videos", {
                method: "POST",
                token,
                body: { videoUrl: presign.publicUrl, notes: notes.trim() || undefined },
              });
              setStatus("Video submitted for coach review.");
              setNotes("");
              setSelectedVideo(null);
              await loadVideos();
            } catch (error: any) {
              setStatus(error?.message ?? "Upload failed.");
            } finally {
              setUploading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View className="rounded-3xl border border-app/15 bg-input px-5 py-5">
      <View className="flex-row items-center justify-between">
        <Text className="text-xl font-clash text-app">Video Upload</Text>
        <View className="rounded-full border border-app/20 bg-white/10 px-3 py-1">
          <Text className="text-xs font-outfit text-secondary uppercase tracking-[1px]">Coach Review</Text>
        </View>
      </View>
      <Text className="text-base font-outfit text-secondary mt-2">
        Share training clips and receive detailed coach feedback.
      </Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional notes for your coach"
        placeholderTextColor="#9CA3AF"
        multiline
        className="mt-4 rounded-2xl border border-app/15 bg-white/10 px-4 py-3 text-base font-outfit text-app"
        style={{ minHeight: 88 }}
      />
      {selectedVideo ? (
        <View className="mt-4 rounded-2xl border border-accent/30 bg-accent/10 p-3">
          <Text className="text-sm font-outfit text-app mb-2">Preview before send</Text>
          <Video
            source={{ uri: selectedVideo.uri }}
            useNativeControls
            resizeMode={ResizeMode.COVER}
            style={{ width: "100%", height: 180, borderRadius: 12 }}
          />
          <Text className="text-sm font-outfit text-secondary mt-2" numberOfLines={1}>
            {selectedVideo.fileName}
          </Text>
        </View>
      ) : null}
      {status ? (
        <View className={`mt-3 rounded-xl border px-3 py-2 ${status.toLowerCase().includes("submitted") ? "border-emerald-400/40 bg-emerald-400/10" : "border-app/20 bg-white/10"}`}>
          <Text className="text-base font-outfit text-secondary">{status}</Text>
        </View>
      ) : null}
      <View className="mt-4 flex-row gap-3">
        <TouchableOpacity
          onPress={handlePickVideo}
          disabled={uploading}
          className="flex-1 rounded-2xl border border-app/20 bg-white/10 px-4 py-3 flex-row items-center justify-center gap-2"
        >
          <Feather name="video" size={16} color="#0F172A" />
          <Text className="text-app text-base font-outfit">Choose Video</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSubmitVideo}
          disabled={uploading || !selectedVideo}
          className={`flex-1 rounded-2xl px-4 py-3 flex-row items-center justify-center gap-2 ${uploading || !selectedVideo ? "bg-accent/40" : "bg-accent"}`}
        >
          <Feather name="send" size={16} color="white" />
          <Text className="text-white text-base font-outfit">{uploading ? "Uploading..." : "Send to Coach"}</Text>
        </TouchableOpacity>
      </View>

      <View className="mt-6 rounded-2xl border border-app/15 bg-white/5 p-4">
        <View className="mb-1 flex-row items-center justify-between">
          <Text className="text-lg font-clash text-app">Your Uploaded Videos</Text>
          <TouchableOpacity
            onPress={() => void loadVideos()}
            disabled={loadingVideos}
            className="rounded-full border border-app/20 bg-white/10 px-3 py-1.5"
          >
            <Text className="text-xs font-outfit text-app">{loadingVideos ? "Refreshing..." : "Refresh"}</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-base font-outfit text-secondary mb-3">
          Pull down inside this section to refresh. Shows videos uploaded from this account only.
        </Text>
        <ScrollView
          style={{ maxHeight: 520 }}
          nestedScrollEnabled
          alwaysBounceVertical
          contentContainerStyle={{ paddingBottom: 8 }}
          refreshControl={<RefreshControl refreshing={loadingVideos} onRefresh={() => void loadVideos()} />}
          showsVerticalScrollIndicator={false}
        >
          {loadingVideos && videoItems.length === 0 ? (
            <Text className="text-base font-outfit text-secondary">Loading uploads...</Text>
          ) : videoItems.length === 0 ? (
            <Text className="text-base font-outfit text-secondary">No videos uploaded yet.</Text>
          ) : (
            <View className="gap-5">
              <View className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3">
                <View className="mb-3 flex-row items-center justify-between">
                  <Text className="text-lg font-clash text-app">Awaiting Review</Text>
                  <View className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1">
                    <Text className="text-xs font-outfit text-app">{awaitingVideos.length}</Text>
                  </View>
                </View>
                {awaitingVideos.length === 0 ? (
                  <Text className="text-base font-outfit text-secondary">No pending videos.</Text>
                ) : (
                  <View className="gap-4">
                    {awaitingVideos.map((item) => (
                      <View key={`awaiting-${item.id}`} className="rounded-2xl border border-app/15 bg-input p-3">
                        <Video
                          source={{ uri: item.videoUrl }}
                          useNativeControls
                          resizeMode={ResizeMode.COVER}
                          style={{ width: "100%", height: 170, borderRadius: 10 }}
                        />
                        <View className="mt-2 flex-row items-center justify-between">
                          <Text className="text-xs font-outfit text-secondary">Upload #{item.id}</Text>
                          {formatDate(item.createdAt) ? (
                            <Text className="text-xs font-outfit text-secondary">{formatDate(item.createdAt)}</Text>
                          ) : null}
                        </View>
                        {item.notes ? (
                          <Text className="text-base font-outfit text-secondary mt-2">Notes: {item.notes}</Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3">
                <View className="mb-3 flex-row items-center justify-between">
                  <Text className="text-lg font-clash text-app">Reviewed With Coach Feedback</Text>
                  <View className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1">
                    <Text className="text-xs font-outfit text-app">{reviewedVideos.length}</Text>
                  </View>
                </View>
                {reviewedVideos.length === 0 ? (
                  <Text className="text-base font-outfit text-secondary">No reviewed videos yet.</Text>
                ) : (
                  <View className="gap-4">
                    {reviewedVideos.map((item) => (
                      <View key={`reviewed-${item.id}`} className="rounded-2xl border border-app/15 bg-input p-3">
                        <Video
                          source={{ uri: item.videoUrl }}
                          useNativeControls
                          resizeMode={ResizeMode.COVER}
                          style={{ width: "100%", height: 170, borderRadius: 10 }}
                        />
                        <View className="mt-2 flex-row items-center justify-between">
                          <Text className="text-xs font-outfit text-secondary">Upload #{item.id}</Text>
                          {formatDate(item.createdAt) ? (
                            <Text className="text-xs font-outfit text-secondary">{formatDate(item.createdAt)}</Text>
                          ) : null}
                        </View>
                        {item.notes ? (
                          <Text className="text-base font-outfit text-secondary mt-2">Notes: {item.notes}</Text>
                        ) : null}
                        <View className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                          <Text className="text-sm font-clash text-app">Coach feedback</Text>
                          <Text className="text-base font-outfit text-secondary mt-1">{item.feedback}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}
