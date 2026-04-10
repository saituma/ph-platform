export interface VideoItem {
  id: string;
  videoUrl: string;
  feedback: string | null;
  notes?: string;
  createdAt: string;
  programSectionContentId?: number | null;
}

export interface CoachResponse {
  id: string;
  mediaUrl: string;
  text: string;
  createdAt: string | null;
  videoUploadId: number;
}

export interface SelectedVideo {
  uri: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
}

export interface OptimisticUpload {
  id: string;
  uri: string;
  progress: number;
  fileName: string;
  notes?: string;
  width?: number;
  height?: number;
  publicUrl?: string;
  submittedAt?: string;
}

export type UploadPhase = "presign" | "uploading" | "finalizing";
