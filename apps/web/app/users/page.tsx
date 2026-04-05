"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { AdminShell } from "../../components/admin/shell";
import { EmptyState } from "../../components/admin/empty-state";
import { SectionHeader } from "../../components/admin/section-header";
import { UsersDialogs, type UsersDialog } from "../../components/admin/users/users-dialogs";
import { UsersFilters } from "../../components/admin/users/users-filters";
import { UsersTable } from "../../components/admin/users/users-table";
import { UsersCards } from "../../components/admin/users/users-cards";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { useBlockUserMutation, useDeleteUserMutation, useGetUsersQuery } from "../../lib/apiSlice";

type AdminUser = {
  id: number;
  role?: string | null;
  name?: string | null;
  email?: string | null;
  isBlocked?: boolean | null;
  onboardingCompleted?: boolean | null;
  createdAt?: string | null;
  athleteId?: number | null;
  programTier?: string | null;
  guardianProgramTier?: string | null;
};

type UsersListItem = {
  id: number;
  name: string;
  email?: string;
  isBlocked: boolean;
  tier: "Admin" | "Premium" | "Plus" | "Program";
  status: "Blocked" | "Active";
  lastActive: string;
  onboarding: "Awaiting review" | "Complete";
  createdAtMs: number;
  tierPriority: number;
};

