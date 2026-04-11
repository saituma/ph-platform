import { useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { PendingAttachment } from "@/types/admin-messages";
import * as FileSystem from "expo-file-system";

export function useMediaUpload(token: string | null) {
  const uploadAttachment = useCallback(async (input: PendingAttachment) => {
    if (!token) throw new Error("Authentication required");

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
      body: {
        folder,
        fileName: input.fileName,
        contentType: input.mimeType,
        sizeBytes: input.sizeBytes,
      },
      skipCache: true,
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
  }, [token]);

  return { uploadAttachment };
}
