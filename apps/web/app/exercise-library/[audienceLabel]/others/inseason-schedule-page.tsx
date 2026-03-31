"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "../../../../components/admin/shell";
import { SectionHeader } from "../../../../components/admin/section-header";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Textarea } from "../../../../components/ui/textarea";
import {
  AudienceWorkspace,
  normalizeAudienceLabelInput,
  trainingContentRequest,
} from "../../../../components/admin/training-content-v2/api";
import { INSEASON_WEEKDAYS, formatWeeklySchedule, parseWeeklySchedule } from "./inseason-shared";

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

  const ageEntry = workspace?.others.find((item) => item.type === "inseason")?.items.find((item) => item.id === itemId) ?? null;

  useEffect(() => {
    if (!ageEntry) return;
    const parsed = parseWeeklySchedule(ageEntry.scheduleNote, ageEntry.metadata);
    setForm({
      title: ageEntry.title,
      weekday: parsed.day,
      time: parsed.time,
      notes: ageEntry.body === "Weekly in-season schedule." ? "" : ageEntry.body,
    });
  }, [ageEntry]);

  const saveSchedule = async () => {
    if (!ageEntry || !form.title.trim()) return;
    setIsSaving(true);
    try {
      const scheduleNote = formatWeeklySchedule(form.weekday, form.time);
      await trainingContentRequest(`/others/${ageEntry.id}`, {
        method: "PUT",
        body: JSON.stringify({
          type: "inseason",
          title: form.title.trim(),
          body: form.notes.trim() || "Weekly in-season schedule.",
          scheduleNote,
          videoUrl: null,
          order: ageEntry.order,
          metadata: {
            kind: "inseason_age_schedule",
            scheduleDay: form.weekday,
            scheduleTime: form.time,
          },
        }),
      });
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save schedule.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminShell title="Training content" subtitle={`Plan: ${normalizedAudienceLabel} -> In-Season Program`}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/exercise-library/${encodeURIComponent(normalizedAudienceLabel)}/others/inseason`}>
            <Button variant="outline">Back to ages</Button>
          </Link>
        </div>
        {error ? <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        <Card>
          <CardHeader>
            <SectionHeader
              title={ageEntry?.title ? `${ageEntry.title} schedule` : "In-Season schedule"}
              description="Set the weekly recurring day and time for this age. It repeats every week until the coach changes it."
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Age label</label>
              <Input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="6, 8, 10-13, 8-16"
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
                placeholder="Optional coaching notes for this age group."
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </div>
            <div className="rounded-2xl border border-border bg-secondary/10 px-4 py-3 text-sm text-muted-foreground">
              Repeats every week on <strong className="text-foreground">{form.weekday}</strong> at{" "}
              <strong className="text-foreground">{formatWeeklySchedule(form.weekday, form.time).replace(`${form.weekday} `, "")}</strong>.
            </div>
            <div className="flex justify-end">
              <Button onClick={saveSchedule} disabled={isSaving || !ageEntry}>
                {isSaving ? "Saving..." : "Save weekly schedule"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
