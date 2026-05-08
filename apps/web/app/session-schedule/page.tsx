"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "../../components/admin/shell";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import {
  useCreateAdminSessionTemplateMutation,
  useDisconnectAdminGoogleCalendarMutation,
  useGetAdminGoogleCalendarsQuery,
  useGetAdminGoogleCalendarConnectionQuery,
  useLazyGetAdminGoogleCalendarOAuthStartQuery,
  useGetAdminScheduledSessionsQuery,
  useGetAdminSessionTemplatesQuery,
  useSelectAdminGoogleCalendarMutation,
  useGetAdminTeamsQuery,
  useGetUsersQuery,
  useMarkAdminSessionAttendanceMutation,
  useMaterializeAdminSessionTemplateMutation,
  useGetAdminAttendanceStatsQuery,
} from "../../lib/apiSlice";
import { QrCode } from "lucide-react";
import { getOrCreateAdminSocket } from "../../lib/admin-socket";
import type { ScheduledSessionAdminRecord } from "../../lib/api/admin-session-schedule";
import { AttendanceQrDialog } from "../../components/admin/AttendanceQrDialog";

function toIsoDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function typeLabel(type: string) {
  if (type === "one_to_one") return "1-1";
  if (type === "semi_private") return "Semi-Private";
  if (type === "in_person") return "In-Person";
  if (type === "team") return "Team";
  return "Session";
}

