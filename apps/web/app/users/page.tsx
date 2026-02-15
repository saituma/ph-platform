"use client";

import { useMemo, useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { EmptyState } from "../../components/admin/empty-state";
import { SectionHeader } from "../../components/admin/section-header";
import { UsersDialogs, type UsersDialog } from "../../components/admin/users/users-dialogs";
import { UsersFilters } from "../../components/admin/users/users-filters";
import { UsersTable } from "../../components/admin/users/users-table";
import { UsersCards } from "../../components/admin/users/users-cards";
import { OnboardingQueue } from "../../components/admin/users/onboarding-queue";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { useBlockUserMutation, useDeleteUserMutation, useGetUsersQuery } from "../../lib/apiSlice";

export default function UsersPage() {
  const { data: usersData, isLoading } = useGetUsersQuery();
  const [blockUser] = useBlockUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  const users = useMemo(() => {
    const source = usersData?.users ?? [];
    return source.map((user: any) => ({
      id: user.id,
      name: user.name ?? user.email,
      email: user.email,
      isBlocked: Boolean(user.isBlocked),
      tier:
        user.role === "admin" || user.role === "superAdmin"
          ? "Admin"
          : user.programTier === "PHP_Premium"
            ? "Premium"
            : user.programTier === "PHP_Plus"
              ? "Plus"
              : "Program",
      status: user.isBlocked ? "Blocked" : "Active",
      lastActive: "Recently",
      onboarding: user.onboardingCompleted === false ? "Awaiting review" : "Complete",
    }));
  }, [usersData]);
  const hasUsers = users.length > 0;
  const [activeDialog, setActiveDialog] = useState<UsersDialog>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [activeChip, setActiveChip] = useState<string>("All");
  const [actionError, setActionError] = useState<string | null>(null);
  const chips = ["All", "Premium", "Plus", "Program", "Pending"];

  const filteredUsers = useMemo(() => {
    if (activeChip === "All") return users;
    if (activeChip === "Pending") {
      return users.filter((user) => user.onboarding !== "Complete");
    }
    return users.filter((user) => user.tier === activeChip);
  }, [activeChip, users]);

  const onboardingQueue = useMemo(
    () => users.filter((user) => user.onboarding !== "Complete"),
    [users]
  );

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
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <SectionHeader title="All Users" actionLabel="Export" />
          </CardHeader>
          <CardContent className="space-y-4">
            <UsersFilters chips={chips} onChipSelect={setActiveChip} />
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
                  onToggleBlock={async (userId, blocked) => {
                    setActionError(null);
                    try {
                      await blockUser({ userId, blocked }).unwrap();
                    } catch (err: any) {
                      setActionError(err?.data?.error || "Failed to update user status.");
                    }
                  }}
                  onDelete={async (userId) => {
                    const confirmed = window.confirm("Delete this user? This will remove them from the admin list.");
                    if (!confirmed) return;
                    setActionError(null);
                    try {
                      await deleteUser({ userId }).unwrap();
                    } catch (err: any) {
                      setActionError(err?.data?.error || "Failed to delete user.");
                    }
                  }}
                />
                <UsersCards
                  users={filteredUsers}
                  onSelect={(userId) => {
                    setSelectedUserId(userId);
                    setActiveDialog("review-onboarding");
                  }}
                  onToggleBlock={async (userId, blocked) => {
                    setActionError(null);
                    try {
                      await blockUser({ userId, blocked }).unwrap();
                    } catch (err: any) {
                      setActionError(err?.data?.error || "Failed to update user status.");
                    }
                  }}
                  onDelete={async (userId) => {
                    const confirmed = window.confirm("Delete this user? This will remove them from the admin list.");
                    if (!confirmed) return;
                    setActionError(null);
                    try {
                      await deleteUser({ userId }).unwrap();
                    } catch (err: any) {
                      setActionError(err?.data?.error || "Failed to delete user.");
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

        <Card>
          <CardHeader>
            <SectionHeader
              title="Onboarding Queue"
              description="Awaiting approvals and assignments."
            />
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
                Loading queue...
              </div>
            ) : (
              <OnboardingQueue
                items={onboardingQueue}
                onReview={(userId) => {
                  setSelectedUserId(userId);
                  setActiveDialog("review-onboarding");
                }}
                onAssign={(userId) => {
                  setSelectedUserId(userId);
                  setActiveDialog("assign-program");
                }}
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
