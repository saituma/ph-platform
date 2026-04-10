import { useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { PendingAttachment } from "@/types/admin-messages";

export function useMediaUpload(token: string | null) {
  const uploadAttachment = useCallback(async (input: PendingAttachment) => {
    if (!token) throw new Error("Authentication required");

    const folder = input.isImage ? "messages/images" : "messages/files";
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

    const fileResponse = await fetch(input.uri);
    const blob = await fileResponse.blob();
    const uploadResponse = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": input.mimeType,
      },
      body: blob,
    });
    if (!uploadResponse.ok) {
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
