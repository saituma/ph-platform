"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronDown,
  Filter,
  Mail,
  MessageSquare,
  Phone as PhoneIcon,
  Plus,
} from "lucide-react";

import { AdminShell } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import {
  useGetEnquiriesQuery,
  useGetEnquiryStatsQuery,
  useUpdateEnquiryMutation,
} from "@/lib/apiSlice";

type EnquiryItem = {
  id: number;
  athleteType?: string | null;
  athleteName: string;
  age?: number | null;
  parentName?: string | null;
  phone: string;
  email: string;
  interestedIn: string;
  locationPreference?: string[] | null;
  groupNeeded?: boolean | null;
  teamName?: string | null;
  ageGroup?: string | null;
  squadSize?: number | null;
  availabilityDays?: string[] | null;
  availabilityTime?: string | null;
  goal?: string | null;
  photoUrl?: string | null;
  status: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_TABS = ["All Enquiries", "New", "Contacted", "Booked", "Closed"] as const;

const SERVICE_BADGE_COLORS: Record<string, string> = {
  "1-to-1 Private": "bg-[#8aff00]/20 text-[#8aff00] border-[#8aff00]/30",
  "Semi-Private (2-4)": "bg-[#8aff00]/20 text-[#8aff00] border-[#8aff00]/30",
  "Team Sessions": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "App Only": "bg-violet-500/20 text-violet-400 border-violet-500/30",
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  new: "bg-[#8aff00]/20 text-[#8aff00]",
  contacted: "bg-amber-500/20 text-amber-400",
  booked: "bg-rose-500/20 text-rose-400",
  closed: "bg-zinc-500/20 text-zinc-400",
};

const STATUS_DOT_COLORS: Record<string, string> = {
  new: "bg-[#8aff00]",
  contacted: "bg-amber-400",
  booked: "bg-rose-400",
  closed: "bg-zinc-400",
};

export default function EnquiriesPage() {
  const [activeTab, setActiveTab] = useState<string>("All Enquiries");
  const [searchTerm] = useState("");
  const [serviceFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const statusFilter = activeTab === "All Enquiries" ? undefined : activeTab.toLowerCase();

  const { data, isLoading } = useGetEnquiriesQuery({
    status: statusFilter,
    service: serviceFilter !== "all" ? serviceFilter : undefined,
    search: searchTerm || undefined,
    sort: sortOrder,
    limit: 100,
  });
  const { data: stats } = useGetEnquiryStatsQuery();
  const [_updateEnquiry] = useUpdateEnquiryMutation();

  const items: EnquiryItem[] = data?.items ?? [];

  const tabCounts = useMemo(() => {
    if (!stats) return {};
    return {
      "All Enquiries": stats.total,
      New: stats.byStatus?.new ?? 0,
      Contacted: stats.byStatus?.contacted ?? 0,
      Booked: stats.byStatus?.booked ?? 0,
      Closed: stats.byStatus?.closed ?? 0,
    };
  }, [stats]);

  const serviceStats = useMemo(() => {
    if (!stats?.byService) return [];
    const total = stats.total || 1;
    return Object.entries(stats.byService).map(([service, count]) => ({
      service,
      count,
      pct: Math.round((count / total) * 100),
    }));
  }, [stats]);

  return (
    <AdminShell
      title="Enquiries"
      subtitle="Manage and respond to all incoming enquiries"
      actions={
        <Button className="bg-[#8aff00] hover:bg-[#8aff00]/90 text-black font-semibold gap-1.5">
          <Plus className="w-4 h-4" />
          New Enquiry
        </Button>
      }
    >
      <div className="flex gap-6 p-4 lg:p-6">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Status tabs */}
          <div className="flex items-center gap-1 border-b border-border pb-px">
            {STATUS_TABS.map((tab) => {
              const count = tabCounts[tab];
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? "border-[#8aff00] text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                  {count !== undefined && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-md font-semibold ${
                        isActive
                          ? "bg-[#8aff00]/20 text-[#8aff00]"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Filters row */}
          <div className="flex items-center gap-2 flex-wrap">
            <FilterDropdown label="All Services" />
            <FilterDropdown label="All Age Groups" />
            <FilterDropdown label="All Days" />
            <FilterDropdown label="All Status" />
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Filter className="w-3.5 h-3.5" />
              Filter
            </button>
            <div className="ml-auto">
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sort: {sortOrder === "newest" ? "Newest" : "Oldest"}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Enquiry cards */}
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-40 rounded-xl bg-card border border-border animate-pulse" />
              ))
            ) : items.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-sm">No enquiries found</p>
              </div>
            ) : (
              items.map((item) => (
                <EnquiryCard key={item.id} item={item} />
              ))
            )}
          </div>
        </div>

        {/* Right sidebar — stats */}
        <div className="hidden xl:block w-[280px] shrink-0 space-y-5">
          <StatsPanel stats={stats} serviceStats={serviceStats} />
        </div>
      </div>
    </AdminShell>
  );
}

function FilterDropdown({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
      <ChevronDown className="w-3.5 h-3.5" />
    </button>
  );
}

