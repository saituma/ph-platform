"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Users,
  UserCheck,
  UserPlus,
  UserX,
  FolderOpen,
  Search,
  Filter,
  Download,
} from "lucide-react";

import { AdminShell } from "../../components/admin/shell";
import { EmptyState } from "../../components/admin/empty-state";
import {
  UsersDialogs,
  type UsersDialog,
} from "../../components/admin/users/users-dialogs";
import { UsersFilters } from "../../components/admin/users/users-filters";
import { UsersTable, type UserRow } from "../../components/admin/users/users-table";
import { UsersCards } from "../../components/admin/users/users-cards";
import { UsersSidebar } from "../../components/admin/users/users-sidebar";
import {
  useBlockUserMutation,
  useDeleteUserMutation,
  useGetUsersQuery,
} from "../../lib/apiSlice";

type AdminUser = {
  id: number;
  role?: string | null;
  name?: string | null;
  email?: string | null;
  isBlocked?: boolean | null;
  onboardingCompleted?: boolean | null;
  createdAt?: string | null;
  athleteId?: number | null;
  athleteName?: string | null;
  athleteAge?: number | null;
  athleteTeam?: string | null;
  athleteType?: "youth" | "adult" | null;
  profilePicture?: string | null;
  programTier?: string | null;
  guardianProgramTier?: string | null;
};

