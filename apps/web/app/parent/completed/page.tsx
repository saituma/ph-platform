"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users, UserCheck } from "lucide-react";

import { ParentShell } from "../../../components/parent/shell";
import { CompletedOnboardingCard } from "../../../components/parent/config/completed-onboarding-card";
import { useGetUsersQuery, useGetUserOnboardingQuery } from "../../../lib/apiSlice";
import { cn } from "../../../lib/utils";

type UserSummary = { id: number; name?: string | null; email?: string | null };

export default function ParentCompletedPage() {
  const { data: usersData } = useGetUsersQuery();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const { data: onboardingData } = useGetUserOnboardingQuery(selectedUserId ?? 0, {
    skip: !selectedUserId,
  });

  const completedGuardians = useMemo(() => {
    const users = usersData?.users ?? [];
    return users.filter(
      (user: { onboardingCompleted?: boolean; role?: string }) =>
        user.onboardingCompleted && user.role === "guardian"
    ) as UserSummary[];
  }, [usersData]);

  const selectedGuardian = completedGuardians.find((u) => u.id === selectedUserId);

  const extraResponses = onboardingData?.athlete?.extraResponses ?? {};
  const extraLevel =
    typeof extraResponses === "object" && extraResponses !== null
      ? (extraResponses as Record<string, unknown>)["level"] as string | null
      : null;
  const extraEntries =
    typeof extraResponses === "object" && extraResponses !== null
      ? Object.entries(extraResponses as Record<string, unknown>)
          .filter(([key]) => key !== "level")
          .map(([key, value]) => `${key}: ${String(value)}`)
      : [];

  return (
    <ParentShell
      title="Completed Onboarding"
      subtitle="View guardians who completed onboarding and their submitted details."
      actions={
        <Link
          href="/parent"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Portal
        </Link>
      }
    >
      <div className="space-y-8">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {completedGuardians.length}
                </p>
                <p className="text-xs text-muted-foreground">Guardians completed onboarding</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {selectedUserId ? "1 selected" : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedUserId ? "Viewing details" : "Select a guardian to view details"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <CompletedOnboardingCard
          completedGuardians={completedGuardians}
          selectedUserId={selectedUserId}
          selectedGuardian={selectedGuardian}
          onboardingData={onboardingData}
          extraLevel={extraLevel}
          extraEntries={extraEntries}
          onSelectUser={setSelectedUserId}
        />
      </div>
    </ParentShell>
  );
}
