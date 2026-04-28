"use client";

import { ClipboardList, RefreshCw } from "lucide-react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { useGetAdminTrainingQuestionnairesQuery } from "../../lib/apiSlice";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function labelSource(source?: string | null) {
  if (source === "premium_plan") return "Premium plan";
  if (source === "program_section") return "Program";
  if (source === "workout_log") return "Workout log";
  return source ?? "Session";
}

export default function TrainingQuestionnairesPage() {
  const { data, isLoading, error, refetch } = useGetAdminTrainingQuestionnairesQuery({ limit: 200 });
  const items = data?.items ?? [];

  return (
    <AdminShell
      title="Training answers"
      subtitle="Adult and team athlete post-session questionnaire responses, workout logs, and readiness notes."
      actions={
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      }
    >
      <Card>
        <CardHeader className="border-b border-border/80">
          <SectionHeader
            title="Questionnaire stream"
            description="RPE, soreness, fatigue, notes, weights, and reps from finished sessions."
          />
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Could not load questionnaire answers.
            </p>
          ) : null}

          {!isLoading && !error && items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
              <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">No questionnaire answers yet.</p>
            </div>
          ) : null}

          {!isLoading && !error && items.length > 0 ? (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={`${item.source}-${item.id}`} className="rounded-2xl border border-border/90 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{item.athleteName ?? `Athlete ${item.athleteId}`}</p>
                        <Badge variant="secondary">{labelSource(item.source)}</Badge>
                        {item.teamName ? <Badge variant="outline">{item.teamName}</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.title ?? "Untitled session"}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(item.completedAt)}</p>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                    <div className="rounded-xl bg-secondary/40 p-3">
                      <p className="text-xs text-muted-foreground">RPE</p>
                      <p className="font-medium tabular-nums">{item.rpe ?? "—"}</p>
                    </div>
                    <div className="rounded-xl bg-secondary/40 p-3">
                      <p className="text-xs text-muted-foreground">Soreness</p>
                      <p className="font-medium tabular-nums">{item.soreness ?? "—"}</p>
                    </div>
                    <div className="rounded-xl bg-secondary/40 p-3">
                      <p className="text-xs text-muted-foreground">Fatigue</p>
                      <p className="font-medium tabular-nums">{item.fatigue ?? "—"}</p>
                    </div>
                    <div className="rounded-xl bg-secondary/40 p-3">
                      <p className="text-xs text-muted-foreground">Athlete type</p>
                      <p className="font-medium capitalize">{item.athleteType ?? "—"}</p>
                    </div>
                  </div>

                  {item.weightsUsed || item.repsCompleted || item.notes ? (
                    <div className="mt-4 rounded-xl border border-border/80 bg-background p-3 text-sm text-muted-foreground">
                      {item.weightsUsed ? <p><span className="font-medium text-foreground">Weights:</span> {item.weightsUsed}</p> : null}
                      {item.repsCompleted ? <p><span className="font-medium text-foreground">Reps:</span> {item.repsCompleted}</p> : null}
                      {item.notes ? <p><span className="font-medium text-foreground">Notes:</span> {item.notes}</p> : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
