"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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
  normalizeAudienceLabelInput,
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
  const audienceLabel = useMemo(
    () => normalizeAudienceLabelInput(decodeURIComponent(String(params.audienceLabel ?? "All"))),
    [params.audienceLabel],
  );

  const [workspace, setWorkspace] = useState<AudienceWorkspace | null>(null);
  const [activeTab, setActiveTab] = useState<"modules" | "others">("modules");
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [moduleForm, setModuleForm] = useState<ModuleForm>({
    id: null,
    name: "",
    focus: "",
    targetOrder: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadWorkspace = async () => {
    try {
      setError(null);
      const data = await trainingContentRequest<AudienceWorkspace>(`/admin?audienceLabel=${encodeURIComponent(audienceLabel)}`);
      setWorkspace(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load age workspace.");
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, [audienceLabel]);

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
            audienceLabel,
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
      await trainingContentRequest(`/modules/${moduleId}`, { method: "DELETE" });
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete module.");
    } finally {
      setIsSaving(false);
    }
  };

  const modules = workspace?.modules ?? [];
  const moduleByOrder = new Map(modules.map((module) => [module.order, module]));
  const moduleSlots = Array.from({ length: 12 }, (_, index) => {
    const order = index + 1;
    return {
      order,
      module: moduleByOrder.get(order) ?? null,
    };
  });

  return (
    <AdminShell title="Exercise library" subtitle={`Age ${audienceLabel}`}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/exercise-library">
            <Button variant="outline">Back to age groups</Button>
          </Link>
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

        {activeTab === "modules" ? (
          <Card>
            <CardHeader>
              <SectionHeader
                title="Program modules (1-12)"
                description="Build the age program as Module 1 through Module 12. Each module includes module number, module name, and focus."
              />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                {moduleSlots.map((slot) => {
                  const module = slot.module;
                  const parsed = module ? parseModuleTitle(module.title) : { name: "", focus: "" };
                  return (
                    <div key={slot.order} className="rounded-2xl border border-border p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Module {slot.order}</p>
                      <p className="mt-2 text-base font-semibold text-foreground">{module ? parsed.name || module.title : "Not set yet"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Focus: {module ? parsed.focus || "Not set yet" : "Not set yet"}</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {module ? `${module.sessions.length} sessions · ${module.totalDayLength} total days` : "0 sessions · 0 total days"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {module ? (
                          <Link href={`/exercise-library/${encodeURIComponent(audienceLabel)}/modules/${module.id}`}>
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
              <SectionHeader title="Other editable content" description="Admin can manage these program areas for this age." />
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-border p-4">
                <p className="text-sm font-semibold text-foreground">Warm-Up</p>
                <p className="mt-1 text-sm text-muted-foreground">Managed inside each session detail.</p>
              </div>
              <div className="rounded-2xl border border-border p-4">
                <p className="text-sm font-semibold text-foreground">Session A</p>
                <p className="mt-1 text-sm text-muted-foreground">Managed inside each session detail.</p>
              </div>
              <div className="rounded-2xl border border-border p-4">
                <p className="text-sm font-semibold text-foreground">Session B</p>
                <p className="mt-1 text-sm text-muted-foreground">Managed inside each session detail.</p>
              </div>
              <div className="rounded-2xl border border-border p-4">
                <p className="text-sm font-semibold text-foreground">Session C</p>
                <p className="mt-1 text-sm text-muted-foreground">Managed inside each session detail.</p>
              </div>
              <Link
                href={`/exercise-library/${encodeURIComponent(audienceLabel)}/others/mobility`}
                className="rounded-2xl border border-border p-4 transition hover:border-primary/40 hover:bg-primary/5"
              >
                <p className="text-sm font-semibold text-foreground">Mobility</p>
                <p className="mt-1 text-sm text-muted-foreground">Open and edit mobility content.</p>
              </Link>
              <Link
                href={`/exercise-library/${encodeURIComponent(audienceLabel)}/others/recovery`}
                className="rounded-2xl border border-border p-4 transition hover:border-primary/40 hover:bg-primary/5"
              >
                <p className="text-sm font-semibold text-foreground">Recovery</p>
                <p className="mt-1 text-sm text-muted-foreground">Open and edit recovery content.</p>
              </Link>
              <div className="rounded-2xl border border-border p-4 sm:col-span-2 xl:col-span-1">
                <p className="text-sm font-semibold text-foreground">Cool-Down</p>
                <p className="mt-1 text-sm text-muted-foreground">Managed inside each session detail.</p>
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
              {moduleForm.targetOrder ? `This will save into Module ${moduleForm.targetOrder}.` : "Set module name and module focus for this age."}
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
    </AdminShell>
  );
}
