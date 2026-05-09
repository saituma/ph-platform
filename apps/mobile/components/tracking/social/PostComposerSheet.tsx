import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  TextInput,
  View,
  Platform,
  ScrollView,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
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
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: spacing.lg,
              paddingTop: Math.max(insets.top, spacing.md) + 4,
              paddingBottom: spacing.md,
              borderBottomWidth: 0.5,
              borderBottomColor: colors.border,
            }}
          >
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, minWidth: 60 })}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 16 }}>Cancel</Text>
            </Pressable>
            <Text style={{ color: colors.textPrimary, fontSize: 17, fontWeight: "700" }}>
              New Post
            </Text>
            <Pressable
              onPress={() => void onSubmit()}
              disabled={canSubmit}
              style={({ pressed }) => ({ opacity: pressed || canSubmit ? 0.4 : 1, minWidth: 60, alignItems: "flex-end" })}
            >
              {posting ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Text style={{ color: canSubmit ? colors.textDim : colors.accent, fontSize: 16, fontWeight: "700" }}>
                  Share
                </Text>
              )}
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxxl }}
          >
            <TextInput
              autoFocus
              multiline
              value={text}
              onChangeText={setText}
              placeholder="Write a caption..."
              placeholderTextColor={colors.textDim}
              style={{
                minHeight: 120,
                color: colors.textPrimary,
                textAlignVertical: "top",
                fontSize: 16,
                lineHeight: 22,
              }}
              maxLength={2000}
            />

            {selectedPhoto ? (
              <View style={{ marginTop: spacing.md, borderRadius: 4, overflow: "hidden" }}>
                <Image
                  source={{ uri: selectedPhoto.uri }}
                  style={{ width: "100%", aspectRatio: 4 / 5 }}
                  contentFit="cover"
                  transition={180}
                />
                <Pressable
                  onPress={() => setSelectedPhoto(null)}
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: "rgba(0,0,0,0.65)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather name="x" size={14} color="#fff" />
                </Pressable>
              </View>
            ) : null}
          </ScrollView>

          <View
            style={{
              borderTopWidth: 0.5,
              borderTopColor: colors.border,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              paddingBottom: Math.max(insets.bottom, spacing.md),
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Pressable
              onPress={() => void pickPhoto()}
              disabled={posting || !!selectedPhoto}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                opacity: pressed || !!selectedPhoto ? 0.5 : 1,
              })}
            >
              <Feather name="image" size={22} color={colors.accent} />
              <Text style={{ color: colors.textPrimary, fontSize: 14 }}>
                {selectedPhoto ? "Photo added" : "Add photo"}
              </Text>
            </Pressable>
            <Text style={{ color: colors.textDim, fontSize: 12 }}>
              {text.length}/2000
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
