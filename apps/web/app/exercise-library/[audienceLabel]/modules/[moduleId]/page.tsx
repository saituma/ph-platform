"use client";

import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
import {
  AudienceWorkspace,
  PROGRAM_TIERS,
  normalizeAudienceLabelInput,
  trainingContentRequest,
} from "../../../../../components/admin/training-content-v2/api";

function SortableSessionCard({
  session,
  audienceLabel,
  moduleId,
  effectiveLockedForTiers,
  onEdit,
  onDelete,
  onLock,
}: {
  session: NonNullable<AudienceWorkspace["modules"][number]>["sessions"][number];
  audienceLabel: string;
  moduleId: number;
  effectiveLockedForTiers: Array<(typeof PROGRAM_TIERS)[number]["value"]>;
  onEdit: (session: NonNullable<AudienceWorkspace["modules"][number]>["sessions"][number]) => void;
  onDelete: (sessionId: number) => void;
  onLock: (session: NonNullable<AudienceWorkspace["modules"][number]>["sessions"][number]) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: session.id });
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
          aria-label={`Drag ${session.title}`}
          {...attributes}
          {...listeners}
        >
          <span className="flex items-center gap-1">
            <GripVertical className="h-3.5 w-3.5" />
            Drag
          </span>
        </button>
        <p className="text-xs text-muted-foreground">Hold and move up or down to reorder sessions.</p>
      </div>
      <p className="text-lg font-semibold text-foreground">{session.order}. {session.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {session.dayLength} days · {session.items.length} content items
      </p>
      {effectiveLockedForTiers.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {effectiveLockedForTiers.map((tier) => (
            <span
              key={`${session.id}-${tier}`}
              className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800"
            >
              Locked for {PROGRAM_TIERS.find((item) => item.value === tier)?.label ?? tier}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex gap-2">
        <Link href={`/exercise-library/${encodeURIComponent(audienceLabel)}/modules/${moduleId}/sessions/${session.id}`}>
          <Button size="sm">Open session</Button>
        </Link>
        <Button size="sm" variant="secondary" onClick={() => onLock(session)}>
          Lock plans
        </Button>
        <Button size="sm" variant="outline" onClick={() => onEdit(session)}>
          Edit
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDelete(session.id)}>
          Delete
        </Button>
      </div>
    </div>
  );
}

export default function ModuleSessionsPage() {
  const params = useParams<{ audienceLabel: string; moduleId: string }>();
  const audienceLabel = useMemo(
    () => normalizeAudienceLabelInput(decodeURIComponent(String(params.audienceLabel ?? "All"))),
    [params.audienceLabel],
  );
  const moduleId = Number(params.moduleId);
  const [workspace, setWorkspace] = useState<AudienceWorkspace | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingLocks, setIsUpdatingLocks] = useState(false);
  const [sessionForm, setSessionForm] = useState({ id: null as number | null, title: "", dayLength: "7" });
  const [lockForm, setLockForm] = useState<{
    sessionId: number | null;
    sessionTitle: string;
    programTiers: Array<(typeof PROGRAM_TIERS)[number]["value"]>;
  }>({
    sessionId: null,
    sessionTitle: "",
    programTiers: [],
  });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const loadWorkspace = async () => {
    try {
      setError(null);
      const data = await trainingContentRequest<AudienceWorkspace>(`/admin?audienceLabel=${encodeURIComponent(audienceLabel)}`);
      setWorkspace(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load module.");
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, [audienceLabel]);

  const module = workspace?.modules.find((item) => item.id === moduleId) ?? null;

  const effectiveLockedTiersBySessionId = useMemo(() => {
    if (!module) return new Map<number, Array<(typeof PROGRAM_TIERS)[number]["value"]>>();

    const sessionLockStartOrderByTier = new Map<(typeof PROGRAM_TIERS)[number]["value"], number>();
    for (const session of module.sessions) {
      for (const tier of session.lockedForTiers ?? []) {
        if (sessionLockStartOrderByTier.has(tier)) continue;
        sessionLockStartOrderByTier.set(tier, session.order);
      }
    }

    return new Map(
      module.sessions.map((session) => [
        session.id,
        PROGRAM_TIERS
          .filter((tier) => {
            const startOrder = sessionLockStartOrderByTier.get(tier.value);
            return startOrder != null && session.order >= startOrder;
          })
          .map((tier) => tier.value),
      ])
    );
  }, [module]);

  const saveSession = async () => {
    if (!module || !sessionForm.title.trim()) return;
    setIsSaving(true);
    try {
      if (sessionForm.id) {
        await trainingContentRequest(`/sessions/${sessionForm.id}`, {
          method: "PUT",
          body: JSON.stringify({
            title: sessionForm.title,
            dayLength: Number(sessionForm.dayLength) || 7,
          }),
        });
      } else {
        await trainingContentRequest("/sessions", {
          method: "POST",
          body: JSON.stringify({
            moduleId: module.id,
            title: sessionForm.title,
            dayLength: Number(sessionForm.dayLength) || 7,
          }),
        });
      }
      setSessionForm({ id: null, title: "", dayLength: "7" });
      setModalOpen(false);
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save session.");
    } finally {
      setIsSaving(false);
    }
  };

  const createSessionPreset = async (title: string) => {
    if (!module) return;
    setIsSaving(true);
    try {
      await trainingContentRequest("/sessions", {
        method: "POST",
        body: JSON.stringify({
          moduleId: module.id,
          title,
          dayLength: 7,
        }),
      });
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSession = async (sessionId: number) => {
    if (!window.confirm("Delete this session?")) return;
    setIsSaving(true);
    try {
      await trainingContentRequest(`/sessions/${sessionId}`, { method: "DELETE" });
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session.");
    } finally {
      setIsSaving(false);
    }
  };

  const reorderSessions = async (sourceId: number, targetId: number) => {
    if (!module || sourceId === targetId) return;
    const sourceIndex = module.sessions.findIndex((item) => item.id === sourceId);
    const targetIndex = module.sessions.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const reordered = [...module.sessions];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    const nextSessions = reordered.map((session, index) => ({ ...session, order: index + 1 }));

    setWorkspace((current) => {
      if (!current) return current;
      return {
        ...current,
        modules: current.modules.map((item) =>
          item.id === module.id ? { ...item, sessions: nextSessions } : item
        ),
      };
    });

    setIsSaving(true);
    setError(null);
    try {
      await Promise.all(
        nextSessions.map((session) =>
          trainingContentRequest(`/sessions/${session.id}`, {
            method: "PUT",
            body: JSON.stringify({
              title: session.title,
              dayLength: session.dayLength,
              order: session.order,
            }),
          })
        )
      );
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder sessions.");
      await loadWorkspace();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSessionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    void reorderSessions(Number(active.id), Number(over.id));
  };

  const saveSessionLocks = async (sessionId: number | null, programTiers: Array<(typeof PROGRAM_TIERS)[number]["value"]>) => {
    if (!module || !programTiers.length) return;
    setIsUpdatingLocks(true);
    try {
      setError(null);
      const workspaceResponse = await trainingContentRequest<AudienceWorkspace>("/sessions/locks", {
        method: "PUT",
        body: JSON.stringify({
          moduleId: module.id,
          sessionId,
          programTiers,
        }),
      });
      setWorkspace(workspaceResponse);
      setLockModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update session locks.");
    } finally {
      setIsUpdatingLocks(false);
    }
  };

  return (
    <AdminShell title="Training content" subtitle={`Age ${audienceLabel} · module structure`}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/exercise-library/${encodeURIComponent(audienceLabel)}`}>
            <Button variant="outline">Back to audience</Button>
          </Link>
          <Button
            className="ml-auto"
            onClick={() => {
              setSessionForm({ id: null, title: "", dayLength: "7" });
              setModalOpen(true);
            }}
          >
            + Add session
          </Button>
        </div>
        {error ? <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        <Card>
            <CardHeader>
              <SectionHeader
                title={module ? module.title : "Sessions"}
                description="Within each module, build Session A, Session B, and Session C. Inside each session, add exercises with sets, reps/time, coaching notes, and video."
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => void createSessionPreset("Session A")} disabled={isSaving}>
                  + Session A
                </Button>
                <Button size="sm" variant="outline" onClick={() => void createSessionPreset("Session B")} disabled={isSaving}>
                  + Session B
                </Button>
                <Button size="sm" variant="outline" onClick={() => void createSessionPreset("Session C")} disabled={isSaving}>
                  + Session C
                </Button>
              </div>
              {module?.sessions.length ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSessionDragEnd}>
                  <SortableContext items={module.sessions.map((session) => session.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {module.sessions.map((session) => (
                        <SortableSessionCard
                          key={session.id}
                          session={session}
                          audienceLabel={audienceLabel}
                          moduleId={moduleId}
                          effectiveLockedForTiers={effectiveLockedTiersBySessionId.get(session.id) ?? []}
                          onLock={(current) => {
                            setLockForm({
                              sessionId: current.id,
                              sessionTitle: current.title,
                              programTiers: current.lockedForTiers,
                            });
                            setLockModalOpen(true);
                          }}
                          onEdit={(current) => {
                            setSessionForm({
                              id: current.id,
                              title: current.title,
                              dayLength: String(current.dayLength),
                            });
                            setModalOpen(true);
                          }}
                          onDelete={(sessionId) => void deleteSession(sessionId)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : null}
            {!module?.sessions.length ? <p className="text-sm text-muted-foreground">No sessions created yet.</p> : null}
          </CardContent>
        </Card>
      </div>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{sessionForm.id ? "Edit session" : "Add session"}</DialogTitle>
            <DialogDescription>
              Use names like Session A, Session B, and Session C for {module?.title ?? "this module"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Session title</label>
              <Input
                placeholder="e.g. Lower body strength"
                value={sessionForm.title}
                onChange={(event) => setSessionForm((current) => ({ ...current, title: event.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                This is the session name coaches and athletes will see in the module.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Session length in days</label>
              <Input
                placeholder="e.g. 7"
                value={sessionForm.dayLength}
                onChange={(event) => setSessionForm((current) => ({ ...current, dayLength: event.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Use any number of days you want, like 6, 7, or 10. New sessions are ordered automatically by when you add them.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveSession} disabled={!module || isSaving}>
                {sessionForm.id ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={lockModalOpen} onOpenChange={setLockModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lock session for plans</DialogTitle>
            <DialogDescription>
              Starting from {lockForm.sessionTitle || "this session"}, the selected plan tiers will be locked here and for every session below it on mobile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLockForm((current) => ({ ...current, programTiers: PROGRAM_TIERS.map((tier) => tier.value) }))}
              >
                All plans
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLockForm((current) => ({ ...current, programTiers: [] }))}
              >
                Clear selection
              </Button>
            </div>
            <div className="space-y-3">
              {PROGRAM_TIERS.map((tier) => {
                const checked = lockForm.programTiers.includes(tier.value);
                return (
                  <label key={tier.value} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        const nextProgramTiers = event.target.checked
                          ? [...lockForm.programTiers, tier.value]
                          : lockForm.programTiers.filter((value) => value !== tier.value);
                        setLockForm((current) => ({ ...current, programTiers: nextProgramTiers }));
                      }}
                    />
                    <span className="text-sm font-medium text-foreground">{tier.label}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-between gap-2">
              <Button
                variant="ghost"
                disabled={isUpdatingLocks || !lockForm.programTiers.length}
                onClick={() => void saveSessionLocks(null, lockForm.programTiers)}
              >
                Unlock selected plans
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setLockModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={isUpdatingLocks || !lockForm.sessionId || !lockForm.programTiers.length}
                  onClick={() => void saveSessionLocks(lockForm.sessionId, lockForm.programTiers)}
                >
                  {isUpdatingLocks ? "Saving..." : "Save locks"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
