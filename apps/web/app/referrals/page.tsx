"use client";

import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  Gift,
  Link2,
  Search,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react";
import { AdminShell } from "@/components/admin/shell";
import { useGetAdminReferralsQuery, type ReferrerRow } from "@/lib/apiSlice";
import { cn } from "@/lib/utils";

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-2xl font-black">{value}</p>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      </div>
    </div>
  );
}

function ReferrerCard({ row }: { row: ReferrerRow }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
      >
        {/* Rank indicator / avatar */}
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-black shrink-0">
          {(row.referrerName ?? row.referrerEmail ?? "?").slice(0, 1).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{row.referrerName ?? "—"}</p>
          <p className="text-xs text-muted-foreground truncate">{row.referrerEmail}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="font-mono text-xs bg-muted px-2 py-1 rounded tracking-widest">
            {row.code}
          </span>
          <div className="text-right">
            <p className="text-lg font-black leading-none">{row.totalReferred}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">referred</p>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0",
              open && "rotate-180"
            )}
          />
        </div>
      </button>

      {open && (
        <div className="border-t divide-y">
          {row.claims.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">No referrals claimed yet.</p>
          ) : (
            row.claims.map((claim) => (
              <div key={claim.id} className="flex items-center gap-3 px-5 py-3">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-black shrink-0">
                  {(claim.joineeName ?? claim.joineeEmail ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{claim.joineeName ?? "—"}</p>
                  <p className="text-xs text-muted-foreground truncate">{claim.joineeEmail}</p>
                </div>
                <p className="text-xs text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(claim.claimedAt), { addSuffix: true })}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function ReferralsPage() {
  const { data, isLoading, isError } = useGetAdminReferralsQuery();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data?.referrers ?? [];
    return (data?.referrers ?? []).filter(
      (r) =>
        r.referrerName?.toLowerCase().includes(q) ||
        r.referrerEmail?.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q)
    );
  }, [data, search]);

  const topReferrer = data?.referrers[0] ?? null;

  return (
    <AdminShell title="User Referrals">
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Gift className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-black uppercase tracking-tight">User Referrals</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Athletes ranked by who invited the most. Expand any row to see their invitees.
          </p>
        </div>

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Active referral codes" value={data.totalCodes} icon={Link2} />
            <StatCard label="Total athletes referred" value={data.totalClaims} icon={Users} />
            <StatCard
              label="Top referrer count"
              value={topReferrer?.totalReferred ?? 0}
              icon={Trophy}
            />
          </div>
        )}

        {/* Top referrer callout */}
        {topReferrer && topReferrer.totalReferred > 0 && (
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 px-5 py-4 flex items-center gap-4">
            <Trophy className="h-6 w-6 text-primary shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-0.5">Top referrer</p>
              <p className="font-black text-sm">
                {topReferrer.referrerName ?? topReferrer.referrerEmail} —{" "}
                <span className="text-primary">{topReferrer.totalReferred} athletes referred</span>
              </p>
            </div>
            <span className="ml-auto font-mono text-sm font-black tracking-widest text-primary/70">
              {topReferrer.code}
            </span>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or code…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* List */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-xl border bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-6 text-center">
            <p className="text-sm font-medium text-destructive">Failed to load referral data.</p>
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="rounded-xl border bg-muted/20 px-5 py-12 text-center space-y-2">
            <UserCheck className="h-8 w-8 mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {search ? "No referrers match your search." : "No referral codes have been created yet."}
            </p>
          </div>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((row, idx) => (
              <div key={row.referrerId} className="relative">
                {idx < 3 && row.totalReferred > 0 && (
                  <span className="absolute -left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary/60 select-none">
                    #{idx + 1}
                  </span>
                )}
                <ReferrerCard row={row} />
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
