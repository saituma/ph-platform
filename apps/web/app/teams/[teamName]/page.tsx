"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { AdminShell } from "../../../components/admin/shell";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { SectionHeader } from "../../../components/admin/section-header";
import { Input } from "../../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";

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
  athleteTeam?: string | null;
};

type AvailableAthlete = {
  athleteId: number;
  displayName: string;
  email: string;
  currentTeam: string | null;
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
  const teamName = useMemo(
    () => decodeURIComponent(encodedName),
    [encodedName],
  );
  const cleanTeamName = useMemo(() => teamName.trim(), [teamName]);
  const [details, setDetails] = useState<TeamDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageNotice, setPageNotice] = useState<string | null>(null);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [includeOtherTeams, setIncludeOtherTeams] = useState(false);
  const [athleteSearch, setAthleteSearch] = useState("");
  const [availableAthletes, setAvailableAthletes] = useState<
    AvailableAthlete[]
  >([]);
  const [isLoadingAvailableAthletes, setIsLoadingAvailableAthletes] =
    useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(
    null,
  );
  const [isAssigningAthlete, setIsAssigningAthlete] = useState(false);
  const [moveConfirmText, setMoveConfirmText] = useState("");

  const selectedAthlete = useMemo(() => {
    if (!selectedAthleteId) return null;
    return (
      availableAthletes.find(
        (athlete) => athlete.athleteId === selectedAthleteId,
      ) ?? null
    );
  }, [availableAthletes, selectedAthleteId]);

  const isMoveFromOtherTeam = useMemo(() => {
    return Boolean(
      includeOtherTeams &&
      selectedAthlete?.currentTeam &&
      selectedAthlete.currentTeam !== cleanTeamName,
    );
  }, [cleanTeamName, includeOtherTeams, selectedAthlete?.currentTeam]);

  const isMoveConfirmed = useMemo(() => {
    return moveConfirmText.trim().toUpperCase() === "MOVE";
  }, [moveConfirmText]);

  const loadDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/backend/admin/teams/${encodeURIComponent(teamName)}`,
        {
          credentials: "include",
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to load team details.");
      }
      const next = payload as TeamDetails;
      setDetails(next);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load team details.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableAthletes = async () => {
    if (!details) return;
    setIsLoadingAvailableAthletes(true);
    try {
      const response = await fetch("/api/backend/admin/users", {
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to load athletes.");
      }

      const teamMemberIds = new Set(
        details.members.map((member) => member.athleteId),
      );

      const nextAthletes = (Array.isArray(payload?.users) ? payload.users : [])
        .filter(
          (user: AdminUser) =>
            user.role === "athlete" && Number.isFinite(user.athleteId),
        )
        .filter((user: AdminUser) => {
          const existingTeam = (user.athleteTeam ?? "").trim();
          if (includeOtherTeams) {
            return existingTeam !== cleanTeamName;
          }
          return existingTeam.length === 0;
        })
        .map(
          (user: AdminUser): AvailableAthlete => ({
            athleteId: Number(user.athleteId),
            displayName:
              user.athleteName ?? user.name ?? `Athlete ${user.athleteId}`,
            email: user.email ?? "—",
            currentTeam: (user.athleteTeam ?? "").trim() || null,
          }),
        )
        .filter(
          (athlete: AvailableAthlete) => !teamMemberIds.has(athlete.athleteId),
        )
        .sort((a: AvailableAthlete, b: AvailableAthlete) =>
          a.displayName.localeCompare(b.displayName),
        );

      setAvailableAthletes(nextAthletes);
      setSelectedAthleteId(nextAthletes[0]?.athleteId ?? null);
    } catch (err) {
      setPageNotice(
        err instanceof Error ? err.message : "Failed to load athletes.",
      );
    } finally {
      setIsLoadingAvailableAthletes(false);
    }
  };

  useEffect(() => {
    if (!assignModalOpen) return;
    setPageNotice(null);
    void loadAvailableAthletes();
  }, [assignModalOpen, includeOtherTeams]);

  useEffect(() => {
    if (!assignModalOpen) return;
    setMoveConfirmText("");
  }, [assignModalOpen, includeOtherTeams, selectedAthleteId]);

  const assignExistingAthlete = async () => {
    if (!selectedAthleteId) return;
    setPageNotice(null);
    setIsAssigningAthlete(true);
    try {
      const allowMoveFromOtherTeam = isMoveFromOtherTeam;
      if (allowMoveFromOtherTeam && !isMoveConfirmed) {
        setPageNotice('Type "MOVE" to confirm moving this athlete.');
        return;
      }

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
          body: JSON.stringify({ allowMoveFromOtherTeam }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          payload?.error ?? "Failed to assign athlete to this team.",
        );
      }

      setAssignModalOpen(false);
      setAthleteSearch("");
      setMoveConfirmText("");
      setPageNotice(
        allowMoveFromOtherTeam && selectedAthlete?.currentTeam
          ? `Member moved from "${selectedAthlete.currentTeam}" to this team.`
          : "Member assigned to team.",
      );
      await loadDetails();
    } catch (err) {
      setPageNotice(
        err instanceof Error
          ? err.message
          : "Failed to assign athlete to this team.",
      );
    } finally {
      setIsAssigningAthlete(false);
    }
  };

  const filteredAvailableAthletes = availableAthletes.filter((athlete) => {
    const normalized = athleteSearch.trim().toLowerCase();
    if (!normalized) return true;
    return `${athlete.displayName} ${athlete.email}`
      .toLowerCase()
      .includes(normalized);
  });

  useEffect(() => {
    if (!teamName) return;
    void loadDetails();
  }, [teamName]);

  return (
    <AdminShell
      title={teamName || "Team details"}
      subtitle="Team details and member list."
    >
      <div className="grid gap-6">
        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}
        {pageNotice ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
            {pageNotice}
          </div>
        ) : null}

        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 pt-6">
            <Button
              size="sm"
              onClick={() => {
                setIncludeOtherTeams(false);
                setAssignModalOpen(true);
              }}
            >
              Assign member
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/teams">Back to teams</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader
              title="Summary"
              description="Overview for this team."
            />
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">
                Loading team details...
              </p>
            ) : (
              <>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Athletes</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {details?.summary.memberCount ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Guardians</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {details?.summary.guardianCount ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {formatDate(details?.summary.createdAt ?? null)}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Last updated</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {formatDate(details?.summary.updatedAt ?? null)}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader
              title="Members"
              description="Team member names. Click a member to open detail page."
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">
                Loading members...
              </p>
            ) : !details?.members.length ? (
              <p className="text-sm text-muted-foreground">
                No members found for this team.
              </p>
            ) : (
              details.members.map((member) => (
                <Link
                  key={member.athleteId}
                  href={`/teams/${encodeURIComponent(teamName)}/members/${member.athleteId}`}
                  className="block rounded-xl border border-border p-4 transition hover:border-primary/50 hover:bg-primary/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {member.athleteName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tier: {member.currentProgramTier ?? "—"} ·
                        Training/week: {member.trainingPerWeek ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Guardian: {member.guardianEmail ?? "N/A"}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-primary">
                      Open member
                    </span>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign member</DialogTitle>
            <DialogDescription>
              Select an athlete to attach to {teamName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Search athlete name or email"
              value={athleteSearch}
              onChange={(event) => setAthleteSearch(event.target.value)}
            />

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={includeOtherTeams}
                onChange={(event) => setIncludeOtherTeams(event.target.checked)}
                className="h-4 w-4"
              />
              Include athletes already assigned to another team
            </label>
            {includeOtherTeams ? (
              <p className="text-xs text-muted-foreground">
                Showing unassigned athletes and athletes already on other teams.
                Assigning an athlete from another team will move them to{" "}
                {cleanTeamName || teamName}.
              </p>
            ) : null}

            {isMoveFromOtherTeam ? (
              <div className="space-y-2 rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">
                  This athlete is currently assigned to another team. Type MOVE
                  to confirm the move.
                </p>
                <Input
                  placeholder="Type MOVE to confirm"
                  value={moveConfirmText}
                  onChange={(event) => setMoveConfirmText(event.target.value)}
                />
              </div>
            ) : null}

            <div className="max-h-72 space-y-2 overflow-auto rounded-xl border border-border p-2">
              {isLoadingAvailableAthletes ? (
                <p className="p-2 text-sm text-muted-foreground">
                  Loading athletes...
                </p>
              ) : filteredAvailableAthletes.length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">
                  No available athletes found.
                </p>
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
                    <p className="text-sm font-medium text-foreground">
                      {athlete.displayName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {athlete.email}
                      {athlete.currentTeam &&
                      athlete.currentTeam !== cleanTeamName
                        ? ` · Current team: ${athlete.currentTeam}`
                        : ""}
                    </p>
                  </button>
                ))
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setAssignModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void assignExistingAthlete()}
                disabled={
                  !selectedAthleteId ||
                  isAssigningAthlete ||
                  isLoadingAvailableAthletes ||
                  (isMoveFromOtherTeam && !isMoveConfirmed)
                }
              >
                {isAssigningAthlete ? "Assigning..." : "Assign member"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
