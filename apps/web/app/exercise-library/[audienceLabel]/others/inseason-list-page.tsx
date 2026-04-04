"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "../../../../components/admin/shell";
import { SectionHeader } from "../../../../components/admin/section-header";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";
import { Input } from "../../../../components/ui/input";
import {
  AudienceWorkspace,
  normalizeAudienceLabelInput,
  trainingContentRequest,
} from "../../../../components/admin/training-content-v2/api";
import { isInseasonAgeGroup } from "./inseason-shared";

export function InseasonListPage({ audienceLabel }: { audienceLabel: string }) {
  const router = useRouter();
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
      setError(err instanceof Error ? err.message : "Failed to load in-season ages.");
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, [normalizedAudienceLabel]);

  const inseasonGroup = workspace?.others.find((item) => item.type === "inseason") ?? null;
  const ageGroups = (inseasonGroup?.items ?? []).filter((item) => isInseasonAgeGroup(item.metadata));
  const currentAgeEntry = ageGroups.find(
    (item) => item.title.trim().toLowerCase() === normalizedAudienceLabel.trim().toLowerCase(),
  );

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
      setError(err instanceof Error ? err.message : "Failed to create age entry.");
    } finally {
      setIsSaving(false);
    }
  };

  const openCurrentAgeSchedule = async () => {
    setIsSaving(true);
    try {
      if (currentAgeEntry) {
        router.push(`/exercise-library/${encodeURIComponent(normalizedAudienceLabel)}/others/inseason/${currentAgeEntry.id}`);
        return;
      }

      const created = await trainingContentRequest<{ item: { id: number } }>("/others", {
        method: "POST",
        body: JSON.stringify({
          audienceLabel: normalizedAudienceLabel,
          type: "inseason",
          title: normalizedAudienceLabel,
          body: "Weekly in-season schedule.",
          scheduleNote: null,
          videoUrl: null,
          order: null,
          metadata: {
            kind: "inseason_age_group",
          },
        }),
      });
      const createdId = created?.item?.id;
      if (createdId) {
        router.push(`/exercise-library/${encodeURIComponent(normalizedAudienceLabel)}/others/inseason/${createdId}`);
        return;
      }

      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open weekly schedule.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminShell title="Training content" subtitle={`Plan: ${normalizedAudienceLabel} -> In-Season Program`}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/exercise-library/${encodeURIComponent(normalizedAudienceLabel)}`}>
            <Button variant="outline">Back to others</Button>
          </Link>
          <Button variant="outline" onClick={() => void openCurrentAgeSchedule()} disabled={isSaving}>
            Manage weekly schedule
          </Button>
          <Button
            className="ml-auto"
            onClick={() => {
              setAgeLabel("");
              setModalOpen(true);
            }}
          >
            + Add age
          </Button>
        </div>
        {error ? <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        <Card>
          <CardHeader>
            <SectionHeader
              title="In-Season age groups"
              description="Coaches can set fixed weekly training slots for each age group (for example Monday 17:00, Tuesday 18:30)."
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {ageGroups.map((item) => (
              <Link
                key={item.id}
                href={`/exercise-library/${encodeURIComponent(normalizedAudienceLabel)}/others/inseason/${item.id}`}
                className="block rounded-2xl border border-border p-4 transition hover:border-primary/40 hover:bg-primary/5"
              >
                <p className="text-lg font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Open this age to add one or more recurring weekly schedule slots.
                </p>
              </Link>
            ))}
            {!ageGroups.length ? (
              <p className="text-sm text-muted-foreground">No ages created yet for In-Season.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add age</DialogTitle>
            <DialogDescription>
              Add an age label like 6, 8, 10-13, or 8-16 for the shared In-Season schedule flow.
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
                {isSaving ? "Creating..." : "Add age"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
