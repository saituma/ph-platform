import { Text } from "@/components/ScaledText";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { useAdminSessions } from "@/hooks/admin/useAdminSessions";
import { useAdminAudienceWorkspace, SessionItem } from "@/hooks/admin/useAdminAudienceWorkspace";
import { VIDEO_PICK_PRESERVE_NATIVE_RESOLUTION } from "@/lib/media/videoPickerNativeResolution";
import { safeLaunchImagePicker } from "@/lib/media/safeLaunchImagePicker";
import { apiRequest } from "@/lib/api";
import {
  buildSessionItemMetadata,
  emptySessionExerciseForm,
  type SessionExerciseFormState,
} from "@/lib/training-content-session-item";
import { useAppSelector } from "@/store/hooks";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import type { ImagePickerAsset } from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  View,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
} from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import {
  Dumbbell,
  Plus,
  Trash2,
  Video,
  Film,
  Edit2,
  ArrowUp,
  ArrowDown,
} from "lucide-react-native";
import {
  AdminScreen,
  AdminHeader,
  AdminBackButton,
  AdminCard,
  AdminButton,
  AdminBadge,
  AdminFormField,
  AdminChipSelect,
  AdminEmptyState,
  AdminLoadingState,
  AdminIconButton,
  AdminModalContainer,
  AdminModalTitle,
  AdminModalSubtitle,
  useAdminPastel,
} from "@/components/admin/AdminUI";
import type { AdminCardColor } from "@/constants/theme";
import { VideoPlayer } from "@/components/media/VideoPlayer";

const CARD_COLORS: AdminCardColor[] = ["sage", "lavender", "peach", "mint", "pink", "yellow"];

