"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { AdminShell } from "../../../../../../../components/admin/shell";
import { SectionHeader } from "../../../../../../../components/admin/section-header";
import { Button } from "../../../../../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../../../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../../../../../components/ui/dialog";
import { Input } from "../../../../../../../components/ui/input";
import { Textarea } from "../../../../../../../components/ui/textarea";
import {
  AudienceWorkspace,
  buildMetadata,
  isProgramTierAudienceLabel,
  normalizeAudienceLabelInput,
  toStorageAudienceLabel,
  trainingContentRequest,
} from "../../../../../../../components/admin/training-content-v2/api";
import { useCreateMediaUploadUrlMutation } from "../../../../../../../lib/apiSlice";

function createEmptyItemForm() {
  return {
    id: null as number | null,
    blockType: "main",
    title: "",
    body: "",
    videoUrl: "",
    allowVideoUpload: false,
    order: "",
    sets: "",
    reps: "",
    duration: "",
    restSeconds: "",
    steps: "",
    cues: "",
    progression: "",
    regression: "",
    category: "",
    equipment: "",
  };
}

export default function SessionDetailPage() {
  return (
    <Suspense fallback={null}>
      <SessionDetailPageInner />
    </Suspense>
  );
}

function SessionDetailPageInner() {
  const params = useParams<{ audienceLabel: string; moduleId: string; sessionId: string }>();
  const searchParams = useSearchParams();
  const audienceLabel = useMemo(
    () => normalizeAudienceLabelInput(decodeURIComponent(String(params.audienceLabel ?? "All"))),
    [params.audienceLabel],
  );
  const fromAdultMode = searchParams.get("mode") === "adult" || isProgramTierAudienceLabel(audienceLabel);
  const storageAudienceLabel = useMemo(
    () => toStorageAudienceLabel({ audienceLabel, adultMode: fromAdultMode }),
    [audienceLabel, fromAdultMode],
  );
  const moduleId = Number(params.moduleId);
  const sessionId = Number(params.sessionId);
  const [workspace, setWorkspace] = useState<AudienceWorkspace | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const [createUploadUrl] = useCreateMediaUploadUrlMutation();
  const [itemForm, setItemForm] = useState(createEmptyItemForm);

  const loadWorkspace = async () => {
    try {
      setError(null);
      const data = await trainingContentRequest<AudienceWorkspace>(`/admin?audienceLabel=${encodeURIComponent(storageAudienceLabel)}`);
      setWorkspace(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session.");
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, [storageAudienceLabel]);

  const module = workspace?.modules.find((item) => item.id === moduleId) ?? null;
  const session = module?.sessions.find((item) => item.id === sessionId) ?? null;
  const mainItems = (session?.items ?? []).filter((item) => item.blockType === "main");

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
	        folder: "training-content/session-items",
	        fileName,
	        contentType: file.type || "application/octet-stream",
	        sizeBytes: file.size,
	        client: "web",
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

      setItemForm((current) => ({ ...current, videoUrl: result.publicUrl }));
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

  const saveItem = async () => {
    if (!session || !itemForm.title.trim() || !itemForm.body.trim()) return;
    setIsSaving(true);
    try {
      const metadataInput = {
        ...itemForm,
        category: itemForm.category,
      };
      const payload = {
        sessionId: session.id,
        blockType: itemForm.blockType,
        title: itemForm.title,
        body: itemForm.body,
        videoUrl: itemForm.videoUrl.trim() || null,
        allowVideoUpload: itemForm.allowVideoUpload,
        order: itemForm.order.trim() ? Number(itemForm.order) : null,
        metadata: buildMetadata(metadataInput),
      };
      if (itemForm.id) {
        await trainingContentRequest(`/items/${itemForm.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await trainingContentRequest("/items", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setItemForm(createEmptyItemForm());
      setModalOpen(false);
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save item.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteItem = async (itemId: number) => {
    if (!window.confirm("Delete this item?")) return;
    setIsSaving(true);
    try {
      await trainingContentRequest(`/items/${itemId}`, { method: "DELETE" });
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminShell title="Training content" subtitle={`${fromAdultMode ? "Adult tier" : "Age"} ${audienceLabel} -> module -> session`}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/exercise-library/${encodeURIComponent(audienceLabel)}/modules/${moduleId}${fromAdultMode ? "?mode=adult" : ""}`}
          >
            <Button variant="outline">Back to module</Button>
          </Link>
          <Button
            className="ml-auto"
            onClick={() => {
              setItemForm(createEmptyItemForm());
              setModalOpen(true);
            }}
          >
            + Add session item
          </Button>
        </div>
        {error ? <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        <Card>
          <CardHeader>
            <SectionHeader
              title={session ? session.title : "Session blocks"}
              description="Manage exercises for this session. Each exercise includes name, sets, reps or time, coaching notes, and video."
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border p-4">
              <div className="space-y-3">
                {mainItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border bg-secondary/20 p-3">
                    <p className="font-semibold text-foreground">{item.order}. {item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setItemForm({
                            id: item.id,
                            blockType: item.blockType,
                            title: item.title,
                            body: item.body,
                            videoUrl: item.videoUrl ?? "",
                            allowVideoUpload: Boolean(item.allowVideoUpload),
                            order: String(item.order),
                            sets: item.metadata?.sets != null ? String(item.metadata.sets) : "",
                            reps: item.metadata?.reps != null ? String(item.metadata.reps) : "",
                            duration: item.metadata?.duration != null ? String(item.metadata.duration) : "",
                            restSeconds: item.metadata?.restSeconds != null ? String(item.metadata.restSeconds) : "",
                            steps: item.metadata?.steps ?? "",
                            cues: item.metadata?.cues ?? "",
                            progression: item.metadata?.progression ?? "",
                            regression: item.metadata?.regression ?? "",
                            category: item.metadata?.category ?? "",
                            equipment: item.metadata?.equipment ?? "",
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
                {!mainItems.length ? <p className="text-sm text-muted-foreground">No exercises in this session yet.</p> : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{itemForm.id ? "Edit exercise" : "Add exercise"}</DialogTitle>
            <DialogDescription>
              Add exercise name, sets, reps or time, coaching notes, and video in {session?.title ?? "this session"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="Exercise name" value={itemForm.title} onChange={(event) => setItemForm((current) => ({ ...current, title: event.target.value }))} />
              <Input placeholder="Order" value={itemForm.order} onChange={(event) => setItemForm((current) => ({ ...current, order: event.target.value }))} />
            </div>
            <Textarea placeholder="Coaching notes" value={itemForm.body} onChange={(event) => setItemForm((current) => ({ ...current, body: event.target.value }))} />
            <div className="grid gap-2 sm:grid-cols-4">
              <Input placeholder="Sets" value={itemForm.sets} onChange={(event) => setItemForm((current) => ({ ...current, sets: event.target.value }))} />
              <Input placeholder="Reps / Time" value={itemForm.reps} onChange={(event) => setItemForm((current) => ({ ...current, reps: event.target.value }))} />
              <Input placeholder="Time (sec)" value={itemForm.duration} onChange={(event) => setItemForm((current) => ({ ...current, duration: event.target.value }))} />
              <Input placeholder="Rest sec" value={itemForm.restSeconds} onChange={(event) => setItemForm((current) => ({ ...current, restSeconds: event.target.value }))} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="Equipment" value={itemForm.equipment} onChange={(event) => setItemForm((current) => ({ ...current, equipment: event.target.value }))} />
              <Input placeholder="Category (optional)" value={itemForm.category} onChange={(event) => setItemForm((current) => ({ ...current, category: event.target.value }))} />
            </div>
            <Textarea placeholder="Extra coaching cues" value={itemForm.cues} onChange={(event) => setItemForm((current) => ({ ...current, cues: event.target.value }))} />
            <Textarea placeholder="Steps" value={itemForm.steps} onChange={(event) => setItemForm((current) => ({ ...current, steps: event.target.value }))} />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="Progression" value={itemForm.progression} onChange={(event) => setItemForm((current) => ({ ...current, progression: event.target.value }))} />
              <Input placeholder="Regression" value={itemForm.regression} onChange={(event) => setItemForm((current) => ({ ...current, regression: event.target.value }))} />
            </div>
            <div className="space-y-3 rounded-xl border border-border p-3">
              <p className="text-sm font-medium text-foreground">Exercise video</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={isUploadingVideo}
                >
                  {isUploadingVideo ? "Uploading..." : "Upload local video"}
                </Button>
                {itemForm.videoUrl ? (
                  <span className="text-xs text-muted-foreground">Video attached</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Or paste a video URL below</span>
                )}
              </div>
              {isUploadingVideo ? (
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              ) : null}
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void uploadLocalVideo(file);
                }}
              />
              <Input placeholder="Video URL" value={itemForm.videoUrl} onChange={(event) => setItemForm((current) => ({ ...current, videoUrl: event.target.value }))} />
              {itemForm.videoUrl.trim() ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Video preview</p>
                  <video
                    key={itemForm.videoUrl}
                    src={itemForm.videoUrl.trim()}
                    controls
                    preload="metadata"
                    className="w-full rounded-lg border border-border bg-black"
                  />
                </div>
              ) : null}
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={itemForm.allowVideoUpload}
                onChange={(event) => setItemForm((current) => ({ ...current, allowVideoUpload: event.target.checked }))}
              />
              Allow athlete video upload
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveItem} disabled={!session || isSaving}>
                {itemForm.id ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
