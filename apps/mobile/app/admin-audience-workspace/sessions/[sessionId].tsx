import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text, TextInput } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useAdminSessions } from "@/hooks/admin/useAdminSessions";
import { useAdminAudienceWorkspace, SessionItem } from "@/hooks/admin/useAdminAudienceWorkspace";
import { goBackOrFallbackTabs } from "@/lib/navigation/androidBackToTabs";
import { VIDEO_PICK_PRESERVE_NATIVE_RESOLUTION } from "@/lib/media/videoPickerNativeResolution";
import { safeLaunchImagePicker } from "@/lib/media/safeLaunchImagePicker";
import { apiRequest } from "@/lib/api";
import {
  buildSessionItemMetadata,
  emptySessionExerciseForm,
  type SessionExerciseFormState,
} from "@/lib/training-content-session-item";
import { useAppSelector } from "@/store/hooks";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import type { ImagePickerAsset } from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  StyleSheet,
} from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Feather } from "@/components/ui/theme-icons";
import { VideoPlayer } from "@/components/media/VideoPlayer";

export default function AdminSessionDetailScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const { sessionId: rawSessionId, audienceLabel: rawLabel, moduleId: rawModuleId } =
    useLocalSearchParams<{ sessionId: string; audienceLabel: string; moduleId: string }>();
  const sessionId = parseInt(rawSessionId);

  const token = useAppSelector((state) => state.user.token);
  const bootstrapReady = useAppSelector((state) => state.app.bootstrapReady);
  const canLoad = Boolean(token && bootstrapReady);

  const { workspace, loading: workspaceLoading, load: loadWorkspace } = useAdminAudienceWorkspace(token, canLoad, rawLabel);
  const sessionsHook = useAdminSessions(token, canLoad);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemForm, setItemForm] = useState<SessionExerciseFormState>(() => emptySessionExerciseForm());
  const [videoUploading, setVideoUploading] = useState(false);
  const videoPickerInFlightRef = useRef(false);

  const session = useMemo(() => {
    if (!workspace) return null;
    for (const m of workspace.modules) {
      const s = m.sessions.find((s) => s.id === sessionId);
      if (s) return s;
    }
    return null;
  }, [workspace, sessionId]);

  const uploadExerciseVideoAsset = useCallback(
    async (asset: ImagePickerAsset) => {
      if (!token) return;
      const uri = asset.uri;
      const fileName = asset.fileName ?? `session-${Date.now()}.mp4`;
      const mimeType = asset.mimeType ?? "video/mp4";
      const sizeBytes = asset.fileSize ?? 0;
      const maxMb = 250;
      if (sizeBytes > maxMb * 1024 * 1024) {
        Alert.alert("File too large", `Video must be smaller than ${maxMb}MB.`);
        return;
      }
      setVideoUploading(true);
      try {
        const presign = await apiRequest<{ uploadUrl: string; publicUrl: string }>("/media/presign", {
          method: "POST",
          token,
          body: { folder: "training-content/session-items", fileName, contentType: mimeType, sizeBytes: sizeBytes || 1 },
          skipCache: true,
        });
        const uploadResult = await FileSystem.uploadAsync(presign.uploadUrl, uri, {
          httpMethod: "PUT",
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: { "Content-Type": mimeType },
        });
        if (uploadResult.status < 200 || uploadResult.status >= 300) throw new Error("Upload failed.");
        setItemForm((prev) => ({ ...prev, videoUrl: presign.publicUrl }));
      } catch (e) {
        Alert.alert("Upload failed", e instanceof Error ? e.message : "Could not upload video.");
      } finally {
        setVideoUploading(false);
      }
    },
    [token],
  );

  const pickExerciseVideoFromLibrary = useCallback(async () => {
    if (!token || videoPickerInFlightRef.current || videoUploading) return;
    videoPickerInFlightRef.current = true;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert("Permission needed", "Allow photo library access to upload a video."); return; }
      const result = await safeLaunchImagePicker(() =>
        ImagePicker.launchImageLibraryAsync(VIDEO_PICK_PRESERVE_NATIVE_RESOLUTION)
      );
      if (result.canceled || !result.assets[0]) return;
      await uploadExerciseVideoAsset(result.assets[0]);
    } finally {
      videoPickerInFlightRef.current = false;
    }
  }, [token, uploadExerciseVideoAsset, videoUploading]);

  const recordExerciseVideo = useCallback(async () => {
    if (!token || videoPickerInFlightRef.current || videoUploading) return;
    videoPickerInFlightRef.current = true;
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert("Permission needed", "Allow camera access to record a video."); return; }
      const result = await safeLaunchImagePicker(() =>
        ImagePicker.launchCameraAsync({ ...VIDEO_PICK_PRESERVE_NATIVE_RESOLUTION, cameraType: ImagePicker.CameraType.back })
      );
      if (result.canceled || !result.assets[0]) return;
      await uploadExerciseVideoAsset(result.assets[0]);
    } finally {
      videoPickerInFlightRef.current = false;
    }
  }, [token, uploadExerciseVideoAsset, videoUploading]);

  const mainItems = useMemo(() => {
    const items = (session?.items ?? []).filter((i) => i.blockType === "main");
    return [...items].sort((a, b) => a.order - b.order);
  }, [session]);

  const populateFormFromItem = useCallback((item: SessionItem): SessionExerciseFormState => {
    const m = item.metadata;
    return {
      ...emptySessionExerciseForm(),
      id: item.id, blockType: item.blockType, title: item.title, body: item.body ?? "",
      videoUrl: item.videoUrl ?? "", allowVideoUpload: Boolean(item.allowVideoUpload),
      order: String(item.order ?? ""),
      sets: m?.sets != null ? String(m.sets) : "",
      reps: m?.reps != null ? String(m.reps) : "",
      duration: m?.duration != null ? String(m.duration) : "",
      restSeconds: m?.restSeconds != null ? String(m.restSeconds) : "",
      steps: m?.steps ?? "", cues: m?.cues ?? "",
      progression: m?.progression ?? "", regression: m?.regression ?? "",
      category: m?.category ?? "", equipment: m?.equipment ?? "",
    };
  }, []);

  useEffect(() => {
    if (canLoad && rawLabel) loadWorkspace();
  }, [canLoad, rawLabel, loadWorkspace]);

  const handleSaveItem = async () => {
    if (!itemForm.title.trim() || !itemForm.body.trim()) {
      Alert.alert("Required", "Exercise name and coaching notes are required.");
      return;
    }
    const metadata = buildSessionItemMetadata({
      sets: itemForm.sets, reps: itemForm.reps, duration: itemForm.duration,
      restSeconds: itemForm.restSeconds, steps: itemForm.steps, cues: itemForm.cues,
      progression: itemForm.progression, regression: itemForm.regression,
      category: itemForm.category, equipment: itemForm.equipment,
    });
    const orderNum = itemForm.order.trim() ? Number(itemForm.order) : null;
    const blockType = itemForm.blockType as "warmup" | "main" | "cooldown";
    try {
      if (itemForm.id) {
        await sessionsHook.updateItem(itemForm.id, {
          title: itemForm.title.trim(), body: itemForm.body.trim(), blockType,
          videoUrl: itemForm.videoUrl.trim() || null, allowVideoUpload: itemForm.allowVideoUpload, metadata,
          ...(orderNum != null && !Number.isNaN(orderNum) ? { order: orderNum } : {}),
        });
      } else {
        await sessionsHook.createItem(sessionId, {
          title: itemForm.title.trim(), body: itemForm.body.trim(), blockType,
          videoUrl: itemForm.videoUrl.trim() || null, allowVideoUpload: itemForm.allowVideoUpload, metadata,
          ...(orderNum != null && !Number.isNaN(orderNum) ? { order: orderNum } : {}),
        });
      }
      setItemForm(emptySessionExerciseForm());
      setItemModalOpen(false);
      loadWorkspace(true);
    } catch (e) {
      Alert.alert("Error", "Failed to save item");
    }
  };

  const handleDeleteItem = (itemId: number, title: string) => {
    Alert.alert("Delete Item", `Are you sure you want to delete "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await sessionsHook.deleteItem(itemId);
            loadWorkspace(true);
          } catch (e) {
            Alert.alert("Error", "Failed to delete item");
          }
        },
      },
    ]);
  };

  const handleMove = async (itemId: number, direction: "up" | "down") => {
    const items = [...mainItems];
    const index = items.findIndex((i) => i.id === itemId);
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === items.length - 1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const itemA = items[index];
    const itemB = items[targetIndex];
    try {
      await Promise.all([
        sessionsHook.updateItem(itemA.id, { order: itemB.order }),
        sessionsHook.updateItem(itemB.id, { order: itemA.order }),
      ]);
      loadWorkspace(true);
    } catch (e) {
      Alert.alert("Error", "Failed to reorder items");
    }
  };

  const cardBg     = isDark ? colors.cardElevated : colors.card;
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  const chipBg     = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)";
  const divider    = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";

  if (workspaceLoading && !session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
        <View style={{ padding: 24, gap: 12 }}>
          <Skeleton width="55%" height={28} />
          <Skeleton width="100%" height={120} borderRadius={20} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>

      {/* ── Nav header ──────────────────────���───────────────────── */}
      <View
        style={{
          paddingHorizontal: 20, paddingVertical: 14,
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          borderBottomWidth: 1, borderBottomColor: divider,
        }}
      >
        <TouchableOpacity
          onPress={() => goBackOrFallbackTabs(router, pathname)}
          style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)",
            alignItems: "center", justifyContent: "center",
            borderWidth: 1, borderColor: divider,
          }}
        >
          <Feather name="chevron-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 12 }}>
          <Text style={{ fontFamily: "Clash-Bold", fontSize: 18, color: colors.textPrimary, letterSpacing: -0.3 }} numberOfLines={1}>
            {session?.title || "Session Detail"}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ThemedScrollView showsVerticalScrollIndicator={false} onRefresh={() => loadWorkspace(true)}>
        <View style={{ padding: 20, paddingBottom: 120 }}>

          {/* ── Section header ──────���───────────────────────────── */}
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.delay(60).duration(300).springify()}
            style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}
          >
            <View>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: `${colors.accent}18`, alignSelf: "flex-start", marginBottom: 6 }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: colors.accent, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Day {session ? session.order + 1 : "?"}
                </Text>
              </View>
              <Text style={{ fontFamily: "Clash-Bold", fontSize: 24, color: colors.textPrimary, letterSpacing: -0.4 }}>
                Exercises
              </Text>
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                Name, sets, reps or time, coaching notes, and video.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => { setItemForm({ ...emptySessionExerciseForm(), blockType: "main" }); setItemModalOpen(true); }}
              activeOpacity={0.8}
              style={{
                height: 44, paddingHorizontal: 18, borderRadius: 14,
                backgroundColor: colors.accent,
                flexDirection: "row", alignItems: "center", gap: 7,
                marginLeft: 12,
              }}
            >
              <Feather name="plus" size={16} color={colors.textInverse} />
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: colors.textInverse, letterSpacing: 0.4, textTransform: "uppercase" }}>
                Add
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* ── Exercise list ───────────────────��────────────────── */}
          {mainItems.length === 0 ? (
            <View style={{
              paddingVertical: 64, alignItems: "center", justifyContent: "center",
              borderWidth: 1, borderStyle: "dashed",
              borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.12)",
              borderRadius: 20, gap: 10,
            }}>
              <Feather name="activity" size={28} color={colors.textSecondary} style={{ opacity: 0.35 }} />
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: colors.textSecondary }}>
                No exercises in this session yet.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {mainItems.map((item, idx) => (
                <Animated.View
                  key={item.id}
                  entering={reduceMotion ? undefined : FadeInDown.delay(idx * 45 + 80).duration(280).springify()}
                  style={{
                    padding: 20, borderRadius: 20, borderWidth: 1,
                    backgroundColor: cardBg, borderColor: cardBorder,
                  }}
                >
                  {/* Title row */}
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 17, color: colors.textPrimary, letterSpacing: -0.2, lineHeight: 22 }} numberOfLines={2}>
                        {item.order}. {item.title}
                      </Text>
                    </View>
                    {item.videoUrl ? (
                      <View style={{
                        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
                        backgroundColor: `${colors.accent}18`,
                        flexDirection: "row", alignItems: "center", gap: 4,
                      }}>
                        <Feather name="video" size={12} color={colors.accent} />
                        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 10, color: colors.accent, textTransform: "uppercase", letterSpacing: 0.4 }}>
                          Video
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Metadata chips */}
                  {item.metadata && (item.metadata.sets != null || item.metadata.reps != null || item.metadata.duration != null) ? (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                      {item.metadata.sets != null && (
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: chipBg }}>
                          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: colors.accent }}>{item.metadata.sets} sets</Text>
                        </View>
                      )}
                      {item.metadata.reps != null && (
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: chipBg }}>
                          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: colors.accent }}>{item.metadata.reps} reps</Text>
                        </View>
                      )}
                      {item.metadata.duration != null && (
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: chipBg }}>
                          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: colors.accent }}>{item.metadata.duration}s</Text>
                        </View>
                      )}
                      {item.metadata.restSeconds != null && (
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: chipBg }}>
                          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: colors.textSecondary }}>{item.metadata.restSeconds}s rest</Text>
                        </View>
                      )}
                    </View>
                  ) : null}

                  {/* Coaching notes */}
                  {item.body ? (
                    <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 16 }} numberOfLines={3}>
                      {item.body}
                    </Text>
                  ) : null}

                  {/* Action row */}
                  <View style={{ flexDirection: "row", gap: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: divider }}>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => handleMove(item.id, "up")}
                        style={{
                          width: 40, height: 40, borderRadius: 12,
                          backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)",
                          alignItems: "center", justifyContent: "center",
                          borderWidth: 1, borderColor: divider,
                        }}
                      >
                        <Feather name="arrow-up" size={15} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleMove(item.id, "down")}
                        style={{
                          width: 40, height: 40, borderRadius: 12,
                          backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)",
                          alignItems: "center", justifyContent: "center",
                          borderWidth: 1, borderColor: divider,
                        }}
                      >
                        <Feather name="arrow-down" size={15} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      onPress={() => { setItemForm(populateFormFromItem(item)); setItemModalOpen(true); }}
                      style={{
                        flex: 1, height: 40, borderRadius: 12,
                        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)",
                        alignItems: "center", justifyContent: "center",
                        flexDirection: "row", gap: 6,
                        borderWidth: 1, borderColor: divider,
                      }}
                    >
                      <Feather name="edit-2" size={14} color={colors.textPrimary} />
                      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, color: colors.textPrimary, textTransform: "uppercase", letterSpacing: 0.4 }}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDeleteItem(item.id, item.title)}
                      style={{
                        flex: 1, height: 40, borderRadius: 12,
                        backgroundColor: "rgba(239,68,68,0.1)",
                        alignItems: "center", justifyContent: "center",
                        flexDirection: "row", gap: 6,
                        borderWidth: 1, borderColor: "rgba(239,68,68,0.2)",
                      }}
                    >
                      <Feather name="trash-2" size={14} color={colors.danger} />
                      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, color: colors.danger, textTransform: "uppercase", letterSpacing: 0.4 }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              ))}
            </View>
          )}
        </View>
      </ThemedScrollView>

      {/* ── Exercise Modal ───────────────────────────────────────── */}
      <Modal visible={itemModalOpen} transparent animationType="fade">
        <View style={StyleSheet.absoluteFillObject} className="justify-center">
          <Pressable
            style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.58)" }]}
            onPress={() => setItemModalOpen(false)}
          />
          <View style={{
            marginHorizontal: 16, maxHeight: "90%", alignSelf: "center", width: "100%", maxWidth: 480,
            borderRadius: 28, overflow: "hidden",
            borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
            backgroundColor: isDark ? "hsl(220,10%,10%)" : "#FFFFFF",
          }}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 24, paddingBottom: 32 }}
            >
              <Text style={{ fontFamily: "Clash-Bold", fontSize: 22, color: colors.textPrimary, letterSpacing: -0.4, marginBottom: 4 }}>
                {itemForm.id ? "Edit exercise" : "Add exercise"}
              </Text>
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: colors.textSecondary, marginBottom: 20, lineHeight: 18 }}>
                Add exercise name, sets, reps or time, coaching notes, and video in {session?.title ?? "this session"}.
              </Text>

              <View style={{ flexDirection: "row", gap: 10, marginBottom: 4 }}>
                <View style={{ flex: 1 }}>
                  <FormField label="Exercise name" value={itemForm.title} onChangeText={(t) => setItemForm((p) => ({ ...p, title: t }))} placeholder="Exercise name" isDark={isDark} colors={colors} />
                </View>
                <View style={{ width: 80 }}>
                  <FormField label="Order" value={itemForm.order} onChangeText={(t) => setItemForm((p) => ({ ...p, order: t }))} placeholder="#" keyboardType="number-pad" isDark={isDark} colors={colors} />
                </View>
              </View>

              <FormField label="Coaching notes" value={itemForm.body} onChangeText={(t) => setItemForm((p) => ({ ...p, body: t }))} placeholder="Primary coaching notes" multiline isDark={isDark} colors={colors} />

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
                <View style={{ width: "47%" }}>
                  <FormField label="Sets" value={itemForm.sets} onChangeText={(t) => setItemForm((p) => ({ ...p, sets: t }))} placeholder="Sets" keyboardType="number-pad" isDark={isDark} colors={colors} />
                </View>
                <View style={{ width: "47%" }}>
                  <FormField label="Reps / Time" value={itemForm.reps} onChangeText={(t) => setItemForm((p) => ({ ...p, reps: t }))} placeholder="Reps" keyboardType="number-pad" isDark={isDark} colors={colors} />
                </View>
                <View style={{ width: "47%" }}>
                  <FormField label="Duration (sec)" value={itemForm.duration} onChangeText={(t) => setItemForm((p) => ({ ...p, duration: t }))} placeholder="Sec" keyboardType="number-pad" isDark={isDark} colors={colors} />
                </View>
                <View style={{ width: "47%" }}>
                  <FormField label="Rest (sec)" value={itemForm.restSeconds} onChangeText={(t) => setItemForm((p) => ({ ...p, restSeconds: t }))} placeholder="Rest" keyboardType="number-pad" isDark={isDark} colors={colors} />
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginBottom: 4 }}>
                <View style={{ flex: 1 }}>
                  <FormField label="Equipment" value={itemForm.equipment} onChangeText={(t) => setItemForm((p) => ({ ...p, equipment: t }))} placeholder="Equipment" isDark={isDark} colors={colors} />
                </View>
                <View style={{ flex: 1 }}>
                  <FormField label="Category" value={itemForm.category} onChangeText={(t) => setItemForm((p) => ({ ...p, category: t }))} placeholder="Category" isDark={isDark} colors={colors} />
                </View>
              </View>

              <FormField label="Coaching cues" value={itemForm.cues} onChangeText={(t) => setItemForm((p) => ({ ...p, cues: t }))} placeholder="Cues" multiline isDark={isDark} colors={colors} />
              <FormField label="Steps" value={itemForm.steps} onChangeText={(t) => setItemForm((p) => ({ ...p, steps: t }))} placeholder="Steps" multiline isDark={isDark} colors={colors} />

              <View style={{ flexDirection: "row", gap: 10, marginBottom: 4 }}>
                <View style={{ flex: 1 }}>
                  <FormField label="Progression" value={itemForm.progression} onChangeText={(t) => setItemForm((p) => ({ ...p, progression: t }))} placeholder="Progression" isDark={isDark} colors={colors} />
                </View>
                <View style={{ flex: 1 }}>
                  <FormField label="Regression" value={itemForm.regression} onChangeText={(t) => setItemForm((p) => ({ ...p, regression: t }))} placeholder="Regression" isDark={isDark} colors={colors} />
                </View>
              </View>

              {/* Video section */}
              <View style={{
                borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16,
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
              }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: colors.textPrimary, marginBottom: 12 }}>
                  Exercise video
                </Text>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                  <TouchableOpacity
                    onPress={() => void pickExerciseVideoFromLibrary()}
                    disabled={videoUploading}
                    style={{
                      flex: 1, height: 44, borderRadius: 12, borderWidth: 1,
                      borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.1)",
                      alignItems: "center", justifyContent: "center",
                      opacity: videoUploading ? 0.6 : 1,
                    }}
                  >
                    {videoUploading
                      ? <ActivityIndicator size="small" color={colors.accent} />
                      : <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, color: colors.textPrimary, textAlign: "center" }}>Upload from library</Text>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => void recordExerciseVideo()}
                    disabled={videoUploading}
                    style={{
                      flex: 1, height: 44, borderRadius: 12, borderWidth: 1,
                      borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.1)",
                      alignItems: "center", justifyContent: "center",
                      opacity: videoUploading ? 0.6 : 1,
                    }}
                  >
                    {videoUploading
                      ? <ActivityIndicator size="small" color={colors.accent} />
                      : <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, color: colors.textPrimary, textAlign: "center" }}>Record video</Text>
                    }
                  </TouchableOpacity>
                </View>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>
                  Or paste a URL:
                </Text>
                <FormField label="Video URL" value={itemForm.videoUrl} onChangeText={(t) => setItemForm((p) => ({ ...p, videoUrl: t }))} placeholder="https://..." isDark={isDark} colors={colors} />
                {itemForm.videoUrl.trim() ? (
                  <View style={{ marginTop: 8, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)" }}>
                    <VideoPlayer uri={itemForm.videoUrl.trim()} height={180} autoPlay={false} initialMuted={false} isLooping={false} />
                  </View>
                ) : null}
              </View>

              {/* Allow upload toggle */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, marginBottom: 16 }}>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: colors.textPrimary, flex: 1, paddingRight: 16 }}>
                  Allow athlete video upload
                </Text>
                <Switch
                  value={itemForm.allowVideoUpload}
                  onValueChange={(v) => setItemForm((p) => ({ ...p, allowVideoUpload: v }))}
                  trackColor={{ false: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.12)", true: colors.accent }}
                />
              </View>

              {/* Block type */}
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>
                Block type
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
                {(["warmup", "main", "cooldown"] as const).map((type) => {
                  const isActive = itemForm.blockType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setItemForm((p) => ({ ...p, blockType: type }))}
                      activeOpacity={0.8}
                      style={{
                        flex: 1, height: 40, borderRadius: 12, borderWidth: 1,
                        alignItems: "center", justifyContent: "center",
                        backgroundColor: isActive ? colors.accent : "transparent",
                        borderColor: isActive ? colors.accent : isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.1)",
                      }}
                    >
                      <Text style={{
                        fontFamily: "Outfit-Bold", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4,
                        color: isActive ? colors.textInverse : colors.textSecondary,
                      }}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Form actions */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setItemModalOpen(false)}
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
                  onPress={handleSaveItem}
                  disabled={!itemForm.title.trim() || !itemForm.body.trim() || sessionsHook.isBusy}
                  style={{
                    flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
                    backgroundColor: colors.accent,
                    opacity: sessionsHook.isBusy || !itemForm.body.trim() ? 0.55 : 1,
                  }}
                >
                  {sessionsHook.isBusy
                    ? <ActivityIndicator color={colors.textInverse} size="small" />
                    : <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: colors.textInverse, letterSpacing: 0.5, textTransform: "uppercase" }}>
                        {itemForm.id ? "Update" : "Create"}
                      </Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Form field ─────────────────────────────��──────────────────────────

function FormField({
  label, value, onChangeText, placeholder, multiline = false, keyboardType, isDark, colors,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "number-pad";
  isDark: boolean;
  colors: any;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{
        fontFamily: "Outfit-Bold", fontSize: 11, color: colors.textSecondary,
        textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 7,
      }}>
        {label}
      </Text>
      <View style={{
        borderRadius: 14, borderWidth: isFocused ? 2 : 1,
        paddingHorizontal: 14, justifyContent: "center",
        backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)",
        borderColor: isFocused ? colors.accent : (isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)"),
        minHeight: multiline ? 112 : 48,
        paddingVertical: multiline ? 14 : 0,
      }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          multiline={multiline}
          keyboardType={keyboardType}
          textAlignVertical={multiline ? "top" : "center"}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{ fontFamily: "Outfit-Regular", fontSize: 15, color: colors.textPrimary }}
          cursorColor={colors.accent}
        />
      </View>
    </View>
  );
}
