import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "../../ui/select";

type UsersFiltersProps = {
  chips: string[];
  onChipSelect: (chip: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  tierFilter?: string;
  onTierChange?: (value: string | null) => void;
  statusFilter?: string;
  onStatusChange?: (value: string | null) => void;
};

const TIER_ITEMS = [
  { label: "All tiers", value: "all" },
  { label: "Program", value: "Program" },
  { label: "Plus", value: "Plus" },
  { label: "Premium", value: "Premium" },
];

const STATUS_ITEMS = [
  { label: "All status", value: "all" },
  { label: "Active", value: "Active" },
  { label: "Pending", value: "Pending" },
];

export function UsersFilters({
  chips,
  onChipSelect,
  searchValue,
  onSearchChange,
  tierFilter = "all",
  onTierChange,
  statusFilter = "all",
  onStatusChange,
}: UsersFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Mobile chip filters */}
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

      {/* Desktop filters */}
      <div className="hidden flex-wrap gap-2 md:flex">
        <Input
          placeholder="Search users"
          className="h-9 w-64"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
        />

        <Select
          items={TIER_ITEMS}
          value={tierFilter}
          onValueChange={onTierChange}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {TIER_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>

        <Select
          items={STATUS_ITEMS}
          value={statusFilter}
          onValueChange={onStatusChange}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {STATUS_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </div>
    </div>
  );
}
