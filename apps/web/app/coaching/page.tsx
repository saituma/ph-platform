"use client";

import { useCallback, useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import {
  Activity,
  ChevronRight,
  Clock,
  Crown,
  Dumbbell,
  Eye,
  MessageCircle,
  PlayCircle,
  Search,
  TrendingUp,
  User,
  Video,
} from "lucide-react";

import { AdminShell } from "../../components/admin/shell";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { cn } from "../../lib/utils";
import {
  useGetTrainingSnapshotQuery,
  useGetUserPremiumPlanQuery,
  useGetUserPremiumSessionCheckinsQuery,
  useGetUserProgramSectionCompletionsQuery,
  useGetVideoUploadsQuery,
  useGetUsersQuery,
  useGetUserOnboardingQuery,
} from "../../lib/apiSlice";

export default function CoachingPage() {
  const { data: snapshotData, isLoading: snapshotLoading } = useGetTrainingSnapshotQuery();
  const { data: usersData } = useGetUsersQuery();
  const { data: videosData } = useGetVideoUploadsQuery();
  const [search, setSearch] = useState("");
  const [selectedAthleteUserId, setSelectedAthleteUserId] = useState<number | null>(null);

  const premiumAthletes = useMemo(() => {
    const items = snapshotData?.items ?? [];
    return items.filter(
      (a: any) =>
        a.programTier === "PHP_Premium" || a.programTier === "premium",
    );
  }, [snapshotData]);

  const filtered = useMemo(() => {
    if (!search.trim()) return premiumAthletes;
    const q = search.toLowerCase();
    return premiumAthletes.filter((a: any) =>
      a.athleteName?.toLowerCase().includes(q),
    );
  }, [premiumAthletes, search]);

  const pendingVideosByAthlete = useMemo(() => {
    const map = new Map<number, number>();
    for (const v of videosData?.items ?? []) {
      if (v.reviewedAt) continue;
      const athleteId = v.athleteId ?? v.athlete?.id;
      if (!athleteId) continue;
      map.set(athleteId, (map.get(athleteId) ?? 0) + 1);
    }
    return map;
  }, [videosData]);

  return (
    <AdminShell title="1:1 Premium Coaching" subtitle="Athlete command center">
      <div className="flex gap-6" style={{ minHeight: "calc(100vh - 200px)" }}>
        {/* Left panel — athlete list */}
        <div className="w-80 shrink-0 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search athletes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {filtered.length} Premium athlete{filtered.length !== 1 ? "s" : ""}
          </div>

          <div className="space-y-1.5 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
            {snapshotLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-secondary/50" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No Premium athletes found.
              </div>
            ) : (
              filtered.map((athlete: any) => {
                const athleteUserId = athlete.athleteUserId ?? athlete.guardianUserId;
                const isActive = selectedAthleteUserId === athleteUserId;
                const progress = athlete.premiumExercisesTotal
                  ? Math.round((athlete.premiumExercisesDone / athlete.premiumExercisesTotal) * 100)
                  : 0;
                const exerciseSummary = athlete.premiumExercisesTotal > 0
                  ? `${athlete.premiumExercisesDone}/${athlete.premiumExercisesTotal} exercises`
                  : athlete.sectionCompletions30d > 0
                    ? `${athlete.sectionCompletions30d} completed`
                    : "No completed training yet";
                const pendingVideos = pendingVideosByAthlete.get(athlete.athleteId) ?? 0;

                return (
                  <button
                    key={athlete.athleteId}
                    onClick={() => setSelectedAthleteUserId(athleteUserId)}
                    className={cn(
                      "w-full text-left rounded-xl border p-3.5 transition-all",
                      isActive
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/30 hover:bg-secondary/30",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground",
                        )}>
                          {(athlete.athleteName ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {athlete.athleteName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {exerciseSummary}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {pendingVideos > 0 && (
                          <Badge variant="accent" className="rounded-full text-[10px]">
                            {pendingVideos}
                          </Badge>
                        )}
                        <ChevronRight className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                      </div>
                    </div>

                    {athlete.premiumExercisesTotal > 0 && (
                      <div className="mt-3">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right panel — athlete detail */}
        <div className="flex-1 min-w-0">
          {selectedAthleteUserId ? (
            <AthleteCoachingPanel userId={selectedAthleteUserId} />
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border bg-card">
              <div className="text-center space-y-3 px-6">
                <Crown className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <p className="text-lg font-semibold text-foreground">Select an athlete</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Pick a Premium athlete from the list to see their training plan, session check-ins, exercise progress, and uploaded videos.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

function AthleteCoachingPanel({ userId }: { userId: number }) {
  const { data: onboarding, isLoading: onboardingLoading } = useGetUserOnboardingQuery(userId);
  const { data: planData, isLoading: planLoading } = useGetUserPremiumPlanQuery({ userId });
  const { data: checkinsData, isLoading: checkinsLoading } = useGetUserPremiumSessionCheckinsQuery({ userId, limit: 30 });
  const { data: completionsData, isLoading: completionsLoading } = useGetUserProgramSectionCompletionsQuery({ userId, limit: 30 });
  const { data: videosData } = useGetVideoUploadsQuery();
  const [activeVideo, setActiveVideo] = useState<any | null>(null);

  const athleteName = onboarding?.athlete?.name ?? "Athlete";
  const athleteAge = onboarding?.athlete?.age ?? null;
  const team = onboarding?.athlete?.team ?? null;
  const injuries = onboarding?.athlete?.injuries ?? null;
  const goals = onboarding?.athlete?.performanceGoals ?? null;

  const sessions = useMemo(() => {
    const items = planData?.items ?? [];
    return items.slice().sort(
      (a: any, b: any) =>
        Number(a.weekNumber) - Number(b.weekNumber) ||
        Number(a.sessionNumber) - Number(b.sessionNumber),
    );
  }, [planData]);

  const weeks = useMemo(() => {
    const set = new Set<number>();
    for (const s of sessions) set.add(Number(s.weekNumber));
    return Array.from(set).sort((a, b) => a - b);
  }, [sessions]);

  const [activeWeek, setActiveWeek] = useState<number | null>(null);
  const displayWeek = activeWeek ?? weeks[weeks.length - 1] ?? 1;

  const weekSessions = useMemo(
    () => sessions.filter((s: any) => Number(s.weekNumber) === displayWeek),
    [displayWeek, sessions],
  );

  const checkins = checkinsData?.items ?? [];
  const programCompletions = completionsData?.items ?? [];
  const fallbackCheckins = useMemo(
    () =>
      programCompletions.filter(
        (c: any) => c.rpe != null || c.soreness != null || c.fatigue != null || c.notes,
      ),
    [programCompletions],
  );
  const displayCheckins = checkins.length > 0 ? checkins : fallbackCheckins;

  const athleteVideos = useMemo(() => {
    const athleteId = onboarding?.athlete?.id;
    if (!athleteId) return [];
    return (videosData?.items ?? []).filter(
      (v: any) => (v.athleteId ?? v.athlete?.id) === athleteId,
    );
  }, [onboarding?.athlete?.id, videosData]);

  const avgRpe = useMemo(() => {
    const vals = displayCheckins.filter((c: any) => c.rpe != null).map((c: any) => c.rpe);
    return vals.length ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1) : "—";
  }, [displayCheckins]);

  const avgSoreness = useMemo(() => {
    const vals = displayCheckins.filter((c: any) => c.soreness != null).map((c: any) => c.soreness);
    return vals.length ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1) : "—";
  }, [displayCheckins]);

  const avgFatigue = useMemo(() => {
    const vals = displayCheckins.filter((c: any) => c.fatigue != null).map((c: any) => c.fatigue);
    return vals.length ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1) : "—";
  }, [displayCheckins]);

  const totalExercises = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const s of sessions) {
      for (const ex of s.exercises ?? []) {
        total++;
        if (ex.completed) done++;
      }
    }
    return { total, done };
  }, [sessions]);

  const statExercisesValue =
    totalExercises.total > 0
      ? `${totalExercises.done}/${totalExercises.total}`
      : programCompletions.length > 0
        ? `${programCompletions.length} completed`
        : "0/0";

  if (onboardingLoading) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Loading athlete...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground">
            {athleteName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{athleteName}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {team && <Badge variant="outline" className="rounded-full">{team}</Badge>}
              {athleteAge != null && <Badge variant="outline" className="rounded-full">Age {athleteAge}</Badge>}
              <Badge variant="accent" className="rounded-full">Premium</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Dumbbell} label="Exercises Done" value={statExercisesValue} />
        <StatCard icon={Activity} label="Avg RPE" value={String(avgRpe)} color={Number(avgRpe) >= 8 ? "text-red-500" : undefined} />
        <StatCard icon={TrendingUp} label="Avg Soreness" value={String(avgSoreness)} />
        <StatCard icon={Clock} label="Avg Fatigue" value={String(avgFatigue)} />
      </div>

      {/* Profile notes */}
      {(injuries || goals) && (
        <div className="grid gap-3 md:grid-cols-2">
          {injuries && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Injuries / Notes</p>
              <p className="text-sm text-foreground">{injuries}</p>
            </div>
          )}
          {goals && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Performance Goals</p>
              <p className="text-sm text-foreground">{goals}</p>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="plan">
        <TabsList>
          <TabsTrigger value="plan">Training Plan</TabsTrigger>
          <TabsTrigger value="checkins">Check-ins ({displayCheckins.length})</TabsTrigger>
          <TabsTrigger value="videos">Videos ({athleteVideos.length})</TabsTrigger>
        </TabsList>

        {/* Training Plan Tab */}
        <TabsContent value="plan">
          {planLoading ? (
            <div className="text-sm text-muted-foreground">Loading plan...</div>
          ) : sessions.length === 0 ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No 1:1 premium plan assigned yet. Assign a template from the athlete&apos;s profile page.
              </div>
              {completionsLoading ? (
                <div className="text-sm text-muted-foreground">Loading completed mobile training...</div>
              ) : programCompletions.length > 0 ? (
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Completed Mobile Training
                  </p>
                  <div className="space-y-2">
                    {programCompletions.slice(0, 10).map((completion: any) => {
                      const completedAt = completion.completedAt ? new Date(completion.completedAt) : null;
                      return (
                        <div key={completion.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {completion.contentTitle ?? completion.title ?? "Completed session"}
                            </p>
                            {completion.sectionTitle ? (
                              <p className="text-xs text-muted-foreground">{completion.sectionTitle}</p>
                            ) : null}
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {completedAt ? completedAt.toLocaleDateString() : "Completed"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {weeks.map((w) => (
                  <Button
                    key={w}
                    size="sm"
                    variant={displayWeek === w ? "default" : "outline"}
                    onClick={() => setActiveWeek(w)}
                    className="rounded-full"
                  >
                    Week {w}
                  </Button>
                ))}
              </div>

              {weekSessions.length === 0 ? (
                <div className="text-sm text-muted-foreground">No sessions in Week {displayWeek}.</div>
              ) : (
                <div className="space-y-3">
                  {weekSessions.map((session: any) => {
                    const exercises = (session.exercises ?? [])
                      .slice()
                      .sort((a: any, b: any) => Number(a.order) - Number(b.order));
                    const done = exercises.filter((e: any) => e.completed).length;
                    return (
                      <div key={session.id} className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 bg-secondary/30">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              Session {session.sessionNumber}
                              {session.title ? ` — ${session.title}` : ""}
                            </p>
                            {session.notes && (
                              <p className="text-xs text-muted-foreground mt-0.5">{session.notes}</p>
                            )}
                          </div>
                          <Badge variant={done === exercises.length && exercises.length > 0 ? "accent" : "default"} className="rounded-full">
                            {done}/{exercises.length}
                          </Badge>
                        </div>
                        <div className="divide-y divide-border">
                          {exercises.map((ex: any) => {
                            const base = ex.exercise ?? null;
                            const name = base?.name ?? "Exercise";
                            const stats = [
                              ex.sets ?? base?.sets ? `${ex.sets ?? base?.sets}s` : null,
                              ex.reps ?? base?.reps ? `${ex.reps ?? base?.reps}r` : null,
                              ex.restSeconds ?? base?.restSeconds ? `${ex.restSeconds ?? base?.restSeconds}s rest` : null,
                            ].filter(Boolean).join(" · ");
                            return (
                              <div key={ex.id} className={cn("flex items-center gap-3 px-4 py-2.5", ex.completed ? "bg-primary/5" : "")}>
                                <div className={cn(
                                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs",
                                  ex.completed
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border text-muted-foreground",
                                )}>
                                  {ex.completed ? "✓" : ""}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className={cn("text-sm", ex.completed ? "text-foreground" : "text-foreground")}>
                                    {name}
                                  </p>
                                  {stats && <p className="text-xs text-muted-foreground">{stats}</p>}
                                  {ex.coachingNotes && (
                                    <p className="mt-1 text-xs text-muted-foreground italic">{ex.coachingNotes}</p>
                                  )}
                                </div>
                                {base?.videoUrl && (
                                  <a href={base.videoUrl} target="_blank" rel="noreferrer" className="shrink-0">
                                    <PlayCircle className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Check-ins Tab */}
        <TabsContent value="checkins">
          {checkinsLoading ? (
            <div className="text-sm text-muted-foreground">Loading check-ins...</div>
          ) : displayCheckins.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No session check-ins yet. The athlete will log RPE, soreness, and fatigue after each session.
            </div>
          ) : (
            <div className="space-y-2">
              {displayCheckins.map((c: any) => {
                const date = c.completedAt ? new Date(c.completedAt) : null;
                const isPremiumPlanCheckin = c.weekNumber != null || c.sessionNumber != null;
                return (
                  <div key={c.id} className="rounded-xl border border-border bg-card px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {isPremiumPlanCheckin
                            ? `Week ${c.weekNumber} · Session ${c.sessionNumber}${c.sessionTitle ? ` — ${c.sessionTitle}` : ""}`
                            : "Mobile training check-in"}
                        </p>
                        {date && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                            {" at "}
                            {date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {c.rpe != null && (
                          <div className="text-center">
                            <p className={cn("text-lg font-bold", c.rpe >= 8 ? "text-red-500" : c.rpe >= 6 ? "text-amber-500" : "text-primary")}>
                              {c.rpe}
                            </p>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">RPE</p>
                          </div>
                        )}
                        {c.soreness != null && (
                          <div className="text-center">
                            <p className={cn("text-lg font-bold", c.soreness >= 7 ? "text-red-500" : "text-foreground")}>
                              {c.soreness}
                            </p>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sore</p>
                          </div>
                        )}
                        {c.fatigue != null && (
                          <div className="text-center">
                            <p className={cn("text-lg font-bold", c.fatigue >= 7 ? "text-red-500" : "text-foreground")}>
                              {c.fatigue}
                            </p>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fatigue</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {c.notes && (
                      <div className="mt-2 rounded-lg bg-secondary/40 px-3 py-2">
                        <p className="text-xs text-foreground">{c.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Videos Tab */}
        <TabsContent value="videos">
          {athleteVideos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No video uploads from this athlete yet.
            </div>
          ) : (
            <div className="space-y-2">
              {athleteVideos.map((v: any) => {
                const uploaded = v.createdAt ? new Date(v.createdAt) : null;
                const reviewed = !!v.reviewedAt;
                return (
                  <div key={v.id} className="rounded-xl border border-border bg-card px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                          reviewed ? "bg-primary/10" : "bg-amber-500/10",
                        )}>
                          <Video className={cn("h-4 w-4", reviewed ? "text-primary" : "text-amber-500")} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {v.sectionTitle ?? v.title ?? "Training video"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {uploaded?.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            {v.notes ? ` · ${v.notes.slice(0, 60)}${v.notes.length > 60 ? "…" : ""}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={reviewed ? "default" : "accent"}
                          className="rounded-full"
                        >
                          {reviewed ? "Reviewed" : "Pending"}
                        </Badge>
                        {v.videoUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => setActiveVideo(v)}
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            Watch
                          </Button>
                        )}
                      </div>
                    </div>
                    {v.feedback && (
                      <div className="mt-2 rounded-lg bg-secondary/40 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Coach Feedback</p>
                        <p className="text-xs text-foreground">{v.feedback}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(activeVideo)} onOpenChange={(open) => (open ? null : setActiveVideo(null))}>
        <DialogContent className="max-w-5xl overflow-hidden border-zinc-800 bg-zinc-950 p-0 text-zinc-50">
          <div className="border-b border-zinc-800 bg-zinc-950/95 px-6 py-4">
            <DialogHeader className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-xl font-semibold text-white">
                  {activeVideo?.sectionTitle ?? activeVideo?.title ?? "Training video"}
                </DialogTitle>
                <Badge
                  variant="outline"
                  className="border-zinc-700 bg-zinc-900 text-zinc-200"
                >
                  {activeVideo?.reviewedAt ? "Reviewed" : "Pending review"}
                </Badge>
              </div>
              <DialogDescription className="text-sm text-zinc-400">
                Review the athlete&apos;s uploaded clip without leaving the coaching dashboard.
              </DialogDescription>
            </DialogHeader>
          </div>
          {activeVideo?.videoUrl ? (
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="bg-black p-4 sm:p-6">
                <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
                  <div className="aspect-video bg-black">
                    <video
                      key={activeVideo.videoUrl}
                      src={activeVideo.videoUrl}
                      controls
                      playsInline
                      preload="metadata"
                      className="h-full w-full bg-black object-contain"
                    />
                  </div>
                </div>
              </div>
              <aside className="border-t border-zinc-800 bg-zinc-950/80 p-5 lg:border-l lg:border-t-0">
                <div className="space-y-5">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                      Upload Details
                    </p>
                    <div className="mt-3 space-y-3 text-sm">
                      <div>
                        <p className="text-zinc-500">Uploaded</p>
                        <p className="text-zinc-100">
                          {activeVideo?.createdAt
                            ? new Date(activeVideo.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "Unknown"}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500">Status</p>
                        <p className="text-zinc-100">
                          {activeVideo?.reviewedAt ? "Reviewed by coach" : "Waiting for review"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                      Athlete Notes
                    </p>
                    <p className="mt-3 text-sm leading-6 text-zinc-200">
                      {activeVideo?.notes?.trim() || "No notes were added with this upload."}
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className={cn("text-2xl font-bold", color ?? "text-foreground")}>{value}</p>
    </div>
  );
}
