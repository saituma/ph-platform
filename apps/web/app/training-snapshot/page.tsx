"use client";

import Link from "next/link";
import { useMemo } from "react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import {
  ClientTrainingPremiumBanner,
  ClientTrainingSummaryStrip,
  PremiumExerciseProgress,
  tierBadgeProps,
} from "../../components/admin/client-training-workspace";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { useGetTrainingSnapshotQuery } from "../../lib/apiSlice";

type SnapshotRow = {
  athleteId: number;
  athleteName: string;
  programTier: string | null;
  guardianUserId: number;
  sectionCompletions30d: number;
  premiumExercisesTotal: number;
  premiumExercisesDone: number;
};

export default function TrainingSnapshotPage() {
  const { data, isLoading, error, refetch } = useGetTrainingSnapshotQuery();

  const items = useMemo(() => (data?.items ?? []) as SnapshotRow[], [data]);

  const summary = useMemo(() => {
    const premiumTierCount = items.filter((r) => (r.programTier ?? "").includes("Premium")).length;
    const sectionCompletions30dSum = items.reduce((s, r) => s + (r.sectionCompletions30d ?? 0), 0);
    return {
      totalAthletes: items.length,
      premiumTierCount,
      sectionCompletions30dSum,
    };
  }, [items]);

  return (
    <AdminShell
      title="Client training"
      subtitle="Premium coach hub — roster progress, your training assignments, and guardian profiles in one place."
      actions={
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Refresh
        </Button>
      }
    >
      <div className="space-y-8">
        <ClientTrainingPremiumBanner />

        {!isLoading && !error && items.length > 0 ? (
          <ClientTrainingSummaryStrip
            totalAthletes={summary.totalAthletes}
            premiumTierCount={summary.premiumTierCount}
            sectionCompletions30dSum={summary.sectionCompletions30dSum}
          />
        ) : null}

        <Card className="overflow-hidden border-border/90 shadow-sm dark:shadow-black/20">
          <CardHeader className="border-b border-border/80 bg-gradient-to-r from-secondary/35 via-secondary/20 to-transparent dark:from-secondary/15">
            <SectionHeader
              title="Training snapshot"
              description="Last 30 days of program section completions and Premium plan exercise check-offs. Open a guardian profile to message, edit plans, or push training from your library."
            />
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full rounded-xl" />
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : null}

            {error ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                Could not load snapshot. Check admin auth and API, then try Refresh.
              </p>
            ) : null}

            {!isLoading && !error && items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/20 px-6 py-10 text-center dark:bg-secondary/10">
                <p className="font-medium text-foreground">No athletes yet</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  When guardians complete onboarding, their athletes appear here so you can track training and open
                  each profile.
                </p>
                <Button className="mt-4" variant="outline" size="sm" render={<Link href="/users" />}>
                  Go to Users &amp; tiers
                </Button>
              </div>
            ) : null}

            {!isLoading && !error && items.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-border/90">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-secondary/50 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground dark:bg-secondary/25">
                    <tr>
                      <th className="px-4 py-3.5 font-medium">Athlete</th>
                      <th className="px-4 py-3.5 font-medium">Tier</th>
                      <th className="px-4 py-3.5 font-medium">Sections (30d)</th>
                      <th className="min-w-[140px] px-4 py-3.5 font-medium">Premium exercises</th>
                      <th className="px-4 py-3.5 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => {
                      const tier = tierBadgeProps(row.programTier);
                      return (
                        <tr
                          key={row.athleteId}
                          className="border-t border-border/80 transition-colors hover:bg-secondary/35 dark:hover:bg-secondary/15"
                        >
                          <td className="px-4 py-3.5 font-medium text-foreground">{row.athleteName}</td>
                          <td className="px-4 py-3.5">
                            <Badge variant={tier.variant}>{tier.label}</Badge>
                          </td>
                          <td className="px-4 py-3.5 tabular-nums text-muted-foreground">
                            {row.sectionCompletions30d ?? 0}
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground">
                            {row.premiumExercisesTotal > 0 ? (
                              <PremiumExerciseProgress
                                done={row.premiumExercisesDone ?? 0}
                                total={row.premiumExercisesTotal}
                              />
                            ) : (
                              <span className="text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <Button variant="outline" size="sm" render={<Link href={`/users/${row.guardianUserId}`} />}>
                              Open profile
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
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
