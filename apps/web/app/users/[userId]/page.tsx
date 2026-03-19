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
import {
  useBlockUserMutation,
  useDeleteUserMutation,
  useGetUserOnboardingQuery,
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