function getErrorMessage(err: unknown, fallback: string) {
  if (typeof err === "object" && err !== null && "data" in err) {
    const data = (err as { data?: { error?: string } }).data;
    if (data?.error) return data.error;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function UsersPageContent() {
  const router = useRouter();
  const { data: usersData, isLoading } = useGetUsersQuery();
  const searchParams = useSearchParams();
  const [blockUser] = useBlockUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  const users = useMemo(() => {
    const source = ((usersData?.users ?? []) as AdminUser[]).filter((user) => user.role === "guardian");
    const mapped: UsersListItem[] = source.map((user) => {
      const resolvedTier = user.programTier ?? user.guardianProgramTier ?? null;
      const tierLabel =
        user.role === "admin" || user.role === "superAdmin"
          ? "Admin"
          : resolvedTier === "PHP_Premium"
            ? "Premium"
            : resolvedTier === "PHP_Premium_Plus"
              ? "Plus"
              : "Program";
      const createdAtMs = user?.createdAt ? new Date(user.createdAt).getTime() : 0;
      const tierPriority = tierLabel === "Premium" ? 0 : tierLabel === "Plus" ? 1 : 2;
      return {
        id: user.id,
        name: user.name ?? user.email ?? `User ${user.id}`,
        email: user.email ?? undefined,
        isBlocked: Boolean(user.isBlocked),
        tier: tierLabel,
        status: user.isBlocked ? "Blocked" : "Active",
        lastActive: "Recently",
        onboarding: user.onboardingCompleted === false ? "Awaiting review" : "Complete",
        createdAtMs,
        tierPriority,
      };
    });

    return mapped
      .slice()
      .sort((a, b) => {
        if (a.tierPriority !== b.tierPriority) return a.tierPriority - b.tierPriority;
        return (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0);
      })
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        isBlocked: user.isBlocked,
        tier: user.tier,
        status: user.status,
        lastActive: user.lastActive,
        onboarding: user.onboarding,
      }));
  }, [usersData]);
  const hasUsers = users.length > 0;
  const [activeDialog, setActiveDialog] = useState<UsersDialog>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [activeChip, setActiveChip] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [actionError, setActionError] = useState<string | null>(null);
  const chips = ["All", "Premium", "Plus", "Program", "Pending"];

  const filteredUsers = useMemo(() => {
    let result = users;
    if (activeChip === "Pending") {
      result = result.filter((user) => user.onboarding !== "Complete");
    } else if (activeChip !== "All") {
      result = result.filter((user) => user.tier === activeChip);
    }
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return result;
    return result.filter((user) => {
      const haystack = `${user.name ?? ""} ${user.email ?? ""}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [activeChip, searchTerm, users]);

  useEffect(() => {
    const userIdParam = searchParams.get("userId");
    const athleteIdParam = searchParams.get("athleteId");
    if (!userIdParam && !athleteIdParam) return;

    let resolvedUserId: number | null = null;
    if (userIdParam) {
      const parsed = Number(userIdParam);
      if (Number.isFinite(parsed)) {
        resolvedUserId = parsed;
      }
    } else if (athleteIdParam && usersData?.users) {
      const parsed = Number(athleteIdParam);
      if (Number.isFinite(parsed)) {
        const match = (usersData.users as AdminUser[]).find((user) => user.athleteId === parsed);
        resolvedUserId = match?.id ?? null;
      }
    }

    if (resolvedUserId) {
      router.replace(`/users/${resolvedUserId}`);
    }
  }, [searchParams, usersData, router]);

  return (
    <AdminShell
      title="Users"
      subtitle="Manage athletes, parents, and onboarding."
    >
      {actionError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {actionError}
        </div>
      ) : null}
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <SectionHeader title="All Users" actionLabel="Export" />
          </CardHeader>
          <CardContent className="space-y-4">
            <UsersFilters
              chips={chips}
              onChipSelect={setActiveChip}
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
            />
            {isLoading ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
                Loading users...
              </div>
            ) : hasUsers ? (
              <>
                <UsersTable
                  users={filteredUsers}
                  onSelect={(userId) => {
                    setSelectedUserId(userId);
                    setActiveDialog("review-onboarding");
                  }}
                  onChangePlan={(userId) => {
                    setSelectedUserId(userId);
                    setActiveDialog("assign-program");
                  }}
                  onToggleBlock={async (userId, blocked) => {
                    setActionError(null);
                    try {
                      await blockUser({ userId, blocked }).unwrap();
                    } catch (err: unknown) {
                      setActionError(getErrorMessage(err, "Failed to update user status."));
                    }
                  }}
                  onDelete={async (userId) => {
                    const confirmed = window.confirm("Delete this user? This will remove them from the admin list.");
                    if (!confirmed) return;
                    setActionError(null);
                    try {
                      await deleteUser({ userId }).unwrap();
                    } catch (err: unknown) {
                      setActionError(getErrorMessage(err, "Failed to delete user."));
                    }
                  }}
                />
                <UsersCards
                  users={filteredUsers}
                  onSelect={(userId) => {
                    setSelectedUserId(userId);
                    setActiveDialog("review-onboarding");
                  }}
                  onChangePlan={(userId) => {
                    setSelectedUserId(userId);
                    setActiveDialog("assign-program");
                  }}
                  onToggleBlock={async (userId, blocked) => {
                    setActionError(null);
                    try {
                      await blockUser({ userId, blocked }).unwrap();
                    } catch (err: unknown) {
                      setActionError(getErrorMessage(err, "Failed to update user status."));
                    }
                  }}
                  onDelete={async (userId) => {
                    const confirmed = window.confirm("Delete this user? This will remove them from the admin list.");
                    if (!confirmed) return;
                    setActionError(null);
                    try {
                      await deleteUser({ userId }).unwrap();
                    } catch (err: unknown) {
                      setActionError(getErrorMessage(err, "Failed to delete user."));
                    }
                  }}
                />
              </>
            ) : (
              <EmptyState
                title="No users yet"
                description="New athletes will appear once they onboard."
                actionLabel="Invite Athlete"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <UsersDialogs
        active={activeDialog}
        onClose={() => setActiveDialog(null)}
        selectedUserId={selectedUserId}
      />
    </AdminShell>
  );
}

export default function UsersPage() {
  return (
    <Suspense
      fallback={
        <AdminShell title="Users" subtitle="Manage athletes, parents, and onboarding.">
          <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
            Loading users...
          </div>
        </AdminShell>
      }
    >
      <UsersPageContent />
    </Suspense>
  );
}
