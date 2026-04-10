import { useState, useCallback, useRef } from "react";
import * as FileSystem from "expo-file-system/legacy";
import { apiRequest } from "@/lib/api";
import { SelectedVideo, UploadPhase } from "@/types/video-upload";

export function useVideoUploadLogic(token: string | null, athleteUserId: string | number | null) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [byteProgressUnknown, setUploadByteProgressUnknown] = useState(false);
  
  const uploadProgressRef = useRef<{ value: number; ts: number }>({ value: 0, ts: 0 });

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
    setStatus("Preparing upload...");
    setUploadByteProgressUnknown(false);

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
      setStatus("Uploading video...");

      const uploadTask = FileSystem.createUploadTask(
        presign.uploadUrl,
        video.uri,
        {
          httpMethod: "PUT",
          headers: { "Content-Type": video.contentType },
        },
        (p) => {
          const total = p.totalBytesExpectedToSend;
          if (!total || total <= 0) {
            setUploadByteProgressUnknown(true);
            onProgress(0);
            return;
          }
          setUploadByteProgressUnknown(false);
          onProgress(p.totalBytesSent / total);
        }
      );

      const result = await uploadTask.uploadAsync();
      if (!result || result.status < 200 || result.status >= 300) {
        throw new Error(`Upload failed (${result?.status ?? "unknown"}).`);
      }

      setUploadPhase("finalizing");
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

      setStatus("Uploaded successfully.");
      return presign.publicUrl;
    } finally {
      setIsUploading(false);
      setUploadPhase(null);
    }
  }, [token, athleteUserId]);

  return { uploadVideo, isUploading, uploadPhase, status, setStatus, byteProgressUnknown };
}
