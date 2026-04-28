import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import type { Exercise } from "./types";

type ExerciseCardsProps = {
  exercises: Exercise[];
  onSelect: (exercise: Exercise) => void;
  onDelete?: (exercise: Exercise) => void;
};

export function ExerciseCards({ exercises, onSelect, onDelete }: ExerciseCardsProps) {
  return (
    <div className="space-y-3 md:hidden">
      {exercises.map((exercise) => (
        <div
          key={exercise.id ?? exercise.name}
          className="w-full rounded-2xl border border-border bg-secondary/40 p-4 text-left text-sm"
        >
          <button type="button" className="w-full" onClick={() => onSelect(exercise)}>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground">{exercise.name}</p>
              <Badge variant={exercise.videoStatus === "Uploaded" ? "secondary" : "outline"}>
                {exercise.videoStatus || "Pending"}
              </Badge>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Category</span>
                <span className="text-foreground">{exercise.category || "General"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Sets</span>
                <span className="text-foreground">{exercise.sets ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Reps</span>
                <span className="text-foreground">{exercise.reps ?? "-"}</span>
              </div>
            </div>
          </button>
          {onDelete ? (
            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => onDelete(exercise)}>
                Delete
              </Button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
