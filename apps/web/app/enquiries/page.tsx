"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronDown,
  Mail,
  MessageSquare,
  Phone as PhoneIcon,
  Plus,
  X,
  Trash2,
  Download,
} from "lucide-react";

import { AdminShell } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "@/components/ui/select";
import {
  useGetEnquiriesQuery,
  useGetEnquiryStatsQuery,
  useUpdateEnquiryMutation,
  useDeleteEnquiryMutation,
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

const SERVICE_OPTIONS = [
  { label: "All Services", value: "all" },
  { label: "1-to-1 Private", value: "1-to-1 Private" },
  { label: "Semi-Private (2-4)", value: "Semi-Private (2-4)" },
  { label: "Team Sessions", value: "Team Sessions" },
  { label: "App Only", value: "App Only" },
];

const STATUS_OPTIONS = [
  { label: "All Status", value: "all" },
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Booked", value: "booked" },
  { label: "Closed", value: "closed" },
];

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
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [dropdownStatusFilter, setDropdownStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [detailItem, setDetailItem] = useState<EnquiryItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const statusFilter = activeTab === "All Enquiries"
    ? (dropdownStatusFilter !== "all" ? dropdownStatusFilter : undefined)
    : activeTab.toLowerCase();

  const { data, isLoading } = useGetEnquiriesQuery({
    status: statusFilter,
    service: serviceFilter !== "all" ? serviceFilter : undefined,
    search: searchTerm || undefined,
    sort: sortOrder,
    limit: 100,
  });
  const { data: stats } = useGetEnquiryStatsQuery();
  const [updateEnquiry] = useUpdateEnquiryMutation();
  const [deleteEnquiry] = useDeleteEnquiryMutation();

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

  const handleStatusChange = async (id: number, newStatus: string) => {
    setActionError(null);
    try {
      const result = await updateEnquiry({ id, status: newStatus }).unwrap();
      if (detailItem && detailItem.id === id) {
        setDetailItem({ ...detailItem, status: result.enquiry?.status ?? newStatus });
      }
    } catch {
      setActionError("Failed to update enquiry status.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this enquiry permanently?")) return;
    setActionError(null);
    try {
      await deleteEnquiry(id).unwrap();
      if (detailItem?.id === id) setDetailItem(null);
    } catch {
      setActionError("Failed to delete enquiry.");
    }
  };

  const handleExport = () => {
    const header = ["Name", "Age", "Parent", "Phone", "Email", "Service", "Status", "Team", "Goal", "Created"];
    const rows = items.map((e) => [
      e.athleteName,
      e.age ?? "",
      e.parentName ?? "",
      e.phone,
      e.email,
      e.interestedIn,
      e.status,
      e.teamName ?? "",
      e.goal ?? "",
      e.createdAt,
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminShell
      title="Enquiries"
      subtitle="Manage and respond to all incoming enquiries"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} className="gap-1.5">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button
            className="bg-[#8aff00] hover:bg-[#8aff00]/90 text-black font-semibold gap-1.5"
            render={<a href="/enquiries/new" />}
          >
            <Plus className="w-4 h-4" />
            New Enquiry
          </Button>
        </div>
      }
    >
      {actionError && (
        <div className="mx-4 mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {actionError}
        </div>
      )}

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
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
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
            <div className="relative">
              <input
                type="text"
                placeholder="Search enquiries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-48 rounded-md border border-border bg-secondary/40 pl-3 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <Select
              items={SERVICE_OPTIONS}
              value={serviceFilter}
              onValueChange={(v) => setServiceFilter(v ?? "all")}
            >
              <SelectTrigger className="h-9 w-auto min-w-[140px] bg-transparent border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {SERVICE_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <Select
              items={STATUS_OPTIONS}
              value={dropdownStatusFilter}
              onValueChange={(v) => setDropdownStatusFilter(v ?? "all")}
            >
              <SelectTrigger className="h-9 w-auto min-w-[120px] bg-transparent border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {STATUS_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
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
          <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
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
                <EnquiryCard
                  key={item.id}
                  item={item}
                  onViewDetails={() => setDetailItem(item)}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>

        {/* Right sidebar — stats */}
        <div className="hidden xl:block w-[280px] shrink-0 space-y-5">
          <StatsPanel stats={stats} serviceStats={serviceStats} />
        </div>
      </div>

      {/* Detail Modal */}
      {detailItem && (
        <EnquiryDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}
    </AdminShell>
  );
}

function EnquiryCard({
  item,
  onViewDetails,
  onStatusChange,
  onDelete,
}: {
  item: EnquiryItem;
  onViewDetails: () => void;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
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
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-400 shrink-0 overflow-hidden">
            {item.photoUrl ? (
              <img src={item.photoUrl} alt={item.athleteName} className="w-full h-full rounded-full object-cover" />
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
              {item.athleteType && (
                <>
                  <span className="text-border">·</span>
                  <span className="capitalize">{item.athleteType}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
              {item.phone && (
                <a href={`tel:${item.phone}`} className="flex items-center gap-1 hover:text-foreground">
                  <PhoneIcon className="w-3 h-3" />
                  {item.phone}
                </a>
              )}
              {item.email && (
                <a href={`mailto:${item.email}`} className="flex items-center gap-1 hover:text-foreground">
                  <Mail className="w-3 h-3" />
                  {item.email}
                </a>
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
              onClick={onViewDetails}
              className="text-xs text-[#8aff00] hover:text-[#8aff00]/80 font-medium w-full text-center mt-1 transition-colors"
            >
              View Details
            </button>
            <div className="flex items-center gap-1 mt-1">
              <select
                className="flex-1 h-7 rounded border border-border bg-transparent text-[11px] text-muted-foreground px-1"
                value={item.status}
                onChange={(e) => onStatusChange(item.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="booked">Booked</option>
                <option value="closed">Closed</option>
              </select>
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/30"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EnquiryDetailModal({
  item,
  onClose,
  onStatusChange,
  onDelete,
}: {
  item: EnquiryItem;
  onClose: () => void;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
}) {
  const [notes, setNotes] = useState(item.notes ?? "");
  const [updateEnquiry, { isLoading: isSaving }] = useUpdateEnquiryMutation();

  const handleSaveNotes = async () => {
    try {
      await updateEnquiry({ id: item.id, status: item.status, notes }).unwrap();
    } catch {
      // handled silently
    }
  };

  const badgeColor = SERVICE_BADGE_COLORS[item.interestedIn] ?? "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  const statusColor = STATUS_BADGE_COLORS[item.status] ?? STATUS_BADGE_COLORS.new;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex gap-4">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-bold text-zinc-400 shrink-0 overflow-hidden">
              {item.photoUrl ? (
                <img src={item.photoUrl} alt={item.athleteName} className="w-full h-full rounded-full object-cover" />
              ) : (
                item.athleteName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{item.athleteName}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                {item.age && <span>Age {item.age}</span>}
                {item.athleteType && <span className="capitalize">· {item.athleteType}</span>}
                {item.parentName && <span>· Parent: {item.parentName}</span>}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${statusColor}`}>
                  {item.status}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Phone</p>
              <a href={`tel:${item.phone}`} className="text-sm text-foreground hover:text-primary">{item.phone}</a>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Email</p>
              <a href={`mailto:${item.email}`} className="text-sm text-foreground hover:text-primary break-all">{item.email}</a>
            </div>
          </div>

          {/* Service */}
          <div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-2">Interested In</p>
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-semibold border ${badgeColor}`}>
                {item.interestedIn}
              </span>
              {item.locationPreference?.map((loc) => (
                <span key={loc} className="inline-flex px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground">
                  {loc}
                </span>
              ))}
              {item.groupNeeded && (
                <span className="inline-flex px-3 py-1.5 rounded-lg text-xs font-medium border border-amber-500/30 bg-amber-500/10 text-amber-400">
                  Group Needed
                </span>
              )}
            </div>
          </div>

          {/* Team details */}
          {item.teamName && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Team</p>
                <p className="text-sm text-foreground">{item.teamName}</p>
              </div>
              {item.ageGroup && (
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Age Group</p>
                  <p className="text-sm text-foreground">{item.ageGroup}</p>
                </div>
              )}
              {item.squadSize && (
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Squad Size</p>
                  <p className="text-sm text-foreground">{item.squadSize} players</p>
                </div>
              )}
            </div>
          )}

          {/* Availability */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Availability Days</p>
              <p className="text-sm text-foreground">
                {item.availabilityDays?.length ? item.availabilityDays.join(", ") : "Flexible"}
              </p>
            </div>
            {item.availabilityTime && (
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Preferred Time</p>
                <p className="text-sm text-foreground">{item.availabilityTime}</p>
              </div>
            )}
          </div>

          {/* Goal */}
          {item.goal && (
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Goal</p>
              <p className="text-sm text-foreground/80">{item.goal}</p>
            </div>
          )}

          {/* Photo */}
          {item.photoUrl && (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Photo</p>
              <img
                src={item.photoUrl}
                alt={item.athleteName}
                className="w-32 h-32 rounded-xl object-cover border border-border"
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Notes</p>
            <textarea
              className="w-full h-24 rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none"
              placeholder="Add notes about this enquiry..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSaveNotes} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Notes"}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status:</span>
            <select
              className="h-8 rounded-lg border border-border bg-transparent text-sm text-foreground px-2"
              value={item.status}
              onChange={(e) => onStatusChange(item.id, e.target.value)}
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="booked">Booked</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/${item.phone?.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#25d366]/20 text-[#25d366] text-sm font-semibold hover:bg-[#25d366]/30 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              WhatsApp
            </a>
            <a
              href={`tel:${item.phone}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <PhoneIcon className="w-4 h-4" />
              Call
            </a>
            <button
              onClick={() => onDelete(item.id)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-500/30 text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
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
        <h3 className="text-sm font-semibold text-foreground mb-3">Enquiries Overview</h3>
        <div className="mb-1">
          <span className="text-3xl font-bold text-foreground">{total}</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Total Enquiries</p>
        <div className="flex items-end gap-1 h-16">
          {(["new", "contacted", "booked", "closed"] as const).map((status) => {
            const count = byStatus[status] ?? 0;
            const pct = total ? Math.max(8, (count / total) * 100) : 25;
            return (
              <div key={status} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${pct}%`,
                    backgroundColor: STATUS_DOT_COLORS[status]?.replace("bg-", "") ?? "#666",
                    background: `var(--tw-${STATUS_DOT_COLORS[status]?.replace("bg-", "")}, #8aff00)`,
                  }}
                />
                <span className="text-[9px] text-muted-foreground capitalize">{status}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* By Service */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">By Service</h3>
        <div className="space-y-2.5">
          {serviceStats.map((s) => (
            <div key={s.service}>
              <div className="flex items-center justify-between text-xs mb-1">
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
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${s.pct}%`,
                    backgroundColor: SERVICE_COLORS[s.service] ?? "#666",
                  }}
                />
              </div>
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
