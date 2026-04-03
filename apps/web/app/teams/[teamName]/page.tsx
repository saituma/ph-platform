"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { AdminShell } from "../../../components/admin/shell";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { SectionHeader } from "../../../components/admin/section-header";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select } from "../../../components/ui/select";
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
  const [memberDrafts, setMemberDrafts] = useState<Record<number, {
    athleteName: string;
    birthDate: string;
    trainingPerWeek: string;
    currentProgramTier: string;
    guardianEmail: string;
    guardianPhone: string;
    relationToAthlete: string;
  }>>({});
  const [defaultsNotice, setDefaultsNotice] = useState<string | null>(null);
  const [memberNotice, setMemberNotice] = useState<string | null>(null);
  const [isSavingDefaults, setIsSavingDefaults] = useState(false);
  const [isSavingMemberId, setIsSavingMemberId] = useState<number | null>(null);

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
      setMemberDrafts(
        Object.fromEntries(
          next.members.map((member) => [
            member.athleteId,
            {
              athleteName: member.athleteName ?? "",
              birthDate: member.birthDate ?? "",
              trainingPerWeek: member.trainingPerWeek != null ? String(member.trainingPerWeek) : "",
              currentProgramTier: member.currentProgramTier ?? "",
              guardianEmail: member.guardianEmail ?? "",
              guardianPhone: member.guardianPhone ?? "",
              relationToAthlete: member.relationToAthlete ?? "",
            },
          ])
        )
      );
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

  const saveMember = async (athleteId: number) => {
    const draft = memberDrafts[athleteId];
    if (!draft) return;

    setMemberNotice(null);
    setIsSavingMemberId(athleteId);
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(`/api/backend/admin/teams/${encodeURIComponent(teamName)}/members/${athleteId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        },
        body: JSON.stringify({
          athleteName: draft.athleteName.trim(),
          birthDate: draft.birthDate.trim() || null,
          trainingPerWeek: Number.parseInt(draft.trainingPerWeek, 10),
          currentProgramTier: draft.currentProgramTier || null,
          guardianEmail: draft.guardianEmail.trim() || null,
          guardianPhone: draft.guardianPhone.trim() || null,
          relationToAthlete: draft.relationToAthlete.trim() || null,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to update team member.");
      }
      setMemberNotice(`Saved member ${draft.athleteName || athleteId}.`);
      await loadDetails();
    } catch (err) {
      setMemberNotice(err instanceof Error ? err.message : "Failed to update team member.");
    } finally {
      setIsSavingMemberId(null);
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
            <SectionHeader title="Members" description="All athletes and guardian contact info in this team." />
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading members...</p>
            ) : !details?.members.length ? (
              <p className="text-sm text-muted-foreground">No members found for this team.</p>
            ) : (
              details.members.map((member) => (
                <div key={member.athleteId} className="rounded-xl border border-border p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Athlete name</Label>
                      <Input
                        value={memberDrafts[member.athleteId]?.athleteName ?? ""}
                        onChange={(event) =>
                          setMemberDrafts((current) => ({
                            ...current,
                            [member.athleteId]: { ...current[member.athleteId], athleteName: event.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Birth date</Label>
                      <Input
                        type="date"
                        value={memberDrafts[member.athleteId]?.birthDate ?? ""}
                        onChange={(event) =>
                          setMemberDrafts((current) => ({
                            ...current,
                            [member.athleteId]: { ...current[member.athleteId], birthDate: event.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Training/week</Label>
                      <Input
                        type="number"
                        min={0}
                        value={memberDrafts[member.athleteId]?.trainingPerWeek ?? ""}
                        onChange={(event) =>
                          setMemberDrafts((current) => ({
                            ...current,
                            [member.athleteId]: { ...current[member.athleteId], trainingPerWeek: event.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Program tier</Label>
                      <Select
                        value={memberDrafts[member.athleteId]?.currentProgramTier ?? ""}
                        onChange={(event) =>
                          setMemberDrafts((current) => ({
                            ...current,
                            [member.athleteId]: { ...current[member.athleteId], currentProgramTier: event.target.value },
                          }))
                        }
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
                        value={memberDrafts[member.athleteId]?.guardianEmail ?? ""}
                        onChange={(event) =>
                          setMemberDrafts((current) => ({
                            ...current,
                            [member.athleteId]: { ...current[member.athleteId], guardianEmail: event.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Guardian phone</Label>
                      <Input
                        value={memberDrafts[member.athleteId]?.guardianPhone ?? ""}
                        onChange={(event) =>
                          setMemberDrafts((current) => ({
                            ...current,
                            [member.athleteId]: { ...current[member.athleteId], guardianPhone: event.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Relation</Label>
                      <Input
                        value={memberDrafts[member.athleteId]?.relationToAthlete ?? ""}
                        onChange={(event) =>
                          setMemberDrafts((current) => ({
                            ...current,
                            [member.athleteId]: { ...current[member.athleteId], relationToAthlete: event.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      Created: {formatDate(member.createdAt)} · Updated: {formatDate(member.updatedAt)}
                    </p>
                    <Button
                      type="button"
                      onClick={() => void saveMember(member.athleteId)}
                      disabled={isSavingMemberId === member.athleteId}
                    >
                      {isSavingMemberId === member.athleteId ? "Saving..." : "Save member"}
                    </Button>
                  </div>
                </div>
              ))
            )}
            {memberNotice ? <p className="text-xs text-muted-foreground">{memberNotice}</p> : null}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
