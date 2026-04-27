"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "../../../../components/admin/shell";
import { SectionHeader } from "../../../../components/admin/section-header";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";
import { Input } from "../../../../components/ui/input";
import { Textarea } from "../../../../components/ui/textarea";
import {
  AudienceWorkspace,
  normalizeAudienceLabelInput,
  toStorageAudienceLabel,
  toTeamStorageAudienceLabel,
  trainingContentRequest,
} from "../../../../components/admin/training-content-v2/api";
import { isInseasonAgeGroup } from "./others/inseason-shared";
import { OTHER_SECTION_CONFIGS } from "./others/shared";

type TeamSummary = {
  team: string;
  memberCount: number;
  youthCount: number;
  adultCount: number;
};

function toPlanStorageAudienceLabel(planName: string) {
  return toStorageAudienceLabel({ audienceLabel: planName, adultMode: true });
}

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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });
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
        <p className="text-xs text-muted-foreground">
          Hold and move up or down to reorder modules.
        </p>
      </div>
      <p className="text-lg font-semibold text-foreground">
        {module.order}. {module.title}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {module.sessions.length} sessions · {module.totalDayLength} total days
      </p>
      <div className="mt-3 flex gap-2">
        <Link
          href={`/exercise-library/teams/${encodeURIComponent(audienceLabel)}/modules/${module.id}`}
        >
          <Button size="sm">Open module</Button>
        </Link>
        <Button size="sm" variant="outline" onClick={() => onEdit(module)}>
          Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(`/modules/${module.id}`)}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

