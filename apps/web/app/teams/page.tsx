"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { AdminShell } from "../../components/admin/shell";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { SectionHeader } from "../../components/admin/section-header";

type TeamSummary = {
  id: number;
  team: string;
  athleteType: "youth" | "adult";
  minAge: number | null;
  maxAge: number | null;
  memberCount: number;
  maxAthletes: number;
  subscriptionStatus: string | null;
  planPaymentType: string | null;
  planCommitmentMonths: number | null;
  planExpiresAt: string | Date | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
};

function billingLabel(team: TeamSummary): { text: string; color: string } {
  const status = team.subscriptionStatus ?? "pending_payment";
  if (status === "active") {
    const cycle = team.planPaymentType === "upfront"
      ? `${team.planCommitmentMonths ?? 12}mo upfront`
      : "monthly";
    return { text: `Active · ${cycle}`, color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" };
  }
  if (status === "cancelled") return { text: "Cancelled", color: "border-red-500/30 bg-red-500/10 text-red-200" };
  if (status === "past_due") return { text: "Past due", color: "border-red-500/30 bg-red-500/10 text-red-200" };
  return { text: "Waiting payment", color: "border-amber-500/30 bg-amber-500/10 text-amber-200" };
}

function formatDate(value: string | Date | null) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function TeamsPageContent() {
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const searchParams = useSearchParams();
  const successType = searchParams.get("success");

  const loadTeams = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/backend/admin/teams", {
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to load teams.");
      }
      setTeams(Array.isArray(payload?.teams) ? payload.teams : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams.");
    } finally {
      setIsLoading(false);
    }
  };

  const approveTeam = async (teamId: number) => {
    setApprovingId(teamId);
    try {
      const res = await fetch(`/api/backend/admin/teams/${teamId}/approve`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingCycle: "monthly" }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to approve team.");
      }
      await loadTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve team.");
    } finally {
      setApprovingId(null);
    }
  };

  useEffect(() => {
    void loadTeams();
  }, []);

  return (
    <AdminShell
      title="Teams"
      subtitle="All teams created across onboarding imports."
      actions={
        <Button size="sm" render={<Link href="/users/add-team" />}>
          Add team
        </Button>
      }
    >
      <div className="grid gap-6">
        {successType === "email_sent" && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            Payment link sent to the team manager. The team will activate once they complete payment, or you can approve it instantly below.
          </div>
        )}
        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}
        <Card>
          <CardHeader>
            <SectionHeader
              title="All Teams"
              description="Grouped by athlete team name."
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading teams...</p>
            ) : teams.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No teams yet. Create one from Add team.
              </p>
            ) : (
              <div className="grid gap-3">
                {teams.map((team) => (
                  <div
                    key={team.team}
                    className="group relative block rounded-xl border border-border p-4 transition hover:border-primary/50 hover:bg-primary/5"
                  >
                    <Link
                      href={`/teams/${encodeURIComponent(team.team)}`}
                      className="absolute inset-0 z-0"
                    />
                    <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-foreground">
                          {team.team}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className={`rounded-full border px-2 py-1 ${team.athleteType === 'adult' ? 'border-blue-500/30 bg-blue-500/10 text-blue-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'}`}>
                            {team.athleteType === 'adult' ? 'Adult Team' : 'Youth Team'}
                          </span>
                          {(team.minAge != null || team.maxAge != null) ? (
                            <span className="rounded-full border border-border px-2 py-1">
                              Ages {team.minAge ?? '?'}-{team.maxAge ?? '?'}
                            </span>
                          ) : null}
                          <span className="rounded-full border border-border px-2 py-1">
                            {team.memberCount}{team.maxAthletes > 0 ? `/${team.maxAthletes}` : ""} athlete
                            {team.memberCount === 1 ? "" : "s"}
                          </span>
                          <span className={`rounded-full border px-2 py-1 ${billingLabel(team).color}`}>
                            {billingLabel(team).text}
                          </span>
                          {team.planExpiresAt ? (
                            <span className="rounded-full border border-border px-2 py-1">
                              Expires {formatDate(team.planExpiresAt)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {(team.subscriptionStatus ?? "pending_payment") !== "active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); approveTeam(team.id); }}
                            disabled={approvingId === team.id}
                          >
                            {approvingId === team.id ? "Approving…" : "Approve"}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          render={<Link href={`/exercise-library/teams/${encodeURIComponent(team.team)}`} />}
                          className="h-8"
                        >
                          Post training
                        </Button>
                      </div>
                    </div>
                    <p className="relative z-10 mt-2 text-xs text-muted-foreground">
                      Created: {formatDate(team.createdAt)} · Last updated:{" "}
                      {formatDate(team.updatedAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}

export default function TeamsPage() {
  return (
    <Suspense>
      <TeamsPageContent />
    </Suspense>
  );
}
