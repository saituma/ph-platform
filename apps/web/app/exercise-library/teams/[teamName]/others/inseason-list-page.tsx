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
import {
  AudienceWorkspace,
  normalizeAudienceLabelInput,
  trainingContentRequest,
} from "../../../../../components/admin/training-content-v2/api";
import { isInseasonAgeGroup } from "./inseason-shared";

export function InseasonListPage({ audienceLabel }: { audienceLabel: string }) {
  const normalizedAudienceLabel = useMemo(() => normalizeAudienceLabelInput(audienceLabel), [audienceLabel]);
  const [workspace, setWorkspace] = useState<AudienceWorkspace | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [ageLabel, setAgeLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadWorkspace = async () => {
    try {
      setError(null);
      const data = await trainingContentRequest<AudienceWorkspace>(`/admin?audienceLabel=${encodeURIComponent(normalizedAudienceLabel)}`);
      setWorkspace(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load in-season groups.");
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, [normalizedAudienceLabel]);

  const inseasonGroup = workspace?.others.find((item) => item.type === "inseason") ?? null;
  const ageGroups = (inseasonGroup?.items ?? []).filter((item) => isInseasonAgeGroup(item.metadata));

  const createAgeEntry = async () => {
    if (!ageLabel.trim()) return;
    setIsSaving(true);
    try {
      await trainingContentRequest("/others", {
        method: "POST",
        body: JSON.stringify({
          audienceLabel: normalizedAudienceLabel,
          type: "inseason",
          title: ageLabel.trim(),
          body: "Weekly in-season schedule.",
          scheduleNote: null,
          videoUrl: null,
          order: null,
          metadata: {
            kind: "inseason_age_group",
          },
        }),
      });
      setAgeLabel("");
      setModalOpen(false);
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group entry.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminShell title="Training content" subtitle={`Team: ${normalizedAudienceLabel} -> In-Season Program`}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/exercise-library/teams/${encodeURIComponent(normalizedAudienceLabel)}?view=others`}>
            <Button variant="outline">Back to others</Button>
          </Link>
          <Button
            className="ml-auto"
            onClick={() => {
              setAgeLabel("");
              setModalOpen(true);
            }}
          >
            + Add group
          </Button>
        </div>
        {error ? <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        <Card>
          <CardHeader>
            <SectionHeader
              title="In-Season groups"
              description="Create group entries like U10, U12, or Starter. Each group opens into its own weekly schedule page."
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {ageGroups.map((item) => (
              <Link
                key={item.id}
                href={`/exercise-library/teams/${encodeURIComponent(normalizedAudienceLabel)}/others/inseason/${item.id}`}
                className="block rounded-2xl border border-border p-4 transition hover:border-primary/40 hover:bg-primary/5"
              >
                <p className="text-lg font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Open this group to add one or more recurring weekly schedule slots.
                </p>
              </Link>
            ))}
            {!ageGroups.length ? (
              <p className="text-sm text-muted-foreground">No groups created yet for In-Season.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add group</DialogTitle>
            <DialogDescription>
              Add a group label like U10, U12, or Starter for the shared In-Season schedule flow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="6, 8, 10-13, 8-16"
              value={ageLabel}
              onChange={(event) => setAgeLabel(event.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createAgeEntry} disabled={isSaving || !ageLabel.trim()}>
                {isSaving ? "Creating..." : "Add group"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
