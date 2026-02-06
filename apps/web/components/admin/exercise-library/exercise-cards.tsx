import { Badge } from "../../ui/badge";

type Exercise = {
  name: string;
  category: string;
  sets: string;
  reps: string;
  video: string;
};

type ExerciseCardsProps = {
  exercises: Exercise[];
  onSelect: (exercise: Exercise) => void;
};

export function ExerciseCards({ exercises, onSelect }: ExerciseCardsProps) {
  return (
    <div className="space-y-3 md:hidden">
      {exercises.map((exercise) => (
        <button
          key={exercise.name}
          type="button"
          className="w-full rounded-2xl border border-border bg-secondary/40 p-4 text-left text-sm"
          onClick={() => onSelect(exercise)}
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold text-foreground">{exercise.name}</p>
            <Badge variant={exercise.video === "Uploaded" ? "accent" : "outline"}>
              {exercise.video}
            </Badge>
          </div>
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Category</span>
              <span className="text-foreground">{exercise.category}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Sets</span>
              <span className="text-foreground">{exercise.sets}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Reps</span>
              <span className="text-foreground">{exercise.reps}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
