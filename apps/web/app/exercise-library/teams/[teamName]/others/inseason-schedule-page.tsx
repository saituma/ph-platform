"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "../../../../../components/admin/shell";
import { SectionHeader } from "../../../../../components/admin/section-header";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../../../components/ui/dialog";
import { Input } from "../../../../../components/ui/input";
import { Textarea } from "../../../../../components/ui/textarea";
import {
  AudienceWorkspace,
  OtherItem,
  normalizeAudienceLabelInput,
  trainingContentRequest,
} from "../../../../../components/admin/training-content-v2/api";
import {
  INSEASON_WEEKDAYS,
  formatWeeklySchedule,
  isInseasonAgeGroup,
  isLegacyInseasonAgeSchedule,
  isInseasonScheduleEntry,
  parseWeeklySchedule,
} from "./inseason-shared";

export function InseasonSchedulePage({
  audienceLabel,
  itemId,
}: {
  audienceLabel: string;
  itemId: number;
}) {
  const normalizedAudienceLabel = useMemo(() => normalizeAudienceLabelInput(audienceLabel), [audienceLabel]);
  const [workspace, setWorkspace] = useState<AudienceWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: "",
    weekday: "Monday",
    time: "17:00",
    notes: "",
  });

  const loadWorkspace = async () => {
    try {
      setError(null);
      const data = await trainingContentRequest<AudienceWorkspace>(`/admin?audienceLabel=${encodeURIComponent(normalizedAudienceLabel)}`);
      setWorkspace(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schedule.");
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, [normalizedAudienceLabel]);

  const inseasonItems = workspace?.others.find((item) => item.type === "inseason")?.items ?? [];
  const ageEntry = inseasonItems.find((item) => item.id === itemId && isInseasonAgeGroup(item.metadata)) ?? null;
  const scheduleEntries = inseasonItems.filter((item) => {
    if (item.id === itemId && isLegacyInseasonAgeSchedule(item.metadata)) return true;
    if (!isInseasonScheduleEntry(item.metadata)) return false;
    return item.metadata?.ageGroupId === itemId;
  });

  const resetForm = () => {
    setEditingScheduleId(null);
    setForm({
      title: "",
      weekday: "Monday",
      time: "17:00",
      notes: "",
    });
  };

  const openEditModal = (schedule: OtherItem) => {
    const parsed = parseWeeklySchedule(schedule.scheduleNote, schedule.metadata);
    setEditingScheduleId(schedule.id);
    setForm({
      title: schedule.title,
      weekday: parsed.day,
      time: parsed.time,
      notes: schedule.body === "Weekly in-season schedule." ? "" : schedule.body,
    });
    setModalOpen(true);
  };

  const saveSchedule = async () => {
    if (!ageEntry || !form.title.trim()) return;
    setIsSaving(true);
    try {
      const scheduleNote = formatWeeklySchedule(form.weekday, form.time);
      if (editingScheduleId != null) {
        const existingSchedule = scheduleEntries.find((item) => item.id === editingScheduleId);
        if (!existingSchedule) {
          throw new Error("Schedule could not be found.");
        }
        const isLegacySchedule = isLegacyInseasonAgeSchedule(existingSchedule.metadata);
        await trainingContentRequest(`/others/${existingSchedule.id}`, {
          method: "PUT",
          body: JSON.stringify({
            type: "inseason",
            title: form.title.trim(),
            body: form.notes.trim() || "Weekly in-season schedule.",
            scheduleNote,
            videoUrl: null,
            order: existingSchedule.order,
            metadata: isLegacySchedule
              ? {
                  kind: "inseason_age_schedule",
                  scheduleDay: form.weekday,
                  scheduleTime: form.time,
                }
              : {
                  kind: "inseason_schedule_entry",
                  ageGroupId: ageEntry.id,
                  ageLabel: ageEntry.title,
                  scheduleDay: form.weekday,
                  scheduleTime: form.time,
                },
          }),
        });
      } else {
        await trainingContentRequest("/others", {
          method: "POST",
          body: JSON.stringify({
            audienceLabel: normalizedAudienceLabel,
            type: "inseason",
            title: form.title.trim(),
            body: form.notes.trim() || "Weekly in-season schedule.",
            scheduleNote,
            videoUrl: null,
            order: null,
            metadata: {
              kind: "inseason_schedule_entry",
              ageGroupId: ageEntry.id,
              ageLabel: ageEntry.title,
              scheduleDay: form.weekday,
              scheduleTime: form.time,
            },
          }),
        });
      }
      resetForm();
      setModalOpen(false);
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save schedule.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSchedule = async (schedule: OtherItem) => {
    try {
      setError(null);
      await trainingContentRequest(`/others/${schedule.id}`, {
        method: "DELETE",
      });
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete schedule.");
    }
  };

  return (
    <AdminShell title="Training content" subtitle={`Team: ${normalizedAudienceLabel} -> In-Season Program`}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/exercise-library/teams/${encodeURIComponent(normalizedAudienceLabel)}/others/inseason`}>
            <Button variant="outline">Back to groups</Button>
          </Link>
          <Button
            className="ml-auto"
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            disabled={!ageEntry}
          >
            + Add schedule
          </Button>
        </div>
        {error ? <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        <Card>
          <CardHeader>
            <SectionHeader
              title={ageEntry?.title ? `${ageEntry.title} schedule` : "In-Season schedule"}
              description="Add recurring weekly schedule rows for this group. Each one repeats every week on the selected day and time."
            />
          </CardHeader>
          <CardContent className="space-y-4">
            {!ageEntry ? <p className="text-sm text-muted-foreground">This group could not be found.</p> : null}
            {ageEntry && !scheduleEntries.length ? (
              <p className="text-sm text-muted-foreground">No weekly schedules added yet for this group.</p>
            ) : null}
            {scheduleEntries.map((schedule) => (
              <div key={schedule.id} className="rounded-2xl border border-border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-base font-semibold text-foreground">{schedule.title}</p>
                    {schedule.scheduleNote ? (
                      <p className="mt-1 text-sm font-semibold text-primary">{schedule.scheduleNote}</p>
                    ) : null}
                    <p className="mt-2 text-sm text-muted-foreground">
                      {schedule.body === "Weekly in-season schedule."
                        ? "Recurring weekly in-season schedule."
                        : schedule.body}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditModal(schedule)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void deleteSchedule(schedule)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingScheduleId != null ? "Edit weekly schedule" : "Add weekly schedule"}</DialogTitle>
            <DialogDescription>
              Add a recurring day and time for this group. The schedule repeats every week until the coach changes or removes it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Title</label>
              <Input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Session title"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Weekly day</label>
                <select
                  className="h-10 w-full rounded-full border border-input bg-background px-4 text-sm"
                  value={form.weekday}
                  onChange={(event) => setForm((current) => ({ ...current, weekday: event.target.value }))}
                >
                  {INSEASON_WEEKDAYS.map((weekday) => (
                    <option key={weekday} value={weekday}>
                      {weekday}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Weekly time</label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Notes</label>
              <Textarea
                placeholder="Optional coaching notes for this schedule."
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </div>
            <div className="rounded-2xl border border-border bg-secondary/10 px-4 py-3 text-sm text-muted-foreground">
              Repeats every week on <strong className="text-foreground">{form.weekday}</strong> at{" "}
              <strong className="text-foreground">{formatWeeklySchedule(form.weekday, form.time).replace(`${form.weekday} `, "")}</strong>.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveSchedule} disabled={isSaving || !form.title.trim() || !ageEntry}>
                {isSaving ? "Saving..." : editingScheduleId != null ? "Save changes" : "Save schedule"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
