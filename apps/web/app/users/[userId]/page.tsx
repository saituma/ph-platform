"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { skipToken } from "@reduxjs/toolkit/query";

import { AdminShell } from "../../../components/admin/shell";
import {
  UserDetailBackBar,
} from "../../../components/admin/users/user-detail-shell";
import {
  Activity,
  CreditCard,
  Eye,
  EyeOff,
  ShieldAlert,
  UserCircle,
  UserRound,
  Users,
  Mail,
  Calendar,
  Award,
  Settings2,
  Trash2,
  Lock,
  ExternalLink,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertCircle,
  Zap,
  Target,
  Trophy,
  Dumbbell,
  ShieldCheck,
  Hash,
  Camera,
  UploadCloud,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "../../../components/ui/select";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import {
  getPasswordRuleStatus,
  isStrongPassword,
} from "../../../lib/password-rules";
import {
  useBlockUserMutation,
  useDeleteUserMutation,
  useGetUserOnboardingQuery,
  useGetUserProgramSectionCompletionsQuery,
  useGetUsersQuery,
  useUpdateProgramTierMutation,
  useUpdateAthleteMutation,
  useCreateMediaUploadUrlMutation,
} from "../../../lib/apiSlice";
import { cn } from "../../../lib/utils";

// --- Custom Styled Components for the "Cool" Factor ---

const GlassCard = ({ children, className, container }: { children: React.ReactNode; className?: string, container?: boolean }) => (
  <div className={cn(
    "relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-card/60 backdrop-blur-xl shadow-2xl",
    container && "p-8 md:p-12",
    className
  )}>
    <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-[100px]" />
    <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-emerald-500/5 blur-[100px]" />
    {children}
  </div>
);

const SectionHeader = ({ icon: Icon, title, subtitle }: { icon: any, title: string, subtitle?: string }) => (
  <div className="flex items-center gap-4 mb-8">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)]">
      <Icon className="h-6 w-6" />
    </div>
    <div>
      <h3 className="text-lg font-black uppercase tracking-tighter text-foreground leading-none">{title}</h3>
      {subtitle && <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1 opacity-70">{subtitle}</p>}
    </div>
  </div>
);

const TechnicalField = ({ label, value, icon: Icon }: { label: string, value: any, icon?: any }) => (
  <div className="group flex flex-col gap-1.5 p-4 rounded-2xl border border-transparent hover:border-white/5 hover:bg-white/[0.02] transition-all">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-3 w-3 text-muted-foreground/50" />}
      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{label}</span>
    </div>
    <div className="text-sm font-bold tracking-tight text-foreground/90 truncate">{value || "—"}</div>
  </div>
);

// --- Types ---

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

// --- Helper Functions ---