export default function TeamDetailPage() {
  const params = useParams<{ teamName: string }>();
  const searchParams = useSearchParams();
  const audienceLabel = useMemo(
    () =>
      normalizeAudienceLabelInput(
        decodeURIComponent(String(params.teamName ?? "All")),
      ),
    [params.teamName],
  );
  const storageAudienceLabel = useMemo(
    () => toTeamStorageAudienceLabel(audienceLabel),
    [audienceLabel],
  );
  const activeView =
    searchParams.get("view") === "others" ? "others" : "modules";
  const [workspace, setWorkspace] = useState<AudienceWorkspace | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [moduleForm, setModuleForm] = useState({
    id: null as number | null,
    title: "",
  });
  const [otherModalOpen, setOtherModalOpen] = useState(false);
  const [otherForm, setOtherForm] = useState({
    id: null as number | null,
    type: "",
    title: "",
    body: "",
    scheduleNote: "",
    videoUrl: "",
    order: "",
  });
  const [plans, setPlans] = useState<
    Array<{ id: number; name: string; tier: string; isActive: boolean }>
  >([]);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [copySourceTeam, setCopySourceTeam] = useState("");
  const [copySearch, setCopySearch] = useState("");
  const [copyStep, setCopyStep] = useState<"team" | "modules" | "sessions">("team");
  const [copySourceWorkspace, setCopySourceWorkspace] = useState<AudienceWorkspace | null>(null);
  const [copyLoadingSource, setCopyLoadingSource] = useState(false);
  const [copyAllModules, setCopyAllModules] = useState(true);
  const [copySelectedModules, setCopySelectedModules] = useState<Set<number>>(new Set());
  const [copyAllSessions, setCopyAllSessions] = useState(true);
  const [copySelectedSessions, setCopySelectedSessions] = useState<Set<number>>(new Set());
  const [otherPlanWorkspaces, setOtherPlanWorkspaces] = useState<
    Record<string, AudienceWorkspace>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [otherLockModalOpen, setOtherLockModalOpen] = useState(false);
  const [isUpdatingOtherLocks, setIsUpdatingOtherLocks] = useState(false);
  const [otherLockForm, setOtherLockForm] = useState<{
    type: string;
    label: string;
    lockedPlanNames: string[];
  }>({
    type: "",
    label: "",
    lockedPlanNames: [],
  });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const loadWorkspace = async () => {
    try {
      setError(null);
      const data = await trainingContentRequest<AudienceWorkspace>(
        `/admin?audienceLabel=${encodeURIComponent(storageAudienceLabel)}`,
      );
      setWorkspace(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team.");
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, [audienceLabel]);

  const loadTeams = async () => {
    try {
      const response = await fetch("/api/backend/admin/teams", {
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to load teams.");
      }
      const nextTeams = Array.isArray(payload?.teams) ? payload.teams : [];
      setTeams(nextTeams);
      setCopySourceTeam((current) => {
        if (current && current !== audienceLabel) return current;
        const firstAvailable =
          nextTeams.find((team: TeamSummary) => team.team !== audienceLabel)
            ?.team ?? "";
        return firstAvailable;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams.");
    }
  };

  useEffect(() => {
    if (!copyModalOpen) return;
    void loadTeams();
  }, [copyModalOpen, audienceLabel]);

  const loadOtherPlans = async () => {
    try {
      const response = await fetch("/api/backend/admin/subscription-plans", {
        credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to load plans.");
      }
      const data = await response.json();
      const nextPlans = Array.isArray(data?.plans) ? data.plans : [];
      setPlans(
        nextPlans
          .filter((plan: { name?: string }) => Boolean(plan?.name))
          .map(
            (plan: {
              id: number;
              name: string;
              tier: string;
              isActive: boolean;
            }) => ({
              id: plan.id,
              name: plan.name,
              tier: plan.tier,
              isActive: Boolean(plan.isActive),
            }),
          ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load plans.");
    }
  };

  const loadOtherPlanWorkspaces = async (planNames: string[]) => {
    if (!planNames.length) {
      setOtherPlanWorkspaces({});
      return;
    }
    try {
      const entries = await Promise.all(
        planNames.map(async (planName) => {
          const storagePlanLabel = toPlanStorageAudienceLabel(planName);
          const data = await trainingContentRequest<AudienceWorkspace>(
            `/admin?audienceLabel=${encodeURIComponent(storagePlanLabel)}`,
          );
          return [planName, data] as const;
        }),
      );
      setOtherPlanWorkspaces(Object.fromEntries(entries));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load plan section settings.",
      );
    }
  };

  useEffect(() => {
    if (activeView !== "others") return;
    void loadOtherPlans();
  }, [activeView]);

  useEffect(() => {
    if (activeView !== "others" || !plans.length) return;
    void loadOtherPlanWorkspaces(plans.map((plan) => plan.name));
  }, [activeView, plans]);

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
            audienceLabel: storageAudienceLabel,
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
    const sourceIndex = workspace.modules.findIndex(
      (item) => item.id === sourceId,
    );
    const targetIndex = workspace.modules.findIndex(
      (item) => item.id === targetId,
    );
    if (sourceIndex < 0 || targetIndex < 0) return;

    const reordered = [...workspace.modules];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const nextModules = reordered.map((module, index) => ({
      ...module,
      order: index + 1,
    }));
    setWorkspace((current) =>
      current ? { ...current, modules: nextModules } : current,
    );
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
          }),
        ),
      );
      await loadWorkspace();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reorder modules.",
      );
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

  const filteredCopyTeams = teams.filter(
    (item) =>
      item.team !== audienceLabel &&
      item.team.toLowerCase().includes(copySearch.trim().toLowerCase()),
  );

  const loadCopySourceWorkspace = async (teamName: string) => {
    setCopyLoadingSource(true);
    try {
      const data = await trainingContentRequest<AudienceWorkspace>(
        `/admin?audienceLabel=${encodeURIComponent(toTeamStorageAudienceLabel(teamName))}`,
      );
      setCopySourceWorkspace(data);
    } catch {
      setCopySourceWorkspace(null);
    } finally {
      setCopyLoadingSource(false);
    }
  };

  const executeCopy = async () => {
    if (!copySourceTeam || !copySourceWorkspace) return;
    const moduleIds = copyAllModules
      ? copySourceWorkspace.modules.map((m) => m.id)
      : Array.from(copySelectedModules);
    if (!moduleIds.length) return;

    setIsCopying(true);
    try {
      setError(null);
      await trainingContentRequest<AudienceWorkspace>("/admin/copy-selected", {
        method: "POST",
        body: JSON.stringify({
          sourceAudienceLabel: toTeamStorageAudienceLabel(copySourceTeam),
          targetAudienceLabel: storageAudienceLabel,
          moduleIds,
          sessionIds: copyAllSessions ? null : Array.from(copySelectedSessions),
        }),
      });
      await loadWorkspace();
      setCopyModalOpen(false);
      setCopySearch("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to copy modules from another team.",
      );
    } finally {
      setIsCopying(false);
    }
  };

  const copySourceModules = copySourceWorkspace?.modules ?? [];
  const copySelectedModulesList = copyAllModules
    ? copySourceModules
    : copySourceModules.filter((m) => copySelectedModules.has(m.id));
  const copyAvailableSessions = copySelectedModulesList.flatMap((m) =>
    m.sessions.map((s) => ({ ...s, moduleTitle: m.title })),
  );

  const toggleOtherType = async (type: string, enabled: boolean) => {
    try {
      setError(null);
      await trainingContentRequest("/others/settings", {
        method: "PUT",
        body: JSON.stringify({
          audienceLabel: storageAudienceLabel,
          type,
          enabled,
        }),
      });
      await loadWorkspace();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update this content toggle.",
      );
    }
  };

  const saveOtherTypeLocks = async (
    type: string,
    lockedPlanNames: string[],
  ) => {
    setIsUpdatingOtherLocks(true);
    try {
      setError(null);
      await Promise.all(
        plans.map((plan) => {
          const storagePlanLabel = toPlanStorageAudienceLabel(plan.name);
          return trainingContentRequest("/others/settings", {
            method: "PUT",
            body: JSON.stringify({
              audienceLabel: storagePlanLabel,
              type,
              enabled: !lockedPlanNames.includes(plan.name),
            }),
          });
        }),
      );
      await Promise.all([
        loadWorkspace(),
        loadOtherPlanWorkspaces(plans.map((plan) => plan.name)),
      ]);
      setOtherLockModalOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update section locks.",
      );
    } finally {
      setIsUpdatingOtherLocks(false);
    }
  };

  const saveOtherContent = async () => {
    if (!otherForm.type || !otherForm.title.trim() || !otherForm.body.trim())
      return;
    setIsSaving(true);
    try {
      const payload = {
        audienceLabel: storageAudienceLabel,
        type: otherForm.type,
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
      setOtherForm({
        id: null,
        type: "",
        title: "",
        body: "",
        scheduleNote: "",
        videoUrl: "",
        order: "",
      });
      setOtherModalOpen(false);
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save content.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteOtherItem = async (itemId: number) => {
    if (!window.confirm("Delete this content item?")) return;
    setIsSaving(true);
    try {
      await trainingContentRequest(`/others/${itemId}`, { method: "DELETE" });
      await loadWorkspace();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete content.",
      );
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <AdminShell
      title="Training content"
      subtitle={
        activeView === "modules"
          ? `Team: ${audienceLabel}`
          : `Team others: ${audienceLabel}`
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/exercise-library?mode=team`}>
            <Button variant="outline">Back to teams</Button>
          </Link>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
            <Link
              href={`/exercise-library/teams/${encodeURIComponent(audienceLabel)}`}
            >
              <Button
                size="sm"
                variant={activeView === "modules" ? "secondary" : "ghost"}
              >
                Modules
              </Button>
            </Link>
            <Link
              href={`/exercise-library/teams/${encodeURIComponent(audienceLabel)}?view=others`}
            >
              <Button
                size="sm"
                variant={activeView === "others" ? "secondary" : "ghost"}
              >
                Others
              </Button>
            </Link>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {activeView === "modules" ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCopyStep("team");
                    setCopySourceWorkspace(null);
                    setCopyAllModules(true);
                    setCopySelectedModules(new Set());
                    setCopyAllSessions(true);
                    setCopySelectedSessions(new Set());
                    setCopyModalOpen(true);
                  }}
                >
                  Copy from team
                </Button>
                <Button
                  onClick={() => {
                    setModuleForm({ id: null, title: "" });
                    setModalOpen(true);
                  }}
                >
                  + Add team module
                </Button>
              </>
            ) : null}
          </div>
        </div>
        {error ? (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {activeView === "modules" ? (
          <Card>
            <CardHeader>
              <SectionHeader
                title={`Modules for team ${audienceLabel}`}
                description="Click a module to open its session list page."
              />
            </CardHeader>
            <CardContent className="space-y-3">
              {workspace?.modules.length ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleModuleDragEnd}
                >
                  <SortableContext
                    items={workspace.modules.map((module) => module.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {workspace.modules.map((module) => (
                        <SortableModuleCard
                          key={module.id}
                          module={module}
                          audienceLabel={audienceLabel}
                          onEdit={(current) => {
                            setModuleForm({
                              id: current.id,
                              title: current.title,
                            });
                            setModalOpen(true);
                          }}
                          onDelete={(path) => void deletePath(path)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : null}
              {!workspace?.modules.length ? (
                <p className="text-sm text-muted-foreground">
                  No modules created yet.
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <SectionHeader
                title={`Others for team ${audienceLabel}`}
                description="Turn each section on or off, then manage team content below."
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {OTHER_SECTION_CONFIGS.map((section) => {
                  const group = workspace?.others.find(
                    (item) => item.type === section.type,
                  );
                  const inseasonGroups =
                    section.concept === "age-schedule"
                      ? (group?.items ?? []).filter((item) =>
                          isInseasonAgeGroup(item.metadata),
                        )
                      : [];
                  const lockedPlans = plans
                    .filter((plan) => {
                      const planGroup = otherPlanWorkspaces[
                        plan.name
                      ]?.others.find((item) => item.type === section.type);
                      return planGroup ? !planGroup.enabled : false;
                    })
                    .map((plan) => plan.name);
                  return (
                    <div
                      key={section.type}
                      className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1 text-left">
                          <p className="text-base font-semibold text-foreground">
                            {section.label}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {section.concept === "age-schedule"
                              ? inseasonGroups.length
                                ? `${inseasonGroups.length} group${inseasonGroups.length === 1 ? "" : "s"} added`
                                : "No groups created yet."
                              : group?.items.length
                                ? `${group.items.length} item${group.items.length === 1 ? "" : "s"} added`
                                : "No content created yet."}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {section.summary}
                          </p>
                          {lockedPlans.length ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {lockedPlans.map((planName) => (
                                <span
                                  key={`${section.type}-${planName}`}
                                  className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800"
                                >
                                  Locked for {planName}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {section.concept === "age-schedule" ? (
                            <Link
                              href={`/exercise-library/teams/${encodeURIComponent(audienceLabel)}/others/${section.type}`}
                            >
                              <Button type="button" size="sm">
                                Open groups
                              </Button>
                            </Link>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setOtherForm({
                                  id: null,
                                  type: section.type,
                                  title: "",
                                  body: "",
                                  scheduleNote: "",
                                  videoUrl: "",
                                  order: "",
                                });
                                setOtherModalOpen(true);
                              }}
                            >
                              Add content
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOtherLockForm({
                                type: section.type,
                                label: section.label,
                                lockedPlanNames: lockedPlans,
                              });
                              setOtherLockModalOpen(true);
                            }}
                          >
                            Lock plans
                          </Button>
                          <label className="flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm font-medium text-foreground">
                            <input
                              type="checkbox"
                              checked={Boolean(group?.enabled)}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) =>
                                void toggleOtherType(
                                  section.type,
                                  event.target.checked,
                                )
                              }
                            />
                            <span>{group?.enabled ? "On" : "Off"}</span>
                          </label>
                        </div>
                      </div>
                      {section.concept === "age-schedule" ? (
                        <div className="mt-4 space-y-3">
                          {inseasonGroups.map((item) => (
                            <Link
                              key={item.id}
                              href={`/exercise-library/teams/${encodeURIComponent(audienceLabel)}/others/${section.type}/${item.id}`}
                              className="block rounded-2xl border border-border/70 p-4 transition hover:border-primary/40 hover:bg-primary/5"
                            >
                              <p className="text-sm font-semibold text-foreground">
                                {item.title}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Open this group to add one or more recurring
                                weekly schedule slots.
                              </p>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {(group?.items ?? []).map((item) => (
                            <div
                              key={item.id}
                              className="rounded-2xl border border-border/70 p-4"
                            >
                              <p className="text-sm font-semibold text-foreground">
                                {item.order}. {item.title}
                              </p>
                              {item.scheduleNote ? (
                                <p className="mt-1 text-xs font-semibold text-primary">
                                  {item.scheduleNote}
                                </p>
                              ) : null}
                              <p className="mt-2 text-sm text-muted-foreground">
                                {item.body}
                              </p>
                              <div className="mt-3 flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setOtherForm({
                                      id: item.id,
                                      type: section.type,
                                      title: item.title,
                                      body: item.body,
                                      scheduleNote: item.scheduleNote ?? "",
                                      videoUrl: item.videoUrl ?? "",
                                      order: String(item.order),
                                    });
                                    setOtherModalOpen(true);
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => void deleteOtherItem(item.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {moduleForm.id ? "Edit module" : "Add module"}
            </DialogTitle>
            <DialogDescription>
              {`Create or update a module for team ${audienceLabel}.`}
            </DialogDescription>
          </DialogHeader>
          {activeView === "modules" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Module title
                </label>
                <Input
                  placeholder="e.g. Foundation block"
                  value={moduleForm.title}
                  onChange={(event) =>
                    setModuleForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  This is the module name athletes and coaches will see in the
                  team flow. New modules are ordered automatically by when you
                  add them.
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
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={otherLockModalOpen} onOpenChange={setOtherLockModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Lock plans for {otherLockForm.label || "section"}
            </DialogTitle>
            <DialogDescription>
              Check each plan that should be locked for this section in mobile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              {plans.map((plan) => {
                const checked = otherLockForm.lockedPlanNames.includes(
                  plan.name,
                );
                return (
                  <label
                    key={plan.id}
                    className="flex items-center gap-3 rounded-xl border border-border px-4 py-3"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        const nextLockedPlans = event.target.checked
                          ? [...otherLockForm.lockedPlanNames, plan.name]
                          : otherLockForm.lockedPlanNames.filter(
                              (value) => value !== plan.name,
                            );
                        setOtherLockForm((current) => ({
                          ...current,
                          lockedPlanNames: nextLockedPlans,
                        }));
                      }}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {plan.name}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOtherLockModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={isUpdatingOtherLocks || !otherLockForm.type}
                onClick={() =>
                  void saveOtherTypeLocks(
                    otherLockForm.type,
                    otherLockForm.lockedPlanNames,
                  )
                }
              >
                {isUpdatingOtherLocks ? "Saving..." : "Save locks"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={otherModalOpen && activeView === "others"}
        onOpenChange={setOtherModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {otherForm.id ? "Edit content" : "Add content"}
            </DialogTitle>
            <DialogDescription>
              Manage this Others section directly from the Others tab.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Title"
              value={otherForm.title}
              onChange={(event) =>
                setOtherForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
            />
            <Textarea
              placeholder="Content body"
              value={otherForm.body}
              onChange={(event) =>
                setOtherForm((current) => ({
                  ...current,
                  body: event.target.value,
                }))
              }
            />
            <Input
              placeholder="Schedule note"
              value={otherForm.scheduleNote}
              onChange={(event) =>
                setOtherForm((current) => ({
                  ...current,
                  scheduleNote: event.target.value,
                }))
              }
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="Video URL"
                value={otherForm.videoUrl}
                onChange={(event) =>
                  setOtherForm((current) => ({
                    ...current,
                    videoUrl: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Order"
                value={otherForm.order}
                onChange={(event) =>
                  setOtherForm((current) => ({
                    ...current,
                    order: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOtherModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={saveOtherContent}
                disabled={isSaving || !otherForm.type}
              >
                {otherForm.id ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={copyModalOpen} onOpenChange={setCopyModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {copyStep === "team" && "Copy modules from another team"}
              {copyStep === "modules" && "Select modules to copy"}
              {copyStep === "sessions" && "Select sessions to copy"}
            </DialogTitle>
            <DialogDescription>
              {copyStep === "team" && "Choose the source team to copy from."}
              {copyStep === "modules" && "Pick all modules or select specific ones."}
              {copyStep === "sessions" && "Pick all sessions or select specific ones."}
            </DialogDescription>
          </DialogHeader>

          {copyStep === "team" && (
            <div className="space-y-4">
              <Input
                placeholder="Search team name"
                value={copySearch}
                onChange={(event) => setCopySearch(event.target.value)}
              />
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {filteredCopyTeams.map((item) => (
                  <button
                    key={item.team}
                    type="button"
                    onClick={() => setCopySourceTeam(item.team)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      copySourceTeam === item.team
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <p className="text-sm font-semibold text-foreground">{item.team}</p>
                    <p className="text-xs text-muted-foreground">{item.youthCount} youth · {item.adultCount} adult</p>
                  </button>
                ))}
                {!filteredCopyTeams.length ? (
                  <p className="text-sm text-muted-foreground">No teams match that search.</p>
                ) : null}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCopyModalOpen(false)}>Cancel</Button>
                <Button
                  disabled={!copySourceTeam}
                  onClick={async () => {
                    if (!copySourceTeam) return;
                    await loadCopySourceWorkspace(copySourceTeam);
                    setCopyStep("modules");
                  }}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {copyStep === "modules" && (
            <div className="space-y-3">
              {copyLoadingSource ? (
                <p className="text-sm text-muted-foreground">Loading modules...</p>
              ) : (
                <>
                  <label className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
                    <input
                      type="checkbox"
                      checked={copyAllModules}
                      onChange={(e) => {
                        setCopyAllModules(e.target.checked);
                        if (e.target.checked) setCopySelectedModules(new Set());
                      }}
                    />
                    <span className="text-sm font-medium text-foreground">All modules</span>
                  </label>
                  {!copyAllModules && (
                    <div className="max-h-60 space-y-2 overflow-y-auto">
                      {copySourceModules.map((m) => (
                        <label key={m.id} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
                          <input
                            type="checkbox"
                            checked={copySelectedModules.has(m.id)}
                            onChange={(e) => {
                              setCopySelectedModules((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(m.id);
                                else next.delete(m.id);
                                return next;
                              });
                            }}
                          />
                          <span className="text-sm text-foreground">
                            {m.order}. {m.title}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCopyStep("team")}>Back</Button>
                <Button
                  disabled={!copyAllModules && copySelectedModules.size === 0}
                  onClick={() => setCopyStep("sessions")}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {copyStep === "sessions" && (
            <div className="space-y-3">
              <label className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
                <input
                  type="checkbox"
                  checked={copyAllSessions}
                  onChange={(e) => {
                    setCopyAllSessions(e.target.checked);
                    if (e.target.checked) setCopySelectedSessions(new Set());
                  }}
                />
                <span className="text-sm font-medium text-foreground">All sessions in selected modules</span>
              </label>
              {!copyAllSessions && (
                <div className="max-h-60 space-y-2 overflow-y-auto">
                  {copyAvailableSessions.map((s) => (
                    <label key={s.id} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
                      <input
                        type="checkbox"
                        checked={copySelectedSessions.has(s.id)}
                        onChange={(e) => {
                          setCopySelectedSessions((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(s.id);
                            else next.delete(s.id);
                            return next;
                          });
                        }}
                      />
                      <span className="text-sm text-foreground">
                        <span className="text-muted-foreground">{s.moduleTitle} ›</span> {s.title}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCopyStep("modules")}>Back</Button>
                <Button
                  disabled={isCopying || (!copyAllSessions && copySelectedSessions.size === 0)}
                  onClick={() => void executeCopy()}
                >
                  {isCopying ? "Copying..." : "Copy"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
