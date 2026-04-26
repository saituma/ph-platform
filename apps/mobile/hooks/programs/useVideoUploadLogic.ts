import { useState, useCallback, useRef } from "react";
import { apiRequest } from "@/lib/api";
import { SelectedVideo, UploadPhase } from "@/types/video-upload";

function formatMb(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// XHR upload runs in the foreground (unlike legacy FileSystem background tasks
// which iOS can throttle). Uses fetch() to get a blob from the local file URI,
// then sends raw binary via XHR so R2 presigned PUT validation passes.
async function uploadFileToUrl(
  url: string,
  fileUri: string,
  contentType: string,
  totalBytes: number,
  onProgress: (ratio: number) => void,
): Promise<void> {
  const fileRes = await fetch(fileUri);
  const blob = await fileRes.blob();

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.timeout = 15 * 60 * 1000;
    xhr.upload.onprogress = (e) => {
      const total = e.total > 0 ? e.total : totalBytes;
      if (total > 0) onProgress(e.loaded / total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.ontimeout = () => reject(new Error("Upload timed out."));
    xhr.send(blob);
  });
}

export function useVideoUploadLogic(token: string | null, athleteUserId: string | number | null) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [byteProgressUnknown, setUploadByteProgressUnknown] = useState(false);

  const progressTsRef = useRef(0);

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
    progressTsRef.current = 0;

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

      await uploadFileToUrl(
        presign.uploadUrl,
        video.uri,
        video.contentType,
        video.sizeBytes,
        (ratio) => {
          const now = Date.now();
          if (now - progressTsRef.current > 250) {
            setStatus(`Uploading ${formatMb(ratio * video.sizeBytes)} / ${formatMb(video.sizeBytes)}...`);
            progressTsRef.current = now;
          }
          onProgress(ratio);
        },
      );

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
