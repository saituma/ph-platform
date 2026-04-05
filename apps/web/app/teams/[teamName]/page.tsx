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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../components/ui/dialog";

type TeamDetails = {
  team: string;
  summary: {
    memberCount: number;
    guardianCount: number;
    createdAt: string | Date | null;
    updatedAt: string | Date | null;
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

type AdminUser = {
  id: number;
  role?: string | null;
  name?: string | null;
  email?: string | null;
  athleteId?: number | null;
  athleteName?: string | null;
};

type AvailableAthlete = {
  athleteId: number;
  displayName: string;
  email: string;
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
  const [pageNotice, setPageNotice] = useState<string | null>(null);
  const [attachModalOpen, setAttachModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [athleteSearch, setAthleteSearch] = useState("");
  const [availableAthletes, setAvailableAthletes] = useState<AvailableAthlete[]>([]);
  const [isLoadingAvailableAthletes, setIsLoadingAvailableAthletes] = useState(false);
  const [isAttachingAthlete, setIsAttachingAthlete] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);
  const [isRegisteringAthlete, setIsRegisteringAthlete] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    email: "",
    guardianDisplayName: "",
    athleteName: "",
    birthDate: "",
    trainingPerWeek: "3",
    parentPhone: "",
    relationToAthlete: "Guardian",
    desiredProgramType: "PHP",
  });

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

  const loadAvailableAthletes = async () => {
    if (!details) return;
    setIsLoadingAvailableAthletes(true);
    try {
      const response = await fetch("/api/backend/admin/users", { credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to load athletes.");
      }
      const teamMemberIds = new Set(details.members.map((member) => member.athleteId));
      const nextAthletes = (Array.isArray(payload?.users) ? payload.users : [])
        .filter((user: AdminUser) => user.role === "athlete" && Number.isFinite(user.athleteId))
        .map((user: AdminUser): AvailableAthlete => ({
          athleteId: Number(user.athleteId),
          displayName: user.athleteName ?? user.name ?? `Athlete ${user.athleteId}`,
          email: user.email ?? "—",
        }))
        .filter((athlete: AvailableAthlete) => !teamMemberIds.has(athlete.athleteId))
        .sort((a: AvailableAthlete, b: AvailableAthlete) => a.displayName.localeCompare(b.displayName));

      setAvailableAthletes(nextAthletes);
      setSelectedAthleteId(nextAthletes[0]?.athleteId ?? null);
    } catch (err) {
      setPageNotice(err instanceof Error ? err.message : "Failed to load athletes.");
    } finally {
      setIsLoadingAvailableAthletes(false);
    }
  };

  useEffect(() => {
    if (!attachModalOpen) return;
    void loadAvailableAthletes();
  }, [attachModalOpen]);

  const attachExistingAthlete = async () => {
    if (!selectedAthleteId) return;
    setPageNotice(null);
    setIsAttachingAthlete(true);
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(
        `/api/backend/admin/teams/${encodeURIComponent(teamName)}/athletes/${selectedAthleteId}/attach`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
          },
          credentials: "include",
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to add athlete to this team.");
      }
      setAttachModalOpen(false);
      setAthleteSearch("");
      setPageNotice("Athlete added to team.");
      await loadDetails();
    } catch (err) {
      setPageNotice(err instanceof Error ? err.message : "Failed to add athlete to this team.");
    } finally {
      setIsAttachingAthlete(false);
    }
  };

  const registerNewAthlete = async () => {
    if (!registerForm.email.trim() || !registerForm.guardianDisplayName.trim() || !registerForm.athleteName.trim() || !registerForm.birthDate.trim()) {
      setPageNotice("Please fill all required fields.");
      return;
    }

    const trainingPerWeek = Number.parseInt(registerForm.trainingPerWeek, 10);
    if (!Number.isFinite(trainingPerWeek) || trainingPerWeek < 0) {
      setPageNotice("Training/week must be a valid number.");
      return;
    }

    setPageNotice(null);
    setIsRegisteringAthlete(true);
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch("/api/backend/admin/users/provision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          email: registerForm.email.trim(),
          guardianDisplayName: registerForm.guardianDisplayName.trim(),
          athleteName: registerForm.athleteName.trim(),
          birthDate: registerForm.birthDate.trim(),
          team: teamName.trim(),
          trainingPerWeek,
          parentPhone: registerForm.parentPhone.trim() || null,
          relationToAthlete: registerForm.relationToAthlete.trim() || null,
          desiredProgramType: registerForm.desiredProgramType as "PHP" | "PHP_Premium" | "PHP_Premium_Plus" | "PHP_Pro",
          planPaymentType: "monthly",
          planCommitmentMonths: 6,
          termsVersion: "1.0",
          privacyVersion: "1.0",
          appVersion: "admin-web",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to register player.");
      }
      setRegisterModalOpen(false);
      setRegisterForm({
        email: "",
        guardianDisplayName: "",
        athleteName: "",
        birthDate: "",
        trainingPerWeek: "3",
        parentPhone: "",
        relationToAthlete: "Guardian",
        desiredProgramType: "PHP",
      });
      setPageNotice(payload?.emailSent ? "Player registered and invite email sent." : "Player registered. Email sending failed.");
      await loadDetails();
    } catch (err) {
      setPageNotice(err instanceof Error ? err.message : "Failed to register player.");
    } finally {
      setIsRegisteringAthlete(false);
    }
  };

  const filteredAvailableAthletes = availableAthletes.filter((athlete) => {
    const normalized = athleteSearch.trim().toLowerCase();
    if (!normalized) return true;
    return `${athlete.displayName} ${athlete.email}`.toLowerCase().includes(normalized);
  });

  return (
    <AdminShell title={teamName || "Team details"} subtitle="Team details and member list.">
      <div className="grid gap-6">
        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        ) : null}
        {pageNotice ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{pageNotice}</div>
        ) : null}

        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 pt-6">
            <Button
              size="sm"
              onClick={() => {
                setRegisterModalOpen(true);
                setRegisterForm((current) => ({ ...current, relationToAthlete: current.relationToAthlete || "Guardian" }));
              }}
            >
              Register new player
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAttachModalOpen(true)}>
              Add existing athlete
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/teams">Back to teams</Link>
            </Button>
          </CardContent>
        </Card>

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
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{member.athleteName}</p>
                      <p className="text-xs text-muted-foreground">
                        Tier: {member.currentProgramTier ?? "—"} · Training/week: {member.trainingPerWeek ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Guardian: {member.guardianEmail ?? "N/A"}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-primary">Open member</span>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={attachModalOpen} onOpenChange={setAttachModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add existing athlete</DialogTitle>
            <DialogDescription>Select an athlete to attach to {teamName}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Search athlete name or email"
              value={athleteSearch}
              onChange={(event) => setAthleteSearch(event.target.value)}
            />
            <div className="max-h-72 space-y-2 overflow-auto rounded-xl border border-border p-2">
              {isLoadingAvailableAthletes ? (
                <p className="p-2 text-sm text-muted-foreground">Loading athletes...</p>
              ) : filteredAvailableAthletes.length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">No available athletes found.</p>
              ) : (
                filteredAvailableAthletes.map((athlete) => (
                  <button
                    key={athlete.athleteId}
                    type="button"
                    onClick={() => setSelectedAthleteId(athlete.athleteId)}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                      selectedAthleteId === athlete.athleteId
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <p className="text-sm font-medium text-foreground">{athlete.displayName}</p>
                    <p className="text-xs text-muted-foreground">{athlete.email}</p>
                  </button>
                ))
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAttachModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => void attachExistingAthlete()}
                disabled={!selectedAthleteId || isAttachingAthlete || isLoadingAvailableAthletes}
              >
                {isAttachingAthlete ? "Adding..." : "Add athlete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={registerModalOpen} onOpenChange={setRegisterModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register new player</DialogTitle>
            <DialogDescription>Create a youth player and assign them directly to {teamName}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Guardian email</Label>
              <Input
                type="email"
                value={registerForm.email}
                onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="guardian@email.com"
              />
            </div>
            <div className="space-y-1">
              <Label>Guardian name</Label>
              <Input
                value={registerForm.guardianDisplayName}
                onChange={(event) => setRegisterForm((current) => ({ ...current, guardianDisplayName: event.target.value }))}
                placeholder="Parent / guardian name"
              />
            </div>
            <div className="space-y-1">
              <Label>Athlete name</Label>
              <Input
                value={registerForm.athleteName}
                onChange={(event) => setRegisterForm((current) => ({ ...current, athleteName: event.target.value }))}
                placeholder="Player full name"
              />
            </div>
            <div className="space-y-1">
              <Label>Birth date</Label>
              <Input
                type="date"
                value={registerForm.birthDate}
                onChange={(event) => setRegisterForm((current) => ({ ...current, birthDate: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Training/week</Label>
              <Input
                type="number"
                min={0}
                value={registerForm.trainingPerWeek}
                onChange={(event) => setRegisterForm((current) => ({ ...current, trainingPerWeek: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Program tier</Label>
              <select
                className="h-10 w-full rounded-full border border-input bg-background px-4 text-sm"
                value={registerForm.desiredProgramType}
                onChange={(event) => setRegisterForm((current) => ({ ...current, desiredProgramType: event.target.value }))}
              >
                <option value="PHP">PHP Program</option>
                <option value="PHP_Premium">PHP Premium</option>
                <option value="PHP_Premium_Plus">PHP Premium Plus</option>
                <option value="PHP_Pro">PHP Pro</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Guardian phone (optional)</Label>
              <Input
                value={registerForm.parentPhone}
                onChange={(event) => setRegisterForm((current) => ({ ...current, parentPhone: event.target.value }))}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Relation (optional)</Label>
              <Input
                value={registerForm.relationToAthlete}
                onChange={(event) => setRegisterForm((current) => ({ ...current, relationToAthlete: event.target.value }))}
                placeholder="Guardian"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRegisterModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void registerNewAthlete()} disabled={isRegisteringAthlete}>
                {isRegisteringAthlete ? "Registering..." : "Register player"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
