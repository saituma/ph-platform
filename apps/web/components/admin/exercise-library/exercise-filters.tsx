import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select } from "../../ui/select";

type ExerciseFiltersProps = {
  chips: string[];
  onChipSelect: (chip: string) => void;
};

export function ExerciseFilters({ chips, onChipSelect }: ExerciseFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-auto pb-1 md:hidden">
        {chips.map((chip) => (
          <Button
            key={chip}
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
            onClick={() => onChipSelect(chip)}
          >
            {chip}
          </Button>
        ))}
      </div>
      <div className="hidden flex-wrap gap-2 md:flex">
        <Input placeholder="Search exercises" className="h-10 w-64" />
        <Select className="w-40">
          <option>All categories</option>
          <option>Power</option>
          <option>Speed</option>
          <option>Recovery</option>
        </Select>
        <Select className="w-40">
          <option>All status</option>
          <option>Uploaded</option>
          <option>Pending</option>
        </Select>
      </div>
    </div>
  );
}
