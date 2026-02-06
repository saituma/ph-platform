import { Button } from "../../ui/button";
import { Select } from "../../ui/select";

type BookingsFiltersProps = {
  chips: string[];
  onChipSelect: (chip: string) => void;
};

export function BookingsFilters({ chips, onChipSelect }: BookingsFiltersProps) {
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
      <div className="flex flex-wrap gap-2">
        <Select className="w-48">
          <option>All Services</option>
          <option>Role Model</option>
          <option>Lift Lab 1:1</option>
          <option>Group Call</option>
        </Select>
        <Select className="w-40">
          <option>All Types</option>
          <option>Video</option>
          <option>In-person</option>
        </Select>
      </div>
    </div>
  );
}
