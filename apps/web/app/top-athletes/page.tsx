"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { TopAthleteRow } from "../../components/admin/dashboard/dashboard-overview";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "../../components/ui/select";
import { Skeleton } from "../../components/ui/skeleton";
import { useGetDashboardQuery } from "../../lib/apiSlice";

const tierFilterItems = [
  { label: "All tiers", value: "all" },
  { label: "Program", value: "program" },
  { label: "Premium", value: "premium" },
  { label: "Premium Plus", value: "premium-plus" },
  { label: "Pro", value: "pro" },
];

const scoreFilterItems = [
  { label: "Any activity", value: "all" },
  { label: "1+ sessions (30d)", value: "1" },
  { label: "2+ sessions (30d)", value: "2" },
  { label: "3+ sessions (30d)", value: "3" },
  { label: "5+ sessions (30d)", value: "5" },
];

type DashboardTopAthlete = {
  name: string;
  team?: string | null;
  tier?: string | null;
  score?: string | number | null;
};

type TierFilter = "all" | "program" | "premium" | "premium-plus" | "pro";
type ScoreFilter = "all" | "1" | "2" | "3" | "5";

type AthleteRow = {
  name: string;
  team: string;
  tier: "Program" | "Premium" | "Premium Plus" | "Pro";
  scoreLabel: string;
  sessionsLast30d: number;
};

function formatTierLabel(tier?: string | null): AthleteRow["tier"] {
  if (tier === "PHP_Pro") return "Pro";
  if (tier === "PHP_Premium_Plus") return "Premium Plus";
  if (tier === "PHP_Premium") return "Premium";
  return "Program";
}

function parseSessionCount(score?: string | number | null) {
  if (typeof score === "number") return Number.isFinite(score) ? score : 0;
  if (typeof score !== "string") return 0;
  const match = score.match(/(\d+)/);
  return match ? Number.parseInt(match[1] ?? "0", 10) : 0;
}

export default function TopAthletesPage() {
  const { data: dashboardData, isLoading, isFetching, refetch } = useGetDashboardQuery();
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");
  const [teamFilter, setTeamFilter] = useState("all");

  const athletes = useMemo(() => {
    const source = (dashboardData?.topAthletes ?? []) as DashboardTopAthlete[];
    return source.map((athlete): AthleteRow => {
      const sessions = parseSessionCount(athlete.score);
      return {
        name: athlete.name,
        team: athlete.team?.trim() ? athlete.team : "Unassigned",
        tier: formatTierLabel(athlete.tier),
        scoreLabel: athlete.score != null && String(athlete.score).trim() ? String(athlete.score) : "No activity yet",
        sessionsLast30d: sessions,
      };
    });
  }, [dashboardData]);

  const teamOptions = useMemo(() => {
    const teams = new Set<string>();
    for (const athlete of athletes) teams.add(athlete.team);
    return Array.from(teams).sort((a, b) => a.localeCompare(b));
  }, [athletes]);

  const teamFilterItems = useMemo(
    () => [
      { label: "All teams", value: "all" },
      ...teamOptions.map((team) => ({ label: team, value: team })),
    ],
    [teamOptions]
  );

  const filteredAthletes = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const minSessions = scoreFilter === "all" ? 0 : Number.parseInt(scoreFilter, 10);

    return athletes.filter((athlete) => {
      if (tierFilter !== "all") {
        const tierMatches =
          (tierFilter === "program" && athlete.tier === "Program") ||
          (tierFilter === "premium" && athlete.tier === "Premium") ||
          (tierFilter === "premium-plus" && athlete.tier === "Premium Plus") ||
          (tierFilter === "pro" && athlete.tier === "Pro");
        if (!tierMatches) return false;
      }

      if (athlete.sessionsLast30d < minSessions) return false;
      if (teamFilter !== "all" && athlete.team !== teamFilter) return false;

      if (!normalizedSearch) return true;
      return `${athlete.name} ${athlete.team}`.toLowerCase().includes(normalizedSearch);
    });
  }, [athletes, scoreFilter, search, teamFilter, tierFilter]);

  return (
    <AdminShell
      title="Top Athletes"
      subtitle="Most active this period — full ranking with filters."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" render={<Link href="/" />}>
            Back to Overview
          </Button>
        </div>
      }
    >
      <Card>
        <CardHeader>
          <SectionHeader
            title="TOP ATHLETES"
            description="MOST ACTIVE THIS PERIOD."
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search athlete or team"
              aria-label="Search athlete"
            />
            <Select
              items={tierFilterItems}
              value={tierFilter}
              onValueChange={(value) => setTierFilter(value as TierFilter)}
              aria-label="Filter by tier"
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectPopup>
                {tierFilterItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <Select
              items={scoreFilterItems}
              value={scoreFilter}
              onValueChange={(value) => setScoreFilter(value as ScoreFilter)}
              aria-label="Filter by activity"
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectPopup>
                {scoreFilterItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <Select
              items={teamFilterItems}
              value={teamFilter}
              onValueChange={(v) => setTeamFilter(v ?? "")}
              aria-label="Filter by team"
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectPopup>
                {teamFilterItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Skeleton key={idx} className="h-16 w-full rounded-none" />
              ))}
            </div>
          ) : filteredAthletes.length ? (
            <div className="space-y-3">
              {filteredAthletes.map((athlete, index) => (
                <TopAthleteRow
                  key={`${athlete.name}-${index}`}
                  rank={index + 1}
                  name={athlete.name}
                  score={`${athlete.scoreLabel} • Team: ${athlete.team}`}
                  tier={athlete.tier}
                  tierVariant={athlete.tier === "Premium" ? "secondary" : "default"}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-secondary/20 px-6 py-10 text-center">
              <p className="font-medium text-foreground">No athletes match this filter</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try clearing search or lowering the minimum sessions filter.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
