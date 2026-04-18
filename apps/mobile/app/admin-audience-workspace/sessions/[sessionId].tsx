import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text, TextInput } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Shadows } from "@/constants/theme";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Feather } from "@/components/ui/theme-icons";
import { VideoPlayer } from "@/components/media/VideoPlayer";

export default function AdminSessionDetailScreen() {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { sessionId: rawSessionId, audienceLabel: rawLabel, moduleId: rawModuleId } = useLocalSearchParams<{ sessionId: string; audienceLabel: string; moduleId: string }>();
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
      const s = m.sessions.find(s => s.id === sessionId);
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
          body: {
            folder: "training-content/session-items",
            fileName,
            contentType: mimeType,
            sizeBytes: sizeBytes || 1,
          },
          skipCache: true,
        });
        const uploadResult = await FileSystem.uploadAsync(presign.uploadUrl, uri, {
          httpMethod: "PUT",
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: { "Content-Type": mimeType },
        });
        if (uploadResult.status < 200 || uploadResult.status >= 300) {
          throw new Error("Upload failed.");
        }
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
      if (!perm.granted) {
        Alert.alert("Permission needed", "Allow photo library access to upload a video.");
        return;
      }
      const result = await safeLaunchImagePicker(() =>
        ImagePicker.launchImageLibraryAsync(VIDEO_PICK_PRESERVE_NATIVE_RESOLUTION),
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
      if (!perm.granted) {
        Alert.alert("Permission needed", "Allow camera access to record a video.");
        return;
      }
      const result = await safeLaunchImagePicker(() =>
        ImagePicker.launchCameraAsync({
          ...VIDEO_PICK_PRESERVE_NATIVE_RESOLUTION,
          cameraType: ImagePicker.CameraType.back,
        }),
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
      id: item.id,
      blockType: item.blockType,
      title: item.title,
      body: item.body ?? "",
      videoUrl: item.videoUrl ?? "",
      allowVideoUpload: Boolean(item.allowVideoUpload),
      order: String(item.order ?? ""),
      sets: m?.sets != null ? String(m.sets) : "",
      reps: m?.reps != null ? String(m.reps) : "",
      duration: m?.duration != null ? String(m.duration) : "",
      restSeconds: m?.restSeconds != null ? String(m.restSeconds) : "",
      steps: m?.steps ?? "",
      cues: m?.cues ?? "",
      progression: m?.progression ?? "",
      regression: m?.regression ?? "",
      category: m?.category ?? "",
      equipment: m?.equipment ?? "",
    };
  }, []);

  useEffect(() => {
    if (canLoad && rawLabel) {
      loadWorkspace();
    }
  }, [canLoad, rawLabel, loadWorkspace]);

  const handleSaveItem = async () => {
    if (!itemForm.title.trim() || !itemForm.body.trim()) {
      Alert.alert("Required", "Exercise name and coaching notes are required.");
      return;
    }
    const metadata = buildSessionItemMetadata({
      sets: itemForm.sets,
      reps: itemForm.reps,
      duration: itemForm.duration,
      restSeconds: itemForm.restSeconds,
      steps: itemForm.steps,
      cues: itemForm.cues,
      progression: itemForm.progression,
      regression: itemForm.regression,
      category: itemForm.category,
      equipment: itemForm.equipment,
    });
    const orderNum = itemForm.order.trim() ? Number(itemForm.order) : null;
    const blockType = itemForm.blockType as "warmup" | "main" | "cooldown";
    try {
      if (itemForm.id) {
        await sessionsHook.updateItem(itemForm.id, {
          title: itemForm.title.trim(),
          body: itemForm.body.trim(),
          blockType,
          videoUrl: itemForm.videoUrl.trim() || null,
          allowVideoUpload: itemForm.allowVideoUpload,
          metadata,
          ...(orderNum != null && !Number.isNaN(orderNum) ? { order: orderNum } : {}),
        });
      } else {
        await sessionsHook.createItem(sessionId, {
          title: itemForm.title.trim(),
          body: itemForm.body.trim(),
          blockType,
          videoUrl: itemForm.videoUrl.trim() || null,
          allowVideoUpload: itemForm.allowVideoUpload,
          metadata,
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
        }
      }
    ]);
  };

  const handleMove = async (itemId: number, direction: 'up' | 'down') => {
    const items = [...mainItems];
    const index = items.findIndex(i => i.id === itemId);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
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

  const cardStyle = {
    backgroundColor: isDark ? colors.cardElevated : colors.card,
    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
    borderRadius: 24,
    ...(isDark ? Shadows.none : Shadows.sm),
  };

  if (workspaceLoading && !session) {
    return (
      <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
        <View className="p-6 gap-4">
          <Skeleton width="60%" height={32} />
          <Skeleton width="100%" height={120} borderRadius={24} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <View className="px-6 py-6 flex-row items-center justify-between border-b border-app/5">
        <TouchableOpacity 
          onPress={() => goBackOrFallbackTabs(router, pathname)}
          className="h-10 w-10 rounded-full bg-secondary/5 items-center justify-center border border-app/5"
        >
          <Feather name="chevron-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <View className="flex-1 items-center px-4">
          <Text className="text-xl font-clash font-bold text-app" numberOfLines={1}>
            {session?.title || "Session Detail"}
          </Text>
        </View>
        <View className="w-10" />
      </View>

      <ThemedScrollView showsVerticalScrollIndicator={false} onRefresh={() => loadWorkspace(true)}>
        <View className="p-6 pb-40">
          <View className="flex-row items-center justify-between mb-8">
            <View>
              <Text className="text-[11px] font-outfit-bold text-accent uppercase tracking-wider mb-1">
                Day {session ? session.order + 1 : "?"}
              </Text>
              <Text className="text-2xl font-clash font-bold text-app">Exercises</Text>
              <Text className="text-sm font-outfit text-textSecondary mt-1">
                Name, sets, reps or time, coaching notes, and video — same as web.
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => {
                setItemForm({ ...emptySessionExerciseForm(), blockType: "main" });
                setItemModalOpen(true);
              }}
              className="h-12 px-5 rounded-2xl bg-accent items-center justify-center flex-row gap-2"
            >
              <Feather name="plus" size={18} color={colors.textInverse} />
              <Text className="font-outfit-bold text-[14px] uppercase tracking-wider" style={{ color: colors.textInverse }}>Add exercise</Text>
            </TouchableOpacity>
          </View>

          {mainItems.length === 0 ? (
            <View className="py-20 items-center justify-center border border-dashed border-app/20 rounded-[32px]">
              <Text className="text-textSecondary font-outfit italic text-base">No exercises in this session yet.</Text>
            </View>
          ) : (
            <View className="gap-4">
              {mainItems.map((item) => (
                <View 
                  key={item.id}
                  className="p-6 border"
                  style={cardStyle}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-1 mr-4">
                      <Text className="text-lg font-outfit-bold text-app" numberOfLines={2}>
                        {item.order}. {item.title}
                      </Text>
                    </View>
                    {item.videoUrl ? <Feather name="video" size={16} color={colors.accent} /> : null}
                  </View>
                  {item.metadata && (item.metadata.sets != null || item.metadata.reps != null) ? (
                    <Text className="text-xs font-outfit text-accent mb-2">
                      {item.metadata.sets != null ? `${item.metadata.sets} sets` : ""}
                      {item.metadata.sets != null && item.metadata.reps != null ? " · " : ""}
                      {item.metadata.reps != null ? `${item.metadata.reps} reps` : ""}
                      {item.metadata.duration != null ? ` · ${item.metadata.duration}s` : ""}
                    </Text>
                  ) : null}
                  {item.body ? (
                    <Text className="text-sm font-outfit text-textSecondary mb-4 leading-relaxed" numberOfLines={3}>
                      {item.body}
                    </Text>
                  ) : null}
                  
                  <View className="flex-row gap-3 pt-4 border-t border-app/5">
                    <View className="flex-row gap-2">
                      <TouchableOpacity 
                        onPress={() => handleMove(item.id, 'up')}
                        className="h-10 w-10 rounded-xl bg-secondary/5 items-center justify-center border border-app/5"
                      >
                        <Feather name="arrow-up" size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => handleMove(item.id, 'down')}
                        className="h-10 w-10 rounded-xl bg-secondary/5 items-center justify-center border border-app/5"
                      >
                        <Feather name="arrow-down" size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity 
                      onPress={() => {
                        setItemForm(populateFormFromItem(item));
                        setItemModalOpen(true);
                      }}
                      className="flex-1 h-10 rounded-xl bg-secondary/5 items-center justify-center flex-row gap-2"
                    >
                      <Feather name="edit-2" size={14} color={colors.text} />
                      <Text className="text-[10px] font-outfit-bold text-app uppercase">Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleDeleteItem(item.id, item.title)}
                      className="flex-1 h-10 rounded-xl bg-red-500/10 items-center justify-center flex-row gap-2"
                    >
                      <Feather name="trash-2" size={14} color={colors.danger} />
                      <Text className="text-[10px] font-outfit-bold text-red-400 uppercase">Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ThemedScrollView>

      <Modal visible={itemModalOpen} transparent animationType="fade">
        <View style={StyleSheet.absoluteFillObject} className="justify-center">
          <Pressable
            style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.55)" }]}
            onPress={() => setItemModalOpen(false)}
          />
          <View className="mx-5 max-h-[88%] self-center w-full max-w-lg rounded-[32px] overflow-hidden border border-app/10" style={{ backgroundColor: isDark ? "#161628" : "#FFFFFF" }}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingBottom: 32 }}>
              <Text className="text-2xl font-clash font-bold text-app mb-1">
                {itemForm.id ? "Edit exercise" : "Add exercise"}
              </Text>
              <Text className="text-sm font-outfit text-textSecondary mb-6">
                Add exercise name, sets, reps or time, coaching notes, and video in {session?.title ?? "this session"}.
              </Text>

              <View className="flex-row gap-2 mb-4">
                <View className="flex-1">
                  <FormField label="Exercise name" value={itemForm.title} onChangeText={(t) => setItemForm((prev) => ({ ...prev, title: t }))} placeholder="Exercise name" />
                </View>
                <View style={{ width: 88 }}>
                  <FormField label="Order" value={itemForm.order} onChangeText={(t) => setItemForm((prev) => ({ ...prev, order: t }))} placeholder="#" keyboardType="number-pad" />
                </View>
              </View>

              <FormField label="Coaching notes" value={itemForm.body} onChangeText={(t) => setItemForm((prev) => ({ ...prev, body: t }))} placeholder="Primary coaching notes" multiline />

              <View className="flex-row flex-wrap gap-2 mb-4">
                <View style={{ width: "47%" }}>
                  <FormField label="Sets" value={itemForm.sets} onChangeText={(t) => setItemForm((prev) => ({ ...prev, sets: t }))} placeholder="Sets" keyboardType="number-pad" />
                </View>
                <View style={{ width: "47%" }}>
                  <FormField label="Reps / Time" value={itemForm.reps} onChangeText={(t) => setItemForm((prev) => ({ ...prev, reps: t }))} placeholder="Reps" keyboardType="number-pad" />
                </View>
                <View style={{ width: "47%" }}>
                  <FormField label="Time (sec)" value={itemForm.duration} onChangeText={(t) => setItemForm((prev) => ({ ...prev, duration: t }))} placeholder="Sec" keyboardType="number-pad" />
                </View>
                <View style={{ width: "47%" }}>
                  <FormField label="Rest sec" value={itemForm.restSeconds} onChangeText={(t) => setItemForm((prev) => ({ ...prev, restSeconds: t }))} placeholder="Rest" keyboardType="number-pad" />
                </View>
              </View>

              <View className="flex-row gap-2 mb-4">
                <View className="flex-1">
                  <FormField label="Equipment" value={itemForm.equipment} onChangeText={(t) => setItemForm((prev) => ({ ...prev, equipment: t }))} placeholder="Equipment" />
                </View>
                <View className="flex-1">
                  <FormField label="Category (optional)" value={itemForm.category} onChangeText={(t) => setItemForm((prev) => ({ ...prev, category: t }))} placeholder="Category" />
                </View>
              </View>

              <FormField label="Extra coaching cues" value={itemForm.cues} onChangeText={(t) => setItemForm((prev) => ({ ...prev, cues: t }))} placeholder="Cues" multiline />
              <FormField label="Steps" value={itemForm.steps} onChangeText={(t) => setItemForm((prev) => ({ ...prev, steps: t }))} placeholder="Steps" multiline />

              <View className="flex-row gap-2 mb-4">
                <View className="flex-1">
                  <FormField label="Progression" value={itemForm.progression} onChangeText={(t) => setItemForm((prev) => ({ ...prev, progression: t }))} placeholder="Progression" />
                </View>
                <View className="flex-1">
                  <FormField label="Regression" value={itemForm.regression} onChangeText={(t) => setItemForm((prev) => ({ ...prev, regression: t }))} placeholder="Regression" />
                </View>
              </View>

              <View className="mb-4 rounded-2xl border border-app/10 p-4" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)" }}>
                <Text className="text-sm font-outfit-bold text-app mb-3">Exercise video</Text>
                <View className="flex-row gap-2 mb-3">
                  <TouchableOpacity
                    onPress={() => void pickExerciseVideoFromLibrary()}
                    disabled={videoUploading}
                    className="flex-1 h-11 px-3 rounded-xl border border-app/15 items-center justify-center"
                    style={{ opacity: videoUploading ? 0.6 : 1 }}
                  >
                    {videoUploading ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                      <Text className="text-xs font-outfit-bold text-app text-center">Upload from library</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => void recordExerciseVideo()}
                    disabled={videoUploading}
                    className="flex-1 h-11 px-3 rounded-xl border border-app/15 items-center justify-center"
                    style={{ opacity: videoUploading ? 0.6 : 1 }}
                  >
                    {videoUploading ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                      <Text className="text-xs font-outfit-bold text-app text-center">Record video</Text>
                    )}
                  </TouchableOpacity>
                </View>
                <Text className="text-xs font-outfit text-textSecondary mb-2">Or paste a video URL below</Text>
                <FormField label="Video URL" value={itemForm.videoUrl} onChangeText={(t) => setItemForm((prev) => ({ ...prev, videoUrl: t }))} placeholder="https://..." />
                {itemForm.videoUrl.trim() ? (
                  <View className="mt-3 rounded-xl overflow-hidden border border-app/10">
                    <VideoPlayer uri={itemForm.videoUrl.trim()} height={200} autoPlay={false} initialMuted={false} isLooping={false} />
                  </View>
                ) : null}
              </View>

              <View className="flex-row items-center justify-between mb-6 px-1">
                <Text className="text-sm font-outfit text-app flex-1 pr-4">Allow athlete video upload</Text>
                <Switch
                  value={itemForm.allowVideoUpload}
                  onValueChange={(v) => setItemForm((prev) => ({ ...prev, allowVideoUpload: v }))}
                  trackColor={{ false: "#767577", true: colors.accent }}
                />
              </View>

              <View className="mb-4">
                <Text className="text-[11px] font-outfit-bold text-textSecondary uppercase tracking-[2px] mb-3 ml-1">Block type</Text>
                <View className="flex-row gap-2">
                  {(["warmup", "main", "cooldown"] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setItemForm((prev) => ({ ...prev, blockType: type }))}
                      className={`flex-1 h-10 rounded-xl items-center justify-center border ${itemForm.blockType === type ? "bg-accent border-accent" : "border-app/10"}`}
                    >
                      <Text className={`text-[10px] font-outfit-bold uppercase ${itemForm.blockType === type ? "text-white" : "text-textSecondary"}`}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View className="flex-row gap-3 mt-2">
                <TouchableOpacity onPress={() => setItemModalOpen(false)} className="flex-1 h-12 rounded-xl bg-secondary/10 items-center justify-center">
                  <Text className="text-sm font-outfit-bold text-app uppercase tracking-wider">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveItem}
                  disabled={!itemForm.title.trim() || !itemForm.body.trim() || sessionsHook.isBusy}
                  className="flex-1 h-12 rounded-xl bg-accent items-center justify-center"
                  style={{ opacity: sessionsHook.isBusy || !itemForm.body.trim() ? 0.6 : 1 }}
                >
                  {sessionsHook.isBusy ? (
                    <ActivityIndicator color={colors.textInverse} size="small" />
                  ) : (
                    <Text className="text-sm font-outfit-bold uppercase tracking-wider" style={{ color: colors.textInverse }}>
                      {itemForm.id ? "Update" : "Create"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "number-pad";
}) {
  const { colors, isDark } = useAppTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="mb-4">
      <Text className="text-[11px] font-outfit-bold text-textSecondary uppercase tracking-[2px] mb-2 ml-1">
        {label}
      </Text>
      <View 
        className="rounded-[18px] border px-5 justify-center"
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)",
          borderColor: isFocused ? colors.accent : (isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)"),
          borderWidth: isFocused ? 2 : 1,
          minHeight: multiline ? 120 : 52,
          paddingVertical: multiline ? 16 : 0,
        }}
      >
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
          className="text-[16px] font-outfit text-app"
          cursorColor={colors.accent}
        />
      </View>
    </View>
  );
}
