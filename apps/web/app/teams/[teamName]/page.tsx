"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { AdminShell } from "../../../components/admin/shell";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { SectionHeader } from "../../../components/admin/section-header";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";

type TeamDetails = {
  team: string;
  summary: {
    memberCount: number;
    guardianCount: number;
    createdAt: string | Date | null;
    updatedAt: string | Date | null;
  };
  defaults: {
    injuries: string | null;
    growthNotes: string | null;
    performanceGoals: string | null;
    equipmentAccess: string | null;
  };
  members: Array<{
    athleteId: number;
    athleteName: string;
    birthDate: string | null;
    trainingPerWeek: number | null;
    currentProgramTier: string | null;
    guardianEmail: string | null;
    guardianPhone: string | null;
    relationToAthlete: string | null;
    createdAt: string | Date | null;
    updatedAt: string | Date | null;
  }>;
};

function formatDate(value: string | Date | null) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function getCsrfToken() {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("csrfToken="))
      ?.split("=")[1] ?? ""
  );
}

export default function TeamDetailPage() {
  const params = useParams<{ teamName: string }>();
  const encodedName = String(params.teamName ?? "");
  const teamName = useMemo(() => decodeURIComponent(encodedName), [encodedName]);
  const [details, setDetails] = useState<TeamDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [defaultsForm, setDefaultsForm] = useState({
    injuries: "",
    growthNotes: "",
    performanceGoals: "",
    equipmentAccess: "",
  });
  const [defaultsNotice, setDefaultsNotice] = useState<string | null>(null);
  const [isSavingDefaults, setIsSavingDefaults] = useState(false);

  const loadDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/backend/admin/teams/${encodeURIComponent(teamName)}`, {
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to load team details.");
      }
      const next = payload as TeamDetails;
      setDetails(next);
      setDefaultsForm({
        injuries: next.defaults.injuries ?? "",
        growthNotes: next.defaults.growthNotes ?? "",
        performanceGoals: next.defaults.performanceGoals ?? "",
        equipmentAccess: next.defaults.equipmentAccess ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!teamName) return;
    void loadDetails();
  }, [teamName]);

  const saveDefaults = async () => {
    setDefaultsNotice(null);
    setIsSavingDefaults(true);
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch("/api/backend/admin/teams/defaults", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        },
        body: JSON.stringify({
          teamName,
          injuries: defaultsForm.injuries.trim() || null,
          growthNotes: defaultsForm.growthNotes.trim() || null,
          performanceGoals: defaultsForm.performanceGoals.trim() || null,
          equipmentAccess: defaultsForm.equipmentAccess.trim() || null,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to save defaults.");
      }
      setDefaultsNotice("Team defaults saved.");
      await loadDetails();
    } catch (err) {
      setDefaultsNotice(err instanceof Error ? err.message : "Failed to save defaults.");
    } finally {
      setIsSavingDefaults(false);
    }
  };

  return (
    <AdminShell
      title={teamName || "Team details"}
      subtitle="Team details and member list."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/teams">Back to teams</Link>
        </Button>
      }
    >
      <div className="grid gap-6">
        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        ) : null}

        <Card>
          <CardHeader>
            <SectionHeader title="Summary" description="Overview for this team." />
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading team details...</p>
            ) : (
              <>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Athletes</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{details?.summary.memberCount ?? 0}</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Guardians</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{details?.summary.guardianCount ?? 0}</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{formatDate(details?.summary.createdAt ?? null)}</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Last updated</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{formatDate(details?.summary.updatedAt ?? null)}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader title="Team defaults" description="Shared defaults currently saved on this team." />
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="defaults-injuries">Injuries / history</Label>
              <Textarea
                id="defaults-injuries"
                rows={2}
                value={defaultsForm.injuries}
                onChange={(event) => setDefaultsForm((current) => ({ ...current, injuries: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaults-growth">Growth notes</Label>
              <Textarea
                id="defaults-growth"
                rows={2}
                value={defaultsForm.growthNotes}
                onChange={(event) => setDefaultsForm((current) => ({ ...current, growthNotes: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaults-goals">Performance goals</Label>
              <Textarea
                id="defaults-goals"
                rows={2}
                value={defaultsForm.performanceGoals}
                onChange={(event) => setDefaultsForm((current) => ({ ...current, performanceGoals: event.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="defaults-equipment">Equipment access</Label>
              <Textarea
                id="defaults-equipment"
                rows={2}
                value={defaultsForm.equipmentAccess}
                onChange={(event) => setDefaultsForm((current) => ({ ...current, equipmentAccess: event.target.value }))}
              />
            </div>
            <div className="sm:col-span-2 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">{defaultsNotice ?? " "}</p>
              <Button type="button" onClick={() => void saveDefaults()} disabled={isSavingDefaults}>
                {isSavingDefaults ? "Saving..." : "Save defaults"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader title="Members" description="Team member names. Click a member to open detail page." />
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading members...</p>
            ) : !details?.members.length ? (
              <p className="text-sm text-muted-foreground">No members found for this team.</p>
            ) : (
              details.members.map((member) => (
                <Link
                  key={member.athleteId}
                  href={`/teams/${encodeURIComponent(teamName)}/members/${member.athleteId}`}
                  className="block rounded-xl border border-border p-4 transition hover:border-primary/50 hover:bg-primary/5"
                >
                  <p className="text-sm font-semibold text-foreground">{member.athleteName}</p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
