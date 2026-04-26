import { useState, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { apiRequest } from "@/lib/api";

export type PendingAttachment = {
  uri: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  isImage: boolean;
};

function inferTypeFromPath(path: string): "image" | "video" | "text" {
  const cleaned = String(path).toLowerCase().split("?")[0].split("#")[0];
  if (/\.(jpg|jpeg|png|gif|webp|bmp|heic|heif|avif)$/.test(cleaned)) return "image";
  if (/\.(mp4|mov|webm|m4v|avi|mkv)$/.test(cleaned)) return "video";
  return "text";
}

function resolveMessageContentType(input: {
  mimeType: string;
  fileName: string;
  uri: string;
  isImage: boolean;
}): "text" | "image" | "video" {
  const mime = String(input.mimeType ?? "").toLowerCase().trim();
  if (mime.startsWith("image") || mime.includes("image/")) return "image";
  if (mime.startsWith("video") || mime.includes("video/")) return "video";
  if (input.isImage) return "image";
  const byName = inferTypeFromPath(input.fileName);
  if (byName !== "text") return byName;
  return inferTypeFromPath(input.uri);
}

export function useChatAttachments(
  token: string | null,
  actingHeaders: Record<string, string> | undefined,
) {
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [pendingAttachment, setPendingAttachment] =
    useState<PendingAttachment | null>(null);
  const [composerMenuOpen, setComposerMenuOpen] = useState(false);

  const resolveAttachmentSize = useCallback(
    async (uri: string, fallbackSize: number) => {
      try {
        const info = await FileSystem.getInfoAsync(uri);
        if (info.exists && Number.isFinite(info.size) && (info.size ?? 0) > 0) {
          return info.size as number;
        }
      } catch {
        // Ignore; keep fallback size for snappy UI.
      }
      return fallbackSize;
    },
    [],
  );

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

      const contentType = resolveMessageContentType({
        mimeType: input.mimeType,
        fileName: input.fileName,
        uri: input.uri,
        isImage: input.isImage,
      });
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
        mediaTypes: "images",
        quality: 0.9,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const mimeType = asset.mimeType || "image/jpeg";
      const fallbackSize = asset.fileSize ?? 512000;
      const draftAttachment = {
        uri: asset.uri,
        fileName: asset.fileName || `photo-${Date.now()}.jpg`,
        mimeType,
        sizeBytes: fallbackSize,
        isImage: true,
      };
      setPendingAttachment(draftAttachment);
      void resolveAttachmentSize(asset.uri, fallbackSize).then((sizeBytes) => {
        setPendingAttachment((current) => {
          if (!current || current.uri !== draftAttachment.uri) return current;
          if (current.sizeBytes === sizeBytes) return current;
          return { ...current, sizeBytes };
        });
      });
    } catch (error) {
      console.warn("Failed to attach image", error);
    } finally {
      setComposerMenuOpen(false);
    }
  }, [isUploadingAttachment, resolveAttachmentSize, token]);

  const handleAttachVideo = useCallback(async () => {
    if (!token || isUploadingAttachment) return;
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "videos",
        quality: 0.9,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const mimeType = asset.mimeType || "video/mp4";
      const fallbackSize = asset.fileSize ?? 2000000;
      const draftAttachment = {
        uri: asset.uri,
        fileName: asset.fileName || `video-${Date.now()}.mp4`,
        mimeType,
        sizeBytes: fallbackSize,
        isImage: false,
      };
      setPendingAttachment(draftAttachment);
      void resolveAttachmentSize(asset.uri, fallbackSize).then((sizeBytes) => {
        setPendingAttachment((current) => {
          if (!current || current.uri !== draftAttachment.uri) return current;
          if (current.sizeBytes === sizeBytes) return current;
          return { ...current, sizeBytes };
        });
      });
    } catch (error) {
      console.warn("Failed to attach video", error);
    } finally {
      setComposerMenuOpen(false);
    }
  }, [isUploadingAttachment, resolveAttachmentSize, token]);

  const handleTakePhoto = useCallback(async () => {
    if (!token || isUploadingAttachment) return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images",
        quality: 0.9,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const mimeType = asset.mimeType || "image/jpeg";
      const fallbackSize = asset.fileSize ?? 512000;
      const draftAttachment = {
        uri: asset.uri,
        fileName: asset.fileName || `photo-${Date.now()}.jpg`,
        mimeType,
        sizeBytes: fallbackSize,
        isImage: true,
      };
      setPendingAttachment(draftAttachment);
      void resolveAttachmentSize(asset.uri, fallbackSize).then((sizeBytes) => {
        setPendingAttachment((current) => {
          if (!current || current.uri !== draftAttachment.uri) return current;
          if (current.sizeBytes === sizeBytes) return current;
          return { ...current, sizeBytes };
        });
      });
    } catch (error) {
      console.warn("Failed to take photo", error);
    } finally {
      setComposerMenuOpen(false);
    }
  }, [isUploadingAttachment, resolveAttachmentSize, token]);

  const handleRecordVideo = useCallback(async () => {
    if (!token || isUploadingAttachment) return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "videos",
        quality: 0.9,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const mimeType = asset.mimeType || "video/mp4";
      const fallbackSize = asset.fileSize ?? 2000000;
      const draftAttachment = {
        uri: asset.uri,
        fileName: asset.fileName || `video-${Date.now()}.mp4`,
        mimeType,
        sizeBytes: fallbackSize,
        isImage: false,
      };
      setPendingAttachment(draftAttachment);
      void resolveAttachmentSize(asset.uri, fallbackSize).then((sizeBytes) => {
        setPendingAttachment((current) => {
          if (!current || current.uri !== draftAttachment.uri) return current;
          if (current.sizeBytes === sizeBytes) return current;
          return { ...current, sizeBytes };
        });
      });
    } catch (error) {
      console.warn("Failed to record video", error);
    } finally {
      setComposerMenuOpen(false);
    }
  }, [isUploadingAttachment, resolveAttachmentSize, token]);

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
      const fallbackSize = asset.size ?? 512000;
      const draftAttachment = {
        uri: asset.uri,
        fileName: asset.name || `file-${Date.now()}`,
        mimeType,
        sizeBytes: fallbackSize,
        isImage: mimeType.startsWith("image/"),
      };
      setPendingAttachment(draftAttachment);
      void resolveAttachmentSize(asset.uri, fallbackSize).then((sizeBytes) => {
        setPendingAttachment((current) => {
          if (!current || current.uri !== draftAttachment.uri) return current;
          if (current.sizeBytes === sizeBytes) return current;
          return { ...current, sizeBytes };
        });
      });
    } catch (error) {
      console.warn("Failed to attach file", error);
    } finally {
      setComposerMenuOpen(false);
    }
  }, [isUploadingAttachment, resolveAttachmentSize, token]);

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
