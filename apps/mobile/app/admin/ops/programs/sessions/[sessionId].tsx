import React, { useEffect, useState, useCallback } from "react";
import { Alert, Modal, Pressable, ScrollView, TouchableOpacity, View, ActivityIndicator, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { ChevronLeft, Dumbbell, Plus, Trash2, Video, Film, X } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text, TextInput } from "@/components/ScaledText";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { AdminHeader, AdminScreen, AdminCard, AdminBadge, AdminEmptyState, AdminLoadingState, AdminIconButton } from "@/components/admin/AdminUI";
import { useAppSelector } from "@/store/hooks";
import { useAdminProgramBuilder } from "@/hooks/admin/useAdminProgramBuilder";
import { apiRequest } from "@/lib/api";

export default function AdminSessionDetailScreen() {
  const { colors, isDark } = useAppTheme();
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

  const borderSoft = isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)";
  const inputBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)";

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
            eyebrow={params.moduleTitle ?? "Module"}
            title={sessionTitle}
            subtitle={`${sessionExercises.length} exercise${sessionExercises.length !== 1 ? "s" : ""}`}
            tone="accent"
            right={
              <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 4 }}>
                <ChevronLeft size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            }
          />
        </Animated.View>

        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(120).duration(360).springify()}
          style={{ paddingHorizontal: 24, marginBottom: 16 }}
        >
          <TouchableOpacity
            onPress={() => { resetForm(); setModalOpen(true); }}
            activeOpacity={0.8}
            style={{
              height: 44,
              borderRadius: 14,
              backgroundColor: colors.accent,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Plus size={16} color={colors.textInverse} strokeWidth={2.5} />
            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, letterSpacing: 0.4, textTransform: "uppercase", color: colors.textInverse }}>
              Add Exercise
            </Text>
          </TouchableOpacity>
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
              <AdminCard key={se.id}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      backgroundColor: isDark ? `${colors.accent}20` : `${colors.accent}14`,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: colors.accent }}>
                      {idx + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: "Satoshi-Bold", fontSize: 14, color: colors.textPrimary }} numberOfLines={1}>
                      {se.exercise?.name ?? "Unknown"}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                      {se.exercise?.category ? <AdminBadge>{se.exercise.category}</AdminBadge> : null}
                      {se.exercise?.sets != null ? (
                        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: colors.textSecondary }}>{se.exercise.sets} sets</Text>
                      ) : null}
                      {se.exercise?.reps != null ? (
                        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: colors.textSecondary }}>{se.exercise.reps} reps</Text>
                      ) : null}
                    </View>
                  </View>
                  <AdminIconButton
                    icon={Trash2}
                    tone="danger"
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
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "flex-end" }}
          onPress={() => setModalOpen(false)}
        >
          <Pressable
            style={{
              width: "100%",
              maxHeight: "85%",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
              backgroundColor: isDark ? "hsl(220,10%,10%)" : "#FFFFFF",
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
            }}
          >
            <Text style={{ fontFamily: "Clash-Bold", fontSize: 20, color: colors.textPrimary, letterSpacing: -0.3, marginBottom: 14 }}>
              Create Exercise
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
              <View style={{ gap: 12 }}>
                <FormField label="Name *" value={name} onChangeText={setName} placeholder="e.g. Goblet Squat" borderSoft={borderSoft} inputBg={inputBg} colors={colors} autoFocus />
                <FormField label="Category" value={category} onChangeText={setCategory} placeholder="e.g. Lower Body" borderSoft={borderSoft} inputBg={inputBg} colors={colors} />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <FormField label="Sets" value={sets} onChangeText={setSets} placeholder="3" borderSoft={borderSoft} inputBg={inputBg} colors={colors} keyboardType="number-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormField label="Reps" value={reps} onChangeText={setReps} placeholder="10" borderSoft={borderSoft} inputBg={inputBg} colors={colors} keyboardType="number-pad" />
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <FormField label="Duration (sec)" value={duration} onChangeText={setDuration} placeholder="60" borderSoft={borderSoft} inputBg={inputBg} colors={colors} keyboardType="number-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormField label="Rest (sec)" value={restSeconds} onChangeText={setRestSeconds} placeholder="30" borderSoft={borderSoft} inputBg={inputBg} colors={colors} keyboardType="number-pad" />
                  </View>
                </View>
                <View>
                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: colors.textSecondary, marginBottom: 6 }}>
                    Video
                  </Text>
                  {videoUploading ? (
                    <View style={{
                      borderRadius: 16, borderWidth: 1, padding: 16, alignItems: "center", gap: 8,
                      backgroundColor: inputBg, borderColor: borderSoft,
                    }}>
                      <ActivityIndicator color={colors.accent} />
                      <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: colors.textSecondary }}>
                        Uploading... {Math.round(videoProgress * 100)}%
                      </Text>
                      <View style={{ width: "100%", height: 4, borderRadius: 2, backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)" }}>
                        <View style={{ width: `${Math.round(videoProgress * 100)}%`, height: 4, borderRadius: 2, backgroundColor: colors.accent }} />
                      </View>
                    </View>
                  ) : videoUrl ? (
                    <View style={{
                      borderRadius: 16, borderWidth: 1, padding: 12, gap: 8,
                      backgroundColor: inputBg, borderColor: borderSoft,
                    }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Film size={16} color={colors.accent} />
                        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: colors.textPrimary, flex: 1 }} numberOfLines={1}>
                          Video uploaded
                        </Text>
                        <TouchableOpacity onPress={() => setVideoUrl("")} hitSlop={8}>
                          <X size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <TouchableOpacity
                        onPress={() => handlePickVideo(true)}
                        style={{
                          flex: 1, height: 48, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
                          borderWidth: 1, borderColor: borderSoft, backgroundColor: inputBg,
                        }}
                      >
                        <Video size={16} color={colors.accent} />
                        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, color: colors.textPrimary }}>Record</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handlePickVideo(false)}
                        style={{
                          flex: 1, height: 48, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
                          borderWidth: 1, borderColor: borderSoft, backgroundColor: inputBg,
                        }}
                      >
                        <Film size={16} color={colors.accent} />
                        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, color: colors.textPrimary }}>Choose</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                <FormField label="Cues" value={cues} onChangeText={setCues} placeholder="Coaching cues" borderSoft={borderSoft} inputBg={inputBg} colors={colors} />
                <FormField label="Notes" value={notes} onChangeText={setNotes} placeholder="Additional notes" borderSoft={borderSoft} inputBg={inputBg} colors={colors} />
              </View>
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setModalOpen(false)}
                style={{
                  flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                }}
              >
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: colors.textPrimary, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreate}
                disabled={!name.trim() || isBusy || videoUploading}
                style={{
                  flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
                  backgroundColor: colors.accent, opacity: isBusy || !name.trim() || videoUploading ? 0.6 : 1,
                }}
              >
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: colors.textInverse, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Create & Add
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AdminScreen>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  borderSoft,
  inputBg,
  colors,
  keyboardType,
  autoFocus,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  borderSoft: string;
  inputBg: string;
  colors: any;
  keyboardType?: "default" | "number-pad" | "url";
  autoFocus?: boolean;
}) {
  return (
    <View>
      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: colors.textSecondary, marginBottom: 6 }}>
        {label}
      </Text>
      <View style={{
        borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, height: 48, justifyContent: "center",
        backgroundColor: inputBg, borderColor: borderSoft,
      }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          style={{ fontFamily: "Outfit-Regular", fontSize: 15, color: colors.textPrimary }}
          cursorColor={colors.accent}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
        />
      </View>
    </View>
  );
}
