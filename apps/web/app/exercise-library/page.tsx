"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";

const API_BASE = "/api/backend/training-content-v2";

const OTHER_TYPES = [
  { value: "mobility", label: "Mobility" },
  { value: "recovery", label: "Recovery" },
  { value: "inseason", label: "In-Season Program" },
  { value: "offseason", label: "Off-Season Program" },
  { value: "education", label: "Education" },
] as const;

const BLOCK_TYPES = [
  { value: "warmup", label: "Warmup" },
  { value: "main", label: "Main session" },
  { value: "cooldown", label: "Cool down" },
] as const;

type Metadata = {
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  restSeconds?: number | null;
  steps?: string | null;
  cues?: string | null;
  progression?: string | null;
  regression?: string | null;
  category?: string | null;
  equipment?: string | null;
};

type SessionItem = {
  id: number;
  sessionId: number;
  blockType: string;
  title: string;
  body: string;
  videoUrl?: string | null;
  allowVideoUpload?: boolean;
  metadata?: Metadata | null;
  order: number;
};

type ModuleSession = {
  id: number;
  moduleId: number;
  title: string;
  dayLength: number;
  order: number;
  items: SessionItem[];
};

type Module = {
  id: number;
  age: number;
  title: string;
  order: number;
  totalDayLength: number;
  sessions: ModuleSession[];
};

type OtherItem = {
  id: number;
  age: number;
  type: string;
  title: string;
  body: string;
  scheduleNote?: string | null;
  videoUrl?: string | null;
  order: number;
};

type WorkspaceResponse = {
  age: number;
  modules: Module[];
  others: Array<{ type: string; label: string; items: OtherItem[] }>;
};

const getCsrfToken = () => {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("csrfToken="))
      ?.split("=")[1] ?? ""
  );
};

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(getCsrfToken() ? { "x-csrf-token": getCsrfToken() } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error ?? "Request failed");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function buildMetadata(input: {
  sets: string;
  reps: string;
  duration: string;
  restSeconds: string;
  steps: string;
  cues: string;
  progression: string;
  regression: string;
  category: string;
  equipment: string;
}) {
  const metadata: Metadata = {};
  if (input.sets.trim()) metadata.sets = Number(input.sets);
  if (input.reps.trim()) metadata.reps = Number(input.reps);
  if (input.duration.trim()) metadata.duration = Number(input.duration);
  if (input.restSeconds.trim()) metadata.restSeconds = Number(input.restSeconds);
  if (input.steps.trim()) metadata.steps = input.steps.trim();
  if (input.cues.trim()) metadata.cues = input.cues.trim();
  if (input.progression.trim()) metadata.progression = input.progression.trim();
  if (input.regression.trim()) metadata.regression = input.regression.trim();
  if (input.category.trim()) metadata.category = input.category.trim();
  if (input.equipment.trim()) metadata.equipment = input.equipment.trim();
  return Object.keys(metadata).length ? metadata : null;
}

