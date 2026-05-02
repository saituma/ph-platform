"use client";

import { SlidersHorizontal } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "../../ui/select";

type UsersFiltersProps = {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  programFilter?: string;
  onProgramChange?: (value: string | null) => void;
  statusFilter?: string;
  onStatusChange?: (value: string | null) => void;
  athleteTypeFilter?: string;
  onAthleteTypeChange?: (value: string | null) => void;
  sortValue?: string;
  onSortChange?: (value: string | null) => void;
};

const PROGRAM_ITEMS = [
  { label: "All Programs", value: "all" },
  { label: "PHP Program", value: "PHP" },
  { label: "PHP Premium", value: "PHP_Premium" },
  { label: "PHP Premium Plus", value: "PHP_Premium_Plus" },
  { label: "PHP Pro", value: "PHP_Pro" },
];

const STATUS_ITEMS = [
  { label: "All Status", value: "all" },
  { label: "Active", value: "Active" },
  { label: "Inactive", value: "Inactive" },
  { label: "Trial", value: "Trial" },
];

const ATHLETE_TYPE_ITEMS = [
  { label: "All Types", value: "all" },
  { label: "Youth", value: "Youth" },
  { label: "Adult", value: "Adult" },
];

const SORT_ITEMS = [
  { label: "Sort: Newest", value: "newest" },
  { label: "Sort: Oldest", value: "oldest" },
  { label: "Sort: Name A-Z", value: "name_asc" },
  { label: "Sort: Name Z-A", value: "name_desc" },
];

export function UsersFilters({
  tabs,
  activeTab,
  onTabChange,
  programFilter = "all",
  onProgramChange,
  statusFilter = "all",
  onStatusChange,
  athleteTypeFilter = "all",
  onAthleteTypeChange,
  sortValue = "newest",
  onSortChange,
}: UsersFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-0 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab
                ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Filter dropdowns row */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          items={PROGRAM_ITEMS}
          value={programFilter}
          onValueChange={onProgramChange}
        >
          <SelectTrigger className="h-9 w-auto min-w-[140px] bg-transparent border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {PROGRAM_ITEMS.map((item) => (
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
          <SelectTrigger className="h-9 w-auto min-w-[120px] bg-transparent border-border">
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

        <Select
          items={ATHLETE_TYPE_ITEMS}
          value={athleteTypeFilter}
          onValueChange={onAthleteTypeChange}
        >
          <SelectTrigger className="h-9 w-auto min-w-[120px] bg-transparent border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {ATHLETE_TYPE_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>

        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md border border-border px-3 h-9 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          More Filters
        </button>

        <div className="ml-auto">
          <Select
            items={SORT_ITEMS}
            value={sortValue}
            onValueChange={onSortChange}
          >
            <SelectTrigger className="h-9 w-auto min-w-[140px] bg-transparent border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {SORT_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </div>
      </div>
    </div>
  );
}