export default function AdminSessionDetailScreen() {
  const p = useAdminPastel();
  const router = useRouter();
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
    for (const m of workspace.modules ?? []) {
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

  if (workspaceLoading && !session) {
    return (
      <AdminScreen>
        <AdminLoadingState label="Loading session" />
      </AdminScreen>
    );
  }

  return (
    <AdminScreen>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8 }}>
        <AdminBackButton onPress={() => router.back()} />
      </View>
      <AdminHeader
        title={session?.title || "Session Detail"}
        subtitle={session ? `Day ${session.order + 1}` : undefined}
        right={
          <AdminButton
            label="Add Exercise"
            icon={Plus}
            onPress={() => { setItemForm({ ...emptySessionExerciseForm(), blockType: "main" }); setItemModalOpen(true); }}
            compact
          />
        }
        compact
      />

      <ThemedScrollView showsVerticalScrollIndicator={false} onRefresh={() => loadWorkspace(true)}>
        <View style={{ padding: 20, paddingBottom: 120 }}>

          {/* Exercise list */}
          {mainItems.length === 0 ? (
            <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(60).duration(300).springify()}>
              <AdminEmptyState
                icon={Dumbbell}
                title="No exercises yet"
                description="Add exercises with sets, reps, coaching notes, and video."
                color="sage"
                action={
                  <AdminButton
                    label="Add Exercise"
                    icon={Plus}
                    onPress={() => { setItemForm({ ...emptySessionExerciseForm(), blockType: "main" }); setItemModalOpen(true); }}
                  />
                }
              />
            </Animated.View>
          ) : (
            <View style={{ gap: 14 }}>
              {mainItems.map((item, idx) => {
                const cardColor = CARD_COLORS[idx % CARD_COLORS.length];
                return (
                  <Animated.View
                    key={item.id}
                    entering={reduceMotion ? undefined : FadeInDown.delay(idx * 45 + 80).duration(280).springify()}
                  >
                    <AdminCard color={cardColor}>
                      {/* Title row */}
                      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                        <View style={{ flex: 1, marginRight: 10, flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: p.accentSoft, alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontFamily: "Outfit-ExtraBold", fontSize: 13, color: p.accent }}>{item.order}</Text>
                          </View>
                          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: p.textPrimary, letterSpacing: -0.2, flex: 1 }} numberOfLines={2}>
                            {item.title}
                          </Text>
                        </View>
                        {item.videoUrl ? (
                          <AdminBadge color="mint">
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                              <Video size={10} color={p.accent} strokeWidth={2.5} />
                              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 10, color: p.accent }}>Video</Text>
                            </View>
                          </AdminBadge>
                        ) : null}
                      </View>

                      {/* Category badge */}
                      {item.metadata?.category ? (
                        <View style={{ marginBottom: 10 }}>
                          <AdminBadge color="lavender">
                            {item.metadata.category}
                          </AdminBadge>
                        </View>
                      ) : null}

                      {/* Metadata chips */}
                      {item.metadata && (item.metadata.sets != null || item.metadata.reps != null || item.metadata.duration != null) ? (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                          {item.metadata.sets != null && (
                            <AdminBadge color="peach">{item.metadata.sets} sets</AdminBadge>
                          )}
                          {item.metadata.reps != null && (
                            <AdminBadge color="sage">{item.metadata.reps} reps</AdminBadge>
                          )}
                          {item.metadata.duration != null && (
                            <AdminBadge color="mint">{item.metadata.duration}s</AdminBadge>
                          )}
                          {item.metadata.restSeconds != null && (
                            <AdminBadge color="yellow">{item.metadata.restSeconds}s rest</AdminBadge>
                          )}
                        </View>
                      ) : null}

                      {/* Coaching notes */}
                      {item.body ? (
                        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textSecondary, lineHeight: 18, marginBottom: 14 }} numberOfLines={3}>
                          {item.body}
                        </Text>
                      ) : null}

                      {/* Action row */}
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: p.divider }}>
                        <AdminIconButton icon={ArrowUp} onPress={() => handleMove(item.id, "up")} accessibilityLabel="Move up" />
                        <AdminIconButton icon={ArrowDown} onPress={() => handleMove(item.id, "down")} accessibilityLabel="Move down" />
                        <View style={{ flex: 1 }} />
                        <AdminIconButton icon={Edit2} variant="accent" onPress={() => { setItemForm(populateFormFromItem(item)); setItemModalOpen(true); }} accessibilityLabel="Edit exercise" />
                        <AdminIconButton icon={Trash2} variant="danger" onPress={() => handleDeleteItem(item.id, item.title)} accessibilityLabel="Delete exercise" />
                      </View>
                    </AdminCard>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </View>
      </ThemedScrollView>

      {/* Exercise Modal */}
      <Modal visible={itemModalOpen} transparent animationType="fade">
        <AdminModalContainer onClose={() => setItemModalOpen(false)} position="bottom">
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <AdminModalTitle>{itemForm.id ? "Edit exercise" : "Add exercise"}</AdminModalTitle>
            <AdminModalSubtitle>
              {`Add exercise details for ${session?.title ?? "this session"}.`}
            </AdminModalSubtitle>

            <View style={{ flexDirection: "row", gap: 10, marginBottom: 4 }}>
              <View style={{ flex: 1 }}>
                <AdminFormField label="Exercise name" value={itemForm.title} onChangeText={(t) => setItemForm((prev) => ({ ...prev, title: t }))} placeholder="Exercise name" />
              </View>
              <View style={{ width: 80 }}>
                <AdminFormField label="Order" value={itemForm.order} onChangeText={(t) => setItemForm((prev) => ({ ...prev, order: t }))} placeholder="#" keyboardType="number-pad" />
              </View>
            </View>

            <AdminFormField label="Coaching notes" value={itemForm.body} onChangeText={(t) => setItemForm((prev) => ({ ...prev, body: t }))} placeholder="Primary coaching notes" multiline />

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
              <View style={{ width: "47%" }}>
                <AdminFormField label="Sets" value={itemForm.sets} onChangeText={(t) => setItemForm((prev) => ({ ...prev, sets: t }))} placeholder="Sets" keyboardType="number-pad" />
              </View>
              <View style={{ width: "47%" }}>
                <AdminFormField label="Reps / Time" value={itemForm.reps} onChangeText={(t) => setItemForm((prev) => ({ ...prev, reps: t }))} placeholder="Reps" keyboardType="number-pad" />
              </View>
              <View style={{ width: "47%" }}>
                <AdminFormField label="Duration (sec)" value={itemForm.duration} onChangeText={(t) => setItemForm((prev) => ({ ...prev, duration: t }))} placeholder="Sec" keyboardType="number-pad" />
              </View>
              <View style={{ width: "47%" }}>
                <AdminFormField label="Rest (sec)" value={itemForm.restSeconds} onChangeText={(t) => setItemForm((prev) => ({ ...prev, restSeconds: t }))} placeholder="Rest" keyboardType="number-pad" />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginBottom: 4 }}>
              <View style={{ flex: 1 }}>
                <AdminFormField label="Equipment" value={itemForm.equipment} onChangeText={(t) => setItemForm((prev) => ({ ...prev, equipment: t }))} placeholder="Equipment" />
              </View>
              <View style={{ flex: 1 }}>
                <AdminFormField label="Category" value={itemForm.category} onChangeText={(t) => setItemForm((prev) => ({ ...prev, category: t }))} placeholder="Category" />
              </View>
            </View>

            <AdminFormField label="Coaching cues" value={itemForm.cues} onChangeText={(t) => setItemForm((prev) => ({ ...prev, cues: t }))} placeholder="Cues" multiline />
            <AdminFormField label="Steps" value={itemForm.steps} onChangeText={(t) => setItemForm((prev) => ({ ...prev, steps: t }))} placeholder="Steps" multiline />

            <View style={{ flexDirection: "row", gap: 10, marginBottom: 4 }}>
              <View style={{ flex: 1 }}>
                <AdminFormField label="Progression" value={itemForm.progression} onChangeText={(t) => setItemForm((prev) => ({ ...prev, progression: t }))} placeholder="Progression" />
              </View>
              <View style={{ flex: 1 }}>
                <AdminFormField label="Regression" value={itemForm.regression} onChangeText={(t) => setItemForm((prev) => ({ ...prev, regression: t }))} placeholder="Regression" />
              </View>
            </View>

            {/* Video section */}
            <View style={{
              borderRadius: 20, padding: 16, marginBottom: 16,
              backgroundColor: p.cardMint,
            }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.textPrimary, marginBottom: 12 }}>
                Exercise video
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                <AdminButton
                  label="Upload"
                  icon={Film}
                  variant="secondary"
                  onPress={() => void pickExerciseVideoFromLibrary()}
                  disabled={videoUploading}
                  loading={videoUploading}
                  compact
                  style={{ flex: 1 }}
                />
                <AdminButton
                  label="Record"
                  icon={Video}
                  variant="secondary"
                  onPress={() => void recordExerciseVideo()}
                  disabled={videoUploading}
                  loading={videoUploading}
                  compact
                  style={{ flex: 1 }}
                />
              </View>
              <AdminFormField label="Video URL" value={itemForm.videoUrl} onChangeText={(t) => setItemForm((prev) => ({ ...prev, videoUrl: t }))} placeholder="https://..." keyboardType="url" />
              {itemForm.videoUrl.trim() ? (
                <View style={{ marginTop: 8, borderRadius: 16, overflow: "hidden" }}>
                  <VideoPlayer uri={itemForm.videoUrl.trim()} height={180} autoPlay={false} initialMuted={false} isLooping={false} />
                </View>
              ) : null}
            </View>

            {/* Allow upload toggle */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, marginBottom: 16 }}>
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textPrimary, flex: 1, paddingRight: 16 }}>
                Allow athlete video upload
              </Text>
              <Switch
                value={itemForm.allowVideoUpload}
                onValueChange={(v) => setItemForm((prev) => ({ ...prev, allowVideoUpload: v }))}
                trackColor={{ false: p.divider, true: p.accent }}
              />
            </View>

            {/* Block type */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase", color: p.textMuted, marginBottom: 10 }}>
                Block type
              </Text>
              <AdminChipSelect
                options={[
                  { key: "warmup" as const, label: "Warmup" },
                  { key: "main" as const, label: "Main" },
                  { key: "cooldown" as const, label: "Cooldown" },
                ]}
                value={itemForm.blockType as "warmup" | "main" | "cooldown"}
                onChange={(v) => setItemForm((prev) => ({ ...prev, blockType: v }))}
              />
            </View>

            {/* Form actions */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <AdminButton
                label="Cancel"
                variant="ghost"
                onPress={() => setItemModalOpen(false)}
                style={{ flex: 1 }}
              />
              <AdminButton
                label={itemForm.id ? "Update" : "Create"}
                onPress={handleSaveItem}
                disabled={!itemForm.title.trim() || !itemForm.body.trim() || sessionsHook.isBusy}
                loading={sessionsHook.isBusy}
                style={{ flex: 1 }}
              />
            </View>
          </ScrollView>
        </AdminModalContainer>
      </Modal>
    </AdminScreen>
  );
}
