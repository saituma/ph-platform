import { useState } from "react";
import { Button } from "../../ui/button";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

type BookingsFiltersProps = {
  chips: string[];
  onChipSelect: (chip: string) => void;
};

const serviceItems = [
  { label: "All Services", value: "" },
  { label: "Role Model", value: "role-model" },
  { label: "Lift Lab 1:1", value: "lift-lab" },
  { label: "Group Call", value: "group-call" },
];

const typeItems = [
  { label: "All Types", value: "" },
  { label: "Video", value: "video" },
  { label: "In-person", value: "in-person" },
];

export function BookingsFilters({ chips, onChipSelect }: BookingsFiltersProps) {
  const [service, setService] = useState("");
  const [type, setType] = useState("");

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
        <Select
          value={service}
          onValueChange={(v) => setService(v ?? "")}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {serviceItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <Select
          value={type}
          onValueChange={(v) => setType(v ?? "")}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {typeItems.map((item) => (
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
