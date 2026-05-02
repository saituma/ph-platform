"use client";

import { useMemo } from "react";
import Link from "next/link";
import { BarChart3, TrendingUp } from "lucide-react";

import { ParentShell } from "../../../components/parent/shell";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import { useGetTrainingSnapshotQuery } from "../../../lib/apiSlice";

export default function ParentProgressPage() {
  const { data, isLoading } = useGetTrainingSnapshotQuery();

  const athletes = useMemo(() => {
    return data?.items ?? [];
  }, [data]);

  return (
    <ParentShell title="Progress" subtitle="Athlete training progress overview.">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {athletes.length} athlete{athletes.length !== 1 ? "s" : ""} tracked
          </p>
          <Button variant="outline" render={<Link href="/training-snapshot" />}>
            Full Training View
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={`prog-skel-${i}`} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : athletes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <BarChart3 className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No training data available yet.</p>
              <p className="text-xs text-muted-foreground">Progress will appear once athletes begin their programs.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {athletes.slice(0, 12).map((athlete: { athleteId: number; athleteName: string; programTier?: string | null; sectionCompletions30d: number; premiumExercisesTotal: number }) => (
              <Card key={athlete.athleteId} className="transition hover:border-primary/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{athlete.athleteName}</CardTitle>
                  {athlete.programTier && (
                    <p className="text-xs text-muted-foreground">{athlete.programTier}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Sessions (30d)</span>
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <TrendingUp className="h-3 w-3 text-primary" />
                      {athlete.sectionCompletions30d}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Exercises</span>
                    <span className="font-semibold text-foreground">{athlete.premiumExercisesTotal}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ParentShell>
  );
}
