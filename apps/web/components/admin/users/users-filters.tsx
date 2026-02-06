import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select } from "../../ui/select";

type UsersFiltersProps = {
  chips: string[];
  onChipSelect: (chip: string) => void;
};

export function UsersFilters({ chips, onChipSelect }: UsersFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-auto md:hidden">
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
        <Input placeholder="Search users" className="h-10 w-64" />
        <Select className="w-40">
          <option>All tiers</option>
          <option>Program</option>
          <option>Plus</option>
          <option>Premium</option>
        </Select>
        <Select className="w-40">
          <option>All status</option>
          <option>Active</option>
          <option>Pending</option>
        </Select>
      </div>
    </div>
  );
}
