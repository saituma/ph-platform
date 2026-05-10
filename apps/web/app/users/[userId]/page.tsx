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
  BarChart3,
  Moon,
  Apple,
  Footprints,
  Heart,
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
  guardianEmail?: string | null;
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
      <AdminShell title="User">
        <div className="flex h-96 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40">
          <AlertCircle className="mb-4 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm font-semibold text-muted-foreground">Invalid user ID</p>
          <div className="mt-6"><UserDetailBackBar /></div>
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
            : "Standard";

  const tierColor =
    tierLabel === "Premium" ? "text-amber-500 bg-amber-500/10 border-amber-500/20" :
    tierLabel === "Plus"    ? "text-blue-500 bg-blue-500/10 border-blue-500/20" :
    tierLabel === "Pro"     ? "text-primary bg-primary/10 border-primary/20" :
                              "text-muted-foreground bg-muted border-border";

  return (
    <AdminShell title={displayName}>
      <div className="space-y-4 pb-28">

        {/* Back + actions */}
        <div className="flex items-center justify-between">
          <UserDetailBackBar />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 text-xs" render={<Link href="/training-snapshot" />}>
              <Zap className="h-3.5 w-3.5 text-primary" /> Live Snapshot
            </Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" render={<Link href={`/messaging?userId=${userId}`} />}>
              <Mail className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Notifications */}
        {(actionError || actionNotice) && (
          <div className="space-y-2">
            {actionError && (
              <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                <AlertCircle className="h-4 w-4 shrink-0" />{actionError}
              </div>
            )}
            {actionNotice && (
              <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
                <CheckCircle2 className="h-4 w-4 shrink-0" />{actionNotice}
              </div>
            )}
          </div>
        )}

        {/* ── BENTO GRID ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* ① HERO — spans 2 cols × 1 row */}
          <div className="col-span-1 sm:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex gap-5 p-6">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="h-20 w-20 rounded-xl overflow-hidden border border-border bg-secondary group/av">
                  {onboarding?.athlete?.profilePicture ? (
                    <img src={onboarding.athlete.profilePicture} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <UserCircle className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                  )}
                  <label className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover/av:opacity-100 rounded-xl">
                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} disabled={isUploadingPhoto} />
                    {isUploadingPhoto
                      ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      : <Camera className="h-5 w-5 text-white" />}
                  </label>
                </div>
                {/* status dot */}
                <span className={cn(
                  "absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-card",
                  rawUser?.isBlocked ? "bg-red-500" : "bg-emerald-500"
                )} />
              </div>

              {/* Identity */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <h2 className="text-lg font-bold leading-tight text-foreground truncate">{displayName}</h2>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{rawUser?.guardianEmail || rawUser?.email}</p>
                  </div>
                  <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", tierColor)}>
                    {tierLabel}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
                  {[
                    { label: "ID",     value: `#${userId}` },
                    { label: "Role",   value: rawUser?.role },
                    { label: "Joined", value: rawUser?.createdAt ? new Date(rawUser.createdAt).toLocaleDateString() : "—" },
                    { label: "Team",   value: onboarding?.athlete?.team || "—" },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{f.label}</p>
                      <p className="text-xs font-semibold text-foreground truncate">{f.value || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Status bar */}
            <div className="flex items-center gap-3 border-t border-border bg-muted/30 px-6 py-3">
              <div className={cn("h-1.5 w-1.5 rounded-full", rawUser?.isBlocked ? "bg-red-500" : "bg-emerald-500")} />
              <span className="text-xs font-medium text-muted-foreground">
                {rawUser?.isBlocked ? "Account suspended" : "Account active"}
              </span>
              <div className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                {onboarding?.athlete?.name ? (
                  <><CheckCircle2 className="h-3 w-3 text-primary" /> Athlete linked</>
                ) : (
                  <><AlertCircle className="h-3 w-3 text-muted-foreground/40" /> No athlete</>
                )}
              </div>
            </div>
          </div>

          {/* ② SUBSCRIPTION — 1 col */}
          <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">Subscription</span>
            </div>
            <div className="flex-1 space-y-3">
              <div className="rounded-xl bg-muted/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Plan</p>
                  <Badge variant={billingStatus?.status === "active" ? "success" : "outline"} className="text-[10px] h-5">
                    {billingStatus?.status || "Unknown"}
                  </Badge>
                </div>
                <p className="text-sm font-bold text-foreground">
                  {(() => {
                    const activeTier = billingStatus?.planTier || resolvedTier;
                    const plan = availablePlans.find(p => p.tier === activeTier);
                    return plan?.name || activeTier || "No Plan";
                  })()}
                </p>
                <div className="flex items-center gap-4 pt-2 border-t border-border/60">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Price</p>
                    <p className="text-xs font-semibold font-mono">{billingStatus?.displayPrice || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Interval</p>
                    <p className="text-xs font-semibold capitalize">{billingStatus?.billingInterval || "—"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ③ SYSTEM INFO — 1 col */}
          <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-semibold text-foreground">System</span>
            </div>
            <div className="space-y-2 flex-1">
              {[
                { label: "User ID",      value: String(rawUser?.id ?? "—") },
                { label: "Role",         value: rawUser?.role ?? "—" },
                { label: "Plan expires", value: onboarding?.athlete?.planExpiresAt ? new Date(onboarding.athlete.planExpiresAt).toLocaleDateString() : "—" },
              ].map(f => (
                <div key={f.label} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-xs text-muted-foreground">{f.label}</span>
                  <span className="text-xs font-semibold text-foreground">{f.value}</span>
                </div>
              ))}
              <div className="pt-1">
                <p className="text-[10px] text-muted-foreground mb-1">Cloud ID</p>
                <p className="font-mono text-[9px] text-muted-foreground/60 break-all select-all leading-relaxed">{rawUser?.cognitoSub || "—"}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full gap-2 text-xs" render={<Link href="/messaging" />}>
              <Mail className="h-3.5 w-3.5" /> Message
            </Button>
          </div>

          {/* ④ ATHLETE PROFILE — full width */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-4 rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Dumbbell className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">Athlete Profile</span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
              {[
                { label: "Full name",   value: onboarding?.athlete?.name || rawUser?.athleteName },
                { label: "Age",         value: onboarding?.athlete?.age ? `${onboarding.athlete.age} yrs` : null },
                { label: "Birthday",    value: onboarding?.athlete?.birthDate ? new Date(onboarding.athlete.birthDate).toLocaleDateString() : null },
                { label: "Team",        value: onboarding?.athlete?.team },
                { label: "Sessions/wk", value: onboarding?.athlete?.trainingPerWeek ? String(onboarding.athlete.trainingPerWeek) : null },
                { label: "Equipment",   value: onboarding?.athlete?.equipmentAccess },
                { label: "Commitment",  value: onboarding?.athlete?.planCommitmentMonths ? `${onboarding.athlete.planCommitmentMonths} mo` : null },
              ].map(f => (
                <div key={f.label} className="border-b border-border/40 pb-2">
                  <p className="text-[10px] text-muted-foreground">{f.label}</p>
                  <p className="text-xs font-semibold text-foreground truncate">{f.value || "—"}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {onboarding?.athlete?.performanceGoals && (
                <div className="rounded-xl bg-muted/40 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Target className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Goals</span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">{onboarding.athlete.performanceGoals}</p>
                </div>
              )}
              <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertCircle className="h-3 w-3 text-amber-500" />
                  <span className="text-[10px] font-semibold text-amber-500/80 uppercase tracking-wider">Injuries</span>
                </div>
                {onboarding?.athlete?.injuries ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(() => {
                      try {
                        const parsed = JSON.parse(onboarding.athlete.injuries as string);
                        if (Array.isArray(parsed)) return parsed.map((inj, i) => (
                          <Badge key={i} className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                            {typeof inj === "string" ? inj : JSON.stringify(inj)}
                          </Badge>
                        ));
                      } catch {}
                      return <span className="text-xs">{onboarding.athlete.injuries}</span>;
                    })()}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">None reported</p>
                )}
              </div>
            </div>
          </div>

          {/* ⑤ TELEMETRY — full width, Premium only */}
          {resolvedTier === "PHP_Premium" && (
            <div className="col-span-1 sm:col-span-2 lg:col-span-4 rounded-2xl border border-primary/20 bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Training Metrics</span>
                </div>
                <Button variant="outline" size="sm" className="text-xs gap-1.5" render={<Link href="/training-snapshot" />}>
                  View all <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Sessions", value: completionStats.count },
                  { label: "Avg RPE",  value: completionStats.avgRpe },
                  { label: "Soreness", value: completionStats.avgSoreness },
                  { label: "Fatigue",  value: completionStats.avgFatigue },
                ].map(stat => (
                  <div key={stat.label} className="rounded-xl bg-muted/40 p-4 text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold font-mono text-foreground">
                      {completionsLoading ? "…" : (stat.value ?? "0")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ⑥ DATA PROFILE — 1 col → 2 cols on lg */}
          <div className="col-span-1 sm:col-span-1 lg:col-span-2 rounded-2xl border border-border bg-card p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">Full Data</span>
            </div>
            <div className="grid grid-cols-2 gap-2 flex-1">
              {[
                { icon: Moon,       label: "Sleep",     color: "text-blue-500 bg-blue-500/10" },
                { icon: Apple,      label: "Nutrition", color: "text-green-500 bg-green-500/10" },
                { icon: Footprints, label: "Runs",      color: "text-emerald-500 bg-emerald-500/10" },
                { icon: Heart,      label: "Wellness",  color: "text-red-500 bg-red-500/10" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-2.5">
                  <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md", item.color)}>
                    <item.icon className="h-3 w-3" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
            <Button className="w-full gap-2 text-xs" render={<Link href={`/users/${userId}/data`} />}>
              <BarChart3 className="h-3.5 w-3.5" /> See User Data
            </Button>
          </div>

          {/* ⑦ SECURITY — 1 col → 2 cols on lg */}
          <div className="col-span-1 sm:col-span-1 lg:col-span-2 rounded-2xl border border-border bg-card p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-semibold text-foreground">Security</span>
            </div>
            {isTechnicalAthleteUser ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl bg-muted/30 p-4 text-center">
                <ShieldAlert className="h-6 w-6 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">Managed via guardian account</p>
              </div>
            ) : (
              <div className="flex-1 space-y-3">
                <div className="relative">
                  <Input
                    type={showTemporaryPassword ? "text" : "password"}
                    className="h-10 pr-10 text-sm font-mono"
                    placeholder="Override password…"
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowTemporaryPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                  >
                    {showTemporaryPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <Button
                  className="w-full gap-2 text-xs"
                  onClick={() => void handleResetPassword()}
                  disabled={isResettingPassword || isManualPasswordInvalid}
                >
                  {isResettingPassword ? "Resetting…" : "Reset Password"}
                </Button>
                {temporaryPassword && (
                  <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
                    <p className="text-[10px] text-primary font-medium mb-1">Temporary password</p>
                    <p className="font-mono text-xs break-all select-all text-foreground">{temporaryPassword}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ⑧ ADMIN CONTROLS — full width */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-4 rounded-2xl border border-red-500/20 bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                <ShieldAlert className="h-4 w-4 text-red-500" />
              </div>
              <span className="text-sm font-semibold text-foreground">Admin Controls</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Tier */}
              <div className="space-y-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Program tier</p>
                <div className="flex gap-2">
                  <Select value={programTier} onValueChange={v => setProgramTier(v ?? "")}>
                    <SelectTrigger className="h-9 text-xs flex-1"><SelectValue /></SelectTrigger>
                    <SelectPopup>
                      <SelectItem value="PHP">Standard</SelectItem>
                      <SelectItem value="PHP_Premium">Premium</SelectItem>
                      <SelectItem value="PHP_Premium_Plus">Plus</SelectItem>
                      <SelectItem value="PHP_Pro">Pro</SelectItem>
                    </SelectPopup>
                  </Select>
                  <Button onClick={handleUpdateTier} disabled={!athleteId || tierLoading} className="h-9 w-9 p-0 shrink-0">
                    <Zap className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Plan */}
              {availablePlans.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Assign plan</p>
                  <div className="flex gap-2">
                    <Select value={desiredPlanId?.toString() || ""} onValueChange={v => setDesiredPlanId(Number(v))}>
                      <SelectTrigger className="h-9 text-xs flex-1">
                        <SelectValue placeholder="Select plan…" />
                      </SelectTrigger>
                      <SelectPopup>
                        {availablePlans.map(plan => (
                          <SelectItem key={plan.id} value={plan.id.toString()}>{plan.name}</SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                    <Button onClick={handleAssignPlan} disabled={!athleteId || !desiredPlanId || isAssigningPlan} className="h-9 w-9 p-0 shrink-0 bg-emerald-600 hover:bg-emerald-700">
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Danger */}
              <div className="space-y-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Danger zone</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleBlock} disabled={blockLoading} className="flex-1 h-9 text-xs">
                    {rawUser?.isBlocked ? "Unblock" : "Block"}
                  </Button>
                  <Button variant="outline" onClick={handleDelete} disabled={deleteLoading} className="flex-1 h-9 text-xs border-red-500/30 text-red-500 hover:bg-red-500/10 hover:border-red-500/50">
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </AdminShell>
  );
}
