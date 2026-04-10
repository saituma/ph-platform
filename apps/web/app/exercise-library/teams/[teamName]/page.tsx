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
  PROGRAM_TIERS,
  normalizeAudienceLabelInput,
  toTeamStorageAudienceLabel,
  trainingContentRequest,
} from "../../../../components/admin/training-content-v2/api";
import { isInseasonAgeGroup } from "./others/inseason-shared";
import { OTHER_SECTION_CONFIGS } from "./others/shared";

type TeamSummary = {
  team: string;
  memberCount: number;
  guardianCount: number;
};

function SortableModuleCard({
  module,
  audienceLabel,
  effectiveLockedForTiers,
  onEdit,
  onDelete,
  onLock,
}: {
  module: AudienceWorkspace["modules"][number];
  audienceLabel: string;
  effectiveLockedForTiers: Array<(typeof PROGRAM_TIERS)[number]["value"]>;
  onEdit: (module: AudienceWorkspace["modules"][number]) => void;
  onDelete: (path: string) => void;
  onLock: (module: AudienceWorkspace["modules"][number]) => void;
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
      {effectiveLockedForTiers.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {effectiveLockedForTiers.map((tier) => (
            <span
              key={`${module.id}-${tier}`}
              className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800"
            >
              Locked for{" "}
              {PROGRAM_TIERS.find((item) => item.value === tier)?.label ?? tier}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex gap-2">
        <Link
          href={`/exercise-library/teams/${encodeURIComponent(audienceLabel)}/modules/${module.id}`}
        >
          <Button size="sm">Open module</Button>
        </Link>
        <Button size="sm" variant="secondary" onClick={() => onLock(module)}>
          Lock plans
        </Button>
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
  const [lockModalOpen, setLockModalOpen] = useState(false);
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
  const [lockForm, setLockForm] = useState<{
    moduleId: number | null;
    moduleTitle: string;
    programTiers: Array<(typeof PROGRAM_TIERS)[number]["value"]>;
  }>({
    moduleId: null,
    moduleTitle: "",
    programTiers: [],
  });
  const [plans, setPlans] = useState<
    Array<{ id: number; name: string; tier: string; isActive: boolean }>
  >([]);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [copySourceTeam, setCopySourceTeam] = useState("");
  const [copySearch, setCopySearch] = useState("");
  const [otherPlanWorkspaces, setOtherPlanWorkspaces] = useState<
    Record<string, AudienceWorkspace>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isUpdatingLocks, setIsUpdatingLocks] = useState(false);
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
          const data = await trainingContentRequest<AudienceWorkspace>(
            `/admin?audienceLabel=${encodeURIComponent(planName)}`,
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

  const copyModulesFromAnotherTeam = async () => {
    if (!copySourceTeam || copySourceTeam === audienceLabel) return;
    setIsCopying(true);
    try {
      setError(null);
      await trainingContentRequest<AudienceWorkspace>("/admin/copy-modules", {
        method: "POST",
        body: JSON.stringify({
          sourceAudienceLabel: toTeamStorageAudienceLabel(copySourceTeam),
          targetAudienceLabel: storageAudienceLabel,
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
        plans.map((plan) =>
          trainingContentRequest("/others/settings", {
            method: "PUT",
            body: JSON.stringify({
              audienceLabel: plan.name,
              type,
              enabled: !lockedPlanNames.includes(plan.name),
            }),
          }),
        ),
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

  const saveModuleLocks = async (
    moduleId: number | null,
    programTiers: Array<(typeof PROGRAM_TIERS)[number]["value"]>,
  ) => {
    if (!programTiers.length) return;
    setIsUpdatingLocks(true);
    try {
      setError(null);
      const workspaceResponse = await trainingContentRequest<AudienceWorkspace>(
        "/modules/locks",
        {
          method: "PUT",
          body: JSON.stringify({
            audienceLabel: storageAudienceLabel,
            moduleId,
            programTiers,
          }),
        },
      );
      setWorkspace(workspaceResponse);
      setLockModalOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update module locks.",
      );
    } finally {
      setIsUpdatingLocks(false);
    }
  };

  const effectiveLockedTiersByModuleId = useMemo(() => {
    if (!workspace)
      return new Map<number, Array<(typeof PROGRAM_TIERS)[number]["value"]>>();

    const lockStartOrderByTier = new Map<
      (typeof PROGRAM_TIERS)[number]["value"],
      number
    >();
    for (const lock of workspace.moduleLocks) {
      const lockModule = workspace.modules.find(
        (module) => module.id === lock.startModuleId,
      );
      if (lockModule) {
        lockStartOrderByTier.set(lock.programTier, lockModule.order);
      }
    }

    return new Map(
      workspace.modules.map((module) => [
        module.id,
        PROGRAM_TIERS.filter((tier) => {
          const startOrder = lockStartOrderByTier.get(tier.value);
          return startOrder != null && module.order >= startOrder;
        }).map((tier) => tier.value),
      ]),
    );
  }, [workspace]);

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
          <div className="ml-auto flex flex-wrap gap-2">
            {activeView === "modules" ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setCopyModalOpen(true)}
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
                          effectiveLockedForTiers={
                            effectiveLockedTiersByModuleId.get(module.id) ?? []
                          }
                          onLock={(current) => {
                            setLockForm({
                              moduleId: current.id,
                              moduleTitle: current.title,
                              programTiers: current.lockedForTiers,
                            });
                            setLockModalOpen(true);
                          }}
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
      <Dialog open={lockModalOpen} onOpenChange={setLockModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lock module for plans</DialogTitle>
            <DialogDescription>
              Starting from {lockForm.moduleTitle || "this module"}, the
              selected plan tiers will be locked here and for every module below
              it on mobile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setLockForm((current) => ({
                    ...current,
                    programTiers: PROGRAM_TIERS.map((tier) => tier.value),
                  }))
                }
              >
                All plans
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setLockForm((current) => ({ ...current, programTiers: [] }))
                }
              >
                Clear selection
              </Button>
            </div>
            <div className="space-y-3">
              {PROGRAM_TIERS.map((tier) => {
                const checked = lockForm.programTiers.includes(tier.value);
                return (
                  <label
                    key={tier.value}
                    className="flex items-center gap-3 rounded-xl border border-border px-4 py-3"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        const nextProgramTiers = event.target.checked
                          ? [...lockForm.programTiers, tier.value]
                          : lockForm.programTiers.filter(
                              (value) => value !== tier.value,
                            );
                        setLockForm((current) => ({
                          ...current,
                          programTiers: nextProgramTiers,
                        }));
                      }}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {tier.label}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-between gap-2">
              <Button
                variant="ghost"
                disabled={isUpdatingLocks || !lockForm.programTiers.length}
                onClick={() =>
                  void saveModuleLocks(null, lockForm.programTiers)
                }
              >
                Unlock selected plans
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setLockModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  disabled={
                    isUpdatingLocks ||
                    !lockForm.moduleId ||
                    !lockForm.programTiers.length
                  }
                  onClick={() =>
                    void saveModuleLocks(
                      lockForm.moduleId,
                      lockForm.programTiers,
                    )
                  }
                >
                  {isUpdatingLocks ? "Saving..." : "Save locks"}
                </Button>
              </div>
            </div>
          </div>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy modules from another team</DialogTitle>
            <DialogDescription>
              Copy all modules, sessions, and session items from another team
              into {audienceLabel}. This replaces the current module list for
              this team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Search teams
              </label>
              <Input
                placeholder="Search team name"
                value={copySearch}
                onChange={(event) => setCopySearch(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Search or scroll the list below, then choose the team you want
                to copy from.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Available teams
              </label>
              <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
                <div className="divide-y divide-border">
                  {filteredCopyTeams.map((item) => (
                    <button
                      key={item.team}
                      type="button"
                      onClick={() => setCopySourceTeam(item.team)}
                      className={`flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-secondary/40 ${
                        copySourceTeam === item.team
                          ? "bg-primary/10"
                          : "bg-background"
                      }`}
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {item.team}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.memberCount} athlete
                          {item.memberCount === 1 ? "" : "s"} ·{" "}
                          {item.guardianCount} guardian
                          {item.guardianCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {copySourceTeam === item.team ? "Selected" : "Select"}
                      </span>
                    </button>
                  ))}
                  {!filteredCopyTeams.length ? (
                    <div className="px-4 py-6 text-sm text-muted-foreground">
                      No teams match that search.
                    </div>
                  ) : null}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                We will copy the full module structure from the selected team
                into this one.
              </p>
            </div>
            {isCopying ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Copying module data...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Please wait while we copy modules, sessions, and session
                      items from the selected team.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setCopyModalOpen(false)}
                disabled={isCopying}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void copyModulesFromAnotherTeam()}
                disabled={!copySourceTeam || isCopying}
              >
                {isCopying ? "Copying..." : "Copy modules"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
