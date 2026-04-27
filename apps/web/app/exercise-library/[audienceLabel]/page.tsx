"use client";

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
import {
  AudienceWorkspace,
  AudienceSummary,
  PROGRAM_TIERS,
  isProgramTierAudienceLabel,
  normalizeAudienceLabelInput,
  toStorageAudienceLabel,
  trainingContentRequest,
} from "../../../components/admin/training-content-v2/api";

type ModuleForm = {
  id: number | null;
  name: string;
  focus: string;
  targetOrder: number | null;
};

const MODULE_TITLE_FOCUS_SEPARATOR = " | Focus: ";

function parseModuleTitle(input: string) {
  const [name, focus] = input.split(MODULE_TITLE_FOCUS_SEPARATOR);
  return {
    name: (name ?? "").trim(),
    focus: (focus ?? "").trim(),
  };
}

function buildModuleTitle(name: string, focus: string) {
  const safeName = name.trim();
  const safeFocus = focus.trim();
  if (!safeFocus) return safeName;
  return `${safeName}${MODULE_TITLE_FOCUS_SEPARATOR}${safeFocus}`;
}

export default function AudienceDetailPage() {
  const params = useParams<{ audienceLabel: string }>();
  const searchParams = useSearchParams();
  const audienceLabel = useMemo(
    () => normalizeAudienceLabelInput(decodeURIComponent(String(params.audienceLabel ?? "All"))),
    [params.audienceLabel],
  );
  const isAdultTierAudience = useMemo(() => isProgramTierAudienceLabel(audienceLabel), [audienceLabel]);
  const fromAdultMode = searchParams.get("mode") === "adult" || isAdultTierAudience;
  const storageAudienceLabel = useMemo(
    () => toStorageAudienceLabel({ audienceLabel, adultMode: fromAdultMode }),
    [audienceLabel, fromAdultMode],
  );
  const audienceNoun = fromAdultMode ? "adult tier" : "age";
  const currentTierValue = useMemo(
    () => PROGRAM_TIERS.find((t) => t.label === audienceLabel)?.value ?? null,
    [audienceLabel],
  );

  const [workspace, setWorkspace] = useState<AudienceWorkspace | null>(null);
  const [activeTab, setActiveTab] = useState<"modules" | "others">("modules");
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [lockModalMode, setLockModalMode] = useState<"lock" | "unlock">("lock");
  const [moduleForm, setModuleForm] = useState<ModuleForm>({
    id: null,
    name: "",
    focus: "",
    targetOrder: null,
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
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingLocks, setIsUpdatingLocks] = useState(false);

  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyStep, setCopyStep] = useState<"plan" | "modules" | "sessions">("plan");
  const [copySourcePlans, setCopySourcePlans] = useState<AudienceSummary[]>([]);
  const [copySelectedPlan, setCopySelectedPlan] = useState<string | null>(null);
  const [copySourceWorkspace, setCopySourceWorkspace] = useState<AudienceWorkspace | null>(null);
  const [copySelectedModules, setCopySelectedModules] = useState<Set<number>>(new Set());
  const [copyAllModules, setCopyAllModules] = useState(true);
  const [copyAllSessions, setCopyAllSessions] = useState(true);
  const [copySelectedSessions, setCopySelectedSessions] = useState<Set<number>>(new Set());
  const [isCopying, setIsCopying] = useState(false);
  const [copyLoadingSource, setCopyLoadingSource] = useState(false);

  const loadWorkspace = async () => {
    try {
      setError(null);
      const data = await trainingContentRequest<AudienceWorkspace>(`/admin?audienceLabel=${encodeURIComponent(storageAudienceLabel)}`);
      setWorkspace(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load ${audienceNoun} workspace.`);
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, [storageAudienceLabel]);

  const saveModule = async () => {
    if (!moduleForm.name.trim()) return;
    setIsSaving(true);
    try {
      const title = buildModuleTitle(moduleForm.name, moduleForm.focus);
      if (moduleForm.id) {
        await trainingContentRequest(`/modules/${moduleForm.id}`, {
          method: "PUT",
          body: JSON.stringify({ title }),
        });
      } else {
        const created = await trainingContentRequest<{ id: number }>("/modules", {
          method: "POST",
          body: JSON.stringify({
            audienceLabel: storageAudienceLabel,
            title,
          }),
        });

        if (moduleForm.targetOrder && created?.id) {
          await trainingContentRequest(`/modules/${created.id}`, {
            method: "PUT",
            body: JSON.stringify({
              title,
              order: moduleForm.targetOrder,
            }),
          });
        }
      }

      setModuleForm({ id: null, name: "", focus: "", targetOrder: null });
      setModuleModalOpen(false);
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save module.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteModule = async (moduleId: number) => {
    if (!window.confirm("Delete this module?")) return;
    setIsSaving(true);
    try {
      setNotice(null);
      await trainingContentRequest(`/modules/${moduleId}`, { method: "DELETE" });
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete module.");
    } finally {
      setIsSaving(false);
    }
  };

  const cleanupPlaceholderModules = async () => {
    if (!window.confirm(`Remove auto-created placeholder modules for this ${audienceNoun}?`)) return;
    setIsSaving(true);
    try {
      setError(null);
      setNotice(null);
      const response = await trainingContentRequest<{
        deletedCount: number;
        deletedModuleOrders: number[];
        workspace: AudienceWorkspace;
      }>("/modules/cleanup-placeholders", {
        method: "POST",
        body: JSON.stringify({ audienceLabel: storageAudienceLabel }),
      });
      setWorkspace(response.workspace);
      if (response.deletedCount > 0) {
        setNotice(
          `Removed ${response.deletedCount} placeholder module${response.deletedCount > 1 ? "s" : ""}${
            response.deletedModuleOrders.length ? ` (Module ${response.deletedModuleOrders.join(", Module ")})` : ""
          }.`,
        );
      } else {
        setNotice("No removable placeholder modules were found.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clean placeholder modules.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveModuleLocks = async (moduleId: number | null, programTiers: Array<(typeof PROGRAM_TIERS)[number]["value"]>) => {
    if (!programTiers.length) return;
    setIsUpdatingLocks(true);
    try {
      setError(null);
      const workspaceResponse = await trainingContentRequest<AudienceWorkspace>("/modules/locks", {
        method: "PUT",
        body: JSON.stringify({
          audienceLabel: storageAudienceLabel,
          moduleId,
          programTiers,
        }),
      });
      setWorkspace(workspaceResponse);
      setLockModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update module locks.");
    } finally {
      setIsUpdatingLocks(false);
    }
  };

  const openCopyModal = async () => {
    setCopyStep("plan");
    setCopySelectedPlan(null);
    setCopySourceWorkspace(null);
    setCopySelectedModules(new Set());
    setCopyAllModules(true);
    setCopyAllSessions(true);
    setCopySelectedSessions(new Set());
    setCopyModalOpen(true);
    try {
      const plans = await trainingContentRequest<AudienceSummary[]>("/admin/audiences");
      setCopySourcePlans(plans.filter((p) => p.label !== storageAudienceLabel));
    } catch {
      setCopySourcePlans([]);
    }
  };

  const loadCopySourceWorkspace = async (label: string) => {
    setCopyLoadingSource(true);
    try {
      const data = await trainingContentRequest<AudienceWorkspace>(`/admin?audienceLabel=${encodeURIComponent(label)}`);
      setCopySourceWorkspace(data);
    } catch {
      setCopySourceWorkspace(null);
    } finally {
      setCopyLoadingSource(false);
    }
  };

  const executeCopy = async () => {
    if (!copySelectedPlan || !copySourceWorkspace) return;
    const moduleIds = copyAllModules
      ? copySourceWorkspace.modules.map((m) => m.id)
      : Array.from(copySelectedModules);
    if (!moduleIds.length) return;

    setIsCopying(true);
    try {
      setError(null);
      const result = await trainingContentRequest<AudienceWorkspace>("/admin/copy-selected", {
        method: "POST",
        body: JSON.stringify({
          sourceAudienceLabel: copySelectedPlan,
          targetAudienceLabel: storageAudienceLabel,
          moduleIds,
          sessionIds: copyAllSessions ? null : Array.from(copySelectedSessions),
        }),
      });
      setWorkspace(result);
      setCopyModalOpen(false);
      setNotice("Modules copied successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to copy modules.");
    } finally {
      setIsCopying(false);
    }
  };

  const copySourceModules = copySourceWorkspace?.modules ?? [];
  const copySelectedModulesList = copyAllModules
    ? copySourceModules
    : copySourceModules.filter((m) => copySelectedModules.has(m.id));
  const copyAvailableSessions = copySelectedModulesList.flatMap((m) => m.sessions.map((s) => ({ ...s, moduleTitle: parseModuleTitle(m.title).name || m.title })));

  const modules = workspace?.modules ?? [];
  const moduleOrderById = useMemo(() => new Map(modules.map((module) => [module.id, module.order])), [modules]);
  const lockStartOrderByTier = useMemo(() => {
    const map = new Map<(typeof PROGRAM_TIERS)[number]["value"], number>();
    for (const lock of workspace?.moduleLocks ?? []) {
      const startOrder = moduleOrderById.get(lock.startModuleId);
      if (startOrder != null) {
        map.set(lock.programTier, startOrder);
      }
    }
    return map;
  }, [moduleOrderById, workspace?.moduleLocks]);

  const lockedTiersByOrder = useMemo(() => {
    return new Map(
      Array.from({ length: 12 }, (_, index) => index + 1).map((order) => [
        order,
        PROGRAM_TIERS
          .filter((tier) => {
            const startOrder = lockStartOrderByTier.get(tier.value);
            return startOrder != null && order >= startOrder;
          })
          .map((tier) => tier.value),
      ]),
    );
  }, [lockStartOrderByTier]);

  const moduleByOrder = new Map(modules.map((module) => [module.order, module]));
  const moduleSlots = Array.from({ length: 12 }, (_, index) => {
    const order = index + 1;
    return {
      order,
      module: moduleByOrder.get(order) ?? null,
    };
  });
  const lockModalModuleOrder = lockForm.moduleId ? moduleOrderById.get(lockForm.moduleId) ?? null : null;
  const selectableProgramTiers = useMemo(
    () =>
      PROGRAM_TIERS.filter((tier) => {
        if (lockModalModuleOrder == null) return false;
        const startOrder = lockStartOrderByTier.get(tier.value);
        const isLockedHere = startOrder != null && startOrder <= lockModalModuleOrder;
        return lockModalMode === "lock" ? !isLockedHere : isLockedHere;
      }),
    [lockModalMode, lockModalModuleOrder, lockStartOrderByTier],
  );

  const unlockSelectedPlans = async () => {
    if (!lockForm.programTiers.length) return;
    if (!lockForm.moduleId) return;

    const currentOrder = moduleOrderById.get(lockForm.moduleId);
    if (currentOrder == null) return;

    const tiersToMove = lockForm.programTiers.filter((tier) => {
      const startOrder = lockStartOrderByTier.get(tier);
      return startOrder != null && startOrder <= currentOrder;
    });
    if (!tiersToMove.length) {
      setError("Selected plans are already unlocked through this module.");
      return;
    }

    setIsUpdatingLocks(true);
    try {
      setError(null);
      await trainingContentRequest<AudienceWorkspace>("/modules/unlocks", {
        method: "PUT",
        body: JSON.stringify({
          audienceLabel: storageAudienceLabel,
          throughModuleId: lockForm.moduleId,
          programTiers: tiersToMove,
        }),
      });
      await loadWorkspace();
      setLockModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update module locks.");
    } finally {
      setIsUpdatingLocks(false);
    }
  };

  return (
    <AdminShell title="Exercise library" subtitle={fromAdultMode ? `Adult tier ${audienceLabel}` : `Age ${audienceLabel}`}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={fromAdultMode ? "/exercise-library?mode=adult" : "/exercise-library"}>
            <Button variant="outline">{fromAdultMode ? "Back to adult tiers" : "Back to age groups"}</Button>
          </Link>
          <Button variant="outline" disabled={isSaving || isUpdatingLocks} onClick={() => void cleanupPlaceholderModules()}>
            Clean placeholders
          </Button>
          <Button variant="outline" onClick={() => void openCopyModal()}>
            Copy from plan
          </Button>
          <Button
            className="ml-auto"
            onClick={() => {
              setModuleForm({ id: null, name: "", focus: "", targetOrder: null });
              setModuleModalOpen(true);
            }}
          >
            + Add module
          </Button>
        </div>

        <div className="flex w-full items-center gap-2 rounded-full border border-border bg-card p-1">
          <Button className="flex-1" variant={activeTab === "modules" ? "default" : "outline"} onClick={() => setActiveTab("modules")}>
            Modules
          </Button>
          <Button className="flex-1" variant={activeTab === "others" ? "default" : "outline"} onClick={() => setActiveTab("others")}>
            Others
          </Button>
        </div>

        {error ? <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {notice ? <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}

        {activeTab === "modules" ? (
          <Card>
            <CardHeader>
              <SectionHeader
                title="Program modules (1-12)"
                description={`Build the ${audienceNoun} program as Module 1 through Module 12. Each module includes module number, module name, and focus.`}
              />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-3">
                {moduleSlots.map((slot) => {
                  const module = slot.module;
                  const slotLockedTiers = lockedTiersByOrder.get(slot.order) ?? [];
                  const parsed = module ? parseModuleTitle(module.title) : { name: "", focus: "" };
                  return (
                    <div key={slot.order} className="rounded-2xl border border-border p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Module {slot.order}</p>
                      <p className="mt-2 text-base font-semibold text-foreground">{module ? parsed.name || module.title : "Not set yet"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Focus: {module ? parsed.focus || "Not set yet" : "Not set yet"}</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {module ? `${module.sessions.length} sessions · ${module.totalDayLength} total days` : "0 sessions · 0 total days"}
                      </p>
                      {slotLockedTiers.filter((t) => t !== currentTierValue).length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {slotLockedTiers.filter((t) => t !== currentTierValue).map((tier) => (
                            <span
                              key={`${slot.order}-${tier}`}
                              className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800"
                            >
                              Locked for {PROGRAM_TIERS.find((item) => item.value === tier)?.label ?? tier}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {module ? (
                          <Link href={`/exercise-library/${encodeURIComponent(audienceLabel)}/modules/${module.id}${fromAdultMode ? "?mode=adult" : ""}`}>
                            <Button size="sm">Open module</Button>
                          </Link>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setModuleForm({
                              id: module?.id ?? null,
                              name: module ? parsed.name || module.title : "",
                              focus: module ? parsed.focus : "",
                              targetOrder: slot.order,
                            });
                            setModuleModalOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        {module ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setLockModalMode("lock");
                              setLockForm({
                                moduleId: module.id,
                                moduleTitle: parsed.name || module.title,
                                programTiers: [],
                              });
                              setLockModalOpen(true);
                            }}
                          >
                            Lock plan
                          </Button>
                        ) : null}
                        {module ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={!slotLockedTiers.length}
                            onClick={() => {
                              setLockModalMode("unlock");
                              setLockForm({
                                moduleId: module.id,
                                moduleTitle: parsed.name || module.title,
                                programTiers: [],
                              });
                              setLockModalOpen(true);
                            }}
                          >
                            Unlock plan
                          </Button>
                        ) : null}
                        {module ? (
                          <Button size="sm" variant="ghost" onClick={() => void deleteModule(module.id)}>
                            Delete
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <SectionHeader
                title="Other Editable Content"
                description={`Manage supporting program content for this ${audienceNoun}.`}
              />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Editable in this Others area</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Link
                    href={`/exercise-library/${encodeURIComponent(audienceLabel)}/others/warmup${fromAdultMode ? "?mode=adult" : ""}`}
                    className="group flex items-center justify-between rounded-xl border border-border bg-background p-3 transition hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">Warm-Up</p>
                      <p className="mt-1 text-xs text-muted-foreground">Open and edit warm-up content.</p>
                    </div>
                    <span className="text-xs font-medium text-primary transition group-hover:translate-x-0.5">Open</span>
                  </Link>
                  <Link
                    href={`/exercise-library/${encodeURIComponent(audienceLabel)}/others/cooldown${fromAdultMode ? "?mode=adult" : ""}`}
                    className="group flex items-center justify-between rounded-xl border border-border bg-background p-3 transition hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">Cool-Down</p>
                      <p className="mt-1 text-xs text-muted-foreground">Open and edit cool-down content.</p>
                    </div>
                    <span className="text-xs font-medium text-primary transition group-hover:translate-x-0.5">Open</span>
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Session content</p>
                <p className="mt-1 text-sm text-foreground">Admins can add any exercise content directly inside each session.</p>
              </div>

              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Directly editable here</p>
                <div className="mt-3 space-y-3">
                  <Link
                    href={`/exercise-library/${encodeURIComponent(audienceLabel)}/others/mobility${fromAdultMode ? "?mode=adult" : ""}`}
                    className="group flex items-center justify-between rounded-xl border border-border bg-background p-3 transition hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">Mobility</p>
                      <p className="mt-1 text-xs text-muted-foreground">Open and edit mobility content.</p>
                    </div>
                    <span className="text-xs font-medium text-primary transition group-hover:translate-x-0.5">Open</span>
                  </Link>
                  <Link
                    href={`/exercise-library/${encodeURIComponent(audienceLabel)}/others/recovery${fromAdultMode ? "?mode=adult" : ""}`}
                    className="group flex items-center justify-between rounded-xl border border-border bg-background p-3 transition hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">Recovery</p>
                      <p className="mt-1 text-xs text-muted-foreground">Open and edit recovery content.</p>
                    </div>
                    <span className="text-xs font-medium text-primary transition group-hover:translate-x-0.5">Open</span>
                  </Link>
                  <Link
                    href={`/exercise-library/${encodeURIComponent(audienceLabel)}/others/inseason${fromAdultMode ? "?mode=adult" : ""}`}
                    className="group flex items-center justify-between rounded-xl border border-border bg-background p-3 transition hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">In-Season Training</p>
                      <p className="mt-1 text-xs text-muted-foreground">Open and edit in-season training content.</p>
                    </div>
                    <span className="text-xs font-medium text-primary transition group-hover:translate-x-0.5">Open</span>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={moduleModalOpen} onOpenChange={setModuleModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{moduleForm.id ? "Edit module" : "Add module"}</DialogTitle>
            <DialogDescription>
              {moduleForm.targetOrder ? `This will save into Module ${moduleForm.targetOrder}.` : `Set module name and module focus for this ${audienceNoun}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Module name</label>
              <Input
                placeholder="e.g. Foundation strength"
                value={moduleForm.name}
                onChange={(event) => setModuleForm((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Focus of the module</label>
              <Input
                placeholder="e.g. Technique and movement control"
                value={moduleForm.focus}
                onChange={(event) => setModuleForm((current) => ({ ...current, focus: event.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModuleModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveModule} disabled={isSaving || !moduleForm.name.trim()}>
                {moduleForm.id ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={lockModalOpen} onOpenChange={setLockModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{lockModalMode === "lock" ? "Lock module for plans/tiers" : "Unlock plans for this module"}</DialogTitle>
            <DialogDescription>
              {lockModalMode === "lock"
                ? "Select plans to lock from this module downward."
                : "Select locked plans to unlock through this module. Lock will continue from the next module."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              {selectableProgramTiers.map((tier) => {
                const checked = lockForm.programTiers.includes(tier.value);
                const startOrder = lockStartOrderByTier.get(tier.value);
                return (
                  <div key={tier.value} className="rounded-xl border border-border px-4 py-3">
                    <label className="flex items-center gap-3">
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
                      <span className="text-sm font-medium text-foreground">
                        {tier.label}
                        {startOrder ? ` · starts at Module ${startOrder}` : " · unlocked"}
                      </span>
                    </label>
                  </div>
                );
              })}
              {!selectableProgramTiers.length ? (
                <p className="text-sm text-muted-foreground">
                  {lockModalMode === "lock"
                    ? "All plans are already locked for this module."
                    : "No plans are locked for this module."}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {lockModalMode === "lock" ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUpdatingLocks || !lockForm.moduleId || !lockForm.programTiers.length || !selectableProgramTiers.length}
                  onClick={() => void saveModuleLocks(lockForm.moduleId, lockForm.programTiers)}
                >
                  Lock from this module
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUpdatingLocks || !lockForm.moduleId || !lockForm.programTiers.length || !selectableProgramTiers.length}
                  onClick={() => void unlockSelectedPlans()}
                >
                  Unlock through this module
                </Button>
              )}
              <Button variant="outline" onClick={() => setLockModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={copyModalOpen} onOpenChange={setCopyModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {copyStep === "plan" && "Copy modules from another plan"}
              {copyStep === "modules" && "Select modules to copy"}
              {copyStep === "sessions" && "Select sessions to copy"}
            </DialogTitle>
            <DialogDescription>
              {copyStep === "plan" && "Choose the source plan to copy from."}
              {copyStep === "modules" && "Pick all modules or select specific ones."}
              {copyStep === "sessions" && "Pick all sessions or select specific ones."}
            </DialogDescription>
          </DialogHeader>

          {copyStep === "plan" && (
            <div className="space-y-3">
              {copySourcePlans.length === 0 ? (
                <p className="text-sm text-muted-foreground">No other plans found.</p>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto">
                  {copySourcePlans.map((plan) => (
                    <button
                      key={plan.label}
                      type="button"
                      className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                        copySelectedPlan === plan.label
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40"
                      }`}
                      onClick={() => setCopySelectedPlan(plan.label)}
                    >
                      <p className="text-sm font-semibold text-foreground">{plan.label}</p>
                      <p className="text-xs text-muted-foreground">{plan.moduleCount} modules · {plan.otherCount} other items</p>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCopyModalOpen(false)}>Cancel</Button>
                <Button
                  disabled={!copySelectedPlan}
                  onClick={async () => {
                    if (!copySelectedPlan) return;
                    await loadCopySourceWorkspace(copySelectedPlan);
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
                      {copySourceModules.map((m) => {
                        const parsed = parseModuleTitle(m.title);
                        return (
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
                              Module {m.order}: {parsed.name || m.title}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCopyStep("plan")}>Back</Button>
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