function toDateKey(dateInput: string | Date) {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const HOUR_VALUES = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTE_VALUES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

function formatHourLabel(hour24: string) {
  const h = Number(hour24);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${suffix}`;
}

const WEEK_DAY_COLUMNS = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
] as const;

type AthleteDayRow = {
  id: number | string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  athleteId?: number | null;
  athleteType?: "youth" | "adult" | null;
  preferredTrainingDays?: string[] | null;
};

type AttendanceRow = {
  sessionId: number;
  sessionName: string;
  sessionType: string;
  dateKey: string;
  startsAt: string;
  endsAt: string;
  userId: number;
  userName: string;
  userEmail: string;
  status: "unmarked" | "attended" | "missed";
  checkInAt: string | null;
  selfCheckedIn: boolean;
};

type StatusFilter = "all" | "attended" | "missed" | "unmarked" | "self_checked_in";

function AttendanceCheckInsSection({
  sessions,
  marking,
  markAttendanceWithRetry,
  refetchSessions,
}: {
  sessions: ScheduledSessionAdminRecord[];
  marking: boolean;
  markAttendanceWithRetry: (input: { sessionId: number; userId: number; status: "attended" | "unmarked" }) => Promise<void>;
  refetchSessions: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [nameSearch, setNameSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "name">("date_desc");

  const allRows = useMemo<AttendanceRow[]>(() => {
    const rows: AttendanceRow[] = [];
    for (const s of sessions) {
      const dateKey = toDateKey(s.startsAt);
      for (const a of s.attendees ?? []) {
        rows.push({
          sessionId: s.id,
          sessionName: s.name,
          sessionType: s.type,
          dateKey,
          startsAt: s.startsAt,
          endsAt: s.endsAt,
          userId: a.userId,
          userName: a.userName || `User ${a.userId}`,
          userEmail: a.userEmail || "",
          status: a.status,
          checkInAt: a.checkInAt ?? null,
          selfCheckedIn: !!a.checkInAt,
        });
      }
    }
    return rows;
  }, [sessions]);

  const filteredRows = useMemo(() => {
    let rows = allRows;

    if (statusFilter === "self_checked_in") {
      rows = rows.filter((r) => r.selfCheckedIn);
    } else if (statusFilter !== "all") {
      rows = rows.filter((r) => r.status === statusFilter);
    }

    const q = nameSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) => r.userName.toLowerCase().includes(q) || r.userEmail.toLowerCase().includes(q),
      );
    }

    if (sortBy === "date_desc") rows = [...rows].sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
    else if (sortBy === "date_asc") rows = [...rows].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    else rows = [...rows].sort((a, b) => a.userName.localeCompare(b.userName));

    return rows;
  }, [allRows, statusFilter, nameSearch, sortBy]);

  const counts = useMemo(() => {
    let attended = 0, missed = 0, unmarked = 0, selfChecked = 0;
    for (const r of allRows) {
      if (r.status === "attended") attended++;
      else if (r.status === "missed") missed++;
      else unmarked++;
      if (r.selfCheckedIn) selfChecked++;
    }
    return { attended, missed, unmarked, selfChecked, total: allRows.length };
  }, [allRows]);

  const attendanceRate = counts.total > 0 ? Math.round((counts.attended / counts.total) * 100) : 0;
  const selfRate = counts.total > 0 ? Math.round((counts.selfChecked / counts.total) * 100) : 0;
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (attendanceRate / 100) * circumference;

  return (
    <div className="space-y-4">
      {/* ── Stats cards row ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Attendance rate ring */}
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className="relative mb-2">
              <svg width="84" height="84" viewBox="0 0 84 84">
                <circle cx="42" cy="42" r="36" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
                <circle
                  cx="42" cy="42" r="36" fill="none"
                  strokeWidth="6" strokeLinecap="round"
                  className={attendanceRate >= 80 ? "text-emerald-500" : attendanceRate >= 50 ? "text-amber-500" : "text-red-500"}
                  stroke="currentColor"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  transform="rotate(-90 42 42)"
                  style={{ transition: "stroke-dashoffset 0.6s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold">{attendanceRate}%</span>
              </div>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Attendance Rate</p>
          </CardContent>
        </Card>

        {/* Attended */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{counts.attended}</p>
                <p className="text-xs text-muted-foreground">Attended</p>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted/30">
              <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${counts.total ? (counts.attended / counts.total) * 100 : 0}%` }} />
            </div>
          </CardContent>
        </Card>

        {/* Missed */}
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{counts.missed}</p>
                <p className="text-xs text-muted-foreground">Missed</p>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted/30">
              <div className="h-full rounded-full bg-red-500 transition-all duration-500" style={{ width: `${counts.total ? (counts.missed / counts.total) * 100 : 0}%` }} />
            </div>
          </CardContent>
        </Card>

        {/* Unmarked */}
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{counts.unmarked}</p>
                <p className="text-xs text-muted-foreground">Unmarked</p>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted/30">
              <div className="h-full rounded-full bg-amber-500 transition-all duration-500" style={{ width: `${counts.total ? (counts.unmarked / counts.total) * 100 : 0}%` }} />
            </div>
          </CardContent>
        </Card>

        {/* Self check-ins */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{counts.selfChecked}</p>
                <p className="text-xs text-muted-foreground">Self Check-ins ({selfRate}%)</p>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted/30">
              <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${selfRate}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Table card ── */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Check-in Log</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Detailed attendance records — see who checked in from the app
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border bg-muted/20 p-1">
              {(["all", "attended", "missed", "unmarked", "self_checked_in"] as const).map((f) => {
                const labels: Record<StatusFilter, string> = { all: "All", attended: "Attended", missed: "Missed", unmarked: "Unmarked", self_checked_in: "Self" };
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setStatusFilter(f)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                      statusFilter === f
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {labels[f]}
                  </button>
                );
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {/* Search + Sort */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1" style={{ minWidth: 200, maxWidth: 320 }}>
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              <Input
                className="h-9 pl-9"
                placeholder="Search athlete name or email..."
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
              />
            </div>
            <select
              className="h-9 rounded-md border bg-background px-3 text-xs"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="name">Name A-Z</option>
            </select>
            <span className="text-xs text-muted-foreground">{filteredRows.length} record{filteredRows.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Table */}
          {filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
              <svg className="mb-3 h-10 w-10 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>
              <p className="text-sm font-medium text-muted-foreground">No records found</p>
              <p className="mt-1 text-xs text-muted-foreground">Try adjusting your filters or date range</p>
            </div>
          ) : (
            <div className="overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date & Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Session</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Athlete</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Check-in</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRows.slice(0, 100).map((r) => {
                    const dateObj = new Date(r.startsAt);
                    const dayLabel = dateObj.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
                    const timeLabel = `${dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${new Date(r.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
                    return (
                      <tr key={`${r.sessionId}-${r.userId}`} className="transition-colors hover:bg-muted/10">
                        <td className="whitespace-nowrap px-4 py-3">
                          <p className="font-medium">{dayLabel}</p>
                          <p className="text-xs text-muted-foreground">{timeLabel}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{r.sessionName}</p>
                          <span className="inline-block mt-0.5 rounded bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{typeLabel(r.sessionType)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                              r.status === "attended" ? "bg-emerald-500" : r.status === "missed" ? "bg-red-400" : "bg-muted-foreground/40"
                            }`}>
                              {r.userName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{r.userName}</p>
                              {r.userEmail && !r.userEmail.endsWith("@athlete.local") && (
                                <p className="truncate text-xs text-muted-foreground">{r.userEmail}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            r.status === "attended"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : r.status === "missed"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              r.status === "attended" ? "bg-emerald-500" : r.status === "missed" ? "bg-red-500" : "bg-amber-500"
                            }`} />
                            {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {r.selfCheckedIn ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75" /></svg>
                                Self
                              </span>
                              <span className="mt-0.5 text-[10px] text-muted-foreground">
                                {new Date(r.checkInAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          ) : r.status === "attended" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground">
                              Admin
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant={r.status === "attended" ? "outline" : "default"}
                            disabled={marking}
                            className={`h-8 text-xs ${r.status === "attended" ? "" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                            onClick={async () => {
                              await markAttendanceWithRetry({
                                sessionId: r.sessionId,
                                userId: r.userId,
                                status: r.status === "attended" ? "unmarked" : "attended",
                              });
                              refetchSessions();
                            }}
                          >
                            {r.status === "attended" ? "Undo" : "Mark Attended"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredRows.length > 100 && (
                <div className="flex items-center justify-between border-t bg-muted/10 px-4 py-2.5 text-xs text-muted-foreground">
                  <span>Showing 100 of {filteredRows.length} records</span>
                  <span>Narrow your date range or filters to see more</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SessionSchedulePage() {
  const now = new Date();
  const [fromDate, setFromDate] = useState(toIsoDateInput(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [toDate, setToDate] = useState(toIsoDateInput(new Date(now.getFullYear(), now.getMonth() + 2, 0)));
  const [calendarNotice, setCalendarNotice] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("calendar");
    if (status === "connected") return "Google Calendar connected successfully!";
    if (status === "error") return "Failed to connect Google Calendar. Please try again.";
    return null;
  });

  const fromIso = new Date(`${fromDate}T00:00:00.000Z`).toISOString();
  const toIso = new Date(`${toDate}T23:59:59.999Z`).toISOString();

  const { data: templatesData, refetch: refetchTemplates } = useGetAdminSessionTemplatesQuery();
  const { data: sessionsData, refetch: refetchSessions, isLoading } = useGetAdminScheduledSessionsQuery({ from: fromIso, to: toIso });
  const [userSearch, setUserSearch] = useState("");
  const userQuery = userSearch.trim();
  const { data: usersData, isLoading: usersLoading, error: usersError } = useGetUsersQuery({
    q: userQuery.length >= 2 ? userQuery : undefined,
    limit: userQuery.length >= 2 ? 40 : 20,
  });
  const { data: teamsData } = useGetAdminTeamsQuery();
  const { data: googleConnection } = useGetAdminGoogleCalendarConnectionQuery();
  const { data: attendanceStatsData } = useGetAdminAttendanceStatsQuery({ from: fromIso, to: toIso });

  const [createTemplate, { isLoading: creating }] = useCreateAdminSessionTemplateMutation();
  const [materializeTemplate, { isLoading: materializing }] = useMaterializeAdminSessionTemplateMutation();
  const [markAttendance, { isLoading: marking }] = useMarkAdminSessionAttendanceMutation();
  const [disconnectCalendar, { isLoading: disconnectingCalendar }] = useDisconnectAdminGoogleCalendarMutation();
  const [selectCalendar, { isLoading: selectingCalendar }] = useSelectAdminGoogleCalendarMutation();
  const [triggerOAuthStart, { isFetching: startingOAuth }] =
    useLazyGetAdminGoogleCalendarOAuthStartQuery();
  const { data: calendarListData, refetch: refetchCalendars, isFetching: loadingCalendars } =
    useGetAdminGoogleCalendarsQuery(undefined, { skip: !googleConnection?.connected || googleConnection?.mode !== "oauth" });

  const templates = useMemo(() => (Array.isArray(templatesData?.templates) ? templatesData.templates : []), [templatesData]);
  const sessions = useMemo(() => (Array.isArray(sessionsData?.sessions) ? sessionsData.sessions : []), [sessionsData]);
  const users = useMemo(() => (Array.isArray(usersData?.users) ? usersData.users : []), [usersData]);
  const teams = useMemo(() => (Array.isArray(teamsData?.teams) ? teamsData.teams : []), [teamsData]);

  const [name, setName] = useState("");
  const [type, setType] = useState<"one_to_one" | "semi_private" | "in_person" | "team">("one_to_one");
  const [scope, setScope] = useState<"individual" | "group" | "team">("individual");
  const [weekday, setWeekday] = useState("4");
  const [startHour, setStartHour] = useState("17");
  const [startMinute, setStartMinute] = useState("00");
  const [endHour, setEndHour] = useState("18");
  const [endMinute, setEndMinute] = useState("00");

  const [teamSearch, setTeamSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedCalendarId, setSelectedCalendarId] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [templateNotice, setTemplateNotice] = useState<string | null>(null);
  const [qrSessionId, setQrSessionId] = useState<number | null>(null);
  const [qrSessionName, setQrSessionName] = useState("");
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  const eligibleUsers = useMemo(() => {
    const athleteRoles = new Set(["athlete", "adult_athlete", "youth_athlete", "team_athlete", "guardian"]);
    return users.filter((u) => {
      const role = String((u as any).role ?? "").toLowerCase();
      return athleteRoles.has(role);
    });
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return eligibleUsers.slice(0, 12);
    return eligibleUsers
      .filter((u) => {
        const hay = `${u.name ?? ""} ${u.email ?? ""} ${u.guardianEmail ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 12);
  }, [eligibleUsers, userSearch]);

  const filteredTeams = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    if (!q) return teams.slice(0, 12);
    return teams.filter((t) => String(t.team ?? "").toLowerCase().includes(q)).slice(0, 12);
  }, [teams, teamSearch]);

  const selectedUsers = useMemo(
    () => eligibleUsers.filter((u) => selectedUserIds.includes(Number(u.id))),
    [eligibleUsers, selectedUserIds],
  );

  const selectedTeam = useMemo(
    () => teams.find((t) => Number(t.id) === selectedTeamId) ?? null,
    [teams, selectedTeamId],
  );

  useEffect(() => {
    setSelectedCalendarId(googleConnection?.calendarId ?? "");
  }, [googleConnection?.calendarId]);

  const athleteDayRows = useMemo(() => {
    return users
      .map((u) => u as unknown as AthleteDayRow)
      .filter((u) => {
        const role = String(u.role ?? "").toLowerCase();
        return role === "athlete" || role === "youth" || role === "adult" || !!u.athleteId || !!u.athleteType;
      });
  }, [users]);

  const startsAtTime = `${startHour}:${startMinute}`;
  const endsAtTime = `${endHour}:${endMinute}`;
  const todayKey = toDateKey(new Date());
  const effectiveScope: "individual" | "group" | "team" = type === "team" ? "team" : scope;

  useEffect(() => {
    const socket = getOrCreateAdminSocket();
    const refresh = () => {
      void refetchSessions();
    };
    socket.on("schedule:changed", refresh);
    socket.on("schedule:attendance:changed", refresh);
    return () => {
      socket.off("schedule:changed", refresh);
      socket.off("schedule:attendance:changed", refresh);
    };
  }, [refetchSessions]);

  async function markAttendanceWithRetry(input: {
    sessionId: number;
    userId: number;
    status: "attended" | "unmarked";
  }) {
    try {
      await markAttendance({
        sessionId: input.sessionId,
        updates: [{ userId: input.userId, status: input.status }],
      }).unwrap();
      return;
    } catch (error: any) {
      const status = error?.status ?? error?.originalStatus ?? error?.data?.statusCode;
      if (status === 503) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await markAttendance({
          sessionId: input.sessionId,
          updates: [{ userId: input.userId, status: input.status }],
        }).unwrap();
        return;
      }
      throw error;
    }
  }

  const sessionCountsByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      const key = toDateKey(s.startsAt);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [sessions]);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, typeof sessions>();
    for (const s of sessions) {
      const key = toDateKey(s.startsAt);
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    for (const [key, list] of map.entries()) {
      map.set(
        key,
        [...list].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
      );
    }
    return map;
  }, [sessions]);

  const selectedDateSessions = useMemo(() => {
    if (!selectedDateKey) return [];
    return sessions.filter((s) => toDateKey(s.startsAt) === selectedDateKey);
  }, [sessions, selectedDateKey]);

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startOffset = (first.getDay() + 6) % 7;
    const cells: Array<{ date: Date; key: string } | null> = [];
    for (let i = 0; i < startOffset; i += 1) cells.push(null);
    for (let day = 1; day <= last.getDate(); day += 1) {
      const d = new Date(year, month, day);
      cells.push({ date: d, key: toDateKey(d) });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calendarMonth]);

  return (
    <AdminShell title="Session Attendance" subtitle="Create fixed sessions, generate recurring dates, and mark attendance.">
      <Card>
        <CardHeader>
          <CardTitle>Google Calendar Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Connect your calendar once. Templates with Google sync enabled will create/update events automatically.
          </p>

          {calendarNotice ? (
            <div className={`rounded-md px-3 py-2 text-sm ${calendarNotice.includes("success") ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300" : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"}`}>
              {calendarNotice}
              <button type="button" className="ml-2 underline" onClick={() => { setCalendarNotice(null); window.history.replaceState({}, "", window.location.pathname); }}>Dismiss</button>
            </div>
          ) : null}

          {googleConnection?.connected ? (
            <div className="space-y-2 rounded-md border p-3 text-sm">
              <p><span className="font-medium">Status:</span> Connected</p>
              <p><span className="font-medium">Mode:</span> {googleConnection.mode === "oauth" ? "OAuth" : "Service account"}</p>
              <p><span className="font-medium">Calendar ID:</span> {googleConnection.calendarId}</p>
              <p>
                <span className="font-medium">Account:</span>{" "}
                {googleConnection.accountEmail || googleConnection.serviceAccountEmail || "—"}
              </p>
              {googleConnection.mode === "oauth" ? (
                <div className="space-y-2 rounded-md border p-2">
                  <p className="text-xs text-muted-foreground">Choose which calendar receives synced sessions.</p>
                  <div className="flex flex-wrap gap-2">
                    <select
                      className="rounded-md border bg-background px-2 py-2 text-sm"
                      value={selectedCalendarId}
                      onChange={(e) => setSelectedCalendarId(e.target.value)}
                    >
                      {(calendarListData?.calendars ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.summary}{c.primary ? " (Primary)" : ""}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={selectingCalendar || !selectedCalendarId}
                      onClick={async () => {
                        await selectCalendar({ calendarId: selectedCalendarId }).unwrap();
                      }}
                    >
                      {selectingCalendar ? "Saving..." : "Use this calendar"}
                    </Button>
                    <Button size="sm" variant="outline" disabled={loadingCalendars} onClick={() => refetchCalendars()}>
                      Refresh calendars
                    </Button>
                  </div>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(
                      `Calendar ID: ${googleConnection.calendarId ?? ""}\nAccount: ${googleConnection.accountEmail || googleConnection.serviceAccountEmail || ""}`,
                    );
                  }}
                >
                  Copy Calendar Details
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={startingOAuth}
                  onClick={async () => {
                    const { data } = await triggerOAuthStart();
                    if (data?.authUrl) window.location.href = data.authUrl;
                  }}
                >
                  Switch Google Account
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={disconnectingCalendar}
                  onClick={async () => {
                    await disconnectCalendar().unwrap();
                  }}
                >
                  Disconnect Calendar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Connect with Google OAuth, then pick which calendar to use. You can disconnect any time.
              </p>
              <Button
                disabled={startingOAuth}
                onClick={async () => {
                  const { data } = await triggerOAuthStart();
                  if (data?.authUrl) window.location.href = data.authUrl;
                }}
              >
                {startingOAuth ? "Redirecting..." : "Connect Google Account"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>From</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>To</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={() => refetchSessions()}>Refresh</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden p-0">
        <CardHeader>
          <CardTitle>PHP Calendar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 p-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-full px-3"
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
              >
                ‹
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-full px-3"
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
              >
                ›
              </Button>
            </div>
            <p className="text-base font-semibold text-foreground">
              {calendarMonth.toLocaleDateString([], { month: "long", year: "numeric" })}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-full px-3"
              onClick={() => setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1))}
            >
              Today
            </Button>
          </div>

          <div className="grid grid-cols-7 border-b bg-muted/20 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
              <div key={label} className="border-r py-2 last:border-r-0">{label}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarCells.map((cell, idx) => {
              if (!cell) return <div key={`empty-${idx}`} className="h-24 border-r border-b last:border-r-0" />;
              const count = sessionCountsByDate.get(cell.key) ?? 0;
              const isMarked = count > 0;
              const isToday = cell.key === todayKey;
              return (
                <button
                  type="button"
                  key={cell.key}
                  className={`relative h-24 border-r border-b p-2 text-left transition hover:bg-muted/35 ${selectedDateKey === cell.key ? "bg-primary/10" : "bg-background"}`}
                  onClick={() => {
                    setSelectedDateKey(cell.key);
                    setDateModalOpen(true);
                  }}
                >
                  <div className="flex h-full flex-col justify-between">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                        isToday ? "bg-primary font-semibold text-primary-foreground" : "text-foreground"
                      }`}
                    >
                      {cell.date.getDate()}
                    </span>
                    {isMarked ? (
                      <div className="space-y-1">
                        {(sessionsByDate.get(cell.key) ?? []).slice(0, 3).map((item) => (
                          <div
                            key={`${cell.key}-${item.id}`}
                            className="truncate rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground"
                          >
                            {new Date(item.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} {item.name}
                          </div>
                        ))}
                        {count > 3 ? (
                          <div className="truncate text-[10px] font-medium text-primary">
                            +{count - 3} more
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" />
            <div className="grid grid-cols-3 gap-2 text-sm">
              <select
                className="rounded-md border bg-background px-2 py-2"
                value={type}
                onChange={(e) => {
                  const nextType = e.target.value as "one_to_one" | "semi_private" | "in_person" | "team";
                  setType(nextType);
                  if (nextType === "team") setScope("team");
                  if (nextType !== "team" && scope === "team") setScope("individual");
                }}
              >
                <option value="one_to_one">1-1</option>
                <option value="semi_private">Semi-Private</option>
                <option value="in_person">In-Person</option>
                <option value="team">Team</option>
              </select>
              {type === "team" ? (
                <div className="flex items-center rounded-md border bg-muted/20 px-3 py-2 text-sm text-foreground">
                  Team
                </div>
              ) : (
                <select
                  className="rounded-md border bg-background px-2 py-2"
                  value={scope}
                  onChange={(e) => setScope(e.target.value as any)}
                >
                  <option value="individual">Individual</option>
                  <option value="group">Group</option>
                </select>
              )}
              <select className="rounded-md border bg-background px-2 py-2" value={weekday} onChange={(e) => setWeekday(e.target.value)}>
                <option value="0">Sun</option><option value="1">Mon</option><option value="2">Tue</option><option value="3">Wed</option>
                <option value="4">Thu</option><option value="5">Fri</option><option value="6">Sat</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Start Time</Label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="rounded-md border bg-background px-2 py-2"
                    value={startHour}
                    onChange={(e) => setStartHour(e.target.value)}
                  >
                    {HOUR_VALUES.map((hour) => (
                      <option key={`start-hour-${hour}`} value={hour}>
                        {formatHourLabel(hour)}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded-md border bg-background px-2 py-2"
                    value={startMinute}
                    onChange={(e) => setStartMinute(e.target.value)}
                  >
                    {MINUTE_VALUES.map((minute) => (
                      <option key={`start-minute-${minute}`} value={minute}>
                        :{minute}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>End Time</Label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="rounded-md border bg-background px-2 py-2"
                    value={endHour}
                    onChange={(e) => setEndHour(e.target.value)}
                  >
                    {HOUR_VALUES.map((hour) => (
                      <option key={`end-hour-${hour}`} value={hour}>
                        {formatHourLabel(hour)}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded-md border bg-background px-2 py-2"
                    value={endMinute}
                    onChange={(e) => setEndMinute(e.target.value)}
                  >
                    {MINUTE_VALUES.map((minute) => (
                      <option key={`end-minute-${minute}`} value={minute}>
                        :{minute}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {effectiveScope === "team" ? (
              <div className="space-y-2">
                <Label>Team (search by name)</Label>
                <Input value={teamSearch} onChange={(e) => setTeamSearch(e.target.value)} placeholder="Search team name" />
                {selectedTeam ? (
                  <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <span>{selectedTeam.team}</span>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedTeamId(null)}>Remove</Button>
                  </div>
                ) : null}
                <div className="max-h-40 space-y-1 overflow-auto rounded-md border p-2">
                  {filteredTeams.map((team) => (
                    <button
                      type="button"
                      key={team.id}
                      className="flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm hover:bg-secondary"
                      onClick={() => setSelectedTeamId(team.id)}
                    >
                      <span>{team.team}</span>
                      <span className="text-xs text-muted-foreground">#{team.id}</span>
                    </button>
                  ))}
                  {filteredTeams.length === 0 ? <p className="text-xs text-muted-foreground">No teams found.</p> : null}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Users (search by name/email)</Label>
                <Input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Type 2+ chars to search users" />
                {selectedUsers.length > 0 ? (
                  <div className="flex flex-wrap gap-2 rounded-md border p-2">
                    {selectedUsers.map((u) => (
                      <button
                        type="button"
                        key={u.id}
                        className="rounded bg-secondary px-2 py-1 text-xs"
                        onClick={() => setSelectedUserIds((prev) => prev.filter((id) => id !== Number(u.id)))}
                      >
                        {(u.name || u.email || `User ${u.id}`)} ×
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="max-h-40 space-y-1 overflow-auto rounded-md border p-2">
                  {usersLoading ? <p className="text-xs text-muted-foreground">Loading users...</p> : null}
                  {!usersLoading && usersError ? (
                    <p className="text-xs text-red-500">Failed to load users. Please refresh.</p>
                  ) : null}
                  {filteredUsers.map((u) => {
                    const selected = selectedUserIds.includes(Number(u.id));
                    return (
                      <button
                        type="button"
                        key={u.id}
                        className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm ${selected ? "bg-secondary" : "hover:bg-secondary"}`}
                        onClick={() => {
                          const uid = Number(u.id);
                          setSelectedUserIds((prev) => (prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]));
                        }}
                      >
                        <span>{u.name || "Unnamed"} <span className="text-xs text-muted-foreground">{u.guardianEmail || u.email}</span></span>
                        {selected ? <span className="text-xs">Selected</span> : null}
                      </button>
                    );
                  })}
                  {!usersLoading && !usersError && filteredUsers.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No users found.</p>
                  ) : null}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">Generated sessions auto-sync to Google Calendar when your calendar is connected.</p>

            <Button
              disabled={creating || !name.trim()}
              onClick={async () => {
                  await createTemplate({
                    name: name.trim(),
                    type,
                    scope: effectiveScope,
                    isRecurring: true,
                    weekday: Number(weekday),
                    startsAtTime,
                    endsAtTime,
                    targetUserIds: effectiveScope === "team" ? [] : selectedUserIds,
                    teamId: effectiveScope === "team" ? selectedTeamId : null,
                    googleSyncEnabled: true,
                    isActive: true,
                  }).unwrap();

                setName("");
                setSelectedUserIds([]);
                setSelectedTeamId(null);
                await refetchTemplates();
              }}
            >
              Create Template
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="rounded-lg border p-3 text-sm">
                <div className="font-medium">{t.name}</div>
                <div className="text-muted-foreground">{typeLabel(t.type)} • {t.startsAtTime} - {t.endsAtTime}</div>
                <div className="mt-1 text-xs text-muted-foreground">Calendar sync: Auto (when connected)</div>
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={materializing}
                    onClick={async () => {
                      const result = await materializeTemplate({ templateId: t.id, from: fromIso, to: toIso }).unwrap();
                      if (result.created > 0) {
                        setTemplateNotice(`Generated ${result.created} session${result.created === 1 ? "" : "s"}.`);
                      } else if (result.reason === "already_exists") {
                        setTemplateNotice("No new sessions were created because matching sessions already exist in that date range.");
                      } else if (result.reason === "no_target_users") {
                        setTemplateNotice("No sessions were created because no target users are assigned to this template.");
                      } else if (result.reason === "template_inactive") {
                        setTemplateNotice("This template is inactive. Activate it before generating sessions.");
                      } else {
                        setTemplateNotice("No sessions were created.");
                      }
                      await refetchSessions();
                    }}
                  >
                    {materializing ? "Generating..." : "Generate Sessions"}
                  </Button>
                </div>
              </div>
            ))}
            {templateNotice ? <p className="text-xs text-muted-foreground">{templateNotice}</p> : null}
            {templates.length === 0 ? <p className="text-sm text-muted-foreground">No templates yet.</p> : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Sessions & Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Athlete Requested Days</p>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/40 text-left">
                    <th className="border-b px-3 py-2 font-medium">Athlete</th>
                    {WEEK_DAY_COLUMNS.map((day) => (
                      <th key={`pref-head-${day.id}`} className="border-b px-3 py-2 text-center font-medium">
                        {day.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {athleteDayRows.map((u) => {
                    const preferred = new Set((u.preferredTrainingDays ?? []).map((d) => String(d).toLowerCase()));
                    return (
                      <tr key={`pref-row-${u.id}`}>
                        <td className="border-b px-3 py-2">
                          <div className="font-medium">{u.name || u.email || `User ${u.id}`}</div>
                          <div className="text-xs text-muted-foreground">{u.role || "athlete"}</div>
                        </td>
                        {WEEK_DAY_COLUMNS.map((day) => (
                          <td key={`pref-cell-${u.id}-${day.id}`} className="border-b px-3 py-2 text-center">
                            {preferred.has(day.id) ? "Yes" : "-"}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {athleteDayRows.length === 0 ? (
                    <tr>
                      <td className="border-b px-3 py-4 text-muted-foreground" colSpan={8}>
                        No athlete preferred days found in the current user list.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          {isLoading ? <p className="text-sm text-muted-foreground">Loading requested days...</p> : null}
        </CardContent>
      </Card>

      <Dialog open={dateModalOpen} onOpenChange={setDateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDateKey ? `Sessions on ${selectedDateKey}` : "Sessions"}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-3 overflow-auto p-6 pt-0 text-sm">
            {selectedDateSessions.length === 0 ? (
              <p className="text-muted-foreground">No sessions on this date.</p>
            ) : (
              selectedDateSessions.map((s) => (
                <div key={s.id} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {typeLabel(s.type)} • {new Date(s.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                        {new Date(s.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1.5"
                      onClick={() => {
                        setQrSessionId(s.id);
                        setQrSessionName(s.name);
                        setQrDialogOpen(true);
                      }}
                    >
                      <QrCode className="h-4 w-4" />
                      QR Code
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.attendees?.length ?? 0} assigned users
                  </p>
                  <div className="space-y-1 rounded-md border p-2">
                    {s.attendees?.length ? (
                      s.attendees.map((a) => (
                        <div
                          key={`${s.id}-${a.userId}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/70 px-2 py-1.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium">{a.userName || a.userEmail || `User ${a.userId}`}</p>
                            <p className="text-[11px] text-muted-foreground">
                              Status: {a.status}
                              {a.checkInAt ? ` • Client checked in at ${new Date(a.checkInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant={a.status === "attended" ? "secondary" : "default"}
                              disabled={marking}
                              onClick={async () => {
                                await markAttendanceWithRetry({
                                  sessionId: s.id,
                                  userId: a.userId,
                                  status: a.status === "attended" ? "unmarked" : "attended",
                                });
                                await refetchSessions();
                              }}
                            >
                              {a.status === "attended" ? "Unattended" : "Attend"}
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No assigned users for this session.</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AttendanceCheckInsSection
        sessions={sessions}
        marking={marking}
        markAttendanceWithRetry={markAttendanceWithRetry}
        refetchSessions={refetchSessions}
      />

      <Card>
        <CardHeader>
          <CardTitle>Attendance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Per-athlete attendance stats for the selected date range. Sorted by lowest attendance first.
          </p>
          {!attendanceStatsData?.stats?.length ? (
            <p className="text-sm text-muted-foreground">No attendance data for this date range.</p>
          ) : (
            <div className="overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-3 py-2 font-medium">Athlete</th>
                    <th className="px-3 py-2 font-medium text-center">Total</th>
                    <th className="px-3 py-2 font-medium text-center">Attended</th>
                    <th className="px-3 py-2 font-medium text-center">Missed</th>
                    <th className="px-3 py-2 font-medium text-center">Unmarked</th>
                    <th className="px-3 py-2 font-medium text-center">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceStatsData.stats.map((s) => (
                    <tr key={s.userId} className="border-b last:border-b-0 hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <div className="font-medium">{s.userName || "Unnamed"}</div>
                        <div className="text-xs text-muted-foreground">{s.userEmail?.endsWith("@athlete.local") ? "" : s.userEmail}</div>
                      </td>
                      <td className="px-3 py-2 text-center">{s.totalSessions}</td>
                      <td className="px-3 py-2 text-center text-green-600">{s.attended}</td>
                      <td className="px-3 py-2 text-center text-red-600">{s.missed}</td>
                      <td className="px-3 py-2 text-center text-yellow-600">{s.unmarked}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          s.attendancePercent >= 80 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" :
                          s.attendancePercent >= 50 ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" :
                          "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                        }`}>
                          {s.attendancePercent}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      {qrSessionId !== null && (
        <AttendanceQrDialog
          sessionId={qrSessionId}
          sessionName={qrSessionName}
          open={qrDialogOpen}
          onOpenChange={setQrDialogOpen}
        />
      )}
    </AdminShell>
  );
}
