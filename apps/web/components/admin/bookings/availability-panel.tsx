import { useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select, SelectTrigger, SelectValue, SelectPopup, SelectItem } from "../../ui/select";
import { Skeleton } from "../../ui/skeleton";
import { useCreateAvailabilityMutation } from "../../../lib/apiSlice";

type ApiErrorLike = {
  message?: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const e = error as ApiErrorLike;
    if (typeof e.message === "string") return e.message;
  }
  return fallback;
}

type AvailabilityPanelProps = {
  isLoading?: boolean;
  services?: { id: number; name: string }[];
  onOpenSlots?: () => void;
};

export function AvailabilityPanel({
  isLoading = false,
  services = [],
  onOpenSlots,
}: AvailabilityPanelProps) {
  const [serviceId, setServiceId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startHour, setStartHour] = useState("");
  const [startMinute, setStartMinute] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endHour, setEndHour] = useState("");
  const [endMinute, setEndMinute] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createAvailability, { isLoading: isCreating }] = useCreateAvailabilityMutation();

  const handleOpenSlots = async () => {
    setError(null);
    setSuccess(null);
    if (!serviceId || !startDate || !startHour || !startMinute || !endDate || !endHour || !endMinute) {
      setError("Select a service and time range.");
      return;
    }
    try {
      const pad = (value: string) => value.padStart(2, "0");
      const start = new Date(`${startDate}T${pad(startHour)}:${pad(startMinute)}`);
      const end = new Date(`${endDate}T${pad(endHour)}:${pad(endMinute)}`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        setError("Invalid date or time. Check hour/minute values.");
        return;
      }
      if (end <= start) {
        setError("End time must be after start time.");
        return;
      }
      await createAvailability({
        serviceTypeId: Number(serviceId),
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
      }).unwrap();
      setStartDate("");
      setStartHour("");
      setStartMinute("");
      setEndDate("");
      setEndHour("");
      setEndMinute("");
      setServiceId("");
      setSuccess("Time range saved successfully.");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to save time range"));
    }
  };

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
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              type="date"
              placeholder="Start date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
            <div className="flex gap-2">
              <Input type="number" min={0} max={23} placeholder="Hour" value={startHour} onChange={(event) => setStartHour(event.target.value)} />
              <Input type="number" min={0} max={59} placeholder="Min" value={startMinute} onChange={(event) => setStartMinute(event.target.value)} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              type="date"
              placeholder="End date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
            <div className="flex gap-2">
              <Input type="number" min={0} max={23} placeholder="Hour" value={endHour} onChange={(event) => setEndHour(event.target.value)} />
              <Input type="number" min={0} max={59} placeholder="Min" value={endMinute} onChange={(event) => setEndMinute(event.target.value)} />
            </div>
          </div>
          <Select value={serviceId} onValueChange={(v) => setServiceId(v ?? "")}>
            <SelectTrigger><SelectValue placeholder="Service type" /></SelectTrigger>
            <SelectPopup>
              {services.map((service) => (
                <SelectItem key={service.id} value={String(service.id)}>{service.name}</SelectItem>
              ))}
            </SelectPopup>
          </Select>
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          {success ? <p className="text-sm text-green-600">{success}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button className="flex-1 min-w-[140px]" onClick={handleOpenSlots} disabled={isCreating}>
              Save Time Range
            </Button>
            {onOpenSlots ? (
              <Button variant="outline" className="flex-1 min-w-[140px]" onClick={onOpenSlots}>
                Advanced
              </Button>
            ) : null}
          </div>
          <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm">
            <p className="font-semibold text-foreground">Legacy availability tools</p>
            <p className="text-xs text-muted-foreground">
              This panel is only for older time-range workflows. New service booking is now controlled by service
              capacity and active status.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
