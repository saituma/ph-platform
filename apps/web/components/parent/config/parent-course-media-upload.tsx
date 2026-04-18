"use client";

import { useRef, useState } from "react";

import { Button } from "../../ui/button";
import { useCreateMediaUploadUrlMutation } from "../../../lib/apiSlice";

type ApiErrorLike = {
  message?: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const e = error as ApiErrorLike;
    if (typeof e.message === "string") return e.message;
  }
  return fallback;
}

export function ParentCourseMediaUpload({
  label,
  folder,
  accept,
  maxSizeMb = 25,
  onUploaded,
}: {
  label: string;
  folder: string;
  accept: string;
  maxSizeMb?: number;
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [createUploadUrl] = useCreateMediaUploadUrlMutation();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handlePick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);

    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`File must be smaller than ${maxSizeMb}MB.`);
      return;
    }

    try {
      setIsUploading(true);
      setProgress(0);
	      const result = await createUploadUrl({
	        folder,
	        fileName: file.name,
	        contentType: file.type || "application/octet-stream",
	        sizeBytes: file.size,
	        client: "web",
	      }).unwrap();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const next = Math.round((event.loaded / event.total) * 100);
          setProgress(next);
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error("Failed to upload file."));
          }
        };
        xhr.onerror = () => reject(new Error("Failed to upload file."));
        xhr.open("PUT", result.uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.send(file);
      });

      onUploaded(result.publicUrl);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Upload failed."));
    } finally {
      setIsUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={handlePick} disabled={isUploading}>
          {isUploading ? "Uploading..." : label}
        </Button>
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>
      {isUploading ? (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
