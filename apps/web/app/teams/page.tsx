"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  paymentQueue?: {
    requestId: number;
    status: string;
    paymentMode: string;
    allPaymentsComplete: boolean;
    paidCount: number;
    totalCount: number;
    sponsoredCount: number;
  } | null;
};

function getCsrfToken() {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split(";")
      .map((p) => p.trim())
      .find((p) => p.startsWith("csrfToken="))
      ?.split("=")
      .slice(1)
      .join("=") ?? ""
  );
}

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
  const [sponsoringId, setSponsoringId] = useState<number | null>(null);
  const router = useRouter();
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
      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/backend/admin/teams/${teamId}/approve`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(csrfToken ? { "x-csrf-token": csrfToken } : {}) },
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

  const approveAndSponsor = async (teamId: number) => {
    setSponsoringId(teamId);
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/backend/admin/teams/${teamId}/approve-sponsor-rest`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(csrfToken ? { "x-csrf-token": csrfToken } : {}) },
        body: JSON.stringify({ billingCycle: "monthly" }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Failed to approve team and sponsor remaining players.");
      }
      await loadTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve and sponsor team.");
    } finally {
      setSponsoringId(null);
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
                    role="link"
                    tabIndex={0}
                    onClick={(event) => {
                      const target = event.target as HTMLElement;
                      if (target.closest("a,button")) return;
                      router.push(`/teams/${encodeURIComponent(team.team)}`);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      router.push(`/teams/${encodeURIComponent(team.team)}`);
                    }}
                    className="group block cursor-pointer rounded-xl border border-border p-4 transition hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
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
                          {team.paymentQueue ? (
                            <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-sky-200">
                              Queue: {team.paymentQueue.paidCount}/{team.paymentQueue.totalCount} paid
                              {team.paymentQueue.sponsoredCount > 0 ? ` · ${team.paymentQueue.sponsoredCount} sponsored` : ""}
                            </span>
                          ) : null}
                          {team.planExpiresAt ? (
                            <span className="rounded-full border border-border px-2 py-1">
                              Expires {formatDate(team.planExpiresAt)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {(team.subscriptionStatus ?? "pending_payment") !== "active" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); approveTeam(team.id); }}
                              disabled={approvingId === team.id}
                            >
                              {approvingId === team.id ? "Approving…" : "Approve"}
                            </Button>
                            {team.paymentQueue && team.paymentQueue.totalCount > team.paymentQueue.paidCount ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 border-violet-500/30 text-violet-200 hover:bg-violet-500/10"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); approveAndSponsor(team.id); }}
                                disabled={sponsoringId === team.id}
                              >
                                {sponsoringId === team.id ? "Sponsoring…" : "Approve — sponsor the rest"}
                              </Button>
                            ) : null}
                          </>
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
                    <p className="mt-2 text-xs text-muted-foreground">
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
