import { Badge } from "../../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";

type Exercise = {
  name: string;
  category: string;
  sets: string;
  reps: string;
  video: string;
};

type ExerciseTableProps = {
  exercises: Exercise[];
  onSelect: (exercise: Exercise) => void;
};

export function ExerciseTable({ exercises, onSelect }: ExerciseTableProps) {
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {exercises.map((exercise) => (
            <TableRow
              key={exercise.name}
              className="hover:bg-secondary/60"
              onClick={() => onSelect(exercise)}
            >
              <TableCell className="font-medium text-foreground">
                {exercise.name}
              </TableCell>
              <TableCell>{exercise.category}</TableCell>
              <TableCell>{exercise.sets}</TableCell>
              <TableCell>{exercise.reps}</TableCell>
              <TableCell>
                <Badge variant={exercise.video === "Uploaded" ? "accent" : "outline"}>
                  {exercise.video}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