function getCsrfToken() {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("csrfToken="))
      ?.split("=")[1] ?? ""
  );
}

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
  const { data: onboarding, isFetching: onboardingLoading } =
    useGetUserOnboardingQuery(isValidId ? userId : skipToken);
  const fromIso = useMemo(() => {
    const from = new Date();
    from.setDate(from.getDate() - 14);
    return from.toISOString();
  }, []);
  const { data: completionsData, isFetching: completionsLoading } =
    useGetUserProgramSectionCompletionsQuery(
      isValidId ? { userId, from: fromIso, limit: 200 } : skipToken,
    );
  const [blockUser, { isLoading: blockLoading }] = useBlockUserMutation();
  const [deleteUser, { isLoading: deleteLoading }] = useDeleteUserMutation();
  const [updateProgramTier, { isLoading: tierLoading }] =
    useUpdateProgramTierMutation();
  const [updateAthlete, { isLoading: athleteUpdateLoading }] = useUpdateAthleteMutation();
  const [createMediaUploadUrl, { isLoading: preSignLoading }] = useCreateMediaUploadUrlMutation();

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [programTier, setProgramTier] = useState("PHP");
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [desiredPlanId, setDesiredPlanId] = useState<number | null>(null);
  const [isAssigningPlan, setIsAssigningPlan] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [billingStatus, setBillingStatus] = useState<{
    planTier?: string | null;
    displayPrice?: string | null;
    billingInterval?: string | null;
    status?: string | null;
    paymentStatus?: string | null;
    createdAt?: string | null;
  } | null>(null);

  const [passwordInput, setPasswordInput] = useState("");
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );
  const [passwordEmailSent, setPasswordEmailSent] = useState<boolean | null>(
    null,
  );

  const normalizedPassword = passwordInput.trim();
  const passwordRules = getPasswordRuleStatus(normalizedPassword);
  const isManualPasswordInvalid =
    normalizedPassword.length > 0 && !isStrongPassword(normalizedPassword);
  const passwordRuleClassName = (isMet: boolean) =>
    isMet ? "text-primary font-bold" : "text-muted-foreground/40";

  const rawUser = useMemo(
    () =>
      ((usersData?.users ?? []) as AdminUserRow[]).find((u) => u.id === userId),
    [usersData, userId],
  );

  const isTechnicalAthleteUser = useMemo(() => {
    const email = String(rawUser?.email ?? "").toLowerCase();
    return rawUser?.role === "athlete" && email.endsWith("@athlete.local");
  }, [rawUser?.email, rawUser?.role]);

  const athleteId = onboarding?.athlete?.id ?? rawUser?.athleteId;
  const resolvedTier =
    onboarding?.athlete?.currentProgramTier ??
    onboarding?.guardian?.currentProgramTier ??
    rawUser?.programTier ??
    rawUser?.guardianProgramTier ??
    "PHP";

  const loadCompletions = useMemo(
    () => completionsData?.items ?? [],
    [completionsData],
  );
  const completionStats = useMemo(() => {
    const rows = loadCompletions as Array<{
      rpe?: number | null;
      soreness?: number | null;
      fatigue?: number | null;
    }>;
    if (!rows.length) {
      return {
        count: 0,
        avgRpe: null as number | null,
        avgSoreness: null as number | null,
        avgFatigue: null as number | null,
      };
    }
    const average = (key: "rpe" | "soreness" | "fatigue") => {
      const vals = rows
        .map((r) => (typeof r[key] === "number" ? (r[key] as number) : null))
        .filter((v) => v != null) as number[];
      if (!vals.length) return null;
      return (
        Math.round((vals.reduce((sum, v) => sum + v, 0) / vals.length) * 10) /
        10
      );
    };
    return {
      count: rows.length,
      avgRpe: average("rpe"),
      avgSoreness: average("soreness"),
      avgFatigue: average("fatigue"),
    };
  }, [loadCompletions]);

  useEffect(() => {
    fetch("/api/backend/admin/subscription-plans")
      .then((res) => res.json())
      .then((data) => {
        if (data?.plans) setAvailablePlans(data.plans.filter((p: any) => p.isActive));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setProgramTier(resolvedTier);
  }, [resolvedTier]);

  const handleAssignPlan = useCallback(async () => {
    if (!athleteId || !desiredPlanId) return;
    setActionError(null);
    setActionNotice(null);
    setIsAssigningPlan(true);
    try {
      const plan = availablePlans.find(p => p.id === desiredPlanId);
      const csrfToken = getCsrfToken();
      const response = await fetch("/api/backend/admin/enrollments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        },
        body: JSON.stringify({
          athleteId,
          programType: plan?.tier || "PHP",
          programTemplateId: desiredPlanId,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err?.error || "Failed to assign plan.");
      }
      setActionNotice(`Plan "${plan?.name}" assigned successfully.`);
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, "Failed to assign plan."));
    } finally {
      setIsAssigningPlan(false);
    }
  }, [athleteId, desiredPlanId, availablePlans]);

  const handlePhotoChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !athleteId) return;

    setActionError(null);
    setActionNotice(null);
    setIsUploadingPhoto(true);

    try {
      // 1. Get pre-signed URL
      const { uploadUrl, publicUrl } = await createMediaUploadUrl({
        folder: "profile-pictures",
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      }).unwrap();

      // 2. Upload to storage
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadRes.ok) throw new Error("Failed to upload image to storage.");

      // 3. Update athlete record
      await updateAthlete({
        athleteId,
        patch: { profilePicture: publicUrl }
      }).unwrap();

      setActionNotice("Profile picture updated successfully.");
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, "Failed to update profile picture."));
    } finally {
      setIsUploadingPhoto(false);
    }
  }, [athleteId, createMediaUploadUrl, updateAthlete]);

  const handleBlock = useCallback(async () => {
    setActionError(null);
    setActionNotice(null);
    try {
      await blockUser({ userId, blocked: !rawUser?.isBlocked }).unwrap();
      if (rawUser?.isBlocked) return;
      router.push("/users");
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, "Failed to update block status."));
    }
  }, [userId, rawUser?.isBlocked, blockUser, router]);

  useEffect(() => {
    if (!userId || !isValidId) return;
    let active = true;
    fetch("/api/backend/admin/subscription-requests")
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!active) return;
        const requests: BillingRequest[] = Array.isArray(payload?.requests)
          ? payload.requests
          : [];
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
            : null,
        );
      })
      .catch(() => {
        if (active) setBillingStatus(null);
      });
    return () => {
      active = false;
    };
  }, [userId, isValidId]);

  const handleDelete = useCallback(async () => {
    if (
      !window.confirm(
        "Delete this user? This will remove them from the admin list.",
      )
    )
      return;
    setActionError(null);
    setActionNotice(null);
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
    setActionNotice(null);
    try {
      await updateProgramTier({ athleteId, programTier }).unwrap();
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, "Failed to update program tier."));
    }
  }, [athleteId, programTier, updateProgramTier]);

  const handleResetPassword = useCallback(async () => {
    if (!isValidId) return;
    setActionError(null);
    setActionNotice(null);
    setTemporaryPassword(null);
    setPasswordEmailSent(null);
    setIsResettingPassword(true);

    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(
        `/api/backend/admin/users/${userId}/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
          },
          credentials: "include",
          body: JSON.stringify({
            temporaryPassword: passwordInput.trim() || null,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to reset password.");
      }

      setTemporaryPassword(
        typeof payload?.temporaryPassword === "string"
          ? payload.temporaryPassword
          : null,
      );
      setPasswordEmailSent(
        typeof payload?.emailSent === "boolean" ? payload.emailSent : null,
      );
      setPasswordInput("");
      setActionNotice("Password reset.");
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, "Failed to reset password."));
    } finally {
      setIsResettingPassword(false);
    }
  }, [isValidId, passwordInput, userId]);

  if (!isValidId) {
    return (
      <AdminShell title="User" subtitle="Invalid ID">
        <div className="flex h-96 flex-col items-center justify-center rounded-[3rem] border border-dashed border-border/60 bg-card/20">
          <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground/30" />
          <p className="text-xl font-black uppercase tracking-widest text-muted-foreground/40">Invalid User Access</p>
          <div className="mt-8">
            <UserDetailBackBar />
          </div>
        </div>
      </AdminShell>
    );
  }

  const displayName = rawUser?.name ?? rawUser?.email ?? "User";
  const tierLabel =
    rawUser?.role === "admin" || rawUser?.role === "superAdmin"
      ? "Admin"
      : resolvedTier === "PHP_Pro"
        ? "Pro"
        : resolvedTier === "PHP_Premium"
          ? "Premium"
          : resolvedTier === "PHP_Premium_Plus"
            ? "Plus"
            : "Program";

  const tierVariant =
    tierLabel === "Premium"
      ? "secondary"
      : tierLabel === "Plus"
        ? "info"
        : tierLabel === "Pro"
          ? "success"
          : ("default" as const);

  return (
    <AdminShell
      title={displayName}
      subtitle={
        <span className="flex items-center gap-2">
          <span className="font-mono opacity-50">#{userId}</span>
          <span className="text-muted-foreground/30">•</span>
          <span className={cn(
            "font-black uppercase tracking-[0.2em] text-[10px]",
            tierLabel === "Premium" ? "text-amber-500" :
            tierLabel === "Plus" ? "text-blue-500" :
            tierLabel === "Pro" ? "text-primary" : "text-primary"
          )}>
            {tierLabel}
          </span>
        </span>
      }
    >
      <div className="mx-auto max-w-7xl space-y-12 pb-24">
        {/* Top Control Bar */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <UserDetailBackBar />
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="h-10 gap-2 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50"
              render={<Link href="/training-snapshot" />}
            >
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-[11px] font-black uppercase tracking-widest">Live Snapshot</span>
            </Button>
            <Button
              variant="outline"
              className="h-10 w-10 p-0 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10"
              render={<Link href={`/messaging?userId=${userId}`} />}
            >
              <Mail className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* --- HERO: COMMAND CENTER --- */}
        <div className="group relative">
          <div className="absolute -inset-1 rounded-[3rem] bg-gradient-to-tr from-primary/40 via-transparent to-primary/20 opacity-0 blur-2xl transition duration-1000 group-hover:opacity-30" />
          <GlassCard className="relative z-10 p-0">
            <div className="grid md:grid-cols-[1fr_2fr]">
              {/* Profile Visual */}
              <div className="relative flex flex-col items-center justify-center border-b border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent p-12 md:border-b-0 md:border-r">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-full bg-primary/20 blur-2xl animate-pulse" />
                  <div className="relative h-48 w-48 rounded-full border-[6px] border-card bg-muted shadow-2xl overflow-hidden group/avatar">
                    {onboarding?.athlete?.profilePicture ? (
                      <img
                        src={onboarding.athlete.profilePicture}
                        alt={displayName}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-secondary/20">
                        <UserCircle className="h-24 w-24 text-muted-foreground/20" />
                      </div>
                    )}
                    
                    {/* Photo Edit Overlay */}
                    <label className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover/avatar:opacity-100">
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        disabled={isUploadingPhoto}
                      />
                      {isUploadingPhoto ? (
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      ) : (
                        <>
                          <Camera className="mb-2 h-8 w-8 text-white" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white">Change Photo</span>
                        </>
                      )}
                    </label>
                  </div>
                  <div className="absolute -bottom-2 -right-2 flex h-14 w-14 items-center justify-center rounded-3xl border-4 border-card bg-primary text-primary-foreground shadow-2xl rotate-12 group-hover:rotate-0 transition-transform duration-500">
                    <Trophy className="h-7 w-7" />
                  </div>
                </div>
                <div className="mt-8 text-center">
                  <Badge variant={tierVariant} size="lg" className="h-8 px-4 text-[10px] font-black uppercase tracking-[0.25em] shadow-[0_0_15px_-5px_rgba(16,185,129,0.5)]">
                    {tierLabel} STATUS
                  </Badge>
                </div>
              </div>

              {/* Identity & Technical Metadata */}
              <div className="p-12">
                <div className="flex flex-wrap items-baseline gap-4">
                  <h1 className="text-4xl font-black uppercase tracking-tighter text-foreground md:text-6xl">
                    {displayName}
                  </h1>
                  <span className="text-sm font-black uppercase tracking-widest text-primary/60 font-mono">ID: {userId}</span>
                </div>

                <div className="mt-12 grid grid-cols-2 gap-px bg-white/5 overflow-hidden rounded-3xl border border-white/5 sm:grid-cols-4">
                  {[
                    { label: "Account Role", value: rawUser?.role, icon: ShieldCheck },
                    { label: "Date Joined", value: rawUser?.createdAt ? new Date(rawUser.createdAt).toLocaleDateString() : null, icon: Calendar },
                    { label: "Athlete Auth", value: onboarding?.athlete?.name ? "Linked" : "Direct", icon: Zap },
                    { label: "Team Origin", value: onboarding?.athlete?.team, icon: Target },
                  ].map((stat, i) => (
                    <div key={i} className="bg-card p-6 flex flex-col gap-1 transition-colors hover:bg-white/[0.03]">
                      <div className="flex items-center gap-2 mb-2">
                        <stat.icon className="h-3 w-3 text-primary/60" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">{stat.label}</span>
                      </div>
                      <span className="text-sm font-black uppercase tracking-tight text-foreground truncate">{stat.value || "Not Set"}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      rawUser?.isBlocked ? "bg-red-500 animate-pulse" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                    )} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">
                      {rawUser?.isBlocked ? "Suspended" : "Operational"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground/60 hover:text-primary transition-colors cursor-pointer group/mail">
                    <Mail className="h-4 w-4" />
                    <span className="text-xs font-bold font-mono underline-offset-4 group-hover/mail:underline">{rawUser?.email}</span>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* --- STATUS NOTIFICATIONS --- */}
        {(actionError || actionNotice) && (
          <div className="grid gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            {actionError && (
              <div className="relative overflow-hidden rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-red-500 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5" />
                  <p className="text-xs font-black uppercase tracking-widest">{actionError}</p>
                </div>
              </div>
            )}
            {actionNotice && (
              <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-primary/10 p-5 text-primary backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5" />
                  <p className="text-xs font-black uppercase tracking-widest">{actionNotice}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- MAIN DASHBOARD GRID --- */}
        <div className="grid gap-8 lg:grid-cols-12">
          {/* LEFT: ATHLETE & PERFORMANCE (BENTO COL) */}
          <div className="lg:col-span-8 space-y-8">
            <GlassCard container className="p-10!">
              <SectionHeader title="Performance Profile" subtitle="Physical & Training Context" icon={Dumbbell} />
              
              <div className="grid sm:grid-cols-2 gap-8">
                <div className="space-y-1 rounded-3xl border border-white/5 bg-white/[0.01] p-2">
                  <TechnicalField label="Full Identification" value={onboarding?.athlete?.name || rawUser?.athleteName} icon={UserRound} />
                  <TechnicalField label="Biological Age" value={onboarding?.athlete?.age ? `${onboarding.athlete.age} Years` : null} icon={Hash} />
                  <TechnicalField label="Current Organization" value={onboarding?.athlete?.team} icon={Award} />
                  <TechnicalField label="Birth Matrix" value={onboarding?.athlete?.birthDate ? new Date(onboarding.athlete.birthDate).toLocaleDateString(undefined, { dateStyle: 'full' }) : null} icon={Calendar} />
                </div>
                
                <div className="space-y-1 rounded-3xl border border-white/5 bg-white/[0.01] p-2">
                  <TechnicalField label="Training Frequency" value={onboarding?.athlete?.trainingPerWeek ? `${onboarding.athlete.trainingPerWeek} Sessions/Week` : null} icon={Activity} />
                  <TechnicalField label="Facility Access" value={onboarding?.athlete?.equipmentAccess} icon={Zap} />
                  <TechnicalField label="Commitment Cycle" value={onboarding?.athlete?.planCommitmentMonths ? `${onboarding.athlete.planCommitmentMonths} Months` : null} icon={ShieldCheck} />
                  <TechnicalField label="Deployment Cycle" value={onboarding?.athlete?.planExpiresAt ? `Expires ${new Date(onboarding.athlete.planExpiresAt).toLocaleDateString()}` : null} icon={Calendar} />
                </div>
              </div>

              <div className="mt-12 grid gap-6">
                <div className="group rounded-[2rem] border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent p-8 transition-colors hover:bg-white/[0.04]">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="h-4 w-4 text-primary" />
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Strategic Objectives</h4>
                  </div>
                  <p className="text-sm font-bold leading-relaxed text-foreground/80">{onboarding?.athlete?.performanceGoals || "No objectives defined for current cycle."}</p>
                </div>

                <div className="group rounded-[2rem] border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent p-8 transition-colors hover:bg-white/[0.04]">
                  <div className="flex items-center gap-2 mb-4 text-amber-500">
                    <AlertCircle className="h-4 w-4" />
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-500/80">Trauma & Injury Log</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {onboarding?.athlete?.injuries ? (
                      (() => {
                        try {
                          const injuries = JSON.parse(onboarding.athlete.injuries as string);
                          if (Array.isArray(injuries)) {
                            return injuries.map((inj, i) => (
                              <Badge key={i} className="h-8 px-4 rounded-xl bg-amber-500/10 text-amber-500 border-amber-500/20 font-black text-[9px] uppercase tracking-widest">
                                {typeof inj === 'string' ? inj : JSON.stringify(inj)}
                              </Badge>
                            ));
                          }
                          return <span className="font-bold text-sm">{String(injuries)}</span>;
                        } catch {
                          return <span className="font-bold text-sm">{onboarding.athlete.injuries}</span>;
                        }
                      })()
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground/40">Clean Medical History</span>
                    )}
                  </div>
                </div>
              </div>
            </GlassCard>

            {resolvedTier === "PHP_Premium" && (
              <GlassCard container className="p-10! border-primary/20">
                <SectionHeader title="Telemetry Data" subtitle="Real-time Training Metrics" icon={Activity} />
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/5 rounded-3xl overflow-hidden border border-white/5">
                  {[
                    { label: "Active Logs", value: completionStats.count, loading: completionsLoading },
                    { label: "Mean RPE", value: completionStats.avgRpe, loading: completionsLoading },
                    { label: "Soreness index", value: completionStats.avgSoreness, loading: completionsLoading },
                    { label: "Fatigue level", value: completionStats.avgFatigue, loading: completionsLoading },
                  ].map((stat, i) => (
                    <div key={i} className="bg-card/40 p-8 flex flex-col items-center justify-center text-center transition-colors hover:bg-white/[0.05]">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">{stat.label}</span>
                      <div className="text-3xl font-black font-mono tracking-tighter text-foreground">
                        {stat.loading ? "..." : stat.value || "0.0"}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex justify-end">
                  <Button variant="outline" className="rounded-xl border-primary/20 text-primary hover:bg-primary/5 text-[10px] font-black uppercase tracking-widest" render={<Link href="/training-snapshot" />}>
                    Open Telemetry Hub <ChevronRight className="h-3 w-3 ml-2" />
                  </Button>
                </div>
              </GlassCard>
            )}
          </div>

          {/* RIGHT: COMMANDS & SYSTEMS (BENTO COL) */}
          <div className="lg:col-span-4 space-y-8">
            <GlassCard container className="p-8!">
              <SectionHeader title="System Access" subtitle="Identity & Role Matrix" icon={Settings2} />
              <div className="space-y-1 rounded-3xl border border-white/5 bg-white/[0.01] p-1 mb-8">
                <TechnicalField label="Universal ID" value={rawUser?.id} icon={Hash} />
                <TechnicalField label="Access Level" value={rawUser?.role} icon={ShieldCheck} />
                <div className="p-4 space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Cloud Identifier</span>
                  <div className="font-mono text-[9px] break-all p-3 rounded-xl bg-black/20 border border-white/5 opacity-50 select-all">
                    {rawUser?.cognitoSub}
                  </div>
                </div>
              </div>
              <Button variant="outline" className="w-full h-12 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 group" render={<Link href="/messaging" />}>
                <Mail className="h-4 w-4 mr-3 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-black uppercase tracking-widest">Intercept Messaging</span>
              </Button>
            </GlassCard>

            <GlassCard container className="p-8!">
              <SectionHeader title="Subscription" subtitle="Active Plan & Billing" icon={CreditCard} />
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 block mb-1">Current Plan</span>
                      <h4 className="text-sm font-black uppercase text-foreground">
                        {(() => {
                          const activeTier = billingStatus?.planTier || resolvedTier;
                          const plan = availablePlans.find(p => p.tier === activeTier || p.id === desiredPlanId);
                          return plan?.name || activeTier || "No Active Plan";
                        })()}
                      </h4>
                    </div>
                    <Badge variant={billingStatus?.status === 'active' ? 'success' : 'outline'} className="h-6 px-2 text-[9px] font-black uppercase tracking-widest">
                      {billingStatus?.status || 'Unknown'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 block mb-0.5">Price</span>
                      <span className="text-xs font-bold font-mono">{billingStatus?.displayPrice || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 block mb-0.5">Interval</span>
                      <span className="text-xs font-bold uppercase tracking-tight">{billingStatus?.billingInterval || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard container className="p-8!">
              <SectionHeader title="Authentication" subtitle="Security Protocol" icon={Lock} />
              
              {isTechnicalAthleteUser ? (
                <div className="flex flex-col items-center justify-center p-8 text-center rounded-3xl bg-muted/20 border border-dashed border-white/10">
                   <ShieldAlert className="h-8 w-8 text-muted-foreground/30 mb-3" />
                   <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Legacy Youth Record</p>
                   <p className="mt-2 text-[9px] font-medium leading-relaxed opacity-40">Access managed via guardian primary protocol.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-1">Security Overwrite</label>
                    <div className="relative">
                      <Input
                        type={showTemporaryPassword ? "text" : "password"}
                        className="h-14 rounded-2xl border-white/10 bg-black/20 focus:bg-black/40 transition-all font-mono text-sm"
                        placeholder="System Generated..."
                        value={passwordInput}
                        onChange={(event) => setPasswordInput(event.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowTemporaryPassword((prev) => !prev)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-primary transition-colors"
                      >
                        {showTemporaryPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20"
                    onClick={() => void handleResetPassword()}
                    disabled={isResettingPassword || isManualPasswordInvalid}
                  >
                    {isResettingPassword ? "Executing Reset..." : "Reset System Access"}
                  </Button>
                </div>
              )}
            </GlassCard>

            <GlassCard container className="p-8! border-red-500/20">
              <SectionHeader title="Admin Override" subtitle="Destructive Operations" icon={ShieldAlert} />
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-1">Gated Tier Protocol</label>
                  <div className="flex gap-2">
                    <Select value={programTier} onValueChange={(v) => setProgramTier(v ?? "")}>
                      <SelectTrigger className="h-12 rounded-2xl border-white/10 bg-black/20 w-full font-black uppercase tracking-widest text-[10px]"><SelectValue /></SelectTrigger>
                      <SelectPopup>
                        <SelectItem value="PHP">Standard Tier</SelectItem>
                        <SelectItem value="PHP_Premium">Premium Tier</SelectItem>
                        <SelectItem value="PHP_Premium_Plus">Plus Tier</SelectItem>
                        <SelectItem value="PHP_Pro">Pro Performance</SelectItem>
                      </SelectPopup>
                    </Select>
                    <Button onClick={handleUpdateTier} disabled={!athleteId || tierLoading} className="h-12 w-12 rounded-2xl p-0 shrink-0 shadow-lg shadow-primary/20">
                      <Zap className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {availablePlans.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-1">Specific Plan Assignment</label>
                    <div className="flex gap-2">
                      <Select value={desiredPlanId?.toString() || ""} onValueChange={(v) => setDesiredPlanId(Number(v))}>
                        <SelectTrigger className="h-12 rounded-2xl border-white/10 bg-black/20 w-full font-black uppercase tracking-widest text-[10px]">
                          <SelectValue placeholder="Select Active Plan..." />
                        </SelectTrigger>
                        <SelectPopup>
                          {availablePlans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id.toString()}>{plan.name}</SelectItem>
                          ))}
                        </SelectPopup>
                      </Select>
                      <Button 
                        onClick={handleAssignPlan} 
                        disabled={!athleteId || !desiredPlanId || isAssigningPlan} 
                        className="h-12 w-12 rounded-2xl p-0 shrink-0 bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                  <Button variant="outline" onClick={handleBlock} disabled={blockLoading} className="h-12 rounded-2xl border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest">
                    {rawUser?.isBlocked ? "Unblock" : "Block"}
                  </Button>
                  <Button variant="outline" onClick={handleDelete} disabled={deleteLoading} className="h-12 rounded-2xl border-red-500/30 bg-red-500/5 text-red-500 hover:bg-red-500/10 text-[10px] font-black uppercase tracking-widest">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
