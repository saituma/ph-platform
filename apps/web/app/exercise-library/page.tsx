"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { ExerciseDialogs, type ExerciseDialog } from "../../components/admin/exercise-library/exercise-dialogs";
import { ExerciseFilters } from "../../components/admin/exercise-library/exercise-filters";
import { ExerciseTable } from "../../components/admin/exercise-library/exercise-table";
import { ExerciseCards } from "../../components/admin/exercise-library/exercise-cards";
import type { Exercise } from "../../components/admin/exercise-library/types";

const EXERCISE_API_BASE =
  process.env.NEXT_PUBLIC_EXERCISE_LIBRARY_URL ?? "/api/backend/admin/exercises";
const ADMIN_API_BASE = "/api/backend/admin";
const PROGRAMS_API_BASE = "/api/backend/programs";

const statusChips = ["Uploaded", "Pending"];
const PROGRAM_TYPES = ["PHP", "PHP_Plus", "PHP_Premium"] as const;
const SESSION_TYPES = [
  { value: "program", label: "Session Program" },
  { value: "warmup", label: "Warmups" },
  { value: "cooldown", label: "Cool Downs" },
  { value: "stretching", label: "Stretching & Foam Rolling" },
  { value: "mobility", label: "Mobility" },
  { value: "recovery", label: "Recovery" },
  { value: "offseason", label: "Off Session Program" },
  { value: "inseason", label: "In Session Program" },
  { value: "education", label: "Education" },
  { value: "nutrition", label: "Nutrition & Food Diaries" },
] as const;

function toNumber(value?: string | number) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function normalizeExercise(item: Record<string, unknown>): Exercise {
  const rawVideo = item.videoUrl ?? item.video ?? item.videoURL ?? "";
  const videoStatus =
    item.videoStatus ??
    (typeof item.video === "string" && (item.video === "Uploaded" || item.video === "Pending")
      ? item.video
      : rawVideo
      ? "Uploaded"
      : "Pending");

  return {
    id: item.id ?? item._id ?? item.exerciseId ?? item.name,
    name: item.name ?? item.title ?? "Untitled Exercise",
    category: item.category ?? item.type ?? "",
    sets: item.sets ?? item.setsCount ?? "",
    reps: item.reps ?? item.repsCount ?? "",
    time: item.time ?? item.duration ?? item.durationSeconds ?? "",
    rest: item.rest ?? item.restSeconds ?? "",
    videoUrl: typeof rawVideo === "string" ? rawVideo : "",
    videoStatus,
    notes: item.notes ?? item.coachingNotes ?? "",
    cues: item.cues ?? "",
    howTo: item.howTo ?? "",
    progression: item.progression ?? item.progressions ?? "",
    regression: item.regression ?? item.regressions ?? "",
  };
}

async function fetchExercises(): Promise<Exercise[]> {
  const res = await fetch(EXERCISE_API_BASE, { credentials: "include" });
  if (!res.ok) {
    throw new Error("Failed to load exercise library.");
  }
  const data = (await res.json()) as Record<string, unknown>;
  const items = Array.isArray(data)
    ? data
    : (data.exercises as unknown[]) ??
      (data.items as unknown[]) ??
      (data.data as unknown[]) ??
      (data.results as unknown[]) ??
      [];
  return items.map((item) => normalizeExercise(item as Record<string, unknown>));
}

async function createExercise(payload: Exercise): Promise<Exercise> {
  const res = await fetch(EXERCISE_API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error("Failed to create exercise.");
  }
  const data = await res.json();
  return normalizeExercise(data.exercise ?? data.item ?? data);
}

async function updateExercise(id: number | string, payload: Exercise): Promise<Exercise> {
  const target = `${EXERCISE_API_BASE}/${id}`;
  const res = await fetch(target, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error("Failed to update exercise.");
  }
  const data = await res.json();
  return normalizeExercise(data.exercise ?? data.item ?? data);
}

async function deleteExercise(id: number | string): Promise<void> {
  const target = `${EXERCISE_API_BASE}/${id}`;
  const res = await fetch(target, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to delete exercise.");
  }
}

function buildProgramName(type: (typeof PROGRAM_TYPES)[number]) {
  if (type === "PHP") return "PHP Program";
  if (type === "PHP_Plus") return "PHP Plus";
  return "PHP Premium";
}

