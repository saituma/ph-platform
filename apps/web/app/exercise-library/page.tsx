"use client";

import { useMemo, useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { ExerciseDialogs, type ExerciseDialog } from "../../components/admin/exercise-library/exercise-dialogs";
import { ExerciseFilters } from "../../components/admin/exercise-library/exercise-filters";
import { ExerciseTable } from "../../components/admin/exercise-library/exercise-table";
import { ExerciseCards } from "../../components/admin/exercise-library/exercise-cards";

const exercises = [
  {
    name: "Single-leg Hop",
    category: "Power",
    sets: "3",
    reps: "6",
    video: "Uploaded",
  },
  {
    name: "Hip Mobility Flow",
    category: "Recovery",
    sets: "2",
    reps: "8",
    video: "Pending",
  },
  {
    name: "Sprint Start",
    category: "Speed",
    sets: "4",
    reps: "4",
    video: "Uploaded",
  },
];

export default function ExerciseLibraryPage() {
  const isLoading = false;
  const [activeDialog, setActiveDialog] = useState<ExerciseDialog>(null);
  const [selectedExercise, setSelectedExercise] = useState<(typeof exercises)[number] | null>(
    null
  );
  const [activeChip, setActiveChip] = useState<string>("All");
  const chips = ["All", "Power", "Speed", "Recovery", "Pending"];

  const filteredExercises = useMemo(() => {
    if (activeChip === "All") return exercises;
    if (activeChip === "Pending") return exercises.filter((item) => item.video === "Pending");
    return exercises.filter((item) => item.category === activeChip);
  }, [activeChip]);

  return (
    <AdminShell
      title="Exercise Library"
      subtitle="Centralized exercise and video management."
      actions={<Button onClick={() => setActiveDialog("add")}>Add Exercise</Button>}
    >
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <SectionHeader title="Library" description="Reuse exercises across every program." />
          </CardHeader>
          <CardContent className="space-y-4">
            <ExerciseFilters chips={chips} onChipSelect={setActiveChip} />
            <ExerciseTable
              exercises={filteredExercises}
              onSelect={(exercise) => {
                setSelectedExercise(exercise);
                setActiveDialog("edit");
              }}
            />
            <ExerciseCards
              exercises={filteredExercises}
              onSelect={(exercise) => {
                setSelectedExercise(exercise);
                setActiveDialog("edit");
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader
              title="Upload Video"
              description="Add new assets to the library."
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
      />
    </AdminShell>
  );
}
