"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { AdminShell } from "../../components/admin/shell";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { SectionHeader } from "../../components/admin/section-header";

type TeamSummary = {
  team: string;
  memberCount: number;
  guardianCount: number;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
};

function formatDate(value: string | Date | null) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTeams = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/backend/admin/teams", { credentials: "include" });
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

    void loadTeams();
  }, []);

  return (
    <AdminShell
      title="Teams"
      subtitle="All teams created across onboarding imports."
      actions={
        <Button asChild size="sm">
          <Link href="/users/add-team">Add team</Link>
        </Button>
      }
    >
      <div className="grid gap-6">
        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
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
              <p className="text-sm text-muted-foreground">No teams yet. Create one from Add team.</p>
            ) : (
              teams.map((team) => (
                <div key={team.team} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-base font-semibold text-foreground">{team.team}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full border border-border px-2 py-1">
                        {team.memberCount} athlete{team.memberCount === 1 ? "" : "s"}
                      </span>
                      <span className="rounded-full border border-border px-2 py-1">
                        {team.guardianCount} guardian{team.guardianCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Created: {formatDate(team.createdAt)} · Last updated: {formatDate(team.updatedAt)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
