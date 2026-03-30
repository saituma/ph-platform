"use client";

import { useMemo, useState } from "react";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { useDeleteServiceMutation, useUpdateServiceMutation } from "../../../lib/apiSlice";
import { BOOKING_TYPE_LABELS } from "./bookings-dialogs";

function deleteServiceErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "data" in err) {
    const data = (err as { data?: { error?: string } }).data;
    if (typeof data?.error === "string") return data.error;
  }
  if (err instanceof Error && err.message) return err.message;
  return "Could not delete service.";
}

export type BookingServiceRow = {
  id: number;
  name: string;
  type: string;
  durationMinutes: number;
  capacity?: number | null;
  programTier?: string | null;
  isActive?: boolean | null;
};

const TIER_LABELS: Record<string, string> = {
  PHP: "PHP",
  PHP_Plus: "PHP Plus",
  PHP_Premium: "PHP Premium",
};

type BookingServicesPanelProps = {
  services: BookingServiceRow[];
  isLoading: boolean;
  onAddService: () => void;
  onEditService: (service: BookingServiceRow) => void;
  onOpenSlots: (serviceId: number) => void;
  onOpenSlotsAny: () => void;
  onRefetch: () => void;
};

export function BookingServicesPanel({
  services,
  isLoading,
  onAddService,
  onEditService,
  onOpenSlots,
  onOpenSlotsAny,
  onRefetch,
}: BookingServicesPanelProps) {
  const [updateService] = useUpdateServiceMutation();
  const [deleteService, { isLoading: isDeleting }] = useDeleteServiceMutation();
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...services].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [services],
  );

  const onDelete = async (row: BookingServiceRow) => {
    const ok = window.confirm(
      `Delete “${row.name}”? This removes all open times for this service. You cannot delete it if any bookings still reference it.`,
    );
    if (!ok) return;
    setDeleteError(null);
    setDeletingId(row.id);
    try {
      await deleteService(row.id).unwrap();
      onRefetch();
    } catch (err: unknown) {
      setDeleteError(deleteServiceErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const onToggleActive = async (row: BookingServiceRow) => {
    setDeleteError(null);
    const next = !(row.isActive ?? true);
    setTogglingId(row.id);
    try {
      await updateService({ id: row.id, data: { isActive: next } }).unwrap();
      onRefetch();
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Bookable session types families see under Schedule. Add a service, then use{" "}
          <span className="font-medium text-foreground">Open times</span> to publish availability.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onAddService}>
            Add service
          </Button>
          <Button type="button" variant="outline" onClick={onOpenSlotsAny}>
            Add open times
          </Button>
        </div>
      </div>

      {deleteError ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {deleteError}
        </p>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
          Loading services…
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
          No services yet. Add one to get started.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-secondary/30 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Capacity</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const active = row.isActive ?? true;
                const tier = row.programTier ? TIER_LABELS[row.programTier] ?? row.programTier : "—";
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-border last:border-0 ${active ? "" : "bg-muted/30 opacity-90"}`}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {BOOKING_TYPE_LABELS[row.type] ?? row.type}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.durationMinutes} min</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.capacity != null ? row.capacity : "∞"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{tier}</td>
                    <td className="px-4 py-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          className="accent-primary"
                          checked={active}
                          disabled={togglingId === row.id}
                          onChange={() => onToggleActive(row)}
                        />
                        <Badge variant={active ? "default" : "outline"} className="font-normal">
                          {active ? "On" : "Off"}
                        </Badge>
                      </label>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => onEditService(row)}>
                          Edit
                        </Button>
                        <Button type="button" variant="secondary" size="sm" onClick={() => onOpenSlots(row.id)}>
                          Open times
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={isDeleting && deletingId === row.id}
                          onClick={() => onDelete(row)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
