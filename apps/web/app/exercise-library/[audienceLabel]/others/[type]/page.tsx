"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { AdminShell } from "../../../../../components/admin/shell";
import { SectionHeader } from "../../../../../components/admin/section-header";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../../../components/ui/dialog";
import { Input } from "../../../../../components/ui/input";
import { Textarea } from "../../../../../components/ui/textarea";
import {
  AudienceWorkspace,
  OTHER_TYPES,
  normalizeAudienceLabelInput,
  trainingContentRequest,
} from "../../../../../components/admin/training-content-v2/api";
import { useCreateMediaUploadUrlMutation } from "../../../../../lib/apiSlice";

export default function OtherContentDetailPage() {
  const params = useParams<{ audienceLabel: string; type: string }>();
  const audienceLabel = useMemo(
    () => normalizeAudienceLabelInput(decodeURIComponent(String(params.audienceLabel ?? "All"))),
    [params.audienceLabel],
  );
  const otherType = String(params.type ?? "mobility");
  const [workspace, setWorkspace] = useState<AudienceWorkspace | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const [createUploadUrl] = useCreateMediaUploadUrlMutation();
  const [otherForm, setOtherForm] = useState({
    id: null as number | null,
    title: "",
    body: "",
    scheduleNote: "",
    videoUrl: "",
    order: "",
  });

  const uploadLocalVideo = async (file: File) => {
    const maxSizeMb = 250;
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`Video must be smaller than ${maxSizeMb}MB.`);
      return;
    }

    try {
      setError(null);
      setIsUploadingVideo(true);
      setUploadProgress(0);
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
      const result = await createUploadUrl({
        folder: "training-content/others",
        fileName,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      }).unwrap();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error("Failed to upload video."));
          }
        };
        xhr.onerror = () => reject(new Error("Failed to upload video."));
        xhr.open("PUT", result.uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.send(file);
      });

      setOtherForm((current) => ({ ...current, videoUrl: result.publicUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload video.");
    } finally {
      setIsUploadingVideo(false);
      setUploadProgress(0);
      if (videoInputRef.current) {
        videoInputRef.current.value = "";
      }
    }
  };

  const loadWorkspace = async () => {
    try {
      setError(null);
      const data = await trainingContentRequest<AudienceWorkspace>(`/admin?audienceLabel=${encodeURIComponent(audienceLabel)}`);
      setWorkspace(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load content.");
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, [audienceLabel]);

  const group = workspace?.others.find((item) => item.type === otherType) ?? null;
  const label = OTHER_TYPES.find((item) => item.value === otherType)?.label ?? "Other content";

  const saveOther = async () => {
    if (!otherForm.title.trim() || !otherForm.body.trim()) return;
    setIsSaving(true);
    try {
      const payload = {
        audienceLabel,
        type: otherType,
        title: otherForm.title,
        body: otherForm.body,
        scheduleNote: otherForm.scheduleNote.trim() || null,
        videoUrl: otherForm.videoUrl.trim() || null,
        order: otherForm.order.trim() ? Number(otherForm.order) : null,
        metadata: null,
      };
      if (otherForm.id) {
        await trainingContentRequest(`/others/${otherForm.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await trainingContentRequest("/others", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setOtherForm({ id: null, title: "", body: "", scheduleNote: "", videoUrl: "", order: "" });
      setModalOpen(false);
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save content.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteItem = async (itemId: number) => {
    if (!window.confirm("Delete this item?")) return;
    setIsSaving(true);
    try {
      await trainingContentRequest(`/others/${itemId}`, { method: "DELETE" });
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete content.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminShell title="Training content" subtitle={`Plan: ${audienceLabel} -> ${label}`}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/exercise-library/${encodeURIComponent(audienceLabel)}?view=others`}>
            <Button variant="outline">Back to others</Button>
          </Link>
          <Button
            className="ml-auto"
            onClick={() => {
              setOtherForm({ id: null, title: "", body: "", scheduleNote: "", videoUrl: "", order: "" });
              setModalOpen(true);
            }}
          >
            + Add other content
          </Button>
        </div>
        {error ? <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        <Card>
          <CardHeader>
            <SectionHeader
              title={label}
              description={group?.enabled ? "This section is enabled for the selected plan." : "This section is currently turned off for the selected plan."}
            />
          </CardHeader>
          <CardContent className="space-y-4">
            {(group?.items ?? []).map((item) => (
              <div key={item.id} className="rounded-2xl border border-border p-4">
                <p className="text-lg font-semibold text-foreground">{item.order}. {item.title}</p>
                {item.scheduleNote ? <p className="mt-1 text-xs font-semibold text-primary">{item.scheduleNote}</p> : null}
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setOtherForm({
                        id: item.id,
                        title: item.title,
                        body: item.body,
                        scheduleNote: item.scheduleNote ?? "",
                        videoUrl: item.videoUrl ?? "",
                        order: String(item.order),
                      });
                      setModalOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void deleteItem(item.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {!group?.items.length ? <p className="text-sm text-muted-foreground">No content created yet for this section.</p> : null}
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{otherForm.id ? `Edit ${label}` : `Add ${label}`}</DialogTitle>
            <DialogDescription>
              Create or update content for {label} under plan {audienceLabel}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Title" value={otherForm.title} onChange={(event) => setOtherForm((current) => ({ ...current, title: event.target.value }))} />
            <Textarea placeholder="Content body" value={otherForm.body} onChange={(event) => setOtherForm((current) => ({ ...current, body: event.target.value }))} />
            <Input placeholder="Schedule note" value={otherForm.scheduleNote} onChange={(event) => setOtherForm((current) => ({ ...current, scheduleNote: event.target.value }))} />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="Video URL" value={otherForm.videoUrl} onChange={(event) => setOtherForm((current) => ({ ...current, videoUrl: event.target.value }))} />
              <Input placeholder="Order" value={otherForm.order} onChange={(event) => setOtherForm((current) => ({ ...current, order: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void uploadLocalVideo(file);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => videoInputRef.current?.click()}
                disabled={isUploadingVideo}
              >
                {isUploadingVideo ? "Uploading..." : "Upload local video"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Upload a local video file or paste a hosted video URL above.
              </p>
              {isUploadingVideo ? (
                <div className="space-y-1">
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{uploadProgress}% uploaded</p>
                </div>
              ) : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveOther} disabled={isSaving}>
                {otherForm.id ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
