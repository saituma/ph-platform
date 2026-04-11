import { useState, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { apiRequest } from "@/lib/api";

export type PendingAttachment = {
  uri: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  isImage: boolean;
};

export function useChatAttachments(
  token: string | null,
  actingHeaders: Record<string, string> | undefined,
) {
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [pendingAttachment, setPendingAttachment] =
    useState<PendingAttachment | null>(null);
  const [composerMenuOpen, setComposerMenuOpen] = useState(false);

  const uploadAttachment = useCallback(
    async (input: {
      uri: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      isImage: boolean;
    }) => {
      if (!token) {
        throw new Error("Authentication required");
      }
      const mimeLower = input.mimeType.toLowerCase();
      const isVideo = mimeLower.startsWith("video/");
      const folder = input.isImage
        ? "messages/images"
        : isVideo
          ? "messages/videos"
          : "messages/files";
      const presign = await apiRequest<{
        uploadUrl: string;
        publicUrl: string;
        key: string;
      }>("/media/presign", {
        method: "POST",
        token,
        headers: actingHeaders,
        body: {
          folder,
          fileName: input.fileName,
          contentType: input.mimeType,
          sizeBytes: input.sizeBytes,
        },
      });

      const uploadResult = await FileSystem.uploadAsync(
        presign.uploadUrl,
        input.uri,
        {
          httpMethod: "PUT",
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            "Content-Type": input.mimeType,
          },
        },
      );
      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        throw new Error("Failed to upload attachment");
      }

      const contentType: "text" | "image" | "video" = input.mimeType.startsWith(
        "image/",
      )
        ? "image"
        : input.mimeType.startsWith("video/")
          ? "video"
          : "text";
      return { mediaUrl: presign.publicUrl, contentType };
    },
    [actingHeaders, token],
  );

  const handleAttachImage = useCallback(async () => {
    if (!token || isUploadingAttachment) return;
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const mimeType = asset.mimeType || "image/jpeg";

      const info = await FileSystem.getInfoAsync(asset.uri);
      const sizeBytes =
        (info.exists ? (info.size ?? 0) : 0) || (asset.fileSize ?? 512000);
      setPendingAttachment({
        uri: asset.uri,
        fileName: asset.fileName || `photo-${Date.now()}.jpg`,
        mimeType,
        sizeBytes,
        isImage: true,
      });
    } catch (error) {
      console.warn("Failed to attach image", error);
    } finally {
      setComposerMenuOpen(false);
    }
  }, [isUploadingAttachment, token]);

  const handleAttachVideo = useCallback(async () => {
    if (!token || isUploadingAttachment) return;
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.9,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const mimeType = asset.mimeType || "video/mp4";

      const info = await FileSystem.getInfoAsync(asset.uri);
      const sizeBytes =
        (info.exists ? (info.size ?? 0) : 0) || (asset.fileSize ?? 2000000);
      setPendingAttachment({
        uri: asset.uri,
        fileName: asset.fileName || `video-${Date.now()}.mp4`,
        mimeType,
        sizeBytes,
        isImage: false,
      });
    } catch (error) {
      console.warn("Failed to attach video", error);
    } finally {
      setComposerMenuOpen(false);
    }
  }, [isUploadingAttachment, token]);

  const handleTakePhoto = useCallback(async () => {
    if (!token || isUploadingAttachment) return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const mimeType = asset.mimeType || "image/jpeg";

      const info = await FileSystem.getInfoAsync(asset.uri);
      const sizeBytes =
        (info.exists ? (info.size ?? 0) : 0) || (asset.fileSize ?? 512000);
      setPendingAttachment({
        uri: asset.uri,
        fileName: asset.fileName || `photo-${Date.now()}.jpg`,
        mimeType,
        sizeBytes,
        isImage: true,
      });
    } catch (error) {
      console.warn("Failed to take photo", error);
    } finally {
      setComposerMenuOpen(false);
    }
  }, [isUploadingAttachment, token]);

  const handleRecordVideo = useCallback(async () => {
    if (!token || isUploadingAttachment) return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.9,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const mimeType = asset.mimeType || "video/mp4";

      const info = await FileSystem.getInfoAsync(asset.uri);
      const sizeBytes =
        (info.exists ? (info.size ?? 0) : 0) || (asset.fileSize ?? 2000000);
      setPendingAttachment({
        uri: asset.uri,
        fileName: asset.fileName || `video-${Date.now()}.mp4`,
        mimeType,
        sizeBytes,
        isImage: false,
      });
    } catch (error) {
      console.warn("Failed to record video", error);
    } finally {
      setComposerMenuOpen(false);
    }
  }, [isUploadingAttachment, token]);

  const handleAttachFile = useCallback(async () => {
    if (!token || isUploadingAttachment) return;
    try {
      const DocumentPicker = await import("expo-document-picker");
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const mimeType = asset.mimeType || "application/octet-stream";

      const info = await FileSystem.getInfoAsync(asset.uri);
      const sizeBytes =
        (info.exists ? (info.size ?? 0) : 0) || (asset.size ?? 512000);
      setPendingAttachment({
        uri: asset.uri,
        fileName: asset.name || `file-${Date.now()}`,
        mimeType,
        sizeBytes,
        isImage: mimeType.startsWith("image/"),
      });
    } catch (error) {
      console.warn("Failed to attach file", error);
    } finally {
      setComposerMenuOpen(false);
    }
  }, [isUploadingAttachment, token]);

  return {
    isUploadingAttachment,
    setIsUploadingAttachment,
    pendingAttachment,
    setPendingAttachment,
    composerMenuOpen,
    setComposerMenuOpen,
    uploadAttachment,
    handleAttachImage,
    handleAttachVideo,
    handleTakePhoto,
    handleRecordVideo,
    handleAttachFile,
  };
}