export default function ExerciseLibraryPage() {
  const [ageInput, setAgeInput] = useState("8");
  const [selectedAge, setSelectedAge] = useState(8);
  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [mode, setMode] = useState<"modules" | "others">("modules");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [selectedOtherType, setSelectedOtherType] = useState<string>("mobility");

  const [moduleForm, setModuleForm] = useState({ id: null as number | null, title: "", order: "" });
  const [sessionForm, setSessionForm] = useState({ id: null as number | null, title: "", dayLength: "7", order: "" });
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
  const [otherForm, setOtherForm] = useState({
    id: null as number | null,
    title: "",
    body: "",
    scheduleNote: "",
    videoUrl: "",
    order: "",
  });

  const loadWorkspace = async (age = selectedAge) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiRequest<WorkspaceResponse>(`/admin?age=${encodeURIComponent(String(age))}`);
      setWorkspace(data);
      if (!selectedModuleId && data.modules[0]) {
        setSelectedModuleId(data.modules[0].id);
      }
      if (!data.modules.find((item) => item.id === selectedModuleId)) {
        setSelectedModuleId(data.modules[0]?.id ?? null);
      }
      const firstOtherType = data.others.find((group) => group.items.length > 0)?.type ?? "mobility";
      if (!data.others.find((group) => group.type === selectedOtherType)) {
        setSelectedOtherType(firstOtherType);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workspace.");
      setWorkspace(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspace(selectedAge);
  }, [selectedAge]);

  const selectedModule = useMemo(
    () => workspace?.modules.find((module) => module.id === selectedModuleId) ?? workspace?.modules[0] ?? null,
    [workspace, selectedModuleId],
  );
  const selectedSession = useMemo(
    () => selectedModule?.sessions.find((session) => session.id === selectedSessionId) ?? selectedModule?.sessions[0] ?? null,
    [selectedModule, selectedSessionId],
  );
  const selectedOtherGroup = useMemo(
    () => workspace?.others.find((group) => group.type === selectedOtherType) ?? workspace?.others[0] ?? null,
    [workspace, selectedOtherType],
  );

  useEffect(() => {
    if (selectedModule && !selectedModule.sessions.find((session) => session.id === selectedSessionId)) {
      setSelectedSessionId(selectedModule.sessions[0]?.id ?? null);
    }
  }, [selectedModule, selectedSessionId]);

  const resetModuleForm = () => setModuleForm({ id: null, title: "", order: "" });
  const resetSessionForm = () => setSessionForm({ id: null, title: "", dayLength: "7", order: "" });
  const resetItemForm = () =>
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
  const resetOtherForm = () => setOtherForm({ id: null, title: "", body: "", scheduleNote: "", videoUrl: "", order: "" });

  const saveModule = async () => {
    if (!moduleForm.title.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      if (moduleForm.id) {
        await apiRequest(`/modules/${moduleForm.id}`, {
          method: "PUT",
          body: JSON.stringify({
            title: moduleForm.title,
            order: moduleForm.order.trim() ? Number(moduleForm.order) : null,
          }),
        });
      } else {
        await apiRequest("/modules", {
          method: "POST",
          body: JSON.stringify({
            age: selectedAge,
            title: moduleForm.title,
            order: moduleForm.order.trim() ? Number(moduleForm.order) : null,
          }),
        });
      }
      resetModuleForm();
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save module.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveSession = async () => {
    if (!selectedModule || !sessionForm.title.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      if (sessionForm.id) {
        await apiRequest(`/sessions/${sessionForm.id}`, {
          method: "PUT",
          body: JSON.stringify({
            title: sessionForm.title,
            dayLength: Number(sessionForm.dayLength) || 7,
            order: sessionForm.order.trim() ? Number(sessionForm.order) : null,
          }),
        });
      } else {
        await apiRequest("/sessions", {
          method: "POST",
          body: JSON.stringify({
            moduleId: selectedModule.id,
            title: sessionForm.title,
            dayLength: Number(sessionForm.dayLength) || 7,
            order: sessionForm.order.trim() ? Number(sessionForm.order) : null,
          }),
        });
      }
      resetSessionForm();
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save session.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveItem = async () => {
    if (!selectedSession || !itemForm.title.trim() || !itemForm.body.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        sessionId: selectedSession.id,
        blockType: itemForm.blockType,
        title: itemForm.title,
        body: itemForm.body,
        videoUrl: itemForm.videoUrl.trim() || null,
        allowVideoUpload: itemForm.allowVideoUpload,
        order: itemForm.order.trim() ? Number(itemForm.order) : null,
        metadata: buildMetadata(itemForm),
      };
      if (itemForm.id) {
        await apiRequest(`/items/${itemForm.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/items", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      resetItemForm();
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save session item.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveOther = async () => {
    if (!otherForm.title.trim() || !otherForm.body.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        age: selectedAge,
        type: selectedOtherType,
        title: otherForm.title,
        body: otherForm.body,
        scheduleNote: otherForm.scheduleNote.trim() || null,
        videoUrl: otherForm.videoUrl.trim() || null,
        order: otherForm.order.trim() ? Number(otherForm.order) : null,
        metadata: null,
      };
      if (otherForm.id) {
        await apiRequest(`/others/${otherForm.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/others", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      resetOtherForm();
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save other content.");
    } finally {
      setIsSaving(false);
    }
  };

  const deletePath = async (path: string) => {
    const confirmed = window.confirm("Delete this item?");
    if (!confirmed) return;
    setIsSaving(true);
    setError(null);
    try {
      await apiRequest(path, { method: "DELETE" });
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminShell
      title="Training content"
      subtitle="Age-first module builder for mobile Programs."
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 text-sm">
          <p className="font-semibold text-foreground">New training structure</p>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-muted-foreground">
            <li>Pick an age first, then manage either modules or other age-based content.</li>
            <li>Modules contain ordered sessions, and each session must have warmup, main session, and cool down items.</li>
            <li>Mobile now mirrors this structure: a Modules tab plus one tab per other content type that exists for the age.</li>
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="w-28">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Age</label>
            <Input value={ageInput} onChange={(event) => setAgeInput(event.target.value)} placeholder="8" />
          </div>
          <Button
            onClick={() => {
              const next = Number(ageInput);
              if (Number.isFinite(next) && next > 0) setSelectedAge(Math.floor(next));
            }}
          >
            Load age
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button variant={mode === "modules" ? "default" : "outline"} onClick={() => setMode("modules")}>
              Modules
            </Button>
            <Button variant={mode === "others" ? "default" : "outline"} onClick={() => setMode("others")}>
              Others
            </Button>
          </div>
        </div>

        {error ? <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {isLoading ? <div className="text-sm text-muted-foreground">Loading workspace...</div> : null}

        {mode === "modules" ? (
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1fr_1.3fr]">
            <Card>
              <CardHeader>
                <SectionHeader title={`Age ${selectedAge} modules`} description="Ordered chain visible in mobile Modules tab." />
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Module name"
                  value={moduleForm.title}
                  onChange={(event) => setModuleForm((current) => ({ ...current, title: event.target.value }))}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Order"
                    value={moduleForm.order}
                    onChange={(event) => setModuleForm((current) => ({ ...current, order: event.target.value }))}
                  />
                  <Button onClick={saveModule} disabled={isSaving}>
                    {moduleForm.id ? "Update" : "Add module"}
                  </Button>
                </div>
                {moduleForm.id ? (
                  <Button variant="ghost" onClick={resetModuleForm}>
                    Cancel edit
                  </Button>
                ) : null}
                <div className="space-y-2">
                  {workspace?.modules.map((module) => (
                    <div
                      key={module.id}
                      className={`rounded-xl border p-3 ${selectedModule?.id === module.id ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <button type="button" className="w-full text-left" onClick={() => setSelectedModuleId(module.id)}>
                        <p className="font-semibold text-foreground">{module.order}. {module.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {module.sessions.length} sessions · {module.totalDayLength} total days
                        </p>
                      </button>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setModuleForm({ id: module.id, title: module.title, order: String(module.order) })}
                        >
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void deletePath(`/modules/${module.id}`)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!workspace?.modules.length ? <p className="text-sm text-muted-foreground">No modules yet for this age.</p> : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <SectionHeader title={selectedModule ? selectedModule.title : "Sessions"} description="Create the ordered sessions athletes will finish one by one." />
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Session name"
                  value={sessionForm.title}
                  onChange={(event) => setSessionForm((current) => ({ ...current, title: event.target.value }))}
                  disabled={!selectedModule}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Length in days"
                    value={sessionForm.dayLength}
                    onChange={(event) => setSessionForm((current) => ({ ...current, dayLength: event.target.value }))}
                    disabled={!selectedModule}
                  />
                  <Input
                    placeholder="Order"
                    value={sessionForm.order}
                    onChange={(event) => setSessionForm((current) => ({ ...current, order: event.target.value }))}
                    disabled={!selectedModule}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveSession} disabled={!selectedModule || isSaving}>
                    {sessionForm.id ? "Update" : "Add session"}
                  </Button>
                  {sessionForm.id ? (
                    <Button variant="ghost" onClick={resetSessionForm}>
                      Cancel edit
                    </Button>
                  ) : null}
                </div>
                <div className="space-y-2">
                  {selectedModule?.sessions.map((session) => (
                    <div
                      key={session.id}
                      className={`rounded-xl border p-3 ${selectedSession?.id === session.id ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <button type="button" className="w-full text-left" onClick={() => setSelectedSessionId(session.id)}>
                        <p className="font-semibold text-foreground">{session.order}. {session.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {session.dayLength} days · {session.items.length} items
                        </p>
                      </button>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setSessionForm({
                              id: session.id,
                              title: session.title,
                              dayLength: String(session.dayLength),
                              order: String(session.order),
                            })
                          }
                        >
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void deletePath(`/sessions/${session.id}`)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!selectedModule ? <p className="text-sm text-muted-foreground">Pick a module to start adding sessions.</p> : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <SectionHeader
                  title={selectedSession ? `${selectedSession.title} blocks` : "Session blocks"}
                  description="Every session needs warmup, main session, and cool down items."
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={itemForm.blockType}
                    onChange={(event) => setItemForm((current) => ({ ...current, blockType: event.target.value }))}
                    disabled={!selectedSession}
                  >
                    {BLOCK_TYPES.map((block) => (
                      <option key={block.value} value={block.value}>
                        {block.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="Order"
                    value={itemForm.order}
                    onChange={(event) => setItemForm((current) => ({ ...current, order: event.target.value }))}
                    disabled={!selectedSession}
                  />
                </div>
                <Input
                  placeholder="Exercise or item title"
                  value={itemForm.title}
                  onChange={(event) => setItemForm((current) => ({ ...current, title: event.target.value }))}
                  disabled={!selectedSession}
                />
                <Textarea
                  placeholder="Instructions or coaching notes"
                  value={itemForm.body}
                  onChange={(event) => setItemForm((current) => ({ ...current, body: event.target.value }))}
                  disabled={!selectedSession}
                />
                <div className="grid gap-2 sm:grid-cols-4">
                  <Input placeholder="Sets" value={itemForm.sets} onChange={(event) => setItemForm((current) => ({ ...current, sets: event.target.value }))} disabled={!selectedSession} />
                  <Input placeholder="Reps" value={itemForm.reps} onChange={(event) => setItemForm((current) => ({ ...current, reps: event.target.value }))} disabled={!selectedSession} />
                  <Input placeholder="Duration sec" value={itemForm.duration} onChange={(event) => setItemForm((current) => ({ ...current, duration: event.target.value }))} disabled={!selectedSession} />
                  <Input placeholder="Rest sec" value={itemForm.restSeconds} onChange={(event) => setItemForm((current) => ({ ...current, restSeconds: event.target.value }))} disabled={!selectedSession} />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input placeholder="Category" value={itemForm.category} onChange={(event) => setItemForm((current) => ({ ...current, category: event.target.value }))} disabled={!selectedSession} />
                  <Input placeholder="Equipment" value={itemForm.equipment} onChange={(event) => setItemForm((current) => ({ ...current, equipment: event.target.value }))} disabled={!selectedSession} />
                </div>
                <Textarea placeholder="Coaching cues" value={itemForm.cues} onChange={(event) => setItemForm((current) => ({ ...current, cues: event.target.value }))} disabled={!selectedSession} />
                <Textarea placeholder="Steps" value={itemForm.steps} onChange={(event) => setItemForm((current) => ({ ...current, steps: event.target.value }))} disabled={!selectedSession} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input placeholder="Progression" value={itemForm.progression} onChange={(event) => setItemForm((current) => ({ ...current, progression: event.target.value }))} disabled={!selectedSession} />
                  <Input placeholder="Regression" value={itemForm.regression} onChange={(event) => setItemForm((current) => ({ ...current, regression: event.target.value }))} disabled={!selectedSession} />
                </div>
                <Input placeholder="Video URL" value={itemForm.videoUrl} onChange={(event) => setItemForm((current) => ({ ...current, videoUrl: event.target.value }))} disabled={!selectedSession} />
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={itemForm.allowVideoUpload}
                    onChange={(event) => setItemForm((current) => ({ ...current, allowVideoUpload: event.target.checked }))}
                    disabled={!selectedSession}
                  />
                  Allow athlete video upload on this item
                </label>
                <div className="flex gap-2">
                  <Button onClick={saveItem} disabled={!selectedSession || isSaving}>
                    {itemForm.id ? "Update item" : "Add item"}
                  </Button>
                  {itemForm.id ? (
                    <Button variant="ghost" onClick={resetItemForm}>
                      Cancel edit
                    </Button>
                  ) : null}
                </div>

                <div className="space-y-4">
                  {BLOCK_TYPES.map((block) => {
                    const items = selectedSession?.items.filter((item) => item.blockType === block.value) ?? [];
                    return (
                      <div key={block.value} className="rounded-xl border border-border p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{block.label}</p>
                        <div className="mt-3 space-y-2">
                          {items.map((item) => (
                            <div key={item.id} className="rounded-lg border border-border bg-secondary/20 p-3">
                              <p className="font-medium text-foreground">{item.order}. {item.title}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{item.body}</p>
                              <div className="mt-2 flex gap-2">
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
                                <Button size="sm" variant="ghost" onClick={() => void deletePath(`/items/${item.id}`)}>
                                  Delete
                                </Button>
                              </div>
                            </div>
                          ))}
                          {!items.length ? <p className="text-sm text-muted-foreground">No items yet.</p> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <Card>
              <CardHeader>
                <SectionHeader title={`Age ${selectedAge} others`} description="Standalone age-based tabs outside module progression." />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {OTHER_TYPES.map((type) => (
                    <Button
                      key={type.value}
                      variant={selectedOtherType === type.value ? "default" : "outline"}
                      onClick={() => {
                        setSelectedOtherType(type.value);
                        resetOtherForm();
                      }}
                    >
                      {type.label}
                    </Button>
                  ))}
                </div>
                <div className="space-y-2">
                  {(selectedOtherGroup?.items ?? []).map((item) => (
                    <div key={item.id} className="rounded-xl border border-border p-3">
                      <p className="font-semibold text-foreground">{item.order}. {item.title}</p>
                      {item.scheduleNote ? <p className="mt-1 text-xs text-primary">{item.scheduleNote}</p> : null}
                      <p className="mt-1 text-xs text-muted-foreground">{item.body}</p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setOtherForm({
                              id: item.id,
                              title: item.title,
                              body: item.body,
                              scheduleNote: item.scheduleNote ?? "",
                              videoUrl: item.videoUrl ?? "",
                              order: String(item.order),
                            })
                          }
                        >
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void deletePath(`/others/${item.id}`)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!selectedOtherGroup?.items.length ? <p className="text-sm text-muted-foreground">No content yet in this section.</p> : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <SectionHeader title={OTHER_TYPES.find((item) => item.value === selectedOtherType)?.label ?? "Other content"} description="Creates a standalone Programs tab for this age if items exist." />
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Title" value={otherForm.title} onChange={(event) => setOtherForm((current) => ({ ...current, title: event.target.value }))} />
                <Textarea placeholder="Content body" value={otherForm.body} onChange={(event) => setOtherForm((current) => ({ ...current, body: event.target.value }))} />
                <Input placeholder="Weekly schedule note (use for In-Season timing)" value={otherForm.scheduleNote} onChange={(event) => setOtherForm((current) => ({ ...current, scheduleNote: event.target.value }))} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input placeholder="Video URL" value={otherForm.videoUrl} onChange={(event) => setOtherForm((current) => ({ ...current, videoUrl: event.target.value }))} />
                  <Input placeholder="Order" value={otherForm.order} onChange={(event) => setOtherForm((current) => ({ ...current, order: event.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveOther} disabled={isSaving}>
                    {otherForm.id ? "Update content" : "Add content"}
                  </Button>
                  {otherForm.id ? (
                    <Button variant="ghost" onClick={resetOtherForm}>
                      Cancel edit
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
