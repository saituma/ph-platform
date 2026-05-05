import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { SelectedVideo, UploadPhase } from "@/types/video-upload";
import * as FileSystem from "expo-file-system/legacy";

function formatMb(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function uploadFileToUrl(
  url: string,
  fileUri: string,
  contentType: string,
  onProgress: (ratio: number) => void,
): Promise<void> {
  const uploadTask = FileSystem.createUploadTask(
    url,
    fileUri,
    {
      httpMethod: "PUT",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        "Content-Type": contentType,
      },
    },
    (progressEvent) => {
      const sent = progressEvent.totalBytesSent ?? 0;
      const expected = progressEvent.totalBytesExpectedToSend ?? 0;
      if (expected > 0) {
        onProgress(Math.max(0, Math.min(1, sent / expected)));
      }
    },
  );
  const uploadResult = await uploadTask.uploadAsync();
  if (!uploadResult) {
    throw new Error("Upload canceled.");
  }
  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    throw new Error(`Upload failed (${uploadResult.status}).`);
  }
}

export function useVideoUploadLogic(token: string | null, athleteUserId: string | number | null) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [byteProgressUnknown, setUploadByteProgressUnknown] = useState(false);

  const uploadVideo = useCallback(async (params: {
    video: SelectedVideo;
    notes?: string;
    sectionContentId?: number | null;
    onProgress: (progress: number) => void;
  }) => {
    if (!token) throw new Error("Not authenticated");

    const { video, notes, sectionContentId, onProgress } = params;
    setIsUploading(true);
    setUploadPhase("presign");
    setStatus(`Preparing upload (${formatMb(video.sizeBytes)})...`);
    setUploadByteProgressUnknown(false);
    let stage: UploadPhase = "presign";

    try {
      const headers = athleteUserId ? { "X-Acting-User-Id": String(athleteUserId) } : undefined;

      const presign = await apiRequest<{ uploadUrl: string; publicUrl: string }>("/media/presign", {
        method: "POST",
        token,
        headers,
        body: {
          folder: "video-uploads",
          fileName: video.fileName,
          contentType: video.contentType,
          sizeBytes: video.sizeBytes,
        },
      });

      setUploadPhase("uploading");
      stage = "uploading";
      setStatus("Uploading video...");

      onProgress(0.02);
      await uploadFileToUrl(
        presign.uploadUrl,
        video.uri,
        video.contentType,
        (ratio) => onProgress(Math.max(0.03, Math.min(0.95, ratio * 0.92))),
      );
      onProgress(0.95);

      setUploadPhase("finalizing");
      stage = "finalizing";
      setStatus("Finalizing upload...");

      await apiRequest("/videos", {
        method: "POST",
        token,
        headers,
        body: {
          videoUrl: presign.publicUrl,
          notes: notes || undefined,
          programSectionContentId: sectionContentId ?? undefined,
        },
      });
      onProgress(1);

      setStatus("Uploaded successfully.");
      return presign.publicUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      if (stage === "presign") {
        throw new Error(`Could not prepare upload: ${message}`);
      }
      if (stage === "finalizing") {
        throw new Error(`Upload succeeded but save failed: ${message}`);
      }
      throw new Error(`Could not upload file: ${message}`);
    } finally {
      setIsUploading(false);
      setUploadPhase(null);
    }
  }, [token, athleteUserId]);

  return { uploadVideo, isUploading, uploadPhase, status, setStatus, byteProgressUnknown };
}
