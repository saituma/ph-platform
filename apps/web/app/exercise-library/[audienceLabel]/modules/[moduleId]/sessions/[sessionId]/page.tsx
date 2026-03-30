"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "../../../../../../../components/admin/shell";
import { SectionHeader } from "../../../../../../../components/admin/section-header";
import { Button } from "../../../../../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../../../../../components/ui/card";
import { Input } from "../../../../../../../components/ui/input";
import { Textarea } from "../../../../../../../components/ui/textarea";
import {
  AudienceWorkspace,
  BLOCK_TYPES,
  buildMetadata,
  normalizeAudienceLabelInput,
  trainingContentRequest,
} from "../../../../../../../components/admin/training-content-v2/api";

export default function SessionDetailPage() {
  const params = useParams<{ audienceLabel: string; moduleId: string; sessionId: string }>();
  const audienceLabel = useMemo(
    () => normalizeAudienceLabelInput(decodeURIComponent(String(params.audienceLabel ?? "All"))),
    [params.audienceLabel],
  );
  const moduleId = Number(params.moduleId);
  const sessionId = Number(params.sessionId);
  const [workspace, setWorkspace] = useState<AudienceWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [itemForm, setItemForm] = useState({
    id: null as number | null,
    blockType: "warmup",
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
  });

  const loadWorkspace = async () => {
    try {
      setError(null);
      const data = await trainingContentRequest<AudienceWorkspace>(`/admin?audienceLabel=${encodeURIComponent(audienceLabel)}`);
      setWorkspace(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session.");
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, [audienceLabel]);

  const module = workspace?.modules.find((item) => item.id === moduleId) ?? null;
  const session = module?.sessions.find((item) => item.id === sessionId) ?? null;

  const saveItem = async () => {
    if (!session || !itemForm.title.trim() || !itemForm.body.trim()) return;
    setIsSaving(true);
    try {
      const payload = {
        sessionId: session.id,
        blockType: itemForm.blockType,
        title: itemForm.title,
        body: itemForm.body,
        videoUrl: itemForm.videoUrl.trim() || null,
        allowVideoUpload: itemForm.allowVideoUpload,
        order: itemForm.order.trim() ? Number(itemForm.order) : null,
        metadata: buildMetadata(itemForm),
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
      setItemForm({
        id: null,
        blockType: "warmup",
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
      });
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
    <AdminShell title="Training content" subtitle={`${audienceLabel} -> module -> session`}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/exercise-library/${encodeURIComponent(audienceLabel)}/modules/${moduleId}`}>
            <Button variant="outline">Back to module</Button>
          </Link>
        </div>
        {error ? <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <SectionHeader title={session ? session.title : "Session blocks"} description="This page manages the required warmup, main session, and cool down blocks." />
            </CardHeader>
            <CardContent className="space-y-4">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={itemForm.blockType}
                onChange={(event) => setItemForm((current) => ({ ...current, blockType: event.target.value }))}
              >
                {BLOCK_TYPES.map((block) => (
                  <option key={block.value} value={block.value}>
                    {block.label}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <Input placeholder="Title" value={itemForm.title} onChange={(event) => setItemForm((current) => ({ ...current, title: event.target.value }))} />
                <Input placeholder="Order" value={itemForm.order} onChange={(event) => setItemForm((current) => ({ ...current, order: event.target.value }))} />
              </div>
              <Textarea placeholder="Instructions or notes" value={itemForm.body} onChange={(event) => setItemForm((current) => ({ ...current, body: event.target.value }))} />
              <div className="grid gap-2 sm:grid-cols-4">
                <Input placeholder="Sets" value={itemForm.sets} onChange={(event) => setItemForm((current) => ({ ...current, sets: event.target.value }))} />
                <Input placeholder="Reps" value={itemForm.reps} onChange={(event) => setItemForm((current) => ({ ...current, reps: event.target.value }))} />
                <Input placeholder="Duration sec" value={itemForm.duration} onChange={(event) => setItemForm((current) => ({ ...current, duration: event.target.value }))} />
                <Input placeholder="Rest sec" value={itemForm.restSeconds} onChange={(event) => setItemForm((current) => ({ ...current, restSeconds: event.target.value }))} />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Category" value={itemForm.category} onChange={(event) => setItemForm((current) => ({ ...current, category: event.target.value }))} />
                <Input placeholder="Equipment" value={itemForm.equipment} onChange={(event) => setItemForm((current) => ({ ...current, equipment: event.target.value }))} />
              </div>
              <Textarea placeholder="Coaching cues" value={itemForm.cues} onChange={(event) => setItemForm((current) => ({ ...current, cues: event.target.value }))} />
              <Textarea placeholder="Steps" value={itemForm.steps} onChange={(event) => setItemForm((current) => ({ ...current, steps: event.target.value }))} />
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Progression" value={itemForm.progression} onChange={(event) => setItemForm((current) => ({ ...current, progression: event.target.value }))} />
                <Input placeholder="Regression" value={itemForm.regression} onChange={(event) => setItemForm((current) => ({ ...current, regression: event.target.value }))} />
              </div>
              <Input placeholder="Video URL" value={itemForm.videoUrl} onChange={(event) => setItemForm((current) => ({ ...current, videoUrl: event.target.value }))} />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={itemForm.allowVideoUpload}
                  onChange={(event) => setItemForm((current) => ({ ...current, allowVideoUpload: event.target.checked }))}
                />
                Allow athlete video upload
              </label>
              <div className="flex gap-2">
                <Button onClick={saveItem} disabled={!session || isSaving}>
                  {itemForm.id ? "Update item" : "Add item"}
                </Button>
                {itemForm.id ? (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setItemForm({
                        id: null,
                        blockType: "warmup",
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
                      })
                    }
                  >
                    Cancel edit
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader title="Current block items" description="Each block is shown separately below." />
            </CardHeader>
            <CardContent className="space-y-4">
              {BLOCK_TYPES.map((block) => {
                const items = session?.items.filter((item) => item.blockType === block.value) ?? [];
                return (
                  <div key={block.value} className="rounded-2xl border border-border p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{block.label}</p>
                    <div className="mt-3 space-y-3">
                      {items.map((item) => (
                        <div key={item.id} className="rounded-xl border border-border bg-secondary/20 p-3">
                          <p className="font-semibold text-foreground">{item.order}. {item.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                          <div className="mt-3 flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
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
                                })
                              }
                            >
                              Edit
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => void deleteItem(item.id)}>
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                      {!items.length ? <p className="text-sm text-muted-foreground">No items added yet.</p> : null}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}