function EnquiryCard({
  item,
}: {
  item: EnquiryItem;
}) {
  const timeAgo = formatDistanceToNow(new Date(item.createdAt), { addSuffix: false });
  const badgeColor = SERVICE_BADGE_COLORS[item.interestedIn] ?? "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  const statusColor = STATUS_BADGE_COLORS[item.status] ?? STATUS_BADGE_COLORS.new;
  const initials = item.athleteName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-[#8aff00]/20 transition-colors">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 gap-y-3 items-start">
        {/* Col 1: Avatar + info */}
        <div className="flex gap-3.5">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-400 shrink-0">
            {item.photoUrl ? (
              <img src={item.photoUrl} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{item.athleteName}</h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 flex-wrap">
              {item.age && <span>Age {item.age}</span>}
              {item.parentName && (
                <>
                  <span className="text-border">·</span>
                  <span>Parent: {item.parentName}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
              {item.phone && (
                <span className="flex items-center gap-1">
                  <PhoneIcon className="w-3 h-3" />
                  {item.phone}
                </span>
              )}
              {item.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {item.email}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${statusColor}`}>
                {item.status}
              </span>
              <span className="text-[11px] text-muted-foreground">{timeAgo} ago</span>
            </div>
          </div>
        </div>

        {/* Col 2: Interested In */}
        <div className="min-w-[160px]">
          <p className="text-[11px] text-muted-foreground font-medium mb-1.5">Interested In</p>
          <div className="flex flex-wrap gap-1.5">
            <span className={`inline-flex px-2.5 py-1 rounded text-[11px] font-semibold border ${badgeColor}`}>
              {item.interestedIn}
            </span>
            {item.locationPreference?.map((loc) => (
              <span key={loc} className="inline-flex px-2 py-1 rounded text-[11px] font-medium border border-border text-muted-foreground">
                {loc}
              </span>
            ))}
            {item.groupNeeded && (
              <span className="inline-flex px-2 py-1 rounded text-[11px] font-medium border border-border text-muted-foreground">
                Group Needed
              </span>
            )}
          </div>
          {item.teamName && (
            <div className="mt-2 text-xs text-muted-foreground">
              <p>Team / Age Group</p>
              <p className="text-foreground">{item.teamName} {item.ageGroup}</p>
              {item.squadSize && <p>Squad Size: {item.squadSize} Players</p>}
            </div>
          )}
          {item.goal && (
            <div className="mt-2">
              <p className="text-[11px] text-muted-foreground">Goal</p>
              <p className="text-xs text-foreground/70 line-clamp-2">{item.goal}</p>
            </div>
          )}
        </div>

        {/* Col 3: Availability */}
        <div className="min-w-[120px]">
          <p className="text-[11px] text-muted-foreground font-medium mb-1.5">Availability</p>
          {item.availabilityDays && item.availabilityDays.length > 0 ? (
            <p className="text-sm text-foreground">{item.availabilityDays.join(", ")}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Flexible</p>
          )}
          {item.availabilityTime && (
            <p className="text-xs text-muted-foreground mt-0.5">{item.availabilityTime}</p>
          )}
        </div>

        {/* Col 4: Actions */}
        <div className="min-w-[130px]">
          <p className="text-[11px] text-muted-foreground font-medium mb-1.5">Actions</p>
          <div className="space-y-1.5">
            <a
              href={`https://wa.me/${item.phone?.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-1.5 rounded-lg bg-[#25d366]/20 text-[#25d366] text-xs font-semibold hover:bg-[#25d366]/30 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Message
            </a>
            <a
              href={`tel:${item.phone}`}
              className="flex items-center justify-center gap-1.5 w-full px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <PhoneIcon className="w-3.5 h-3.5" />
              Call
            </a>
            <button
              type="button"
              className="text-xs text-[#8aff00] hover:text-[#8aff00]/80 font-medium w-full text-center mt-1 transition-colors"
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsPanel({
  stats,
  serviceStats,
}: {
  stats?: { total: number; byStatus: Record<string, number>; byService: Record<string, number> } | null;
  serviceStats: { service: string; count: number; pct: number }[];
}) {
  const total = stats?.total ?? 0;
  const byStatus = stats?.byStatus ?? {};

  const SERVICE_COLORS: Record<string, string> = {
    "1-to-1 Private": "#8aff00",
    "Semi-Private (2-4)": "#6ee700",
    "Team Sessions": "#888",
    "App Only": "#555",
  };

  return (
    <>
      {/* Overview card */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Enquiries Overview</h3>
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-muted-foreground"
          >
            This Month
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
        <div className="mb-1">
          <span className="text-3xl font-bold text-foreground">{total}</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Total Enquiries
          <span className="text-[#8aff00] ml-1.5">↑ 33%</span>
          <span className="text-muted-foreground ml-1">vs last month</span>
        </p>
        {/* Mini bar chart placeholder */}
        <div className="flex items-end gap-1 h-16">
          {Array.from({ length: 15 }).map((_, i) => {
            const h = 20 + Math.random() * 80;
            return (
              <div
                key={i}
                className="flex-1 rounded-t bg-[#8aff00]/30"
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>
      </div>

      {/* By Service */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">By Service</h3>
        {/* Donut placeholder */}
        <div className="flex items-center justify-center mb-4">
          <div className="w-24 h-24 rounded-full border-[8px] border-[#8aff00]/30 relative">
            <div
              className="absolute inset-0 rounded-full border-[8px] border-[#8aff00]"
              style={{ clipPath: "polygon(0 0, 100% 0, 100% 50%, 0 50%)" }}
            />
          </div>
        </div>
        <div className="space-y-2.5">
          {serviceStats.map((s) => (
            <div key={s.service} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: SERVICE_COLORS[s.service] ?? "#666" }}
                />
                <span className="text-foreground">{s.service}</span>
              </div>
              <span className="text-muted-foreground">
                {s.pct}% ({s.count})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* By Status */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">By Status</h3>
        <div className="space-y-3">
          {(["new", "contacted", "booked", "closed"] as const).map((status) => (
            <div key={status} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT_COLORS[status]}`} />
                <span className="text-foreground capitalize">{status}</span>
              </div>
              <span className="text-foreground font-medium">{byStatus[status] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
