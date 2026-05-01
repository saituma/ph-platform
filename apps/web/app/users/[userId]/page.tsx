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
import {
  Activity,
  CreditCard,
  Eye,
  EyeOff,
  ShieldAlert,
  UserCircle,
  UserRound,
  Users,
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

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [programTier, setProgramTier] = useState("PHP");
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
    isMet ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground";

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
    setProgramTier(resolvedTier);
  }, [resolvedTier]);

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
      : resolvedTier === "PHP_Pro"
        ? "Pro"
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
          <Button variant="outline" size="sm" render={<Link href="/training-snapshot" />}>
            Client training snapshot
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

        {actionNotice ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-100">
            {actionNotice}
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
          <ProfileField
            label="Status"
            value={rawUser?.isBlocked ? "Blocked" : "Active"}
          />
          <ProfileField label="Program tier" value={tierLabel} />
          <ProfileField
            label="Onboarding"
            value={
              (rawUser?.onboardingCompleted ??
                rawUser?.onboarding_completed) === false
                ? "Awaiting review"
                : "Complete"
            }
          />
          <ProfileField
            label="Created"
            value={
              rawUser?.createdAt
                ? new Date(rawUser.createdAt).toLocaleString()
                : null
            }
          />
          <ProfileField
            label="Updated"
            value={
              rawUser?.updatedAt
                ? new Date(rawUser.updatedAt).toLocaleString()
                : null
            }
          />
          <ProfileField label="Cognito sub" value={rawUser?.cognitoSub} />
        </UserProfileSection>

        {isTechnicalAthleteUser ? (
          <UserDetailSectionCard
            title="Password"
            description="This is a technical athlete record used for linking/profile data. Youth athletes sign in via the guardian account, so there’s no password to reset here."
            icon={ShieldAlert}
          >
            <p className="text-sm text-muted-foreground">
              Password resets are available on the guardian user record.
            </p>
          </UserDetailSectionCard>
        ) : (
          <UserDetailSectionCard
            title="Password"
            description="Passwords can’t be viewed. Resetting generates (or sets) a temporary password and invalidates existing sessions."
            icon={ShieldAlert}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  New temporary password (optional)
                </p>
                <div className="relative">
                  <Input
                    type={showTemporaryPassword ? "text" : "password"}
                    className="pr-10"
                    placeholder="Leave blank to generate a secure password"
                    value={passwordInput}
                    onChange={(event) => setPasswordInput(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowTemporaryPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    aria-label={
                      showTemporaryPassword
                        ? "Hide temporary password"
                        : "Show temporary password"
                    }
                  >
                    {showTemporaryPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="mt-2 grid gap-1 text-xs">
                  <p className="text-muted-foreground">
                    If you set one manually, it must include:
                  </p>
                  <p className={passwordRuleClassName(passwordRules.minLength)}>
                    • At least 8 characters
                  </p>
                  <p className={passwordRuleClassName(passwordRules.uppercase)}>
                    • 1 uppercase letter (A-Z)
                  </p>
                  <p className={passwordRuleClassName(passwordRules.lowercase)}>
                    • 1 lowercase letter (a-z)
                  </p>
                  <p className={passwordRuleClassName(passwordRules.number)}>
                    • 1 number (0-9)
                  </p>
                  <p className={passwordRuleClassName(passwordRules.special)}>
                    • 1 special character
                  </p>
                  {isManualPasswordInvalid ? (
                    <p className="text-destructive">
                      Password doesn’t meet requirements.
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-end justify-end">
                <Button
                  type="button"
                  onClick={() => void handleResetPassword()}
                  disabled={isResettingPassword || isManualPasswordInvalid}
                >
                  {isResettingPassword ? "Resetting..." : "Reset password"}
                </Button>
              </div>
            </div>

            {temporaryPassword ? (
              <div className="mt-4 rounded-2xl border bg-muted/40 p-3 text-sm">
                <p className="font-medium">Temporary password</p>
                <p className="mt-1 break-all font-mono">{temporaryPassword}</p>
                {passwordEmailSent != null ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Email sent: {passwordEmailSent ? "Yes" : "No"}
                  </p>
                ) : null}
              </div>
            ) : null}
          </UserDetailSectionCard>
        )}

        {(onboarding?.guardian || rawUser?.guardianProgramTier != null) && (
          <UserProfileSection
            title="Guardian"
            description="Parent / guardian record linked to this login."
            icon={Users}
          >
            {onboardingLoading ? (
              <div className="px-5 py-6 text-sm text-muted-foreground">
                Loading…
              </div>
            ) : (
              <>
                <ProfileField
                  label="Guardian ID"
                  value={onboarding?.guardian?.id}
                />
                <ProfileField
                  label="Email"
                  value={onboarding?.guardian?.email}
                />
                <ProfileField
                  label="Phone"
                  value={onboarding?.guardian?.phoneNumber}
                />
                <ProfileField
                  label="Relation to athlete"
                  value={onboarding?.guardian?.relationToAthlete}
                />
                <ProfileField
                  label="Current program tier"
                  value={onboarding?.guardian?.currentProgramTier}
                />
                <ProfileField
                  label="Active athlete ID"
                  value={onboarding?.guardian?.activeAthleteId}
                />
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
            description={
              rawUser?.role === "athlete"
                ? "Adult athlete profile, training profile, and plan details."
                : "The athlete profile this guardian manages — onboarding and training context."
            }
            icon={UserRound}
          >
            {onboardingLoading ? (
              <div className="px-5 py-6 text-sm text-muted-foreground">
                Loading…
              </div>
            ) : (
              <>
                {onboarding?.athlete?.profilePicture ? (
                  <div className="px-5 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      Athlete photo
                    </div>
                    <div className="mt-2">
                      <img
                        src={onboarding.athlete.profilePicture}
                        alt={
                          onboarding?.athlete?.name
                            ? `${onboarding.athlete.name} profile`
                            : "Athlete profile"
                        }
                        className="h-28 w-28 rounded-xl border border-border object-cover"
                      />
                    </div>
                  </div>
                ) : null}
                <ProfileField
                  label="Athlete ID"
                  value={onboarding?.athlete?.id ?? rawUser?.athleteId}
                />
                <ProfileField
                  label="Name"
                  value={onboarding?.athlete?.name ?? rawUser?.athleteName}
                />
                <ProfileField label="Age" value={onboarding?.athlete?.age} />
                <ProfileField
                  label="Birth date"
                  value={
                    onboarding?.athlete?.birthDate
                      ? new Date(
                          onboarding.athlete.birthDate,
                        ).toLocaleDateString()
                      : null
                  }
                />
                <ProfileField label="Team" value={onboarding?.athlete?.team} />
                <ProfileField
                  label="Training per week"
                  value={onboarding?.athlete?.trainingPerWeek}
                />
                <ProfileField
                  label="Performance goals"
                  value={onboarding?.athlete?.performanceGoals}
                />
                <ProfileField
                  label="Equipment access"
                  value={onboarding?.athlete?.equipmentAccess}
                />
                <ProfileField
                  label="Injuries"
                  value={
                    onboarding?.athlete?.injuries
                      ? JSON.stringify(onboarding.athlete.injuries)
                      : null
                  }
                />
                <ProfileField
                  label="Growth notes"
                  value={onboarding?.athlete?.growthNotes}
                />
                <ProfileField
                  label="Onboarding completed"
                  value={
                    onboarding?.athlete?.onboardingCompleted ? "Yes" : "No"
                  }
                />
                <ProfileField
                  label="Onboarding completed at"
                  value={
                    onboarding?.athlete?.onboardingCompletedAt
                      ? new Date(
                          onboarding.athlete.onboardingCompletedAt,
                        ).toLocaleString()
                      : null
                  }
                />
                <ProfileField
                  label="Current program tier"
                  value={onboarding?.athlete?.currentProgramTier}
                />
                <ProfileField
                  label="Plan payment type"
                  value={
                    onboarding?.athlete?.planPaymentType === "upfront"
                      ? "Upfront (full)"
                      : onboarding?.athlete?.planPaymentType === "monthly"
                        ? "Monthly"
                        : null
                  }
                />
                <ProfileField
                  label="Plan commitment"
                  value={
                    onboarding?.athlete?.planCommitmentMonths
                      ? `${onboarding.athlete.planCommitmentMonths} months`
                      : null
                  }
                />
                <ProfileField
                  label="Plan expires"
                  value={
                    onboarding?.athlete?.planExpiresAt
                      ? new Date(
                          onboarding.athlete.planExpiresAt,
                        ).toLocaleDateString()
                      : null
                  }
                />
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
                  {
                    label: "Avg soreness",
                    value: completionStats.avgSoreness ?? "—",
                  },
                  {
                    label: "Avg fatigue",
                    value: completionStats.avgFatigue ?? "—",
                  },
                ]}
              />
            )}
          </UserProfileSection>
        )}

        {billingStatus && (
          <UserProfileSection
            title="Subscription & billing"
            description="Latest subscription request and payment outcome from billing."
            icon={CreditCard}
          >
            <ProfileField label="Plan tier" value={billingStatus.planTier} />
            <ProfileField
              label="Display price"
              value={billingStatus.displayPrice}
            />
            <ProfileField
              label="Billing interval"
              value={billingStatus.billingInterval}
            />
            <ProfileField label="Status" value={billingStatus.status} />
            <ProfileField
              label="Payment status"
              value={billingStatus.paymentStatus}
            />
            <ProfileField
              label="Created"
              value={
                billingStatus.createdAt
                  ? new Date(billingStatus.createdAt).toLocaleString()
                  : null
              }
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
                  {(() => {
                    const tierItems = [
                      { label: "PHP Program", value: "PHP" },
                      { label: "PHP Premium", value: "PHP_Premium" },
                      { label: "PHP Premium Plus", value: "PHP_Premium_Plus" },
                      { label: "PHP Pro", value: "PHP_Pro" },
                    ];
                    return (
                      <Select
                        items={tierItems}
                        value={programTier}
                        onValueChange={(v) => setProgramTier(v ?? "")}
                      >
                        <SelectTrigger className="min-w-[160px]"><SelectValue /></SelectTrigger>
                        <SelectPopup>
                          {tierItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                          ))}
                        </SelectPopup>
                      </Select>
                    );
                  })()}
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
              {blockLoading
                ? "Updating..."
                : rawUser?.isBlocked
                  ? "Unblock user"
                  : "Block user"}
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
