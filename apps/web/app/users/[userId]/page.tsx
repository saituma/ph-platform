"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { skipToken } from "@reduxjs/toolkit/query";

import { AdminShell } from "../../../components/admin/shell";
import { Card, CardContent } from "../../../components/ui/card";
import { SectionHeader } from "../../../components/admin/section-header";
import { Button } from "../../../components/ui/button";
import { Select } from "../../../components/ui/select";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import {
  useBlockUserMutation,
  useDeleteUserMutation,
  useGetUserOnboardingQuery,
  useGetUserProgramSectionCompletionsQuery,
  useGetExercisesQuery,
  useGetUserPremiumPlanQuery,
  useCloneUserPremiumPlanMutation,
  useCreateUserPremiumPlanSessionMutation,
  useUpdateUserPremiumPlanSessionMutation,
  useDeleteUserPremiumPlanSessionMutation,
  useAddUserPremiumPlanExerciseMutation,
  useUpdateUserPremiumPlanExerciseMutation,
  useDeleteUserPremiumPlanExerciseMutation,
  useGetUsersQuery,
  useUpdateProgramTierMutation,
} from "../../../lib/apiSlice";

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 py-2 border-b border-border/60 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right max-w-[70%] break-words">
        {String(value)}
      </span>
    </div>
  );
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId ? Number(params.userId) : NaN;
  const isValidId = Number.isFinite(userId) && userId > 0;

  const { data: usersData } = useGetUsersQuery();
  const { data: onboarding, isFetching: onboardingLoading } = useGetUserOnboardingQuery(
    isValidId ? userId : skipToken
  );
  const fromIso = useMemo(() => {
    const from = new Date();
    from.setDate(from.getDate() - 14);
    return from.toISOString();
  }, []);
  const { data: completionsData, isFetching: completionsLoading } = useGetUserProgramSectionCompletionsQuery(
    isValidId ? { userId, from: fromIso, limit: 200 } : (skipToken as any)
  );
  const { data: exercisesData } = useGetExercisesQuery();
  const [clonePlan, { isLoading: isCloningPlan }] = useCloneUserPremiumPlanMutation();
  const [createPlanSession, { isLoading: isCreatingSession }] = useCreateUserPremiumPlanSessionMutation();
  const [updatePlanSession, { isLoading: isUpdatingSession }] = useUpdateUserPremiumPlanSessionMutation();
  const [deletePlanSession, { isLoading: isDeletingSession }] = useDeleteUserPremiumPlanSessionMutation();
  const [addPlanExercise, { isLoading: isAddingExercise }] = useAddUserPremiumPlanExerciseMutation();
  const [updatePlanExercise, { isLoading: isUpdatingExercise }] = useUpdateUserPremiumPlanExerciseMutation();
  const [deletePlanExercise, { isLoading: isDeletingExercise }] = useDeleteUserPremiumPlanExerciseMutation();

  const [blockUser, { isLoading: blockLoading }] = useBlockUserMutation();
  const [deleteUser, { isLoading: deleteLoading }] = useDeleteUserMutation();
  const [updateProgramTier, { isLoading: tierLoading }] = useUpdateProgramTierMutation();

  const [actionError, setActionError] = useState<string | null>(null);
  const [programTier, setProgramTier] = useState("PHP");
  const [billingStatus, setBillingStatus] = useState<{
    planTier?: string | null;
    displayPrice?: string | null;
    billingInterval?: string | null;
    status?: string | null;
    paymentStatus?: string | null;
    createdAt?: string | null;
  } | null>(null);

  const rawUser = useMemo(
    () => (usersData?.users ?? []).find((u: any) => u.id === userId),
    [usersData, userId]
  );

  const athleteId = onboarding?.athlete?.id ?? rawUser?.athleteId;
  const resolvedTier =
    onboarding?.athlete?.currentProgramTier ??
    onboarding?.guardian?.currentProgramTier ??
    rawUser?.programTier ??
    rawUser?.guardianProgramTier ??
    "PHP";

  const loadCompletions = useMemo(() => completionsData?.items ?? [], [completionsData]);
  const completionStats = useMemo(() => {
    const rows = loadCompletions as Array<{ rpe?: number | null; soreness?: number | null; fatigue?: number | null }>;
    if (!rows.length) {
      return { count: 0, avgRpe: null as number | null, avgSoreness: null as number | null, avgFatigue: null as number | null };
    }
    const average = (key: "rpe" | "soreness" | "fatigue") => {
      const vals = rows.map((r) => (typeof r[key] === "number" ? (r[key] as number) : null)).filter((v) => v != null) as number[];
      if (!vals.length) return null;
      return Math.round((vals.reduce((sum, v) => sum + v, 0) / vals.length) * 10) / 10;
    };
    return {
      count: rows.length,
      avgRpe: average("rpe"),
      avgSoreness: average("soreness"),
      avgFatigue: average("fatigue"),
    };
  }, [loadCompletions]);

  const [planWeek, setPlanWeek] = useState<number>(1);
  const { data: premiumPlanData, isFetching: premiumPlanLoading } = useGetUserPremiumPlanQuery(
    isValidId && resolvedTier === "PHP_Premium" ? { userId } : (skipToken as any)
  );
  const planSessions = useMemo(() => premiumPlanData?.items ?? [], [premiumPlanData]);
  const planWeeks = useMemo(() => {
    const set = new Set<number>();
    (planSessions ?? []).forEach((s: any) => {
      if (typeof s.weekNumber === "number") set.add(s.weekNumber);
    });
    return Array.from(set.values()).sort((a, b) => a - b);
  }, [planSessions]);
  useEffect(() => {
    if (!planWeeks.length) return;
    if (planWeeks.includes(planWeek)) return;
    setPlanWeek(planWeeks[0]);
  }, [planWeeks, planWeek]);

  const visiblePlanSessions = useMemo(() => {
    return (planSessions ?? []).filter((s: any) => Number(s.weekNumber) === Number(planWeek));
  }, [planSessions, planWeek]);

  const exerciseOptions = useMemo(() => exercisesData?.exercises ?? [], [exercisesData]);
  const [newSessionWeek, setNewSessionWeek] = useState("1");
  const [newSessionNumber, setNewSessionNumber] = useState("1");
  const [sessionDrafts, setSessionDrafts] = useState<Record<number, { title: string; notes: string }>>({});
  const [exerciseDrafts, setExerciseDrafts] = useState<
    Record<number, { sets: string; reps: string; duration: string; restSeconds: string; coachingNotes: string }>
  >({});
  const [addExerciseSelection, setAddExerciseSelection] = useState<Record<number, string>>({});

  useEffect(() => {
    setSessionDrafts((prev) => {
      const next = { ...prev };
      (planSessions ?? []).forEach((session: any) => {
        if (!session?.id) return;
        if (next[session.id]) return;
        next[session.id] = { title: session.title ?? "", notes: session.notes ?? "" };
      });
      return next;
    });
    setExerciseDrafts((prev) => {
      const next = { ...prev };
      (planSessions ?? []).forEach((session: any) => {
        (session.exercises ?? []).forEach((ex: any) => {
          if (!ex?.id) return;
          if (next[ex.id]) return;
          next[ex.id] = {
            sets: ex.sets != null ? String(ex.sets) : "",
            reps: ex.reps != null ? String(ex.reps) : "",
            duration: ex.duration != null ? String(ex.duration) : "",
            restSeconds: ex.restSeconds != null ? String(ex.restSeconds) : "",
            coachingNotes: ex.coachingNotes ?? "",
          };
        });
      });
      return next;
    });
  }, [planSessions]);

  const isPlanBusy =
    isCloningPlan ||
    isCreatingSession ||
    isUpdatingSession ||
    isDeletingSession ||
    isAddingExercise ||
    isUpdatingExercise ||
    isDeletingExercise;

  useEffect(() => {
    setProgramTier(resolvedTier);
  }, [resolvedTier]);

  useEffect(() => {
    if (!userId || !isValidId) return;
    let active = true;
    fetch("/api/backend/admin/subscription-requests")
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!active) return;
        const requests = payload?.requests ?? [];
        const match = requests.find((r: any) => r.userId === userId);
        setBillingStatus(
          match
            ? {
                planTier: match.planTier ?? null,
                displayPrice: match.displayPrice ?? null,
                billingInterval: match.billingInterval ?? null,
                status: match.status ?? null,
                paymentStatus: match.paymentStatus ?? null,
                createdAt: match.createdAt ?? null,
              }
            : null
        );
      })
      .catch(() => {
        if (active) setBillingStatus(null);
      });
    return () => {
      active = false;
    };
  }, [userId, isValidId]);

  const handleBlock = useCallback(async () => {
    setActionError(null);
    try {
      await blockUser({ userId, blocked: !rawUser?.isBlocked }).unwrap();
      if (rawUser?.isBlocked) return;
      router.push("/users");
    } catch (err: any) {
      setActionError(err?.data?.error ?? "Failed to update block status.");
    }
  }, [userId, rawUser?.isBlocked, blockUser, router]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm("Delete this user? This will remove them from the admin list.")) return;
    setActionError(null);
    try {
      await deleteUser({ userId }).unwrap();
      router.push("/users");
    } catch (err: any) {
      setActionError(err?.data?.error ?? "Failed to delete user.");
    }
  }, [userId, deleteUser, router]);

  const handleUpdateTier = useCallback(async () => {
    if (!athleteId) {
      setActionError("No athlete linked to this user.");
      return;
    }
    setActionError(null);
    try {
      await updateProgramTier({ athleteId, programTier }).unwrap();
    } catch (err: any) {
      setActionError(err?.data?.error ?? "Failed to update program tier.");
    }
  }, [athleteId, programTier, updateProgramTier]);

  if (!isValidId) {
    return (
      <AdminShell title="User" subtitle="Invalid user ID.">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Invalid user ID.</p>
            <Link href="/users" className="mt-4 inline-block text-sm text-foreground hover:underline">
              ← Back to Users
            </Link>
          </CardContent>
        </Card>
      </AdminShell>
    );
  }

  if (!rawUser && usersData !== undefined) {
    return (
      <AdminShell title="User" subtitle="User not found.">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">User not found.</p>
            <Link href="/users" className="mt-4 inline-block text-sm text-foreground hover:underline">
              ← Back to Users
            </Link>
          </CardContent>
        </Card>
      </AdminShell>
    );
  }

  const displayName = rawUser?.name ?? rawUser?.email ?? "User";
  const tierLabel =
    rawUser?.role === "admin" || rawUser?.role === "superAdmin"
      ? "Admin"
      : resolvedTier === "PHP_Premium"
        ? "Premium"
        : resolvedTier === "PHP_Plus"
          ? "Plus"
          : "Program";

  return (
    <AdminShell
      title={displayName}
      subtitle={`User #${userId} · ${tierLabel}`}
    >
      <div className="space-y-6">
        <div>
          <Link href="/users" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Users
          </Link>
        </div>

        {actionError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {actionError}
          </div>
        ) : null}

        {/* Account */}
        <Card>
          <CardContent className="pt-6">
            <SectionHeader title="Account" description="User and auth details." />
            <div className="mt-4 space-y-0">
              <DetailRow label="User ID" value={rawUser?.id} />
              <DetailRow label="Name" value={rawUser?.name} />
              <DetailRow label="Email" value={rawUser?.email} />
              <DetailRow label="Role" value={rawUser?.role} />
              <DetailRow label="Status" value={rawUser?.isBlocked ? "Blocked" : "Active"} />
              <DetailRow label="Program tier" value={tierLabel} />
              <DetailRow
                label="Onboarding"
                value={
                  (rawUser?.onboardingCompleted ?? rawUser?.onboarding_completed) === false
                    ? "Awaiting review"
                    : "Complete"
                }
              />
              <DetailRow
                label="Created"
                value={rawUser?.createdAt ? new Date(rawUser.createdAt).toLocaleString() : null}
              />
              <DetailRow
                label="Updated"
                value={rawUser?.updatedAt ? new Date(rawUser.updatedAt).toLocaleString() : null}
              />
              <DetailRow label="Cognito sub" value={rawUser?.cognitoSub} />
            </div>
          </CardContent>
        </Card>

        {/* Guardian */}
        {(onboarding?.guardian || rawUser?.guardianProgramTier != null) && (
          <Card>
            <CardContent className="pt-6">
              <SectionHeader title="Guardian" description="Guardian profile (if applicable)." />
              {onboardingLoading ? (
                <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
              ) : (
                <div className="mt-4 space-y-0">
                  <DetailRow label="Guardian ID" value={onboarding?.guardian?.id} />
                  <DetailRow label="Email" value={onboarding?.guardian?.email} />
                  <DetailRow label="Phone" value={onboarding?.guardian?.phoneNumber} />
                  <DetailRow label="Relation to athlete" value={onboarding?.guardian?.relationToAthlete} />
                  <DetailRow label="Current program tier" value={onboarding?.guardian?.currentProgramTier} />
                  <DetailRow label="Active athlete ID" value={onboarding?.guardian?.activeAthleteId} />
                  <DetailRow
                    label="Created"
                    value={
                      onboarding?.guardian?.createdAt
                        ? new Date(onboarding.guardian.createdAt).toLocaleString()
                        : null
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Athlete */}
        {(onboarding?.athlete || rawUser?.athleteId) && (
          <Card>
            <CardContent className="pt-6">
              <SectionHeader title="Athlete" description="Athlete profile and onboarding." />
              {onboardingLoading ? (
                <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
              ) : (
                <div className="mt-4 space-y-0">
                  <DetailRow label="Athlete ID" value={onboarding?.athlete?.id ?? rawUser?.athleteId} />
                  <DetailRow label="Name" value={onboarding?.athlete?.name ?? rawUser?.athleteName} />
                  <DetailRow label="Age" value={onboarding?.athlete?.age} />
                  <DetailRow
                    label="Birth date"
                    value={
                      onboarding?.athlete?.birthDate
                        ? new Date(onboarding.athlete.birthDate).toLocaleDateString()
                        : null
                    }
                  />
                  <DetailRow label="Team" value={onboarding?.athlete?.team} />
                  <DetailRow label="Training per week" value={onboarding?.athlete?.trainingPerWeek} />
                  <DetailRow label="Performance goals" value={onboarding?.athlete?.performanceGoals} />
                  <DetailRow label="Equipment access" value={onboarding?.athlete?.equipmentAccess} />
                  <DetailRow
                    label="Injuries"
                    value={
                      onboarding?.athlete?.injuries
                        ? JSON.stringify(onboarding.athlete.injuries)
                        : null
                    }
                  />
                  <DetailRow label="Growth notes" value={onboarding?.athlete?.growthNotes} />
                  <DetailRow
                    label="Onboarding completed"
                    value={onboarding?.athlete?.onboardingCompleted ? "Yes" : "No"}
                  />
                  <DetailRow
                    label="Onboarding completed at"
                    value={
                      onboarding?.athlete?.onboardingCompletedAt
                        ? new Date(onboarding.athlete.onboardingCompletedAt).toLocaleString()
                        : null
                    }
                  />
                  <DetailRow label="Current program tier" value={onboarding?.athlete?.currentProgramTier} />
                  <DetailRow
                    label="Created"
                    value={
                      onboarding?.athlete?.createdAt
                        ? new Date(onboarding.athlete.createdAt).toLocaleString()
                        : null
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Training load (Premium) */}
        {resolvedTier === "PHP_Premium" && (
          <Card>
            <CardContent className="pt-6">
              <SectionHeader
                title="Training Load (V1)"
                description="Completions + RPE/soreness/fatigue captured from the mobile app."
              />
              <div className="mt-4 space-y-0">
                {completionsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading check-ins...</p>
                ) : (
                  <>
                    <DetailRow label="Completions (last 14 days)" value={completionStats.count} />
                    <DetailRow label="Avg RPE" value={completionStats.avgRpe} />
                    <DetailRow label="Avg soreness" value={completionStats.avgSoreness} />
                    <DetailRow label="Avg fatigue" value={completionStats.avgFatigue} />
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Premium plan editor */}
        {resolvedTier === "PHP_Premium" && (
          <Card>
            <CardContent className="pt-6">
              <SectionHeader
                title="Premium Plan Editor (V1)"
                description="Create and edit a per-athlete weekly schedule. This does not change templates."
              />

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    await clonePlan({ userId, replaceExisting: true }).unwrap();
                  }}
                  disabled={!isValidId || isPlanBusy}
                >
                  {isCloningPlan ? "Cloning..." : "Clone From Assigned Template"}
                </Button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Week</span>
                  <Select
                    value={String(planWeek)}
                    onChange={(e) => setPlanWeek(Number(e.target.value))}
                    className="min-w-[120px]"
                  >
                    {(planWeeks.length ? planWeeks : [planWeek]).map((w) => (
                      <option key={w} value={String(w)}>
                        Week {w}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                  <p className="text-sm font-semibold text-foreground">Add session</p>
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Week
                      </label>
                      <Input value={newSessionWeek} onChange={(e) => setNewSessionWeek(e.target.value)} className="w-24" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Session
                      </label>
                      <Input value={newSessionNumber} onChange={(e) => setNewSessionNumber(e.target.value)} className="w-24" />
                    </div>
                    <Button
                      onClick={async () => {
                        const week = Number(newSessionWeek);
                        const sessionNumber = Number(newSessionNumber);
                        if (!Number.isFinite(week) || !Number.isFinite(sessionNumber)) return;
                        await createPlanSession({ userId, weekNumber: week, sessionNumber }).unwrap();
                        setPlanWeek(week);
                      }}
                      disabled={isPlanBusy}
                    >
                      {isCreatingSession ? "Adding..." : "Add"}
                    </Button>
                  </div>
                </div>

                {premiumPlanLoading ? (
                  <div className="text-sm text-muted-foreground">Loading plan…</div>
                ) : visiblePlanSessions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No sessions in this week yet. Clone from template or add a session.
                  </div>
                ) : (
                  visiblePlanSessions
                    .slice()
                    .sort((a: any, b: any) => Number(a.sessionNumber) - Number(b.sessionNumber))
                    .map((session: any) => {
                      const draft = sessionDrafts[session.id] ?? { title: "", notes: "" };
                      const exercises = (session.exercises ?? []).slice().sort((a: any, b: any) => Number(a.order) - Number(b.order));
                      const nextOrder = exercises.length ? Math.max(...exercises.map((e: any) => Number(e.order ?? 0))) + 1 : 1;
                      const selectedExerciseId = addExerciseSelection[session.id] ?? "";
                      return (
                        <div key={session.id} className="rounded-2xl border border-border bg-card p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="text-sm font-semibold text-foreground">
                                Week {session.weekNumber} • Session {session.sessionNumber}
                              </div>
                              <div className="text-xs text-muted-foreground">Session ID: {session.id}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  const confirmed = window.confirm("Delete this session and all its exercises?");
                                  if (!confirmed) return;
                                  await deletePlanSession({ userId, sessionId: session.id }).unwrap();
                                }}
                                disabled={isPlanBusy}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 lg:grid-cols-2">
                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Title
                              </label>
                              <Input
                                value={draft.title}
                                onChange={(e) =>
                                  setSessionDrafts((prev) => ({
                                    ...prev,
                                    [session.id]: { ...(prev[session.id] ?? { title: "", notes: "" }), title: e.target.value },
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Notes
                              </label>
                              <Textarea
                                className="min-h-[42px]"
                                value={draft.notes}
                                onChange={(e) =>
                                  setSessionDrafts((prev) => ({
                                    ...prev,
                                    [session.id]: { ...(prev[session.id] ?? { title: "", notes: "" }), notes: e.target.value },
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <div className="mt-3 flex justify-end">
                            <Button
                              size="sm"
                              onClick={async () => {
                                await updatePlanSession({
                                  userId,
                                  sessionId: session.id,
                                  patch: { title: draft.title.trim() || null, notes: draft.notes.trim() || null },
                                }).unwrap();
                              }}
                              disabled={isPlanBusy}
                            >
                              {isUpdatingSession ? "Saving..." : "Save Session"}
                            </Button>
                          </div>

                          <div className="mt-4 rounded-2xl border border-border bg-secondary/20 p-4">
                            <div className="flex flex-wrap items-end justify-between gap-2">
                              <div className="text-sm font-semibold text-foreground">Exercises</div>
                              <div className="flex flex-wrap items-end gap-2">
                                <Select
                                  value={selectedExerciseId}
                                  onChange={(e) =>
                                    setAddExerciseSelection((prev) => ({ ...prev, [session.id]: e.target.value }))
                                  }
                                  className="min-w-[240px]"
                                >
                                  <option value="">Select exercise…</option>
                                  {exerciseOptions.map((ex: any) => (
                                    <option key={ex.id} value={String(ex.id)}>
                                      {ex.name}
                                    </option>
                                  ))}
                                </Select>
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    const exId = Number(selectedExerciseId);
                                    if (!Number.isFinite(exId) || exId <= 0) return;
                                    await addPlanExercise({
                                      userId,
                                      sessionId: session.id,
                                      body: { exerciseId: exId, order: nextOrder },
                                    }).unwrap();
                                    setAddExerciseSelection((prev) => ({ ...prev, [session.id]: "" }));
                                  }}
                                  disabled={isPlanBusy || !selectedExerciseId}
                                >
                                  {isAddingExercise ? "Adding..." : "Add Exercise"}
                                </Button>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3">
                              {exercises.length === 0 ? (
                                <div className="text-xs text-muted-foreground">No exercises yet.</div>
                              ) : (
                                exercises.map((ex: any) => {
                                  const base = ex.exercise ?? null;
                                  const d = exerciseDrafts[ex.id] ?? {
                                    sets: "",
                                    reps: "",
                                    duration: "",
                                    restSeconds: "",
                                    coachingNotes: "",
                                  };
                                  const name = base?.name ?? `Exercise ${ex.exerciseId}`;
                                  return (
                                    <div key={ex.id} className="rounded-2xl border border-border bg-background p-3">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                          <div className="text-sm font-semibold text-foreground">{name}</div>
                                          <div className="text-xs text-muted-foreground">Order: {ex.order}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={async () => {
                                              const confirmed = window.confirm("Remove this exercise from the session?");
                                              if (!confirmed) return;
                                              await deletePlanExercise({ userId, planExerciseId: ex.id }).unwrap();
                                            }}
                                            disabled={isPlanBusy}
                                          >
                                            Remove
                                          </Button>
                                        </div>
                                      </div>

                                      <div className="mt-3 grid gap-2 md:grid-cols-4">
                                        <Input
                                          placeholder={`Sets${base?.sets != null ? ` (${base.sets})` : ""}`}
                                          value={d.sets}
                                          onChange={(e) =>
                                            setExerciseDrafts((prev) => ({
                                              ...prev,
                                              [ex.id]: { ...(prev[ex.id] ?? d), sets: e.target.value },
                                            }))
                                          }
                                        />
                                        <Input
                                          placeholder={`Reps${base?.reps != null ? ` (${base.reps})` : ""}`}
                                          value={d.reps}
                                          onChange={(e) =>
                                            setExerciseDrafts((prev) => ({
                                              ...prev,
                                              [ex.id]: { ...(prev[ex.id] ?? d), reps: e.target.value },
                                            }))
                                          }
                                        />
                                        <Input
                                          placeholder={`Duration sec${base?.duration != null ? ` (${base.duration})` : ""}`}
                                          value={d.duration}
                                          onChange={(e) =>
                                            setExerciseDrafts((prev) => ({
                                              ...prev,
                                              [ex.id]: { ...(prev[ex.id] ?? d), duration: e.target.value },
                                            }))
                                          }
                                        />
                                        <Input
                                          placeholder={`Rest sec${base?.restSeconds != null ? ` (${base.restSeconds})` : ""}`}
                                          value={d.restSeconds}
                                          onChange={(e) =>
                                            setExerciseDrafts((prev) => ({
                                              ...prev,
                                              [ex.id]: { ...(prev[ex.id] ?? d), restSeconds: e.target.value },
                                            }))
                                          }
                                        />
                                      </div>
                                      <div className="mt-2">
                                        <Textarea
                                          className="min-h-[60px]"
                                          placeholder="Coaching notes (override)"
                                          value={d.coachingNotes}
                                          onChange={(e) =>
                                            setExerciseDrafts((prev) => ({
                                              ...prev,
                                              [ex.id]: { ...(prev[ex.id] ?? d), coachingNotes: e.target.value },
                                            }))
                                          }
                                        />
                                      </div>
                                      <div className="mt-2 flex justify-end">
                                        <Button
                                          size="sm"
                                          onClick={async () => {
                                            const toNumOrNull = (v: string) => {
                                              if (!v.trim()) return null;
                                              const n = Number(v);
                                              return Number.isFinite(n) ? n : null;
                                            };
                                            await updatePlanExercise({
                                              userId,
                                              planExerciseId: ex.id,
                                              patch: {
                                                sets: toNumOrNull(d.sets),
                                                reps: toNumOrNull(d.reps),
                                                duration: toNumOrNull(d.duration),
                                                restSeconds: toNumOrNull(d.restSeconds),
                                                coachingNotes: d.coachingNotes.trim() || null,
                                              },
                                            }).unwrap();
                                          }}
                                          disabled={isPlanBusy}
                                        >
                                          {isUpdatingExercise ? "Saving..." : "Save Exercise"}
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Billing */}
        {billingStatus && (
          <Card>
            <CardContent className="pt-6">
              <SectionHeader title="Subscription / Billing" description="Latest plan and status." />
              <div className="mt-4 space-y-0">
                <DetailRow label="Plan tier" value={billingStatus.planTier} />
                <DetailRow label="Display price" value={billingStatus.displayPrice} />
                <DetailRow label="Billing interval" value={billingStatus.billingInterval} />
                <DetailRow label="Status" value={billingStatus.status} />
                <DetailRow label="Payment status" value={billingStatus.paymentStatus} />
                <DetailRow
                  label="Created"
                  value={billingStatus.createdAt ? new Date(billingStatus.createdAt).toLocaleString() : null}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <Card>
          <CardContent className="pt-6">
            <SectionHeader title="Actions" description="Change plan, block, or delete user." />
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={programTier}
                  onChange={(e) => setProgramTier(e.target.value)}
                  className="min-w-[160px]"
                >
                  <option value="PHP">PHP Program</option>
                  <option value="PHP_Plus">PHP Plus</option>
                  <option value="PHP_Premium">PHP Premium</option>
                </Select>
                <Button
                  onClick={handleUpdateTier}
                  disabled={!athleteId || tierLoading}
                >
                  {tierLoading ? "Saving..." : "Update tier"}
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={handleBlock}
                disabled={blockLoading}
              >
                {blockLoading ? "Updating..." : rawUser?.isBlocked ? "Unblock user" : "Block user"}
              </Button>
              <Button
                variant="outline"
                className="border-red-500/40 text-red-200 hover:bg-red-500/10"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete user"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
