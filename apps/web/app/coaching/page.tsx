"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ChevronRight,
  Clock,
  Crown,
  Dumbbell,
  Eye,
  PlayCircle,
  Search,
  TrendingUp,
  Video,
  type LucideIcon,
} from "lucide-react";

import { AdminShell } from "../../components/admin/shell";
import {
  CardFrame,
  CardFrameHeader,
  CardFrameTitle,
  CardFrameDescription,
} from "../../components/ui/card";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogPanel,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "../../components/ui/empty";
import { Input } from "../../components/ui/input";
import { Progress, ProgressTrack, ProgressIndicator } from "../../components/ui/progress";
import { Skeleton } from "../../components/ui/skeleton";
import { Tabs, TabsList, TabsTab, TabsPanel } from "../../components/ui/tabs";
import { cn } from "../../lib/utils";
import {
  useGetTrainingSnapshotQuery,
  useGetUserProgramSectionCompletionsQuery,
  useGetVideoUploadsQuery,
  useGetUsersQuery,
  useGetUserOnboardingQuery,
} from "../../lib/apiSlice";

type TrainingSnapshotAthlete = {
  athleteId: number;
  athleteUserId?: number | null;
  guardianUserId?: number | null;
  athleteName?: string | null;
  programTier?: string | null;
  premiumExercisesDone?: number;
  premiumExercisesTotal?: number;
  sectionCompletions30d?: number;
};

type BaseExercise = {
  name?: string | null;
  sets?: number | null;
  reps?: number | null;
  restSeconds?: number | null;
  videoUrl?: string | null;
};

type PlanExercise = {
  id: number;
  order?: number | null;
  completed?: boolean | null;
  sets?: number | null;
  reps?: number | null;
  restSeconds?: number | null;
  coachingNotes?: string | null;
  exercise?: BaseExercise | null;
};

type PlanSession = {
  id: number;
  weekNumber: number;
  sessionNumber: number;
  title?: string | null;
  notes?: string | null;
  exercises?: PlanExercise[] | null;
};

type SessionCheckin = {
  id: number;
  completedAt?: string | null;
  weekNumber?: number | null;
  sessionNumber?: number | null;
  sessionTitle?: string | null;
  rpe?: number | null;
  soreness?: number | null;
  fatigue?: number | null;
  notes?: string | null;
};

type ProgramCompletion = {
  id: number;
  completedAt?: string | null;
  contentTitle?: string | null;
  title?: string | null;
  sectionTitle?: string | null;
  weekNumber?: number | null;
  sessionNumber?: number | null;
  sessionTitle?: string | null;
  rpe?: number | null;
  soreness?: number | null;
  fatigue?: number | null;
  notes?: string | null;
};

type VideoUpload = {
  id: number;
  athleteId?: number | null;
  athlete?: { id?: number | null } | null;
  reviewedAt?: string | null;
  createdAt?: string | null;
  sectionTitle?: string | null;
  title?: string | null;
  notes?: string | null;
  videoUrl?: string | null;
  feedback?: string | null;
};

