import React, { useEffect, useState, useCallback } from "react";
import { Alert, Modal, ScrollView, TouchableOpacity, View, ActivityIndicator, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { Dumbbell, Plus, Trash2, Video, Film, X } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";

import { Text } from "@/components/ScaledText";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import {
  AdminScreen,
  AdminHeader,
  AdminBackButton,
  AdminCard,
  AdminButton,
  AdminBadge,
  AdminEmptyState,
  AdminLoadingState,
  AdminIconButton,
  AdminModalContainer,
  AdminModalTitle,
  AdminFormField,
  useAdminPastel,
} from "@/components/admin/AdminUI";
import type { AdminCardColor } from "@/constants/theme";
import { useAppSelector } from "@/store/hooks";
import { useAdminProgramBuilder } from "@/hooks/admin/useAdminProgramBuilder";
import { apiRequest } from "@/lib/api";

const CARD_COLORS: AdminCardColor[] = ["sage", "peach", "lavender", "mint", "pink", "yellow"];

export default function AdminSessionDetailScreen() {
  const p = useAdminPastel();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const params = useLocalSearchParams<{
    sessionId: string;
    programId?: string;
    programName?: string;
    moduleId?: string;
    moduleTitle?: string;
    sessionTitle?: string;
  }>();
  const sessionId = Number(params.sessionId);
  const sessionTitle = params.sessionTitle ?? "Session";

  const token = useAppSelector((s) => s.user.token);
  const bootstrapReady = useAppSelector((s) => s.app.bootstrapReady);
  const canLoad = Boolean(token && bootstrapReady);

  const {
    sessionExercises,
    loading,
    isBusy,
    loadSessionExercises,
    createExerciseAndAdd,
    removeExerciseFromSession,
  } = useAdminProgramBuilder(token, canLoad);

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [duration, setDuration] = useState("");
  const [restSeconds, setRestSeconds] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [cues, setCues] = useState("");
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  const handlePickVideo = useCallback(async (useCamera: boolean) => {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", useCamera ? "Camera access is required to record video." : "Photo library access is required to pick a video.");
      return;
    }

    const iosOpts = Platform.OS === "ios" ? {
      videoExportPreset: ImagePicker.VideoExportPreset.H264_960x540,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    } : {};

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: "videos", quality: 0.5, ...iosOpts })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: "videos", quality: 0.5, ...iosOpts });

    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const fileInfo = await FileSystem.getInfoAsync(asset.uri);
    const sizeBytes = fileInfo.exists ? fileInfo.size : 0;

    if (sizeBytes > 200 * 1024 * 1024) {
      Alert.alert("Too large", "Video must be under 200 MB.");
      return;
    }

    setVideoUploading(true);
    setVideoProgress(0);
    try {
      const fileName = asset.uri.split("/").pop() ?? "video.mp4";
      const contentType = asset.mimeType || "video/mp4";

      const presign = await apiRequest<{ uploadUrl: string; publicUrl: string }>("/media/presign", {
        method: "POST",
        token: token!,
        body: { folder: "exercise-videos", fileName, contentType, sizeBytes },
      });

      const fileRes = await fetch(asset.uri);
      const blob = await fileRes.blob();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presign.uploadUrl);
        xhr.setRequestHeader("Content-Type", contentType);
        xhr.timeout = 10 * 60 * 1000;
        xhr.upload.onprogress = (e) => {
          const total = e.total > 0 ? e.total : sizeBytes;
          if (total > 0) setVideoProgress(e.loaded / total);
        };
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.ontimeout = () => reject(new Error("Upload timed out"));
        xhr.send(blob);
      });

      setVideoUrl(presign.publicUrl);
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? "Something went wrong.");
    } finally {
      setVideoUploading(false);
      setVideoProgress(0);
    }
  }, [token]);

  useEffect(() => {
    if (canLoad && sessionId > 0) {
      loadSessionExercises(sessionId);
    }
  }, [canLoad, sessionId, loadSessionExercises]);

  const nextOrder = sessionExercises.length
    ? Math.max(...sessionExercises.map((e) => e.order ?? 0)) + 1
    : 1;

  const resetForm = () => {
    setName("");
    setCategory("");
    setSets("");
    setReps("");
    setDuration("");
    setRestSeconds("");
    setVideoUrl("");
    setNotes("");
    setCues("");
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createExerciseAndAdd(sessionId, nextOrder, {
      name: name.trim(),
      category: category.trim() || undefined,
      sets: sets ? Number(sets) : undefined,
      reps: reps ? Number(reps) : undefined,
      duration: duration ? Number(duration) : undefined,
      restSeconds: restSeconds ? Number(restSeconds) : undefined,
      videoUrl: videoUrl.trim() || undefined,
      notes: notes.trim() || undefined,
      cues: cues.trim() || undefined,
    });
    resetForm();
    setModalOpen(false);
  };

  const handleRemove = (seId: number) => {
    Alert.alert("Remove Exercise", "Remove this exercise from the session?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeExerciseFromSession(seId, sessionId) },
    ]);
  };

  return (
    <AdminScreen>
      <ThemedScrollView
        showsVerticalScrollIndicator={false}
        onRefresh={() => loadSessionExercises(sessionId, true)}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(60).duration(360).springify()}
          style={{ marginBottom: 18 }}
        >
          <AdminHeader
            title={sessionTitle}
            subtitle={`${params.moduleTitle ?? "Module"} — ${sessionExercises.length} exercise${sessionExercises.length !== 1 ? "s" : ""}`}
            right={<AdminBackButton onPress={() => router.back()} />}
          />
        </Animated.View>

        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(120).duration(360).springify()}
          style={{ paddingHorizontal: 24, marginBottom: 16 }}
        >
          <AdminButton
            label="Add Exercise"
            icon={Plus}
            onPress={() => { resetForm(); setModalOpen(true); }}
          />
        </Animated.View>

        {loading ? (
          <AdminLoadingState label="Loading exercises" />
        ) : sessionExercises.length === 0 ? (
          <AdminEmptyState
            icon={Dumbbell}
            title="No exercises yet"
            description="Tap Add Exercise to create one."
          />
        ) : (
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.delay(180).duration(360).springify()}
            style={{ paddingHorizontal: 24, gap: 10 }}
          >
            {sessionExercises.map((se, idx) => (
              <AdminCard key={se.id} color={CARD_COLORS[idx % CARD_COLORS.length]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      backgroundColor: p.accentSoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.accent }}>
                      {idx + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: "Satoshi-Bold", fontSize: 14, color: p.textPrimary }} numberOfLines={1}>
                      {se.exercise?.name ?? "Unknown"}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                      {se.exercise?.category ? <AdminBadge>{se.exercise.category}</AdminBadge> : null}
                      {se.exercise?.sets != null ? (
                        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textSecondary }}>{se.exercise.sets} sets</Text>
                      ) : null}
                      {se.exercise?.reps != null ? (
                        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textSecondary }}>{se.exercise.reps} reps</Text>
                      ) : null}
                    </View>
                  </View>
                  <AdminIconButton
                    icon={Trash2}
                    variant="danger"
                    accessibilityLabel="Remove exercise"
                    onPress={() => handleRemove(se.id)}
                    disabled={isBusy}
                  />
                </View>
              </AdminCard>
            ))}
          </Animated.View>
        )}
      </ThemedScrollView>

      <Modal visible={modalOpen} transparent animationType="fade">
        <AdminModalContainer onClose={() => setModalOpen(false)} position="bottom">
          <AdminModalTitle>Create Exercise</AdminModalTitle>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
            <AdminFormField label="Name *" value={name} onChangeText={setName} placeholder="e.g. Goblet Squat" autoFocus />
            <AdminFormField label="Category" value={category} onChangeText={setCategory} placeholder="e.g. Lower Body" />

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <AdminFormField label="Sets" value={sets} onChangeText={setSets} placeholder="3" keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <AdminFormField label="Reps" value={reps} onChangeText={setReps} placeholder="10" keyboardType="number-pad" />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <AdminFormField label="Duration (sec)" value={duration} onChangeText={setDuration} placeholder="60" keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <AdminFormField label="Rest (sec)" value={restSeconds} onChangeText={setRestSeconds} placeholder="30" keyboardType="number-pad" />
              </View>
            </View>

            {/* Video Upload Section */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontFamily: "Outfit-Bold",
                  fontSize: 12,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  color: p.textMuted,
                  marginBottom: 8,
                }}
              >
                Video
              </Text>
              {videoUploading ? (
                <View
                  style={{
                    borderRadius: 20,
                    padding: 16,
                    alignItems: "center",
                    gap: 8,
                    backgroundColor: p.inputBg,
                  }}
                >
                  <ActivityIndicator color={p.accent} />
                  <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textSecondary }}>
                    Uploading... {Math.round(videoProgress * 100)}%
                  </Text>
                  <View style={{ width: "100%", height: 4, borderRadius: 2, backgroundColor: p.inputBg }}>
                    <View style={{ width: `${Math.round(videoProgress * 100)}%`, height: 4, borderRadius: 2, backgroundColor: p.accent }} />
                  </View>
                </View>
              ) : videoUrl ? (
                <View
                  style={{
                    borderRadius: 20,
                    padding: 14,
                    gap: 8,
                    backgroundColor: p.inputBg,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Film size={16} color={p.accent} />
                    <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textPrimary, flex: 1 }} numberOfLines={1}>
                      Video uploaded
                    </Text>
                    <TouchableOpacity onPress={() => setVideoUrl("")} hitSlop={8}>
                      <X size={16} color={p.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <AdminButton
                    label="Record"
                    icon={Video}
                    variant="secondary"
                    compact
                    onPress={() => handlePickVideo(true)}
                    style={{ flex: 1 }}
                  />
                  <AdminButton
                    label="Choose"
                    icon={Film}
                    variant="secondary"
                    compact
                    onPress={() => handlePickVideo(false)}
                    style={{ flex: 1 }}
                  />
                </View>
              )}
            </View>

            <AdminFormField label="Cues" value={cues} onChangeText={setCues} placeholder="Coaching cues" />
            <AdminFormField label="Notes" value={notes} onChangeText={setNotes} placeholder="Additional notes" />
          </ScrollView>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <AdminButton
              label="Cancel"
              variant="ghost"
              onPress={() => setModalOpen(false)}
              style={{ flex: 1 }}
            />
            <AdminButton
              label="Create & Add"
              variant="primary"
              onPress={handleCreate}
              disabled={!name.trim() || isBusy || videoUploading}
              loading={isBusy}
              style={{ flex: 1 }}
            />
          </View>
        </AdminModalContainer>
      </Modal>
    </AdminScreen>
  );
}
