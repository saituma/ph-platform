import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select } from "../../ui/select";
import { Skeleton } from "../../ui/skeleton";
type AvailabilityPanelProps = {
  isLoading?: boolean;
  onOpenSlots: () => void;
};

export function AvailabilityPanel({ isLoading = false, onOpenSlots }: AvailabilityPanelProps) {
  return (
    <div className="space-y-3">
      {isLoading ? (
        <>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <div className="rounded-2xl border border-border bg-secondary/40 p-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-3 w-40" />
          </div>
        </>
      ) : (
        <>
          <Input placeholder="Add date range" />
          <Select>
            <option>Service type</option>
            <option>Role Model Meeting</option>
            <option>Lift Lab 1:1</option>
            <option>Group Call</option>
          </Select>
          <Select>
            <option>Fixed call window</option>
            <option>13:00 - 13:30</option>
            <option>14:00 - 14:30</option>
          </Select>
          <Button className="w-full" onClick={onOpenSlots}>
            Open Slots
          </Button>
          <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm">
            <p className="font-semibold text-foreground">Premium Fixed Window</p>
            <p className="text-xs text-muted-foreground">
              13:00 daily call window enabled.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