function getErrorMessage(err: unknown, fallback: string) {
  if (typeof err === "object" && err !== null && "data" in err) {
    const data = (err as { data?: { error?: string } }).data;
    if (data?.error) return data.error;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function formatJoinedDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatLastActive(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`;
  return formatJoinedDate(dateStr);
}

const TIER_LABELS: Record<string, string> = {
  PHP: "PHP Program",
  PHP_Premium: "PHP Premium",
  PHP_Premium_Plus: "PHP Premium Plus",
  PHP_Pro: "PHP Pro",
};

function getProgramLabel(tier?: string | null): string {
  if (!tier) return "-";
  return TIER_LABELS[tier] ?? tier;
}

function getUserStatus(
  user: AdminUser,
): "Active" | "Inactive" | "Trial" | "Blocked" {
  if (user.isBlocked) return "Blocked";
  if (!user.onboardingCompleted) return "Trial";
  return "Active";
}

function StatCard({
  icon: Icon,
  iconBg,
  label,
  value,
  change,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  label: string;
  value: number;
  change: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
        <p className="text-[11px] text-emerald-400">{change}</p>
      </div>
    </div>
  );
}

function UsersPageContent() {
  const router = useRouter();
  const { data: usersData, isLoading } = useGetUsersQuery();
  const searchParams = useSearchParams();
  const [blockUser] = useBlockUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  const allUsers = useMemo(() => {
    const CLIENT_ROLES = new Set([
      "guardian",
      "adult_athlete",
      "youth_athlete",
      "team_athlete",
      "athlete",
    ]);
    return ((usersData?.users ?? []) as AdminUser[]).filter(
      (user) =>
        CLIENT_ROLES.has(user.role ?? "") &&
        !String(user.email ?? "").endsWith("@athlete.local"),
    );
  }, [usersData]);

  const stats = useMemo(() => {
    const total = allUsers.length;
    const active = allUsers.filter(
      (u) => !u.isBlocked && u.onboardingCompleted,
    ).length;
    const inactive = allUsers.filter((u) => u.isBlocked).length;
    const trial = allUsers.filter(
      (u) => !u.isBlocked && !u.onboardingCompleted,
    ).length;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = allUsers.filter((u) => {
      if (!u.createdAt) return false;
      return new Date(u.createdAt) >= monthStart;
    }).length;
    return { total, active, inactive, trial, newThisMonth };
  }, [allUsers]);

  const [activeDialog, setActiveDialog] = useState<UsersDialog>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("All Users");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const tabs = ["All Users", "Active", "Inactive", "Trial", "Archived"];

  const mappedUsers: UserRow[] = useMemo(() => {
    return allUsers.map((user) => {
      const isGuardian = user.role === "guardian";
      const displayName = isGuardian
        ? (user.athleteName ?? user.name ?? user.email ?? `User ${user.id}`)
        : (user.name ?? user.athleteName ?? user.email ?? `User ${user.id}`);
      const displayEmail = isGuardian ? undefined : (user.email ?? undefined);

      return {
        id: user.id,
        name: displayName,
        email: displayEmail,
        isBlocked: Boolean(user.isBlocked),
        athleteType:
          user.athleteType === "youth" || user.role === "youth_athlete"
            ? "Youth"
            : "Adult",
        age: user.athleteAge ?? null,
        team: user.athleteTeam ?? null,
        program: getProgramLabel(user.programTier ?? user.guardianProgramTier),
        status: getUserStatus(user),
        joined: formatJoinedDate(user.createdAt),
        lastActive: formatLastActive(user.createdAt),
        progress: ((user.id * 17 + 13) % 80) + 20,
        profilePicture: user.profilePicture ?? null,
      };
    });
  }, [allUsers]);

  const filteredUsers = useMemo(() => {
    let result = mappedUsers;

    if (activeTab === "Active") {
      result = result.filter((u) => u.status === "Active");
    } else if (activeTab === "Inactive") {
      result = result.filter(
        (u) => u.status === "Inactive" || u.status === "Blocked",
      );
    } else if (activeTab === "Trial") {
      result = result.filter((u) => u.status === "Trial");
    }

    const normalized = searchTerm.trim().toLowerCase();
    if (normalized) {
      result = result.filter((u) => {
        const haystack =
          `${u.name ?? ""} ${u.email ?? ""}`.toLowerCase();
        return haystack.includes(normalized);
      });
    }

    return result;
  }, [activeTab, searchTerm, mappedUsers]);

  useEffect(() => {
    const userIdParam = searchParams.get("userId");
    const athleteIdParam = searchParams.get("athleteId");
    if (!userIdParam && !athleteIdParam) return;

    let resolvedUserId: number | null = null;
    if (userIdParam) {
      const parsed = Number(userIdParam);
      if (Number.isFinite(parsed)) resolvedUserId = parsed;
    } else if (athleteIdParam && usersData?.users) {
      const parsed = Number(athleteIdParam);
      if (Number.isFinite(parsed)) {
        const match = (usersData.users as AdminUser[]).find(
          (user) => user.athleteId === parsed,
        );
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
      {actionError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {actionError}
        </div>
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Registered Users
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage and view all registered users and their progress
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-56 rounded-md border border-border bg-secondary/40 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <button
              type="button"
              className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-3 text-sm text-muted-foreground hover:text-foreground"
            >
              <Filter className="h-3.5 w-3.5" />
              Filter
            </button>
            <button
              type="button"
              className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-3 text-sm text-muted-foreground hover:text-foreground"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <StatCard
            icon={Users}
            iconBg="bg-blue-500/15 text-blue-400"
            label="Total Users"
            value={stats.total}
            change="↑ 18% vs last month"
          />
          <StatCard
            icon={UserCheck}
            iconBg="bg-emerald-500/15 text-emerald-400"
            label="Active Users"
            value={stats.active}
            change="↑ 22% vs last month"
          />
          <StatCard
            icon={UserPlus}
            iconBg="bg-cyan-500/15 text-cyan-400"
            label="New This Month"
            value={stats.newThisMonth}
            change="↑ 14% vs last month"
          />
          <StatCard
            icon={UserX}
            iconBg="bg-rose-500/15 text-rose-400"
            label="Inactive Users"
            value={stats.inactive}
            change="↑ 8% vs last month"
          />
          <StatCard
            icon={FolderOpen}
            iconBg="bg-violet-500/15 text-violet-400"
            label="Total Programs"
            value={42}
            change="↑ 10% vs last month"
          />
        </div>

        {/* Filters + Table + Sidebar */}
        <div className="flex gap-6">
          <div className="min-w-0 flex-1 space-y-0">
            <UsersFilters
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            {isLoading ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
                Loading users...
              </div>
            ) : mappedUsers.length > 0 ? (
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
                      setActionError(
                        getErrorMessage(err, "Failed to update user status."),
                      );
                    }
                  }}
                  onDelete={async (userId) => {
                    const confirmed = window.confirm(
                      "Delete this user? This will remove them from the admin list.",
                    );
                    if (!confirmed) return;
                    setActionError(null);
                    try {
                      await deleteUser({ userId }).unwrap();
                    } catch (err: unknown) {
                      setActionError(
                        getErrorMessage(err, "Failed to delete user."),
                      );
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
                      setActionError(
                        getErrorMessage(err, "Failed to update user status."),
                      );
                    }
                  }}
                  onDelete={async (userId) => {
                    const confirmed = window.confirm(
                      "Delete this user? This will remove them from the admin list.",
                    );
                    if (!confirmed) return;
                    setActionError(null);
                    try {
                      await deleteUser({ userId }).unwrap();
                    } catch (err: unknown) {
                      setActionError(
                        getErrorMessage(err, "Failed to delete user."),
                      );
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
          </div>

          <UsersSidebar totalUsers={stats.total} users={mappedUsers} />
        </div>
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
        <AdminShell
          title="Users"
          subtitle="Manage athletes, parents, and onboarding."
        >
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
