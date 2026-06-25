"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import {
  Activity,
  Apple,
  ChevronRight,
  Dumbbell,
  Search,
  ShieldAlert,
  UserRound,
  Users,
  Video,
} from "lucide-react";

import { AdminShell } from "../../components/admin/shell";
import { EmptyState } from "../../components/admin/empty-state";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { cn } from "../../lib/utils";
import {
  type ClientDataAthleteRow,
  useGetClientDataAthletesQuery,
} from "../../lib/apiSlice";

const TYPE_FILTERS = [
  { label: "All", value: "all" },
  { label: "Youth", value: "youth" },
  { label: "Adult", value: "adult" },
  { label: "Team", value: "team" },
] as const;

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function tierLabel(value?: string | null) {
  if (!value) return "No tier";
  return value.replace(/^PHP_?/, "PHP ").replace(/_/g, " ");
}

function typeLabel(athlete: ClientDataAthleteRow) {
  if (athlete.team) return "Team";
  if (athlete.athleteType === "adult") return "Adult";
  return "Youth";
}

function statusClass(status?: string | null) {
  if (status === "active") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-500";
  if (status === "blocked") return "border-red-500/25 bg-red-500/10 text-red-500";
  return "border-amber-500/25 bg-amber-500/10 text-amber-500";
}

function AthleteAvatar({ athlete }: { athlete: ClientDataAthleteRow }) {
  if (athlete.profilePicture) {
    return (
      <img
        src={athlete.profilePicture}
        alt={athlete.name}
        className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-xs font-black text-muted-foreground">
      {initials(athlete.name) || "AT"}
    </div>
  );
}

function AthleteRow({ athlete }: { athlete: ClientDataAthleteRow }) {
  return (
    <TableRow className="group">
      <TableCell>
        <Link href={`/client-data/${athlete.athleteId}`} className="flex min-w-[240px] items-center gap-3">
          <AthleteAvatar athlete={athlete} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">{athlete.name}</span>
            <span className="mt-1 block truncate text-xs text-muted-foreground">{athlete.email ?? "No email"}</span>
          </span>
        </Link>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="rounded-md">
          {typeLabel(athlete)}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{athlete.age ?? "-"}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{athlete.team ?? "-"}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{tierLabel(athlete.programTier)}</TableCell>
      <TableCell>
        <span className={cn("inline-flex rounded-md border px-2 py-1 text-xs font-semibold capitalize", statusClass(athlete.status))}>
          {athlete.status}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Activity className="h-3.5 w-3.5" />
            {athlete.runsCount ?? 0}
          </span>
          <span className="inline-flex items-center gap-1">
            <Apple className="h-3.5 w-3.5" />
            {athlete.nutritionCount ?? 0}
          </span>
          <span className="inline-flex items-center gap-1">
            <Dumbbell className="h-3.5 w-3.5" />
            {athlete.trainingCount ?? 0}
          </span>
          <span className="inline-flex items-center gap-1">
            <Video className="h-3.5 w-3.5" />
            {athlete.videoCount ?? 0}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Button size="sm" variant="ghost" className="gap-1" render={<Link href={`/client-data/${athlete.athleteId}`} />}>
          Open
          <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function ClientDataPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<(typeof TYPE_FILTERS)[number]["value"]>("all");
  const deferredSearch = useDeferredValue(search.trim());
  const { data, isLoading, isFetching, error } = useGetClientDataAthletesQuery({
    q: deferredSearch,
    type,
    limit: 100,
  });

  const athletes = useMemo(() => data?.items ?? [], [data?.items]);
  const grouped = useMemo(() => {
    const map = new Map<string, ClientDataAthleteRow[]>();
    for (const athlete of athletes) {
      const letter = (athlete.name?.trim()[0] ?? "#").toUpperCase();
      const key = /[A-Z]/.test(letter) ? letter : "#";
      map.set(key, [...(map.get(key) ?? []), athlete]);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [athletes]);

  const totals = useMemo(
    () => ({
      athletes: data?.pageInfo.totalCount ?? athletes.length,
      youth: athletes.filter((athlete) => typeLabel(athlete) === "Youth").length,
      adult: athletes.filter((athlete) => typeLabel(athlete) === "Adult").length,
      team: athletes.filter((athlete) => typeLabel(athlete) === "Team").length,
    }),
    [athletes, data?.pageInfo.totalCount],
  );

  return (
    <AdminShell title="Client Data" subtitle="Athlete records, history, and performance data.">
      <div className="space-y-6">
        <section className="grid gap-3 md:grid-cols-4">
          {[
            { label: "Athletes", value: totals.athletes, icon: Users },
            { label: "Youth", value: totals.youth, icon: UserRound },
            { label: "Adult", value: totals.adult, icon: Activity },
            { label: "Team", value: totals.team, icon: ShieldAlert },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 text-2xl font-black text-foreground">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search athlete name, email, or team..."
                className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {TYPE_FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  size="sm"
                  variant={type === filter.value ? "default" : "outline"}
                  onClick={() => setType(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {error ? (
          <EmptyState
            title="Client data could not load"
            description="The server rejected or failed the athlete data request."
            icon={ShieldAlert}
          />
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-lg bg-secondary/60" />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <EmptyState
            title="No athletes found"
            description="Try a different name or athlete type filter."
            icon={Search}
          />
        ) : (
          <div className="space-y-5">
            {isFetching ? <p className="text-xs text-muted-foreground">Refreshing results...</p> : null}
            {grouped.map(([letter, rows]) => (
              <section key={letter} className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-4 py-3">
                  <h2 className="text-sm font-black uppercase tracking-widest text-foreground">{letter}</h2>
                  <span className="text-xs text-muted-foreground">
                    {rows.length} athlete{rows.length === 1 ? "" : "s"}
                  </span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Athlete</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((athlete) => (
                      <AthleteRow key={athlete.athleteId} athlete={athlete} />
                    ))}
                  </TableBody>
                </Table>
              </section>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
