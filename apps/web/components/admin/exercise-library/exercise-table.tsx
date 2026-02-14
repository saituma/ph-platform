import { Badge } from "../../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { Button } from "../../ui/button";
import type { Exercise } from "./types";

type ExerciseTableProps = {
  exercises: Exercise[];
  onSelect: (exercise: Exercise) => void;
  onDelete?: (exercise: Exercise) => void;
};

export function ExerciseTable({ exercises, onSelect, onDelete }: ExerciseTableProps) {
  return (
    <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Exercise</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Sets</TableHead>
            <TableHead>Reps</TableHead>
            <TableHead>Video</TableHead>
            {onDelete ? <TableHead className="text-right">Actions</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {exercises.map((exercise) => (
            <TableRow
              key={exercise.id ?? exercise.name}
              className="hover:bg-secondary/60"
              onClick={() => onSelect(exercise)}
            >
              <TableCell className="font-medium text-foreground">
                {exercise.name}
              </TableCell>
              <TableCell>{exercise.category || "General"}</TableCell>
              <TableCell>{exercise.sets ?? "-"}</TableCell>
              <TableCell>{exercise.reps ?? "-"}</TableCell>
              <TableCell>
                <Badge variant={exercise.videoStatus === "Uploaded" ? "accent" : "outline"}>
                  {exercise.videoStatus || "Pending"}
                </Badge>
              </TableCell>
              {onDelete ? (
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(exercise);
                    }}
                  >
                    Delete
                  </Button>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
