"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { ExerciseDialogs, type ExerciseDialog } from "../../components/admin/exercise-library/exercise-dialogs";
import { ExerciseFilters } from "../../components/admin/exercise-library/exercise-filters";
import { ExerciseTable } from "../../components/admin/exercise-library/exercise-table";
import { ExerciseCards } from "../../components/admin/exercise-library/exercise-cards";
import type { Exercise } from "../../components/admin/exercise-library/types";

const EXERCISE_API_BASE =
  process.env.NEXT_PUBLIC_EXERCISE_LIBRARY_URL ?? "/api/backend/admin/exercises";

const statusChips = ["Uploaded", "Pending"];

function toNumber(value?: string | number) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function normalizeExercise(item: any): Exercise {
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
  const data = await res.json();
  const items = Array.isArray(data)
    ? data
    : data.exercises ?? data.items ?? data.data ?? data.results ?? [];
  return items.map(normalizeExercise);
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
