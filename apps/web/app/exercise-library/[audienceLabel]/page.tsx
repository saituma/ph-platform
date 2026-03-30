"use client";

import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "../../../components/admin/shell";
import { SectionHeader } from "../../../components/admin/section-header";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import {
  AudienceWorkspace,
  OTHER_TYPES,
  normalizeAudienceLabelInput,
  trainingContentRequest,
} from "../../../components/admin/training-content-v2/api";

function SortableModuleCard({
  module,
  audienceLabel,
  onEdit,
  onDelete,
}: {
  module: AudienceWorkspace["modules"][number];
  audienceLabel: string;
  onEdit: (module: AudienceWorkspace["modules"][number]) => void;
  onDelete: (path: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: module.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border p-4 transition ${isDragging ? "border-primary bg-primary/5 shadow-lg" : "border-border"}`}
    >
      <div className="mb-3 flex items-center gap-3">
        <button
          type="button"
          className="cursor-grab rounded-lg border border-border px-2 py-1 text-xs font-medium text-muted-foreground active:cursor-grabbing"
          aria-label={`Drag ${module.title}`}
          {...attributes}
          {...listeners}
        >
          <span className="flex items-center gap-1">
            <GripVertical className="h-3.5 w-3.5" />
            Drag
          </span>
        </button>
        <p className="text-xs text-muted-foreground">Hold and move up or down to reorder modules.</p>
      </div>
      <p className="text-lg font-semibold text-foreground">{module.order}. {module.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {module.sessions.length} sessions · {module.totalDayLength} total days
      </p>
      <div className="mt-3 flex gap-2">
        <Link href={`/exercise-library/${encodeURIComponent(audienceLabel)}/modules/${module.id}`}>
          <Button size="sm">Open module</Button>
        </Link>
        <Button size="sm" variant="outline" onClick={() => onEdit(module)}>
          Edit
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDelete(`/modules/${module.id}`)}>
          Delete
        </Button>
      </div>
    </div>
  );
}

export default function AudienceDetailPage() {
  const params = useParams<{ audienceLabel: string }>();
  const searchParams = useSearchParams();
  const audienceLabel = useMemo(
    () => normalizeAudienceLabelInput(decodeURIComponent(String(params.audienceLabel ?? "All"))),
    [params.audienceLabel],
  );
  const activeView = searchParams.get("view") === "others" ? "others" : "age";
  const [workspace, setWorkspace] = useState<AudienceWorkspace | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOtherType, setSelectedOtherType] = useState("mobility");
  const [moduleForm, setModuleForm] = useState({ id: null as number | null, title: "" });
  const [otherForm, setOtherForm] = useState({ id: null as number | null, title: "", body: "", scheduleNote: "", videoUrl: "", order: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const loadWorkspace = async () => {
    try {
      setError(null);
      const data = await trainingContentRequest<AudienceWorkspace>(`/admin?audienceLabel=${encodeURIComponent(audienceLabel)}`);
      setWorkspace(data);
      if (!data.others.find((item) => item.type === selectedOtherType)) {
        setSelectedOtherType(data.others[0]?.type ?? "mobility");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audience.");
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, [audienceLabel]);

  const selectedOtherGroup = workspace?.others.find((group) => group.type === selectedOtherType) ?? workspace?.others[0] ?? null;

  const saveModule = async () => {
    if (!moduleForm.title.trim()) return;
    setIsSaving(true);
    try {
      if (moduleForm.id) {
        await trainingContentRequest(`/modules/${moduleForm.id}`, {
          method: "PUT",
          body: JSON.stringify({
            title: moduleForm.title,
          }),
        });
      } else {
        await trainingContentRequest("/modules", {
          method: "POST",
          body: JSON.stringify({
            audienceLabel,
            title: moduleForm.title,
          }),
        });
      }
      setModuleForm({ id: null, title: "" });
      setModalOpen(false);
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save module.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveOther = async () => {
    if (!otherForm.title.trim() || !otherForm.body.trim()) return;
    setIsSaving(true);
    try {
      const payload = {
        audienceLabel,
        type: selectedOtherType,
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

  const deletePath = async (path: string) => {
    if (!window.confirm("Delete this item?")) return;
    setIsSaving(true);
    try {
      await trainingContentRequest(path, { method: "DELETE" });
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const reorderModules = async (sourceId: number, targetId: number) => {
    if (!workspace || sourceId === targetId) return;
    const sourceIndex = workspace.modules.findIndex((item) => item.id === sourceId);
    const targetIndex = workspace.modules.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const reordered = [...workspace.modules];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const nextModules = reordered.map((module, index) => ({ ...module, order: index + 1 }));
    setWorkspace((current) => (current ? { ...current, modules: nextModules } : current));
    setIsSaving(true);
    setError(null);
    try {
      await Promise.all(
        nextModules.map((module) =>
          trainingContentRequest(`/modules/${module.id}`, {
            method: "PUT",
            body: JSON.stringify({
              title: module.title,
              order: module.order,
            }),
          })
        )
      );
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder modules.");
      await loadWorkspace();
    } finally {
      setIsSaving(false);
    }
  };

  const handleModuleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    void reorderModules(Number(active.id), Number(over.id));
  };

  return (
    <AdminShell title="Training content" subtitle={`Audience: ${audienceLabel}`}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/exercise-library${activeView === "others" ? "?view=others" : ""}`}>
            <Button variant="outline">Back to audiences</Button>
          </Link>
          <Button
            className="ml-auto"
            onClick={() => {
              if (activeView === "age") {
                setModuleForm({ id: null, title: "" });
              } else {
                setOtherForm({ id: null, title: "", body: "", scheduleNote: "", videoUrl: "", order: "" });
              }
              setModalOpen(true);
            }}
          >
            + {activeView === "age" ? "Add age module" : "Add other content"}
          </Button>
        </div>
        {error ? <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        {activeView === "age" ? (
          <Card>
            <CardHeader>
              <SectionHeader title={`${audienceLabel} modules`} description="Click a module to open its session list page." />
            </CardHeader>
            <CardContent className="space-y-3">
              {workspace?.modules.length ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
                  <SortableContext items={workspace.modules.map((module) => module.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {workspace.modules.map((module) => (
                        <SortableModuleCard
                          key={module.id}
                          module={module}
                          audienceLabel={audienceLabel}
                          onEdit={(current) => {
                            setModuleForm({ id: current.id, title: current.title });
                            setModalOpen(true);
                          }}
                          onDelete={(path) => void deletePath(path)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : null}
              {!workspace?.modules.length ? <p className="text-sm text-muted-foreground">No modules created yet.</p> : null}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <SectionHeader title="Others" description="Standalone content outside the module flow." />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {OTHER_TYPES.map((type) => (
                  <Button
                    key={type.value}
                    variant={selectedOtherType === type.value ? "default" : "outline"}
                    onClick={() => {
                      setSelectedOtherType(type.value);
                      setOtherForm({ id: null, title: "", body: "", scheduleNote: "", videoUrl: "", order: "" });
                    }}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
              {(selectedOtherGroup?.items ?? []).map((item) => (
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
                    <Button size="sm" variant="ghost" onClick={() => void deletePath(`/others/${item.id}`)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              {!selectedOtherGroup?.items.length ? <p className="text-sm text-muted-foreground">No content created yet for this section.</p> : null}
            </CardContent>
          </Card>
        )}
      </div>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeView === "age" ? (moduleForm.id ? "Edit module" : "Add module") : (otherForm.id ? "Edit other content" : "Add other content")}</DialogTitle>
            <DialogDescription>
              {activeView === "age"
                ? `Create or update a module for audience ${audienceLabel}.`
                : `Create or update ${selectedOtherGroup?.label ?? "other"} content for audience ${audienceLabel}.`}
            </DialogDescription>
          </DialogHeader>
          {activeView === "age" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Module title</label>
                <Input
                  placeholder="e.g. Foundation block"
                  value={moduleForm.title}
                  onChange={(event) => setModuleForm((current) => ({ ...current, title: event.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  This is the module name athletes and coaches will see in the age flow. New modules are ordered automatically by when you add them.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveModule} disabled={isSaving}>
                  {moduleForm.id ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {OTHER_TYPES.map((type) => (
                  <Button
                    key={type.value}
                    variant={selectedOtherType === type.value ? "default" : "outline"}
                    onClick={() => setSelectedOtherType(type.value)}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
              <Input placeholder="Title" value={otherForm.title} onChange={(event) => setOtherForm((current) => ({ ...current, title: event.target.value }))} />
              <Textarea placeholder="Content body" value={otherForm.body} onChange={(event) => setOtherForm((current) => ({ ...current, body: event.target.value }))} />
              <Input placeholder="Schedule note" value={otherForm.scheduleNote} onChange={(event) => setOtherForm((current) => ({ ...current, scheduleNote: event.target.value }))} />
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Video URL" value={otherForm.videoUrl} onChange={(event) => setOtherForm((current) => ({ ...current, videoUrl: event.target.value }))} />
                <Input placeholder="Order" value={otherForm.order} onChange={(event) => setOtherForm((current) => ({ ...current, order: event.target.value }))} />
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
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
