import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { radius, spacing } from "@/constants/theme";
import { createSocialPost } from "@/services/tracking/socialService";
import { apiRequest } from "@/lib/api";
import { safeLaunchImagePicker } from "@/lib/media/safeLaunchImagePicker";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

type SelectedPhoto = {
  uri: string;
  mimeType: string;
  sizeBytes: number;
  fileName: string;
};

export function PostComposerSheet({
  open,
  onClose,
  token,
  useTeamFeed = false,
  onPostCreated,
}: {
  open: boolean;
  onClose: () => void;
  token: string;
  useTeamFeed?: boolean;
  onPostCreated?: () => void;
}) {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<SelectedPhoto | null>(null);

  const canSubmit = useMemo(
    () => posting || (!text.trim().length && !selectedPhoto),
    [posting, selectedPhoto, text],
  );

  const pickPhoto = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo access to attach an image to your post.");
      return;
    }

    const result = await safeLaunchImagePicker(() =>
      ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.85,
      }),
    );

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const fileInfo = await FileSystem.getInfoAsync(asset.uri);
    const mimeType = asset.mimeType?.trim() || "image/jpeg";
    const extension = mimeType.split("/")[1] || "jpg";
    const fallbackSize =
      "size" in fileInfo && typeof fileInfo.size === "number" ? fileInfo.size : 512000;
    setSelectedPhoto({
      uri: asset.uri,
      mimeType,
      sizeBytes: Math.max(1, asset.fileSize ?? fallbackSize),
      fileName: asset.fileName?.trim() || `team-post-${Date.now()}.${extension}`,
    });
  }, []);

  const uploadPhoto = useCallback(
    async (photo: SelectedPhoto) => {
      const presign = await apiRequest<{ uploadUrl: string; publicUrl: string }>(
        "/media/presign",
        {
          method: "POST",
          token,
          body: {
            folder: "social-posts/images",
            fileName: photo.fileName,
            contentType: photo.mimeType,
            sizeBytes: photo.sizeBytes,
            client: "native",
          },
          skipCache: true,
        },
      );

      try {
        const result = await FileSystem.uploadAsync(presign.uploadUrl, photo.uri, {
          httpMethod: "PUT",
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            "Content-Type": photo.mimeType,
          },
        });
        if (result.status < 200 || result.status >= 300) {
          throw new Error(`Upload failed (${result.status})`);
        }
      } catch (error) {
        const blob = await (await fetch(photo.uri)).blob();
        const response = await fetch(presign.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": photo.mimeType,
          },
          body: blob,
        });
        if (!response.ok) {
          throw error instanceof Error ? error : new Error("Upload failed");
        }
      }

      return presign.publicUrl;
    },
    [token],
  );

  const onSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed && !selectedPhoto) return;
    if (posting) return;
    setPosting(true);
    try {
      const mediaUrl = selectedPhoto ? await uploadPhoto(selectedPhoto) : undefined;
      await createSocialPost(
        token,
        {
          content: trimmed,
          ...(mediaUrl ? { mediaUrl, mediaType: "image" } : {}),
        },
        { useTeamFeed },
      );
      setText("");
      setSelectedPhoto(null);
      onPostCreated?.();
      onClose();
    } catch (e: any) {
      Alert.alert("Error", String(e?.message ?? "Could not create post"));
    } finally {
      setPosting(false);
    }
  }, [onClose, onPostCreated, posting, selectedPhoto, text, token, uploadPhoto, useTeamFeed]);

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Pressable
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
          onPress={onClose}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="rounded-t-[28px] px-5 pt-3"
            style={{
              backgroundColor: colors.background,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 12),
            }}
          >
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View
                style={{
                  alignSelf: "center",
                  width: 36,
                  height: 5,
                  borderRadius: 999,
                  backgroundColor: colors.border,
                  marginBottom: spacing.md,
                }}
              />

              <View className="flex-row items-center justify-between mb-3">
                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => ({
                    minHeight: 36,
                    justifyContent: "center",
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Cancel</Text>
                </Pressable>

                <Text style={{ color: colors.textPrimary, fontSize: 17, fontWeight: "600" }}>
                  New Post
                </Text>

                <Pressable
                  onPress={() => void onSubmit()}
                  disabled={canSubmit}
                  style={({ pressed }) => ({
                    minHeight: 36,
                    justifyContent: "center",
                    opacity: pressed || canSubmit ? 0.5 : 1,
                  })}
                >
                  {posting ? (
                    <ActivityIndicator color={colors.accent} />
                  ) : (
                    <Text style={{ color: canSubmit ? colors.textDim : colors.accent, fontSize: 16, fontWeight: "600" }}>
                      Post
                    </Text>
                  )}
                </Pressable>
              </View>

              <LinearGradient
                colors={["rgba(200,241,53,0.12)", "rgba(123,97,255,0.10)", "rgba(255,255,255,0.02)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: radius.xl,
                  padding: 1,
                }}
              >
                <View
                  style={{
                    borderRadius: radius.xl,
                    backgroundColor: colors.background,
                    gap: spacing.md,
                    paddingHorizontal: spacing.md,
                    paddingTop: spacing.sm,
                    paddingBottom: spacing.md,
                  }}
                >
                  <TextInput
                    autoFocus
                    multiline
                    value={text}
                    onChangeText={setText}
                    placeholder="Write something"
                    placeholderTextColor={colors.textDim}
                    style={{
                      minHeight: 160,
                      color: colors.textPrimary,
                      textAlignVertical: "top",
                      fontSize: 17,
                      lineHeight: 24,
                      paddingTop: spacing.sm,
                    }}
                    maxLength={2000}
                  />

                  {selectedPhoto ? (
                    <View
                      style={{
                        borderRadius: radius.lg,
                        overflow: "hidden",
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Image
                        source={{ uri: selectedPhoto.uri }}
                        style={{ width: "100%", height: 260 }}
                        contentFit="cover"
                        transition={180}
                      />
                      <LinearGradient
                        colors={["transparent", "rgba(7,7,15,0.45)"]}
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          bottom: 0,
                          height: 80,
                        }}
                      />
                      <Pressable
                        onPress={() => setSelectedPhoto(null)}
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 10,
                          width: 30,
                          height: 30,
                          borderRadius: 15,
                          backgroundColor: "rgba(0,0,0,0.6)",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Feather name="x" size={16} color="#fff" />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => void pickPhoto()}
                      disabled={posting}
                      style={({ pressed }) => ({
                        minHeight: 56,
                        borderRadius: radius.lg,
                        backgroundColor: colors.surfaceHigh,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <Feather name="image" size={18} color={colors.accent} />
                      <Text style={{ color: colors.textSecondary, fontSize: 15 }}>Add photo</Text>
                    </Pressable>
                  )}

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: spacing.sm,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                    }}
                  >
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                      {selectedPhoto ? "1 photo attached" : "Text post"}
                    </Text>
                    <Text style={{ color: colors.textDim, fontSize: 12 }}>
                      {text.length}/2000
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
