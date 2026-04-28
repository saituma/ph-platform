import { Search } from "lucide-react";
import { Button } from "../../ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../../ui/input-group";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "../../ui/select";

type ExerciseFiltersProps = {
  chips: string[];
  onChipSelect: (chip: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
};

const categoryItems = [
  { label: "All categories", value: "" },
  { label: "Power", value: "Power" },
  { label: "Speed", value: "Speed" },
  { label: "Recovery", value: "Recovery" },
];

const statusItems = [
  { label: "All status", value: "" },
  { label: "Uploaded", value: "Uploaded" },
  { label: "Pending", value: "Pending" },
];

export function ExerciseFilters({
  chips,
  onChipSelect,
  search,
  onSearchChange,
  category,
  onCategoryChange,
  status,
  onStatusChange,
}: ExerciseFiltersProps) {
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
        <InputGroup className="h-10 w-64">
          <InputGroupAddon>
            <Search className="h-4 w-4" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search exercises"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </InputGroup>

        <Select
          items={categoryItems}
          value={category}
          onValueChange={(v) => onCategoryChange(v ?? "")}
        >
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectPopup>
            {categoryItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
            ))}
          </SelectPopup>
        </Select>

        <Select
          items={statusItems}
          value={status}
          onValueChange={(v) => onStatusChange(v ?? "")}
        >
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectPopup>
            {statusItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </div>
    </div>
  );
}
