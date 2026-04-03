"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { AdminShell } from "../../../../../components/admin/shell";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../../../components/ui/card";
import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";
import { Select } from "../../../../../components/ui/select";
import { SectionHeader } from "../../../../../components/admin/section-header";

type TeamMemberDetails = {
  athleteId: number;
  team: string;
  athleteName: string;
  birthDate: string | null;
  trainingPerWeek: number | null;
  currentProgramTier: string | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
  guardianEmail: string | null;
  guardianPhone: string | null;
  relationToAthlete: string | null;
};

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

function formatDate(value: string | Date | null) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

export default function TeamMemberDetailPage() {
  const params = useParams<{ teamName: string; athleteId: string }>();
  const encodedTeamName = String(params.teamName ?? "");
  const teamName = useMemo(() => decodeURIComponent(encodedTeamName), [encodedTeamName]);
  const athleteId = Number.parseInt(String(params.athleteId ?? "0"), 10);

  const [details, setDetails] = useState<TeamMemberDetails | null>(null);
  const [form, setForm] = useState({
    athleteName: "",
    birthDate: "",
    trainingPerWeek: "",
    currentProgramTier: "",
    guardianEmail: "",
    guardianPhone: "",
    relationToAthlete: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMember = async () => {
    if (!teamName || !Number.isFinite(athleteId) || athleteId <= 0) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/backend/admin/teams/${encodeURIComponent(teamName)}/members/${athleteId}`, {
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to load team member.");
      }
      const next = payload as TeamMemberDetails;
      setDetails(next);
      setForm({
        athleteName: next.athleteName ?? "",
        birthDate: next.birthDate ?? "",
        trainingPerWeek: next.trainingPerWeek != null ? String(next.trainingPerWeek) : "",
        currentProgramTier: next.currentProgramTier ?? "",
        guardianEmail: next.guardianEmail ?? "",
        guardianPhone: next.guardianPhone ?? "",
        relationToAthlete: next.relationToAthlete ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team member.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadMember();
  }, [teamName, athleteId]);

  const saveMember = async () => {
    setNotice(null);
    setError(null);
    setIsSaving(true);
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(`/api/backend/admin/teams/${encodeURIComponent(teamName)}/members/${athleteId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        },
        body: JSON.stringify({
          athleteName: form.athleteName.trim(),
          birthDate: form.birthDate.trim() || null,
          trainingPerWeek: Number.parseInt(form.trainingPerWeek, 10),
          currentProgramTier: form.currentProgramTier || null,
          guardianEmail: form.guardianEmail.trim() || null,
          guardianPhone: form.guardianPhone.trim() || null,
          relationToAthlete: form.relationToAthlete.trim() || null,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to save member.");
      }
      setNotice("Member updated.");
      await loadMember();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save member.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminShell
      title={details?.athleteName || "Team member"}
      subtitle={`Team: ${teamName || "—"}`}
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href={`/teams/${encodeURIComponent(teamName)}`}>Back to team</Link>
        </Button>
      }
    >
      <div className="grid gap-6">
        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        ) : null}
        {notice ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{notice}</div>
        ) : null}

        <Card>
          <CardHeader>
            <SectionHeader title="Member details" description="Edit athlete and guardian information for this team member." />
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading member details...</p>
            ) : (
              <>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Athlete name</Label>
                  <Input
                    value={form.athleteName}
                    onChange={(event) => setForm((current) => ({ ...current, athleteName: event.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Birth date</Label>
                  <Input
                    type="date"
                    value={form.birthDate}
                    onChange={(event) => setForm((current) => ({ ...current, birthDate: event.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Training/week</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.trainingPerWeek}
                    onChange={(event) => setForm((current) => ({ ...current, trainingPerWeek: event.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Program tier</Label>
                  <Select
                    value={form.currentProgramTier}
                    onChange={(event) => setForm((current) => ({ ...current, currentProgramTier: event.target.value }))}
                  >
                    <option value="">No tier</option>
                    <option value="PHP">PHP</option>
                    <option value="PHP_Plus">PHP Plus</option>
                    <option value="PHP_Premium">PHP Premium</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Guardian email</Label>
                  <Input
                    type="email"
                    value={form.guardianEmail}
                    onChange={(event) => setForm((current) => ({ ...current, guardianEmail: event.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Guardian phone</Label>
                  <Input
                    value={form.guardianPhone}
                    onChange={(event) => setForm((current) => ({ ...current, guardianPhone: event.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Relation</Label>
                  <Input
                    value={form.relationToAthlete}
                    onChange={(event) => setForm((current) => ({ ...current, relationToAthlete: event.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Created: {formatDate(details?.createdAt ?? null)} · Updated: {formatDate(details?.updatedAt ?? null)}
                  </p>
                  <Button type="button" onClick={() => void saveMember()} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save member"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
