"use client";

import { Activity, MapPinned, RefreshCw, Route } from "lucide-react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { useGetAdminRunTrackingQuery } from "../../lib/apiSlice";

function formatKm(meters?: number | null) {
  return `${((Number(meters ?? 0) || 0) / 1000).toFixed(1)} km`;
}

function formatDuration(seconds?: number | null) {
  const total = Math.max(0, Number(seconds ?? 0) || 0);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function TrackingPage() {
  const { data, isLoading, error, refetch } = useGetAdminRunTrackingQuery({ limit: 200 });
  const items = data?.items ?? [];
  const summary = data?.summary;

  return (
    <AdminShell
      title="Tracking"
      subtitle="Adult and team athlete route logs, kilometers, duration, and map payloads."
      actions={
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-semibold tabular-nums">{summary?.totalRuns ?? 0}</p>
                <p className="text-xs text-muted-foreground">Runs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Route className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-semibold tabular-nums">{formatKm(summary?.totalMeters)}</p>
                <p className="text-xs text-muted-foreground">Total distance</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <MapPinned className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-semibold tabular-nums">{summary?.teamRunCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Team runs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-semibold tabular-nums">{formatDuration(summary?.totalSeconds)}</p>
              <p className="text-xs text-muted-foreground">Total time</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="border-b border-border/80">
            <SectionHeader
              title="Route logs"
              description="Review athlete route history. Rows include route geometry availability so map views can be added without changing the API again."
            />
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : null}

            {error ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                Could not load tracking logs.
              </p>
            ) : null}

            {!isLoading && !error && items.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                No tracking logs yet.
              </p>
            ) : null}

            {!isLoading && !error && items.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-border/90">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-secondary/50 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Athlete</th>
                      <th className="px-4 py-3 font-medium">Team</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Distance</th>
                      <th className="px-4 py-3 font-medium">Duration</th>
                      <th className="px-4 py-3 font-medium">Effort</th>
                      <th className="px-4 py-3 font-medium">Route</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => (
                      <tr key={row.id} className="border-t border-border/80">
                        <td className="px-4 py-3 font-medium">{row.athleteName ?? `User ${row.userId}`}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.teamName ?? "Solo adult"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(row.date)}</td>
                        <td className="px-4 py-3 tabular-nums">{formatKm(row.distanceMeters)}</td>
                        <td className="px-4 py-3 tabular-nums">{formatDuration(row.durationSeconds)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.effortLevel ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.coordinates ? "Available" : "No map"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