async function fetchProgramCards(): Promise<Array<{ type: string; programId?: number | null }>> {
  const res = await fetch(PROGRAMS_API_BASE, { credentials: "include" });
  if (!res.ok) {
    throw new Error("Failed to load programs.");
  }
  const data = await res.json();
  return data.programs ?? [];
}

async function createProgram(type: (typeof PROGRAM_TYPES)[number]) {
  const res = await fetch(`${ADMIN_API_BASE}/programs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      name: buildProgramName(type),
      type,
      description: `${buildProgramName(type)} template`,
    }),
  });
  if (!res.ok) {
    throw new Error("Failed to create program template.");
  }
  const data = await res.json();
  return Number(data?.program?.id);
}

async function fetchSessions(programId: number): Promise<Array<Record<string, unknown>>> {
  const res = await fetch(`${PROGRAMS_API_BASE}/${programId}/sessions`, { credentials: "include" });
  if (!res.ok) {
    throw new Error("Failed to load sessions.");
  }
  const data = (await res.json()) as { sessions?: Array<Record<string, unknown>> };
  return data.sessions ?? [];
}

async function createSession(input: {
  programId: number;
  weekNumber: number;
  sessionNumber: number;
  type: string;
}) {
  const res = await fetch(`${ADMIN_API_BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error("Failed to create session.");
  }
  const data = await res.json();
  return Number(data?.session?.id);
}

async function addSessionExercise(input: {
  sessionId: number;
  exerciseId: number;
  order: number;
  coachingNotes?: string;
  progressionNotes?: string;
  regressionNotes?: string;
}) {
  const res = await fetch(`${ADMIN_API_BASE}/session-exercises`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error("Failed to assign exercise to session.");
  }
}

export default function ExerciseLibraryPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeDialog, setActiveDialog] = useState<ExerciseDialog>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [status, setStatus] = useState("All status");
  const [assignExerciseId, setAssignExerciseId] = useState<string>("");
  const [assignProgramType, setAssignProgramType] = useState<(typeof PROGRAM_TYPES)[number]>("PHP");
  const [assignSessionType, setAssignSessionType] = useState<string>("warmup");
  const [assignWeek, setAssignWeek] = useState("1");
  const [assignSessionNumber, setAssignSessionNumber] = useState("1");
  const [assignOrder, setAssignOrder] = useState("1");
  const [assignCoachingNotes, setAssignCoachingNotes] = useState("");
  const [assignProgressionNotes, setAssignProgressionNotes] = useState("");
  const [assignRegressionNotes, setAssignRegressionNotes] = useState("");
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignMessage, setAssignMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetchExercises()
      .then((items) => {
        if (!active) return;
        setExercises(items);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load exercise library.");
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!assignExerciseId) {
      setAssignCoachingNotes("");
      setAssignProgressionNotes("");
      setAssignRegressionNotes("");
      return;
    }
    const selected = exercises.find((item) => String(item.id) === assignExerciseId);
    setAssignCoachingNotes(String(selected?.notes || selected?.cues || ""));
    setAssignProgressionNotes(String(selected?.progression || ""));
    setAssignRegressionNotes(String(selected?.regression || ""));
  }, [assignExerciseId, exercises]);

  const categories = useMemo(() => {
    const unique = new Set<string>();
    exercises.forEach((exercise) => {
      if (exercise.category) unique.add(exercise.category);
    });
    return ["All", ...Array.from(unique)];
  }, [exercises]);

  const chips = useMemo(() => {
    return ["All", ...categories.filter((item) => item !== "All"), ...statusChips];
  }, [categories]);

  const handleChipSelect = (chip: string) => {
    if (chip === "All") {
      setCategory("All categories");
      setStatus("All status");
      return;
    }
    if (statusChips.includes(chip)) {
      setStatus(chip);
      return;
    }
    setCategory(chip);
  };

  const filteredExercises = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return exercises.filter((exercise) => {
      if (normalizedSearch) {
        const haystack = [
          exercise.name,
          exercise.category,
          exercise.notes,
          exercise.cues,
          exercise.howTo,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(normalizedSearch)) return false;
      }
      if (category !== "All categories" && category !== "All") {
        if (exercise.category !== category) return false;
      }
      if (status !== "All status") {
        if ((exercise.videoStatus ?? "Pending") !== status) return false;
      }
      return true;
    });
  }, [exercises, search, category, status]);

  const handleCreate = async (payload: Exercise) => {
    setIsSaving(true);
    setError(null);
    try {
      const requestPayload = {
        ...payload,
        sets: toNumber(payload.sets),
        reps: toNumber(payload.reps),
        duration: toNumber(payload.time),
        time: toNumber(payload.time),
        restSeconds: toNumber(payload.rest),
        rest: toNumber(payload.rest),
        videoUrl: payload.videoUrl || undefined,
        cues: payload.cues || undefined,
        notes: payload.notes || undefined,
        howTo: payload.howTo || undefined,
        progression: payload.progression || undefined,
        regression: payload.regression || undefined,
      };
      const created = await createExercise(requestPayload);
      setExercises((prev) => [created, ...prev]);
      setActiveDialog(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create exercise.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (id: number | string, payload: Exercise) => {
    setIsSaving(true);
    setError(null);
    try {
      const requestPayload = {
        ...payload,
        sets: toNumber(payload.sets),
        reps: toNumber(payload.reps),
        duration: toNumber(payload.time),
        time: toNumber(payload.time),
        restSeconds: toNumber(payload.rest),
        rest: toNumber(payload.rest),
        videoUrl: payload.videoUrl || undefined,
        cues: payload.cues || undefined,
        notes: payload.notes || undefined,
        howTo: payload.howTo || undefined,
        progression: payload.progression || undefined,
        regression: payload.regression || undefined,
      };
      const updated = await updateExercise(id, requestPayload);
      setExercises((prev) =>
        prev.map((exercise) =>
          String(exercise.id) === String(id) ? updated : exercise
        )
      );
      setActiveDialog(null);
      setSelectedExercise(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update exercise.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number | string) => {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteExercise(id);
      setExercises((prev) =>
        prev.filter((exercise) => String(exercise.id) !== String(id))
      );
      setActiveDialog(null);
      setSelectedExercise(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete exercise.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAssign = async () => {
    const exerciseId = Number(assignExerciseId);
    const weekNumber = Number(assignWeek);
    const sessionNumber = Number(assignSessionNumber);
    const order = Number(assignOrder);
    if (!exerciseId || !weekNumber || !sessionNumber || !order) {
      setAssignMessage("Choose exercise and enter valid week/session/order numbers.");
      return;
    }
    const selected = exercises.find((item) => Number(item.id) === exerciseId);
    if (!selected) {
      setAssignMessage("Selected exercise was not found.");
      return;
    }

    setAssignSaving(true);
    setAssignMessage(null);
    try {
      const cards = await fetchProgramCards();
      let programId = Number(cards.find((card) => card.type === assignProgramType)?.programId ?? 0);
      if (!programId) {
        programId = await createProgram(assignProgramType);
      }
      if (!programId) {
        throw new Error("Unable to resolve program template.");
      }

      const sessions = await fetchSessions(programId);
      let sessionId = Number(
        sessions.find(
          (session) =>
            Number(session.weekNumber) === weekNumber &&
            Number(session.sessionNumber) === sessionNumber &&
            String(session.type) === assignSessionType
        )?.id ?? 0
      );
      if (!sessionId) {
        sessionId = await createSession({
          programId,
          weekNumber,
          sessionNumber,
          type: assignSessionType,
        });
      }
      if (!sessionId) {
        throw new Error("Unable to create/find session.");
      }

      await addSessionExercise({
        sessionId,
        exerciseId,
        order,
        coachingNotes: assignCoachingNotes.trim() || selected.notes || selected.cues || undefined,
        progressionNotes: assignProgressionNotes.trim() || selected.progression || undefined,
        regressionNotes: assignRegressionNotes.trim() || selected.regression || undefined,
      });

      setAssignMessage("Exercise assigned successfully. It will now appear in mobile program tabs.");
    } catch (err) {
      setAssignMessage(err instanceof Error ? err.message : "Failed to assign exercise.");
    } finally {
      setAssignSaving(false);
    }
  };

  return (
    <AdminShell
      title="Exercise Library"
      subtitle="Centralized exercise and video management."
    >
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <SectionHeader title="Library" description="Reuse exercises across every program." />
          </CardHeader>
          <CardContent className="space-y-4">
            <ExerciseFilters
              chips={chips}
              onChipSelect={handleChipSelect}
              search={search}
              onSearchChange={setSearch}
              category={category}
              onCategoryChange={setCategory}
              status={status}
              onStatusChange={setStatus}
            />
            {error ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}
            {isLoading ? (
              <div className="rounded-2xl border border-border bg-secondary/30 p-6 text-sm text-muted-foreground">
                Loading exercise library...
              </div>
            ) : null}
            <ExerciseTable
              exercises={filteredExercises}
              onSelect={(exercise) => {
                setSelectedExercise(exercise);
                setActiveDialog("edit");
              }}
              onDelete={(exercise) => {
                if (!exercise.id) return;
                const confirmed = window.confirm("Delete this exercise from the library?");
                if (!confirmed) return;
                handleDelete(exercise.id);
              }}
            />
            <ExerciseCards
              exercises={filteredExercises}
              onSelect={(exercise) => {
                setSelectedExercise(exercise);
                setActiveDialog("edit");
              }}
              onDelete={(exercise) => {
                if (!exercise.id) return;
                const confirmed = window.confirm("Delete this exercise from the library?");
                if (!confirmed) return;
                handleDelete(exercise.id);
              }}
            />
          </CardContent>
        </Card>

          <Card>
            <CardHeader>
              <SectionHeader
                title="Upload Video"
                description="Upload exercise videos only."
              />
            </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" onClick={() => setActiveDialog("add")}>
              Open Upload Form
            </Button>
            <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm">
              <p className="font-semibold text-foreground">Upload Tips</p>
              <p className="text-xs text-muted-foreground">
                Add clear cues, sets, reps, and a short video clip.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-3">
              <SectionHeader
                title="Assign To Program Section"
                description="Configure Warmups, Cool Downs, Mobility, Recovery, In/Off Session Programs, and more."
              />
              <Select
                value={assignExerciseId}
                onChange={(event) => setAssignExerciseId(event.target.value)}
              >
                <option value="">Select exercise</option>
                {exercises.map((exercise) => (
                  <option key={String(exercise.id)} value={String(exercise.id)}>
                    {exercise.name}
                  </option>
                ))}
              </Select>
              <Select
                value={assignProgramType}
                onChange={(event) => setAssignProgramType(event.target.value as (typeof PROGRAM_TYPES)[number])}
              >
                {PROGRAM_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
              <Select
                value={assignSessionType}
                onChange={(event) => setAssignSessionType(event.target.value)}
              >
                {SESSION_TYPES.map((sessionType) => (
                  <option key={sessionType.value} value={sessionType.value}>
                    {sessionType.label}
                  </option>
                ))}
              </Select>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  min={1}
                  placeholder="Week"
                  value={assignWeek}
                  onChange={(event) => setAssignWeek(event.target.value)}
                />
                <Input
                  type="number"
                  min={1}
                  placeholder="Session #"
                  value={assignSessionNumber}
                  onChange={(event) => setAssignSessionNumber(event.target.value)}
                />
                <Input
                  type="number"
                  min={1}
                  placeholder="Order"
                  value={assignOrder}
                  onChange={(event) => setAssignOrder(event.target.value)}
                />
              </div>
              <Textarea
                className="min-h-[84px]"
                placeholder="Coaching Notes for this session exercise"
                value={assignCoachingNotes}
                onChange={(event) => setAssignCoachingNotes(event.target.value)}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <Textarea
                  className="min-h-[84px]"
                  placeholder="Progression Notes"
                  value={assignProgressionNotes}
                  onChange={(event) => setAssignProgressionNotes(event.target.value)}
                />
                <Textarea
                  className="min-h-[84px]"
                  placeholder="Regression Notes"
                  value={assignRegressionNotes}
                  onChange={(event) => setAssignRegressionNotes(event.target.value)}
                />
              </div>
              {assignMessage ? (
                <div className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                  {assignMessage}
                </div>
              ) : null}
              <Button onClick={handleAssign} disabled={assignSaving}>
                {assignSaving ? "Assigning..." : "Assign Exercise"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <ExerciseDialogs
        active={activeDialog}
        onClose={() => setActiveDialog(null)}
        selectedExercise={selectedExercise}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        saving={isSaving}
        deleting={isDeleting}
      />
    </AdminShell>
  );
}
