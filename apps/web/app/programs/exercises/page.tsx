"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Dumbbell, Pencil, Plus, Search, Upload, Video } from "lucide-react";

import { AdminShell } from "../../../components/admin/shell";
import { SectionHeader } from "../../../components/admin/section-header";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import {
  ExerciseDialogs,
  type ExerciseDialog,
} from "../../../components/admin/exercise-library/exercise-dialogs";
import { BulkImportDialog } from "../../../components/admin/exercise-library/bulk-import-dialog";
import type { Exercise } from "../../../components/admin/exercise-library/types";
import {
  useGetExercisesQuery,
  useCreateExerciseMutation,
  useUpdateExerciseMutation,
  useDeleteExerciseMutation,
} from "../../../lib/apiSlice";
import { toast } from "@/lib/toast";

const CATEGORIES = [
  "Power",
  "Speed",
  "Strength",
  "Conditioning",
  "Agility",
  "Plyometrics",
  "Mobility",
  "Flexibility",
  "Warmup",
  "Cooldown",
  "Recovery",
  "Core",
  "Balance",
  "Endurance",
  "Sport-Specific",
];

export default function ExercisesPage() {
  const { data, isLoading } = useGetExercisesQuery();
  const [createExercise, { isLoading: isCreating }] = useCreateExerciseMutation();
  const [updateExercise, { isLoading: isUpdating }] = useUpdateExerciseMutation();
  const [deleteExercise, { isLoading: isDeleting }] = useDeleteExerciseMutation();

  const [dialog, setDialog] = useState<ExerciseDialog>(null);
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [sort, setSort] = useState<"newest" | "usage" | "name">("newest");

  const exercises: Exercise[] = data?.exercises ?? [];

  const filtered = useMemo(() => {
    const base = exercises.filter((ex) => {
      const matchesSearch =
        !search || ex.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !categoryFilter || ex.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
    if (sort === "usage") {
      return [...base].sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0));
    }
    if (sort === "name") {
      return [...base].sort((a, b) => a.name.localeCompare(b.name));
    }
    return base; // newest — already sorted by createdAt desc from API
  }, [exercises, search, categoryFilter, sort]);

  const handleCreate = async (payload: Exercise) => {
    try {
      await createExercise({
        name: payload.name,
        category: payload.category || undefined,
        cues: payload.cues || undefined,
        howTo: payload.howTo || undefined,
        progression: payload.progression || undefined,
        regression: payload.regression || undefined,
        sets: payload.sets ? Number(payload.sets) : undefined,
        reps: payload.reps ? Number(payload.reps) : undefined,
        duration: payload.time ? Number(payload.time) : undefined,
        restSeconds: payload.rest ? Number(payload.rest) : undefined,
        notes: payload.notes || undefined,
        videoUrl: payload.videoUrl || undefined,
      }).unwrap();
      setDialog(null);
      toast.success("Exercise added to library");
    } catch {
      toast.error("Failed to create exercise");
    }
  };

  const handleUpdate = async (id: number | string, payload: Exercise) => {
    try {
      await updateExercise({
        exerciseId: Number(id),
        patch: {
          name: payload.name,
          category: payload.category || null,
          cues: payload.cues || undefined,
          howTo: payload.howTo || null,
          progression: payload.progression || null,
          regression: payload.regression || null,
          sets: payload.sets ? Number(payload.sets) : null,
          reps: payload.reps ? Number(payload.reps) : null,
          duration: payload.time ? Number(payload.time) : null,
          restSeconds: payload.rest ? Number(payload.rest) : null,
          notes: payload.notes || null,
          videoUrl: payload.videoUrl || null,
        },
      }).unwrap();
      setDialog(null);
      setSelected(null);
      toast.success("Exercise updated");
    } catch {
      toast.error("Failed to update exercise");
    }
  };

  const handleDelete = async (id: number | string) => {
    if (
      !window.confirm(
        "Delete this exercise? It will be removed from any sessions using it.",
      )
    )
      return;
    try {
      await deleteExercise({ exerciseId: Number(id) }).unwrap();
      setDialog(null);
      setSelected(null);
      toast.success("Exercise deleted");
    } catch {
      toast.error("Failed to delete exercise");
    }
  };

  const openEdit = (ex: Exercise) => {
    setSelected(ex);
    setDialog("edit");
  };

  const openAdd = () => {
    setSelected(null);
    setDialog("add");
  };

  return (
    <AdminShell
      title="Exercise Library"
      subtitle="Upload exercises once. Reuse them across any programme session."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setBulkImportOpen(true)}>
            <Upload className="mr-1 h-4 w-4" /> Import CSV
          </Button>
          <Button onClick={openAdd}>
            <Plus className="mr-1 h-4 w-4" /> Add Exercise
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Search + sort */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search exercises by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            {(["newest", "usage", "name"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSort(s)}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  sort === s
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "newest" && "Latest"}
                {s === "usage" && (
                  <><ArrowUpDown className="h-3 w-3" /> Most used</>
                )}
                {s === "name" && "A–Z"}
              </button>
            ))}
          </div>
        </div>

        {/* Category filter pills */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              !categoryFilter
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() =>
                setCategoryFilter(categoryFilter === cat ? null : cat)
              }
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                categoryFilter === cat
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <SectionHeader
          title={`${filtered.length} exercise${filtered.length !== 1 ? "s" : ""}${categoryFilter ? ` · ${categoryFilter}` : ""}${search ? ` matching "${search}"` : ""}`}
          description="Click any card to edit. Changes apply everywhere the exercise is used."
        />

        {/* Grid */}
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-56 animate-pulse rounded-2xl bg-secondary/40"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Dumbbell className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-semibold text-foreground">No exercises yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {search || categoryFilter
                ? "No exercises match your current filter."
                : "Start building your library by uploading your first exercise."}
            </p>
            {!search && !categoryFilter && (
              <Button className="mt-4" onClick={openAdd}>
                <Plus className="mr-1 h-4 w-4" /> Add First Exercise
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((ex) => (
              <button
                key={ex.id}
                type="button"
                className="group rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
                onClick={() => openEdit(ex)}
              >
                {ex.videoUrl ? (
                  <div className="relative mb-3 aspect-video overflow-hidden rounded-xl border border-border bg-secondary/40">
                    <video
                      className="h-full w-full object-cover"
                      src={ex.videoUrl}
                      muted
                      preload="metadata"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Video className="h-6 w-6 text-white/80" />
                    </div>
                  </div>
                ) : (
                  <div className="mb-3 flex aspect-video items-center justify-center rounded-xl border border-dashed border-border bg-secondary/40">
                    <Video className="h-6 w-6 text-muted-foreground/30" />
                  </div>
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">
                      {ex.name}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {ex.category && (
                        <Badge variant="secondary" className="text-[10px]">
                          {ex.category}
                        </Badge>
                      )}
                      {ex.sets && (
                        <span className="text-[11px] text-muted-foreground">
                          {ex.sets} sets
                        </span>
                      )}
                      {ex.reps && (
                        <span className="text-[11px] text-muted-foreground">
                          {ex.reps} reps
                        </span>
                      )}
                      {ex.time && (
                        <span className="text-[11px] text-muted-foreground">
                          {ex.time}s
                        </span>
                      )}
                    </div>
                    {ex.cues && (
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                        {ex.cues}
                      </p>
                    )}
                    {typeof ex.usageCount === "number" && (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Used in{" "}
                        <span className="font-semibold text-foreground">
                          {ex.usageCount}
                        </span>{" "}
                        {ex.usageCount === 1 ? "session" : "sessions"}
                      </p>
                    )}
                  </div>
                  <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <ExerciseDialogs
        active={dialog}
        onClose={() => {
          setDialog(null);
          setSelected(null);
        }}
        selectedExercise={selected}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        saving={isCreating || isUpdating}
        deleting={isDeleting}
      />

      <BulkImportDialog
        open={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
      />
    </AdminShell>
  );
}
