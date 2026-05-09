"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Baby,
  Search,
  Users,
  UserCheck,
  UserX,
  ChevronRight,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";

import { AdminShell } from "../../components/admin/shell";
import { useGetUsersQuery } from "../../lib/apiSlice";
import { cn } from "../../lib/utils";

type GuardianRow = {
  id: number;
  name: string;
  email: string;
  isBlocked?: boolean | null;
  onboardingCompleted?: boolean | null;
  createdAt?: string | null;
  athleteName?: string | null;
  athleteAge?: number | null;
  athleteTeam?: string | null;
  athleteType?: "youth" | "adult" | null;
  profilePicture?: string | null;
};

export default function ParentsPage() {
  const router = useRouter();
  const { data: usersData, isLoading } = useGetUsersQuery();
  const [search, setSearch] = useState("");

  const guardians = useMemo((): GuardianRow[] => {
    const all = usersData?.users ?? [];
    return (all as GuardianRow[]).filter((u) => (u as { role?: string }).role === "guardian");
  }, [usersData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return guardians;
    return guardians.filter(
      (g) =>
        g.name?.toLowerCase().includes(q) ||
        g.email?.toLowerCase().includes(q) ||
        g.athleteName?.toLowerCase().includes(q),
    );
  }, [guardians, search]);

  const stats = useMemo(() => ({
    total: guardians.length,
    completed: guardians.filter((g) => g.onboardingCompleted).length,
    blocked: guardians.filter((g) => g.isBlocked).length,
  }), [guardians]);

  return (
    <AdminShell
      title="Parents"
      subtitle="Guardian accounts & onboarding profiles"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total guardians", value: stats.total,     icon: Users,     color: "bg-primary/10 text-primary" },
            { label: "Onboarded",       value: stats.completed, icon: UserCheck, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
            { label: "Blocked",         value: stats.blocked,   icon: UserX,     color: "bg-red-500/10 text-red-600 dark:text-red-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-black text-foreground">{isLoading ? "—" : value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, email or child…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Cards grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
            <Baby className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-semibold text-foreground">
              {search ? "No parents match your search" : "No guardian accounts yet"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {search ? "Try a different search term" : "Provision a guardian via the Users page"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((guardian) => (
              <button
                key={guardian.id}
                type="button"
                onClick={() => router.push(`/parents/${guardian.id}`)}
                className="group flex flex-col rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {/* Avatar + name */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {guardian.profilePicture ? (
                      <img
                        src={guardian.profilePicture}
                        alt={guardian.name}
                        className="h-10 w-10 rounded-full object-cover ring-1 ring-border flex-shrink-0"
                      />
                    ) : (
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-sm font-black text-primary">
                          {guardian.name?.charAt(0)?.toUpperCase() ?? "P"}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{guardian.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {guardian.onboardingCompleted ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <UserCheck className="h-2.5 w-2.5" /> Onboarded
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            Pending
                          </span>
                        )}
                        {guardian.isBlocked && (
                          <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
                            Blocked
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{guardian.email}</span>
                  </div>

                  {guardian.athleteName && (
                    <div className="flex items-center gap-1.5">
                      <Baby className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">
                        {guardian.athleteName}
                        {guardian.athleteAge ? `, age ${guardian.athleteAge}` : ""}
                        {guardian.athleteType ? ` · ${guardian.athleteType}` : ""}
                      </span>
                    </div>
                  )}

                  {guardian.athleteTeam && (
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{guardian.athleteTeam}</span>
                    </div>
                  )}

                  {guardian.createdAt && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      <span>Joined {format(new Date(guardian.createdAt), "MMM d, yyyy")}</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
