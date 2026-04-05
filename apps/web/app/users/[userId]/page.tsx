"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { skipToken } from "@reduxjs/toolkit/query";

import { AdminShell } from "../../../components/admin/shell";
import { Card, CardContent } from "../../../components/ui/card";
import {
  ProfileField,
  UserDetailBackBar,
  UserDetailSectionCard,
  UserDetailStatGrid,
  UserDetailSummaryStrip,
  UserProfileSection,
} from "../../../components/admin/users/user-detail-shell";
import { Activity, ClipboardList, CreditCard, ShieldAlert, UserCircle, UserRound, Users } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Select } from "../../../components/ui/select";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import {
  useBlockUserMutation,
  useDeleteUserMutation,
  useGetUserOnboardingQuery,
  useGetUserProgramSectionCompletionsQuery,
  useGetExercisesQuery,
  useCreateExerciseMutation,
  usePresignMediaUploadMutation,
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

type AdminUserRow = {
  id: number;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  isBlocked?: boolean | null;
  onboardingCompleted?: boolean | null;
  onboarding_completed?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  cognitoSub?: string | null;
  athleteId?: number | null;
  athleteName?: string | null;
  programTier?: string | null;
  guardianProgramTier?: string | null;
};

type ExerciseLibraryItem = {
  id: number;
  name?: string | null;
  videoUrl?: string | null;
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  restSeconds?: number | null;
};

type PremiumPlanExercise = {
  id: number;
  order?: number | null;
  exerciseId?: number | null;
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  restSeconds?: number | null;
  coachingNotes?: string | null;
  exercise?: ExerciseLibraryItem | null;
};

type PremiumPlanSession = {
  id: number;
  weekNumber?: number | null;
  sessionNumber?: number | null;
  title?: string | null;
  notes?: string | null;
  exercises?: PremiumPlanExercise[] | null;
};

type BillingRequest = {
  userId?: number;
  planTier?: string | null;
  displayPrice?: string | null;
  billingInterval?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
  createdAt?: string | null;
};

type ApiErrorLike = {
  data?: { error?: string; message?: string };
  error?: string;
  message?: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const e = error as ApiErrorLike;
    if (typeof e.data?.error === "string") return e.data.error;
    if (typeof e.data?.message === "string") return e.data.message;
    if (typeof e.error === "string") return e.error;
    if (typeof e.message === "string") return e.message;
  }
  return fallback;
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
    isValidId ? { userId, from: fromIso, limit: 200 } : skipToken
  );
  const { data: exercisesData } = useGetExercisesQuery();
  const [createExercise, { isLoading: isCreatingExercise }] = useCreateExerciseMutation();
  const [presignMediaUpload, { isLoading: isPresigningUpload }] = usePresignMediaUploadMutation();
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
    () => ((usersData?.users ?? []) as AdminUserRow[]).find((u) => u.id === userId),
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
    isValidId && resolvedTier === "PHP_Premium" ? { userId } : skipToken
  );
  const planSessions = useMemo<PremiumPlanSession[]>(
    () => (Array.isArray(premiumPlanData?.items) ? premiumPlanData.items : []),
    [premiumPlanData]
  );
  const planWeeks = useMemo(() => {
    const set = new Set<number>();
    planSessions.forEach((s) => {
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
    return planSessions.filter((s) => Number(s.weekNumber) === Number(planWeek));
  }, [planSessions, planWeek]);

  const exerciseOptions = useMemo<ExerciseLibraryItem[]>(
    () => (Array.isArray(exercisesData?.exercises) ? exercisesData.exercises : []),
    [exercisesData]
  );
  const nextSessionNumberForWeek = useMemo(() => {
    const nums = visiblePlanSessions
      .map((s) => Number(s.sessionNumber))
      .filter((n: number) => Number.isFinite(n));
    return nums.length ? Math.max(...nums) + 1 : 1;
  }, [visiblePlanSessions]);

  const [addSessionMode, setAddSessionMode] = useState<"next" | "custom">("next");
  const [newSessionWeek, setNewSessionWeek] = useState(String(planWeek));
  const [newSessionNumber, setNewSessionNumber] = useState(String(nextSessionNumberForWeek));
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [newSessionNotes, setNewSessionNotes] = useState("");
  const [sessionDrafts, setSessionDrafts] = useState<Record<number, { title: string; notes: string }>>({});
  const [exerciseDrafts, setExerciseDrafts] = useState<
    Record<number, { sets: string; reps: string; duration: string; restSeconds: string; coachingNotes: string }>
  >({});
  const [addExerciseSelection, setAddExerciseSelection] = useState<Record<number, string>>({});
  const [planNotice, setPlanNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [createExerciseDialog, setCreateExerciseDialog] = useState<{
    open: boolean;
    sessionId: number | null;
    order: number;
  }>({ open: false, sessionId: null, order: 1 });
  const [exerciseVideoDialog, setExerciseVideoDialog] = useState<{
    open: boolean;
    title: string;
    url: string;
  }>({ open: false, title: "", url: "" });
  const [isUploadingExerciseVideo, setIsUploadingExerciseVideo] = useState(false);
  const [exerciseVideoPreviewUrl, setExerciseVideoPreviewUrl] = useState<string | null>(null);
  const [newExerciseDraft, setNewExerciseDraft] = useState<{
    name: string;
    videoUrl: string;
    cues: string;
    notes: string;
    sets: string;
    reps: string;
    duration: string;
    restSeconds: string;
  }>({
    name: "",
    videoUrl: "",
    cues: "",
    notes: "",
    sets: "",
    reps: "",
    duration: "",
    restSeconds: "",
  });

  useEffect(() => {
    return () => {
      if (exerciseVideoPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(exerciseVideoPreviewUrl);
      }
    };
  }, [exerciseVideoPreviewUrl]);

  useEffect(() => {
    if (addSessionMode !== "next") return;
    setNewSessionWeek(String(planWeek));
    setNewSessionNumber(String(nextSessionNumberForWeek));
  }, [addSessionMode, planWeek, nextSessionNumberForWeek]);

  useEffect(() => {
    setSessionDrafts((prev) => {
      const next = { ...prev };
      planSessions.forEach((session) => {
        if (!session?.id) return;
        if (next[session.id]) return;
        next[session.id] = { title: session.title ?? "", notes: session.notes ?? "" };
      });
      return next;
    });
    setExerciseDrafts((prev) => {
      const next = { ...prev };
      planSessions.forEach((session) => {
        (session.exercises ?? []).forEach((ex) => {
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
    isDeletingExercise ||
    isCreatingExercise ||
    isPresigningUpload ||
    isUploadingExerciseVideo;

  useEffect(() => {
    if (!planNotice) return;
    const t = window.setTimeout(() => setPlanNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [planNotice]);

  const planErrorMessage = useCallback((err: unknown) => {
    return getErrorMessage(err, "Something went wrong");
  }, []);

  const toNumOrUndefined = useCallback((v: string) => {
    if (!v.trim()) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }, []);

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
        const requests: BillingRequest[] = Array.isArray(payload?.requests) ? payload.requests : [];
        const match = requests.find((r) => r.userId === userId);
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
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, "Failed to update block status."));
    }
  }, [userId, rawUser?.isBlocked, blockUser, router]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm("Delete this user? This will remove them from the admin list.")) return;
    setActionError(null);
    try {
      await deleteUser({ userId }).unwrap();
      router.push("/users");
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, "Failed to delete user."));
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
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, "Failed to update program tier."));
    }
  }, [athleteId, programTier, updateProgramTier]);

  if (!isValidId) {
    return (
      <AdminShell title="User" subtitle="Invalid user ID.">
        <Card className="border-dashed">
          <CardContent className="space-y-4 pt-6">
            <p className="text-muted-foreground">Invalid user ID.</p>
            <UserDetailBackBar />
          </CardContent>
        </Card>
      </AdminShell>
    );
  }

  if (!rawUser && usersData !== undefined) {
    return (
      <AdminShell title="User" subtitle="User not found.">
        <Card className="border-dashed">
          <CardContent className="space-y-4 pt-6">
            <p className="text-muted-foreground">User not found.</p>
            <UserDetailBackBar />
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
        : resolvedTier === "PHP_Premium_Plus"
          ? "Plus"
          : "Program";

  return (
    <AdminShell title={displayName} subtitle={`User #${userId} · ${tierLabel}`}>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <UserDetailBackBar />
          <Button variant="outline" size="sm" asChild>
            <Link href="/training-snapshot">Client training snapshot</Link>
          </Button>
        </div>

        <UserDetailSummaryStrip
          userId={userId}
          email={rawUser?.email}
          tierLabel={tierLabel}
          role={rawUser?.role}
          isBlocked={Boolean(rawUser?.isBlocked)}
          athleteName={onboarding?.athlete?.name ?? rawUser?.athleteName}
        />

        {actionError ? (
          <div className="rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-900 dark:text-red-100">
            {actionError}
          </div>
        ) : null}

        <UserProfileSection
          title="Account"
          description="Sign-in identity, role, and account lifecycle."
          icon={UserCircle}
        >
          <ProfileField label="User ID" value={rawUser?.id} />
          <ProfileField label="Name" value={rawUser?.name} />
          <ProfileField label="Email" value={rawUser?.email} />
          <ProfileField label="Role" value={rawUser?.role} />
          <ProfileField label="Status" value={rawUser?.isBlocked ? "Blocked" : "Active"} />
          <ProfileField label="Program tier" value={tierLabel} />
          <ProfileField
            label="Onboarding"
            value={
              (rawUser?.onboardingCompleted ?? rawUser?.onboarding_completed) === false
                ? "Awaiting review"
                : "Complete"
            }
          />
          <ProfileField
            label="Created"
            value={rawUser?.createdAt ? new Date(rawUser.createdAt).toLocaleString() : null}
          />
          <ProfileField
            label="Updated"
            value={rawUser?.updatedAt ? new Date(rawUser.updatedAt).toLocaleString() : null}
          />
          <ProfileField label="Cognito sub" value={rawUser?.cognitoSub} />
        </UserProfileSection>

        {(onboarding?.guardian || rawUser?.guardianProgramTier != null) && (
          <UserProfileSection
            title="Guardian"
            description="Parent / guardian record linked to this login."
            icon={Users}
          >
            {onboardingLoading ? (
              <div className="px-5 py-6 text-sm text-muted-foreground">Loading…</div>
            ) : (
              <>
                <ProfileField label="Guardian ID" value={onboarding?.guardian?.id} />
                <ProfileField label="Email" value={onboarding?.guardian?.email} />
                <ProfileField label="Phone" value={onboarding?.guardian?.phoneNumber} />
                <ProfileField label="Relation to athlete" value={onboarding?.guardian?.relationToAthlete} />
                <ProfileField label="Current program tier" value={onboarding?.guardian?.currentProgramTier} />
                <ProfileField label="Active athlete ID" value={onboarding?.guardian?.activeAthleteId} />
                <ProfileField
                  label="Created"
                  value={
                    onboarding?.guardian?.createdAt
                      ? new Date(onboarding.guardian.createdAt).toLocaleString()
                      : null
                  }
                />
              </>
            )}
          </UserProfileSection>
        )}

        {(onboarding?.athlete || rawUser?.athleteId) && (
          <UserProfileSection
            title="Athlete"
            description="The athlete profile this guardian manages — onboarding and training context."
            icon={UserRound}
          >
            {onboardingLoading ? (
              <div className="px-5 py-6 text-sm text-muted-foreground">Loading…</div>
            ) : (
              <>
                <ProfileField label="Athlete ID" value={onboarding?.athlete?.id ?? rawUser?.athleteId} />
                <ProfileField label="Name" value={onboarding?.athlete?.name ?? rawUser?.athleteName} />
                <ProfileField label="Age" value={onboarding?.athlete?.age} />
                <ProfileField
                  label="Birth date"
                  value={
                    onboarding?.athlete?.birthDate
                      ? new Date(onboarding.athlete.birthDate).toLocaleDateString()
                      : null
                  }
                />
                <ProfileField label="Team" value={onboarding?.athlete?.team} />
                <ProfileField label="Training per week" value={onboarding?.athlete?.trainingPerWeek} />
                <ProfileField label="Performance goals" value={onboarding?.athlete?.performanceGoals} />
                <ProfileField label="Equipment access" value={onboarding?.athlete?.equipmentAccess} />
                <ProfileField
                  label="Injuries"
                  value={
                    onboarding?.athlete?.injuries ? JSON.stringify(onboarding.athlete.injuries) : null
                  }
                />
                <ProfileField label="Growth notes" value={onboarding?.athlete?.growthNotes} />
                <ProfileField
                  label="Onboarding completed"
                  value={onboarding?.athlete?.onboardingCompleted ? "Yes" : "No"}
                />
                <ProfileField
                  label="Onboarding completed at"
                  value={
                    onboarding?.athlete?.onboardingCompletedAt
                      ? new Date(onboarding.athlete.onboardingCompletedAt).toLocaleString()
                      : null
                  }
                />
                <ProfileField label="Current program tier" value={onboarding?.athlete?.currentProgramTier} />
                <ProfileField
                  label="Created"
                  value={
                    onboarding?.athlete?.createdAt
                      ? new Date(onboarding.athlete.createdAt).toLocaleString()
                      : null
                  }
                />
              </>
            )}
          </UserProfileSection>
        )}

        {resolvedTier === "PHP_Premium" && (
          <UserProfileSection
            title="Training load"
            description="Check-ins from the mobile app — last 14 days of completions plus average RPE, soreness, and fatigue when logged."
            icon={Activity}
          >
            {completionsLoading ? (
              <UserDetailStatGrid
                items={[
                  { label: "Completions (14d)", value: "—", loading: true },
                  { label: "Avg RPE", value: "—", loading: true },
                  { label: "Avg soreness", value: "—", loading: true },
                  { label: "Avg fatigue", value: "—", loading: true },
                ]}
              />
            ) : (
              <UserDetailStatGrid
                items={[
                  { label: "Completions (14d)", value: completionStats.count },
                  { label: "Avg RPE", value: completionStats.avgRpe ?? "—" },
                  { label: "Avg soreness", value: completionStats.avgSoreness ?? "—" },
                  { label: "Avg fatigue", value: completionStats.avgFatigue ?? "—" },
                ]}
              />
            )}
          </UserProfileSection>
        )}

        {resolvedTier === "PHP_Premium" && (
          <UserDetailSectionCard
            title="Premium plan editor"
            description="Per-athlete weekly sessions and exercises. Clone from the assigned template first, then customize — library templates are unchanged."
            icon={ClipboardList}
          >
            <div className="rounded-2xl border border-border/90 bg-secondary/25 p-4 text-sm text-muted-foreground dark:bg-secondary/15">
              <p className="font-semibold text-foreground">How this works</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 leading-relaxed">
                <li>
                  A <span className="font-medium text-foreground">session</span> is one training day in a week (e.g.
                  Lower body, speed, movement screen).
                </li>
                <li>
                  Add <span className="font-medium text-foreground">exercises</span> per session; override sets, reps,
                  rest, and coaching notes for this athlete only.
                </li>
                <li>
                  Fastest path: <span className="font-medium text-foreground">Clone from assigned template</span>, then
                  edit.
                </li>
              </ul>
            </div>

	              {planNotice && (
	                <div
	                  className={[
	                    "mt-4 rounded-2xl border px-4 py-3 text-sm",
	                    planNotice.type === "success"
	                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
	                      : "border-red-200 bg-red-50 text-red-900",
	                  ].join(" ")}
	                >
	                  {planNotice.message}
	                </div>
	              )}

	              <div className="mt-4 flex flex-wrap items-center gap-2">
	                <Button
	                  variant="outline"
	                  onClick={async () => {
	                    try {
	                      await clonePlan({ userId, replaceExisting: true }).unwrap();
	                      setPlanNotice({ type: "success", message: "Cloned the assigned template into this athlete’s Premium plan." });
	                    } catch (err) {
	                      setPlanNotice({ type: "error", message: `Clone failed: ${planErrorMessage(err)}` });
	                    }
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
	                  <div className="flex flex-wrap items-center justify-between gap-2">
	                    <div>
	                      <p className="text-sm font-semibold text-foreground">Create a session</p>
	                      <p className="mt-1 text-xs text-muted-foreground">
	                        Sessions are ordered (Session 1, 2, 3…) within a week. Use titles like “Lower Body Strength”, “Speed”, or “Movement
	                        Screen”.
	                      </p>
	                    </div>
	                    <div className="flex items-center gap-2">
	                      <Button
	                        type="button"
	                        size="sm"
	                        variant={addSessionMode === "next" ? "default" : "outline"}
	                        onClick={() => setAddSessionMode("next")}
	                        disabled={isPlanBusy}
	                      >
	                        Next session
	                      </Button>
	                      <Button
	                        type="button"
	                        size="sm"
	                        variant={addSessionMode === "custom" ? "default" : "outline"}
	                        onClick={() => setAddSessionMode("custom")}
	                        disabled={isPlanBusy}
	                      >
	                        Custom
	                      </Button>
	                    </div>
	                  </div>

	                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
	                    <div className="space-y-2">
	                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Title (recommended)</label>
	                      <Input
	                        value={newSessionTitle}
	                        onChange={(e) => setNewSessionTitle(e.target.value)}
	                        placeholder="e.g. Lower Body Strength"
	                      />
	                    </div>
	                    <div className="space-y-2">
	                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes (optional)</label>
	                      <Textarea
	                        className="min-h-[42px]"
	                        value={newSessionNotes}
	                        onChange={(e) => setNewSessionNotes(e.target.value)}
	                        placeholder="Optional: what to focus on, cues, limitations…"
	                      />
	                    </div>
	                  </div>

	                  <div className="mt-4 flex flex-wrap items-end gap-2">
	                    <div className="space-y-1">
	                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Week</label>
	                      <Input
	                        value={newSessionWeek}
	                        onChange={(e) => setNewSessionWeek(e.target.value)}
	                        className="w-28"
	                        disabled={addSessionMode === "next"}
	                        placeholder={String(planWeek)}
	                      />
	                    </div>
	                    <div className="space-y-1">
	                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Session #</label>
	                      <Input
	                        value={newSessionNumber}
	                        onChange={(e) => setNewSessionNumber(e.target.value)}
	                        className="w-28"
	                        disabled={addSessionMode === "next"}
	                        placeholder={String(nextSessionNumberForWeek)}
	                      />
	                    </div>
	                    <div className="flex-1" />
	                    <Button
	                      onClick={async () => {
	                        const week = addSessionMode === "next" ? planWeek : Number(newSessionWeek);
	                        const sessionNumber = addSessionMode === "next" ? nextSessionNumberForWeek : Number(newSessionNumber);
	                        if (!Number.isFinite(week) || week <= 0) {
	                          setPlanNotice({ type: "error", message: "Week must be a positive number." });
	                          return;
	                        }
	                        if (!Number.isFinite(sessionNumber) || sessionNumber <= 0) {
	                          setPlanNotice({ type: "error", message: "Session number must be a positive number." });
	                          return;
	                        }
	                        try {
	                          await createPlanSession({
	                            userId,
	                            weekNumber: week,
	                            sessionNumber,
	                            title: newSessionTitle.trim() || null,
	                            notes: newSessionNotes.trim() || null,
	                          }).unwrap();
	                          setPlanWeek(week);
	                          setNewSessionTitle("");
	                          setNewSessionNotes("");
	                          setPlanNotice({ type: "success", message: `Created Week ${week} • Session ${sessionNumber}. Now add exercises below.` });
	                        } catch (err) {
	                          setPlanNotice({ type: "error", message: `Create session failed: ${planErrorMessage(err)}` });
	                        }
	                      }}
	                      disabled={isPlanBusy || !isValidId}
	                    >
	                      {isCreatingSession ? "Creating..." : "Create session"}
	                    </Button>
	                  </div>
	                </div>

                {premiumPlanLoading ? (
                  <div className="text-sm text-muted-foreground">Loading plan…</div>
	                ) : visiblePlanSessions.length === 0 ? (
	                  <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
	                    <div className="font-semibold text-foreground">No sessions in Week {planWeek} yet</div>
	                    <div className="mt-2">Pick one:</div>
	                    <ul className="mt-2 list-disc space-y-1 pl-5">
	                      <li>
	                        Click <span className="font-medium text-foreground">Clone From Assigned Template</span> (fastest).
	                      </li>
	                      <li>
	                        Or create a session above, then add exercises.
	                      </li>
	                    </ul>
	                  </div>
	                ) : (
                  visiblePlanSessions
                    .slice()
                    .sort((a, b) => Number(a.sessionNumber) - Number(b.sessionNumber))
                    .map((session) => {
                      const draft = sessionDrafts[session.id] ?? { title: "", notes: "" };
                      const exercises = (session.exercises ?? []).slice().sort((a, b) => Number(a.order) - Number(b.order));
                      const nextOrder = exercises.length ? Math.max(...exercises.map((e) => Number(e.order ?? 0))) + 1 : 1;
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
	                                  try {
	                                    await deletePlanSession({ userId, sessionId: session.id }).unwrap();
	                                    setPlanNotice({
	                                      type: "success",
	                                      message: `Deleted Week ${session.weekNumber} • Session ${session.sessionNumber}.`,
	                                    });
	                                  } catch (err) {
	                                    setPlanNotice({ type: "error", message: `Delete failed: ${planErrorMessage(err)}` });
	                                  }
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
	                                try {
	                                  await updatePlanSession({
	                                    userId,
	                                    sessionId: session.id,
	                                    patch: { title: draft.title.trim() || null, notes: draft.notes.trim() || null },
	                                  }).unwrap();
	                                  setPlanNotice({ type: "success", message: "Session saved." });
	                                } catch (err) {
	                                  setPlanNotice({ type: "error", message: `Save failed: ${planErrorMessage(err)}` });
	                                }
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
	                                  {exerciseOptions.map((ex) => (
	                                    <option key={ex.id} value={String(ex.id)}>
	                                      {ex.name}
	                                    </option>
	                                  ))}
	                                </Select>
	                                <Button
	                                  type="button"
	                                  variant="outline"
	                                  size="sm"
	                                  onClick={() => {
	                                    setNewExerciseDraft({
	                                      name: "",
	                                      videoUrl: "",
	                                      cues: "",
	                                      notes: "",
	                                      sets: "",
	                                      reps: "",
	                                      duration: "",
	                                      restSeconds: "",
	                                    });
	                                    setCreateExerciseDialog({ open: true, sessionId: session.id, order: nextOrder });
	                                  }}
	                                  disabled={isPlanBusy}
	                                >
	                                  New Exercise
	                                </Button>
	                                <Button
	                                  size="sm"
	                                  onClick={async () => {
	                                    const exId = Number(selectedExerciseId);
	                                    if (!Number.isFinite(exId) || exId <= 0) return;
	                                    try {
	                                      await addPlanExercise({
	                                        userId,
	                                        sessionId: session.id,
	                                        body: { exerciseId: exId, order: nextOrder },
	                                      }).unwrap();
	                                      setAddExerciseSelection((prev) => ({ ...prev, [session.id]: "" }));
	                                      setPlanNotice({ type: "success", message: "Exercise added." });
	                                    } catch (err) {
	                                      setPlanNotice({ type: "error", message: `Add exercise failed: ${planErrorMessage(err)}` });
	                                    }
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
                                exercises.map((ex) => {
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
	                                          {base?.videoUrl ? (
	                                            <div className="mt-2 flex flex-wrap items-center gap-2">
	                                              <span className="text-[11px] text-muted-foreground">Video attached</span>
	                                              <Button
	                                                type="button"
	                                                size="sm"
	                                                variant="outline"
	                                                onClick={() =>
	                                                  setExerciseVideoDialog({
	                                                    open: true,
	                                                    title: name,
	                                                    url: base.videoUrl as string,
	                                                  })
	                                                }
	                                              >
	                                                View video
	                                              </Button>
	                                              <a
	                                                href={base.videoUrl}
	                                                target="_blank"
	                                                rel="noreferrer"
	                                                className="text-xs text-muted-foreground underline hover:text-foreground"
	                                              >
	                                                Open
	                                              </a>
	                                            </div>
	                                          ) : (
	                                            <div className="mt-2 text-[11px] text-muted-foreground">No video</div>
	                                          )}
	                                        </div>
	                                        <div className="flex items-center gap-2">
	                                          <Button
	                                            variant="outline"
	                                            size="sm"
	                                            onClick={async () => {
	                                              const confirmed = window.confirm("Remove this exercise from the session?");
	                                              if (!confirmed) return;
	                                              try {
	                                                await deletePlanExercise({ userId, planExerciseId: ex.id }).unwrap();
	                                                setPlanNotice({ type: "success", message: "Exercise removed." });
	                                              } catch (err) {
	                                                setPlanNotice({ type: "error", message: `Remove failed: ${planErrorMessage(err)}` });
	                                              }
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
	                                            try {
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
	                                              setPlanNotice({ type: "success", message: "Exercise saved." });
	                                            } catch (err) {
	                                              setPlanNotice({ type: "error", message: `Save failed: ${planErrorMessage(err)}` });
	                                            }
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
          </UserDetailSectionCard>
        )}

	        <Dialog
	          open={createExerciseDialog.open}
	          onOpenChange={(open) => setCreateExerciseDialog((prev) => ({ ...prev, open }))}
	        >
	          <DialogContent>
	            <DialogHeader>
	              <DialogTitle>Create exercise</DialogTitle>
	              <DialogDescription>
	                This creates a new exercise in your Exercise Library, then adds it to this athlete’s session.
	              </DialogDescription>
	            </DialogHeader>

	            <div className="mt-4 grid gap-3">
	              <div className="space-y-2">
	                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</label>
	                <Input
	                  value={newExerciseDraft.name}
	                  onChange={(e) => setNewExerciseDraft((prev) => ({ ...prev, name: e.target.value }))}
	                  placeholder="e.g. Single-leg squat"
	                />
	              </div>

	              <div className="space-y-2">
	                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Demo video (optional)</label>
	                <div className="flex flex-wrap items-center gap-2">
	                  <input
	                    type="file"
	                    accept="video/*"
	                    onChange={async (e) => {
	                      const file = e.target.files?.[0];
	                      if (!file) return;
	                      if (exerciseVideoPreviewUrl?.startsWith("blob:")) {
	                        URL.revokeObjectURL(exerciseVideoPreviewUrl);
	                      }
	                      setExerciseVideoPreviewUrl(URL.createObjectURL(file));
	                      try {
	                        setIsUploadingExerciseVideo(true);
	                        const presigned = await presignMediaUpload({
	                          folder: "exercises/video",
	                          fileName: file.name,
	                          contentType: file.type || "video/mp4",
	                          sizeBytes: file.size,
	                        }).unwrap();

	                        const putRes = await fetch(presigned.uploadUrl, {
	                          method: "PUT",
	                          headers: { "Content-Type": file.type || "video/mp4" },
	                          body: file,
	                        });
	                        if (!putRes.ok) {
	                          throw new Error(`Upload failed (HTTP ${putRes.status})`);
	                        }
	                        setNewExerciseDraft((prev) => ({ ...prev, videoUrl: presigned.publicUrl }));
	                        setExerciseVideoPreviewUrl(presigned.publicUrl);
	                        setPlanNotice({ type: "success", message: "Video uploaded. It will be saved with the exercise." });
	                      } catch (err) {
	                        setPlanNotice({ type: "error", message: `Video upload failed: ${planErrorMessage(err)}` });
	                      } finally {
	                        setIsUploadingExerciseVideo(false);
	                      }
	                    }}
	                    disabled={isPlanBusy || isUploadingExerciseVideo}
	                    className="block w-full max-w-sm text-sm text-muted-foreground file:mr-3 file:rounded-full file:border file:border-border file:bg-secondary/60 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-secondary/80"
	                  />
	                  {newExerciseDraft.videoUrl ? (
	                    <Button
	                      type="button"
	                      variant="outline"
	                      size="sm"
	                      onClick={() => {
	                        if (exerciseVideoPreviewUrl?.startsWith("blob:")) {
	                          URL.revokeObjectURL(exerciseVideoPreviewUrl);
	                        }
	                        setExerciseVideoPreviewUrl(null);
	                        setNewExerciseDraft((prev) => ({ ...prev, videoUrl: "" }));
	                      }}
	                      disabled={isPlanBusy || isUploadingExerciseVideo}
	                    >
	                      Remove
	                    </Button>
	                  ) : null}
	                </div>
	                <Input
	                  value={newExerciseDraft.videoUrl}
	                  onChange={(e) => {
	                    const url = e.target.value;
	                    setNewExerciseDraft((prev) => ({ ...prev, videoUrl: url }));
	                    setExerciseVideoPreviewUrl(url.trim() ? url.trim() : null);
	                  }}
	                  placeholder="...or paste a URL"
	                  disabled={isUploadingExerciseVideo}
	                />
	                {exerciseVideoPreviewUrl ? (
	                  <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-background">
	                    <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
	                      Preview
	                    </div>
	                    <div className="p-3">
	                      <video
	                        key={exerciseVideoPreviewUrl}
	                        src={exerciseVideoPreviewUrl}
	                        controls
	                        playsInline
	                        className="w-full rounded-xl bg-black"
	                      />
	                    </div>
	                  </div>
	                ) : null}
	              </div>

	              <div className="grid gap-2 md:grid-cols-2">
	                <div className="space-y-2">
	                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cues (optional)</label>
	                  <Textarea
	                    className="min-h-[90px]"
	                    value={newExerciseDraft.cues}
	                    onChange={(e) => setNewExerciseDraft((prev) => ({ ...prev, cues: e.target.value }))}
	                  />
	                </div>
	                <div className="space-y-2">
	                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes (optional)</label>
	                  <Textarea
	                    className="min-h-[90px]"
	                    value={newExerciseDraft.notes}
	                    onChange={(e) => setNewExerciseDraft((prev) => ({ ...prev, notes: e.target.value }))}
	                  />
	                </div>
	              </div>

	              <div className="grid gap-2 md:grid-cols-4">
	                <Input
	                  placeholder="Sets"
	                  value={newExerciseDraft.sets}
	                  onChange={(e) => setNewExerciseDraft((prev) => ({ ...prev, sets: e.target.value }))}
	                />
	                <Input
	                  placeholder="Reps"
	                  value={newExerciseDraft.reps}
	                  onChange={(e) => setNewExerciseDraft((prev) => ({ ...prev, reps: e.target.value }))}
	                />
	                <Input
	                  placeholder="Duration sec"
	                  value={newExerciseDraft.duration}
	                  onChange={(e) => setNewExerciseDraft((prev) => ({ ...prev, duration: e.target.value }))}
	                />
	                <Input
	                  placeholder="Rest sec"
	                  value={newExerciseDraft.restSeconds}
	                  onChange={(e) => setNewExerciseDraft((prev) => ({ ...prev, restSeconds: e.target.value }))}
	                />
	              </div>

	              <div className="mt-2 flex justify-end gap-2">
	                <Button
	                  type="button"
	                  variant="outline"
	                  onClick={() => setCreateExerciseDialog((prev) => ({ ...prev, open: false }))}
	                  disabled={isPlanBusy}
	                >
	                  Cancel
	                </Button>
	                <Button
	                  type="button"
	                  onClick={async () => {
	                    const sessionId = createExerciseDialog.sessionId;
	                    if (!sessionId) return;
	                    const name = newExerciseDraft.name.trim();
	                    if (!name) {
	                      setPlanNotice({ type: "error", message: "Exercise name is required." });
	                      return;
	                    }
	                    try {
	                      const payload = {
	                        name,
	                        cues: newExerciseDraft.cues.trim() || undefined,
	                        notes: newExerciseDraft.notes.trim() || undefined,
	                        videoUrl: newExerciseDraft.videoUrl.trim() || undefined,
	                        sets: toNumOrUndefined(newExerciseDraft.sets),
	                        reps: toNumOrUndefined(newExerciseDraft.reps),
	                        duration: toNumOrUndefined(newExerciseDraft.duration),
	                        restSeconds: toNumOrUndefined(newExerciseDraft.restSeconds),
	                      };
	                      const created = await createExercise(payload).unwrap();
	                      const exId = Number(created?.exercise?.id);
	                      if (!Number.isFinite(exId) || exId <= 0) {
	                        throw new Error("Exercise created but no id returned.");
	                      }
	                      await addPlanExercise({
	                        userId,
	                        sessionId,
	                        body: { exerciseId: exId, order: createExerciseDialog.order },
	                      }).unwrap();
	                      setCreateExerciseDialog({ open: false, sessionId: null, order: 1 });
	                      setPlanNotice({ type: "success", message: "Created a new exercise and added it to the session." });
	                    } catch (err) {
	                      setPlanNotice({ type: "error", message: `Create exercise failed: ${planErrorMessage(err)}` });
	                    }
	                  }}
	                  disabled={isPlanBusy}
	                >
	                  {isCreatingExercise ? "Creating..." : "Create + Add"}
	                </Button>
	              </div>
	            </div>
	          </DialogContent>
	        </Dialog>

	        <Dialog
	          open={exerciseVideoDialog.open}
	          onOpenChange={(open) => setExerciseVideoDialog((prev) => ({ ...prev, open }))}
	        >
	          <DialogContent>
	            <DialogHeader>
	              <DialogTitle>{exerciseVideoDialog.title || "Exercise video"}</DialogTitle>
	              <DialogDescription>Preview the demo video saved on the exercise.</DialogDescription>
	            </DialogHeader>
	            {exerciseVideoDialog.url ? (
	              <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-black/40">
	                <video
	                  key={exerciseVideoDialog.url}
	                  src={exerciseVideoDialog.url}
	                  controls
	                  playsInline
	                  className="w-full"
	                />
	              </div>
	            ) : (
	              <div className="mt-4 text-sm text-muted-foreground">No video URL found.</div>
	            )}
	            {exerciseVideoDialog.url ? (
	              <div className="mt-3">
	                <a
	                  href={exerciseVideoDialog.url}
	                  target="_blank"
	                  rel="noreferrer"
	                  className="text-sm text-muted-foreground underline hover:text-foreground"
	                >
	                  Open in new tab
	                </a>
	              </div>
	            ) : null}
	          </DialogContent>
	        </Dialog>

        {billingStatus && (
          <UserProfileSection
            title="Subscription & billing"
            description="Latest subscription request and payment outcome from billing."
            icon={CreditCard}
          >
            <ProfileField label="Plan tier" value={billingStatus.planTier} />
            <ProfileField label="Display price" value={billingStatus.displayPrice} />
            <ProfileField label="Billing interval" value={billingStatus.billingInterval} />
            <ProfileField label="Status" value={billingStatus.status} />
            <ProfileField label="Payment status" value={billingStatus.paymentStatus} />
            <ProfileField
              label="Created"
              value={billingStatus.createdAt ? new Date(billingStatus.createdAt).toLocaleString() : null}
            />
          </UserProfileSection>
        )}

        <UserDetailSectionCard
          title="Admin actions"
          description="Change athlete program tier, suspend access, or permanently remove this user."
          icon={ShieldAlert}
          variant="danger"
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={programTier}
                onChange={(e) => setProgramTier(e.target.value)}
                className="min-w-[160px]"
              >
                <option value="PHP">PHP Program</option>
                <option value="PHP_Premium">PHP Premium</option>
                <option value="PHP_Premium_Plus">PHP Premium Plus</option>
                <option value="PHP_Pro">PHP Pro</option>
              </Select>
              <Button onClick={handleUpdateTier} disabled={!athleteId || tierLoading}>
                {tierLoading ? "Saving..." : "Update tier"}
              </Button>
            </div>
            <Button variant="outline" onClick={handleBlock} disabled={blockLoading}>
              {blockLoading ? "Updating..." : rawUser?.isBlocked ? "Unblock user" : "Block user"}
            </Button>
            <Button
              variant="outline"
              className="border-red-500/50 text-red-700 hover:bg-red-500/10 dark:text-red-300"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Deleting..." : "Delete user"}
            </Button>
          </div>
        </UserDetailSectionCard>
      </div>
    </AdminShell>
  );
}
