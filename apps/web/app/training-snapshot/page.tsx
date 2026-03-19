"use client";

import Link from "next/link";
import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useGetTrainingSnapshotQuery } from "../../lib/apiSlice";

function tierLabel(tier: string | null | undefined) {
  if (!tier) return "—";
  return tier.replace(/^PHP_?/i, "").replace(/_/g, " ") || tier;
}

export default function TrainingSnapshotPage() {
  const { data, isLoading, error, refetch } = useGetTrainingSnapshotQuery();

  const items = data?.items ?? [];

  return (
    <AdminShell
      title="Client training"
      subtitle="At-a-glance progress for every athlete. Open a guardian profile for full history."
      actions={
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Refresh
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <SectionHeader
            title="Training snapshot"
            description="Section completions (last 30 days) and Premium plan exercise check-offs. Links go to the guardian account for messaging and plan edits."
          />
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
          {error ? (
            <p className="text-sm text-red-500">Could not load snapshot. Check admin auth and API.</p>
          ) : null}
          {!isLoading && !error && items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No athletes found.</p>
          ) : null}
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Athlete</th>
                  <th className="px-4 py-3 font-medium">Tier</th>
                  <th className="px-4 py-3 font-medium">Sections (30d)</th>
                  <th className="px-4 py-3 font-medium">Premium exercises</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row: any) => (
                  <tr key={row.athleteId} className="border-t border-border">
                    <td className="px-4 py-3 font-medium text-foreground">{row.athleteName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{tierLabel(row.programTier)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.sectionCompletions30d ?? 0}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.premiumExercisesTotal > 0
                        ? `${row.premiumExercisesDone ?? 0}/${row.premiumExercisesTotal}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/users/${row.guardianUserId}`}>Open profile</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AdminShell>
  );
}