export default function CoachingPage() {
  const { data: snapshotData, isLoading: snapshotLoading } = useGetTrainingSnapshotQuery();
  useGetUsersQuery(); // prefetch users
  const { data: videosData } = useGetVideoUploadsQuery();
  const [search, setSearch] = useState("");
  const [selectedAthleteUserId, setSelectedAthleteUserId] = useState<number | null>(null);

  const premiumAthletes = useMemo(() => {
    const items: TrainingSnapshotAthlete[] = Array.isArray(snapshotData?.items)
      ? snapshotData.items
      : [];
    return items.filter(
      (a) => a.programTier === "PHP_Premium" || a.programTier === "premium",
    );
  }, [snapshotData]);

  const filtered = useMemo(() => {
    if (!search.trim()) return premiumAthletes;
    const q = search.toLowerCase();
    return premiumAthletes.filter((a) => a.athleteName?.toLowerCase().includes(q));
  }, [premiumAthletes, search]);

  const pendingVideosByAthlete = useMemo(() => {
    const map = new Map<number, number>();
    const items: VideoUpload[] = Array.isArray(videosData?.items) ? videosData.items : [];
    for (const v of items) {
      if (v.reviewedAt) continue;
      const athleteId = v.athleteId ?? v.athlete?.id;
      if (!athleteId) continue;
      map.set(athleteId, (map.get(athleteId) ?? 0) + 1);
    }
    return map;
  }, [videosData]);

  return (
    <AdminShell title="1:1 Premium Coaching" subtitle="Athlete command center">
      <div className="flex flex-col gap-6 lg:flex-row" style={{ minHeight: "calc(100vh - 200px)" }}>
        {/* Left panel — athlete list */}
        <div className="w-full shrink-0 space-y-4 lg:w-80">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search athletes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {filtered.length} Premium athlete{filtered.length !== 1 ? "s" : ""}
          </p>

          <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1 lg:max-h-[calc(100vh-320px)]">
            {snapshotLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Empty className="py-8">
                <EmptyHeader>
                  <EmptyTitle className="text-base">No athletes found</EmptyTitle>
                  <EmptyDescription>No Premium athletes match your search.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              filtered.map((athlete) => {
                const athleteUserId = athlete.athleteUserId ?? athlete.guardianUserId ?? null;
                const isActive = selectedAthleteUserId === athleteUserId;
                const premiumDone = athlete.premiumExercisesDone ?? 0;
                const premiumTotal = athlete.premiumExercisesTotal ?? 0;
                const progress = premiumTotal ? Math.round((premiumDone / premiumTotal) * 100) : 0;
                const exerciseSummary =
                  premiumTotal > 0
                    ? `${premiumDone}/${premiumTotal} exercises`
                    : (athlete.sectionCompletions30d ?? 0) > 0
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
                        <Avatar className={cn("h-10 w-10 text-sm font-bold", isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}>
                          <AvatarFallback>
                            {(athlete.athleteName ?? "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {athlete.athleteName}
                          </p>
                          <p className="text-xs text-muted-foreground">{exerciseSummary}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {pendingVideos > 0 && (
                          <Badge variant="warning" className="rounded-full text-[10px]">
                            {pendingVideos}
                          </Badge>
                        )}
                        <ChevronRight
                          className={cn(
                            "h-4 w-4",
                            isActive ? "text-primary" : "text-muted-foreground",
                          )}
                        />
                      </div>
                    </div>

                    {premiumTotal > 0 && (
                      <div className="mt-3">
                        <Progress value={progress}>
                          <ProgressTrack>
                            <ProgressIndicator />
                          </ProgressTrack>
                        </Progress>
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
            <Empty className="h-full rounded-2xl border border-dashed border-border bg-card">
              <Crown className="h-12 w-12 text-muted-foreground/40" />
              <EmptyHeader>
                <EmptyTitle>Select an athlete</EmptyTitle>
                <EmptyDescription>
                  Pick a Premium athlete from the list to see their training plan, session
                  check-ins, exercise progress, and uploaded videos.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

function AthleteCoachingPanel({ userId }: { userId: number }) {
  const { data: onboarding, isLoading: onboardingLoading } = useGetUserOnboardingQuery(userId);
  const planData = { items: [] as any[] };
  const planLoading = false;
  const checkinsData = { items: [] as any[] };
  const checkinsLoading = false;
  const { data: completionsData, isLoading: completionsLoading } = useGetUserProgramSectionCompletionsQuery({ userId, limit: 30 });
  const { data: videosData } = useGetVideoUploadsQuery();
  const [activeVideo, setActiveVideo] = useState<VideoUpload | null>(null);

  const athleteName = onboarding?.athlete?.name ?? "Athlete";
  const athleteAge = onboarding?.athlete?.age ?? null;
  const team = onboarding?.athlete?.team ?? null;
  const injuriesRaw = onboarding?.athlete?.injuries;
  const injuries =
    typeof injuriesRaw === "string"
      ? injuriesRaw
      : injuriesRaw != null
        ? JSON.stringify(injuriesRaw)
        : null;
  const goals = onboarding?.athlete?.performanceGoals ?? null;

  const sessions = useMemo(() => {
    const items: PlanSession[] = Array.isArray(planData?.items) ? planData.items : [];
    return items
      .slice()
      .sort(
        (a, b) =>
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
    () => sessions.filter((s) => Number(s.weekNumber) === displayWeek),
    [displayWeek, sessions],
  );

  const checkins: SessionCheckin[] = Array.isArray(checkinsData?.items) ? checkinsData.items : [];
  const programCompletions = useMemo<ProgramCompletion[]>(
    () => (Array.isArray(completionsData?.items) ? completionsData.items : []),
    [completionsData],
  );
  const fallbackCheckins = useMemo(
    () =>
      programCompletions.filter(
        (c) => c.rpe != null || c.soreness != null || c.fatigue != null || c.notes,
      ),
    [programCompletions],
  );
  const displayCheckins = checkins.length > 0 ? checkins : fallbackCheckins;

  const athleteVideos = useMemo(() => {
    const athleteId = onboarding?.athlete?.id;
    if (!athleteId) return [];
    const items: VideoUpload[] = Array.isArray(videosData?.items) ? videosData.items : [];
    return items.filter((v) => (v.athleteId ?? v.athlete?.id) === athleteId);
  }, [onboarding?.athlete?.id, videosData]);

  const avgRpe = useMemo(() => {
    const vals = displayCheckins.filter((c) => c.rpe != null).map((c) => c.rpe as number);
    return vals.length
      ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1)
      : "—";
  }, [displayCheckins]);

  const avgSoreness = useMemo(() => {
    const vals = displayCheckins.filter((c) => c.soreness != null).map((c) => c.soreness as number);
    return vals.length
      ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1)
      : "—";
  }, [displayCheckins]);

  const avgFatigue = useMemo(() => {
    const vals = displayCheckins.filter((c) => c.fatigue != null).map((c) => c.fatigue as number);
    return vals.length
      ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1)
      : "—";
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
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Athlete header */}
      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14 rounded-2xl text-xl font-bold bg-primary text-primary-foreground">
          <AvatarFallback className="rounded-2xl bg-primary text-primary-foreground text-xl font-bold">
            {athleteName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-xl font-bold text-foreground">{athleteName}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {team && (
              <Badge variant="outline" className="rounded-full">
                {team}
              </Badge>
            )}
            {athleteAge != null && (
              <Badge variant="outline" className="rounded-full">
                Age {athleteAge}
              </Badge>
            )}
            <Badge variant="info" className="rounded-full">
              Premium
            </Badge>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={Dumbbell}
          label="Exercises Done"
          value={statExercisesValue}
        />
        <StatCard
          icon={Activity}
          label="Avg RPE"
          value={String(avgRpe)}
          color={Number(avgRpe) >= 8 ? "text-destructive" : undefined}
        />
        <StatCard icon={TrendingUp} label="Avg Soreness" value={String(avgSoreness)} />
        <StatCard icon={Clock} label="Avg Fatigue" value={String(avgFatigue)} />
      </div>

      {/* Profile notes */}
      {(injuries || goals) && (
        <div className="grid gap-3 md:grid-cols-2">
          {injuries && (
            <CardFrame>
              <CardFrameHeader>
                <CardFrameTitle>Injuries / Notes</CardFrameTitle>
                <p className="mt-1 text-sm text-foreground">{injuries}</p>
              </CardFrameHeader>
            </CardFrame>
          )}
          {goals && (
            <CardFrame>
              <CardFrameHeader>
                <CardFrameTitle>Performance Goals</CardFrameTitle>
                <p className="mt-1 text-sm text-foreground">{goals}</p>
              </CardFrameHeader>
            </CardFrame>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="plan">
        <div className="overflow-x-auto pb-1">
          <TabsList className="min-w-max">
            <TabsTab value="plan">Training Plan</TabsTab>
            <TabsTab value="checkins">Check-ins ({displayCheckins.length})</TabsTab>
            <TabsTab value="videos">Videos ({athleteVideos.length})</TabsTab>
          </TabsList>
        </div>

        {/* Training Plan Tab */}
        <TabsPanel value="plan">
          {planLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : sessions.length === 0 ? (
            <div className="space-y-4">
              <Empty className="rounded-xl border border-dashed border-border py-10">
                <EmptyHeader>
                  <EmptyTitle className="text-base">No plan assigned</EmptyTitle>
                  <EmptyDescription>
                    No 1:1 premium plan assigned yet. Assign a template from the athlete&apos;s
                    profile page.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>

              {completionsLoading ? (
                <Skeleton className="h-24 rounded-xl" />
              ) : programCompletions.length > 0 ? (
                <CardFrame>
                  <CardFrameHeader>
                    <CardFrameTitle>Completed Mobile Training</CardFrameTitle>
                  </CardFrameHeader>
                  <div className="px-6 pb-4 space-y-2">
                    {programCompletions.slice(0, 10).map((completion) => {
                      const completedAt = completion.completedAt
                        ? new Date(completion.completedAt)
                        : null;
                      return (
                        <div
                          key={completion.id}
                          className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {completion.contentTitle ?? completion.title ?? "Completed session"}
                            </p>
                            {completion.sectionTitle ? (
                              <p className="text-xs text-muted-foreground">
                                {completion.sectionTitle}
                              </p>
                            ) : null}
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {completedAt ? completedAt.toLocaleDateString() : "Completed"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardFrame>
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
                <p className="text-sm text-muted-foreground">No sessions in Week {displayWeek}.</p>
              ) : (
                <div className="space-y-3">
                  {weekSessions.map((session) => {
                    const exercises = (session.exercises ?? [])
                      .slice()
                      .sort((a, b) => Number(a.order) - Number(b.order));
                    const done = exercises.filter((e) => e.completed).length;
                    return (
                      <CardFrame key={session.id}>
                        <CardFrameHeader>
                          <div>
                            <CardFrameTitle>
                              Session {session.sessionNumber}
                              {session.title ? ` — ${session.title}` : ""}
                            </CardFrameTitle>
                            {session.notes && (
                              <CardFrameDescription>{session.notes}</CardFrameDescription>
                            )}
                          </div>
                          <Badge
                            variant={
                              done === exercises.length && exercises.length > 0
                                ? "success"
                                : "secondary"
                            }
                            className="rounded-full"
                          >
                            {done}/{exercises.length}
                          </Badge>
                        </CardFrameHeader>

                        <div className="divide-y divide-border border-t border-border">
                          {exercises.map((ex) => {
                            const base = ex.exercise ?? null;
                            const name = base?.name ?? "Exercise";
                            const stats = [
                              ex.sets ?? base?.sets ? `${ex.sets ?? base?.sets}s` : null,
                              ex.reps ?? base?.reps ? `${ex.reps ?? base?.reps}r` : null,
                              ex.restSeconds ?? base?.restSeconds
                                ? `${ex.restSeconds ?? base?.restSeconds}s rest`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ");
                            return (
                              <div
                                key={ex.id}
                                className={cn(
                                  "flex items-center gap-3 px-4 py-2.5",
                                  ex.completed ? "bg-primary/5" : "",
                                )}
                              >
                                <div
                                  className={cn(
                                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs",
                                    ex.completed
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border text-muted-foreground",
                                  )}
                                >
                                  {ex.completed ? "✓" : ""}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm text-foreground">{name}</p>
                                  {stats && (
                                    <p className="text-xs text-muted-foreground">{stats}</p>
                                  )}
                                  {ex.coachingNotes && (
                                    <p className="mt-1 text-xs text-muted-foreground italic">
                                      {ex.coachingNotes}
                                    </p>
                                  )}
                                </div>
                                {base?.videoUrl && (
                                  <a
                                    href={base.videoUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="shrink-0"
                                  >
                                    <PlayCircle className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardFrame>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </TabsPanel>

        {/* Check-ins Tab */}
        <TabsPanel value="checkins">
          {checkinsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : displayCheckins.length === 0 ? (
            <Empty className="rounded-xl border border-dashed border-border py-10">
              <EmptyHeader>
                <EmptyTitle className="text-base">No check-ins yet</EmptyTitle>
                <EmptyDescription>
                  The athlete will log RPE, soreness, and fatigue after each session.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-2">
              {displayCheckins.map((c) => {
                const date = c.completedAt ? new Date(c.completedAt) : null;
                const isPremiumPlanCheckin = c.weekNumber != null || c.sessionNumber != null;
                return (
                  <CardFrame key={c.id}>
                    <CardFrameHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardFrameTitle>
                            {isPremiumPlanCheckin
                              ? `Week ${c.weekNumber} · Session ${c.sessionNumber}${c.sessionTitle ? ` — ${c.sessionTitle}` : ""}`
                              : "Mobile training check-in"}
                          </CardFrameTitle>
                          {date && (
                            <CardFrameDescription>
                              {date.toLocaleDateString(undefined, {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}{" "}
                              at{" "}
                              {date.toLocaleTimeString(undefined, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </CardFrameDescription>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {c.rpe != null && (
                            <div className="text-center">
                              <p
                                className={cn(
                                  "text-lg font-bold",
                                  c.rpe >= 8
                                    ? "text-destructive"
                                    : c.rpe >= 6
                                      ? "text-warning-foreground"
                                      : "text-primary",
                                )}
                              >
                                {c.rpe}
                              </p>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                RPE
                              </p>
                            </div>
                          )}
                          {c.soreness != null && (
                            <div className="text-center">
                              <p
                                className={cn(
                                  "text-lg font-bold",
                                  c.soreness >= 7 ? "text-destructive" : "text-foreground",
                                )}
                              >
                                {c.soreness}
                              </p>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Sore
                              </p>
                            </div>
                          )}
                          {c.fatigue != null && (
                            <div className="text-center">
                              <p
                                className={cn(
                                  "text-lg font-bold",
                                  c.fatigue >= 7 ? "text-destructive" : "text-foreground",
                                )}
                              >
                                {c.fatigue}
                              </p>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Fatigue
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardFrameHeader>
                    {c.notes && (
                      <div className="px-6 pb-4">
                        <div className="rounded-lg bg-secondary/40 px-3 py-2">
                          <p className="text-xs text-foreground">{c.notes}</p>
                        </div>
                      </div>
                    )}
                  </CardFrame>
                );
              })}
            </div>
          )}
        </TabsPanel>

        {/* Videos Tab */}
        <TabsPanel value="videos">
          {athleteVideos.length === 0 ? (
            <Empty className="rounded-xl border border-dashed border-border py-10">
              <EmptyHeader>
                <EmptyTitle className="text-base">No videos yet</EmptyTitle>
                <EmptyDescription>No video uploads from this athlete yet.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-2">
              {athleteVideos.map((v) => {
                const uploaded = v.createdAt ? new Date(v.createdAt) : null;
                const reviewed = !!v.reviewedAt;
                return (
                  <CardFrame key={v.id}>
                    <CardFrameHeader>
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                            reviewed ? "bg-primary/10" : "bg-warning/10",
                          )}
                        >
                          <Video
                            className={cn(
                              "h-4 w-4",
                              reviewed ? "text-primary" : "text-warning-foreground",
                            )}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardFrameTitle className="truncate">
                            {v.sectionTitle ?? v.title ?? "Training video"}
                          </CardFrameTitle>
                          <CardFrameDescription>
                            {uploaded?.toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                            {v.notes
                              ? ` · ${v.notes.slice(0, 60)}${v.notes.length > 60 ? "…" : ""}`
                              : ""}
                          </CardFrameDescription>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={reviewed ? "success" : "warning"} className="rounded-full">
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
                    </CardFrameHeader>

                    {v.feedback && (
                      <div className="px-6 pb-4">
                        <div className="rounded-lg bg-secondary/40 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                            Coach Feedback
                          </p>
                          <p className="text-xs text-foreground">{v.feedback}</p>
                        </div>
                      </div>
                    )}
                  </CardFrame>
                );
              })}
            </div>
          )}
        </TabsPanel>
      </Tabs>

      {/* Video Player Dialog */}
      <Dialog
        open={Boolean(activeVideo)}
        onOpenChange={(open) => (open ? null : setActiveVideo(null))}
      >
        <DialogPopup className="max-w-5xl overflow-hidden p-0" showCloseButton>
          <DialogHeader className="border-b px-6 py-4">
            <div className="flex flex-wrap items-center gap-2 pr-8">
              <DialogTitle>
                {activeVideo?.sectionTitle ?? activeVideo?.title ?? "Training video"}
              </DialogTitle>
              <Badge variant={activeVideo?.reviewedAt ? "success" : "warning"} className="rounded-full">
                {activeVideo?.reviewedAt ? "Reviewed" : "Pending review"}
              </Badge>
            </div>
            <DialogDescription>
              Review the athlete&apos;s uploaded clip without leaving the coaching dashboard.
            </DialogDescription>
          </DialogHeader>

          {activeVideo?.videoUrl ? (
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_300px]">
              {/* Video */}
              <div className="bg-black p-4 sm:p-6">
                <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-black shadow-2xl">
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

              {/* Sidebar */}
              <DialogPanel className="border-t lg:border-l lg:border-t-0" scrollFade={false}>
                <div className="space-y-4">
                  <CardFrame>
                    <CardFrameHeader>
                      <CardFrameTitle>Upload Details</CardFrameTitle>
                      <div className="mt-2 space-y-2 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Uploaded</p>
                          <p className="font-medium">
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
                          <p className="text-muted-foreground text-xs">Status</p>
                          <p className="font-medium">
                            {activeVideo?.reviewedAt ? "Reviewed by coach" : "Waiting for review"}
                          </p>
                        </div>
                      </div>
                    </CardFrameHeader>
                  </CardFrame>

                  <CardFrame>
                    <CardFrameHeader>
                      <CardFrameTitle>Athlete Notes</CardFrameTitle>
                      <p className="mt-2 text-sm text-foreground leading-6">
                        {activeVideo?.notes?.trim() || "No notes were added with this upload."}
                      </p>
                    </CardFrameHeader>
                  </CardFrame>
                </div>
              </DialogPanel>
            </div>
          ) : null}
        </DialogPopup>
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
  icon: LucideIcon;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <CardFrame>
      <CardFrameHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <CardFrameDescription>{label}</CardFrameDescription>
        </div>
        <p className={cn("mt-1 text-2xl font-bold tabular-nums", color ?? "text-foreground")}>
          {value}
        </p>
      </CardFrameHeader>
    </CardFrame>
  );
}
