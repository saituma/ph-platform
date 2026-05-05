"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/shell";
import { SectionHeader } from "@/components/admin/section-header";

type AttendanceItem = {
  date: string;
  dayId: string;
  athleteId: number;
  athleteName: string;
  team?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  status: "present" | "absent";
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendancePage() {
  const [from, setFrom] = useState(todayKey());
  const [to, setTo] = useState(todayKey());
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AttendanceItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/backend/admin/attendance?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load attendance");
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load attendance");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    const present = items.filter((item) => item.status === "present").length;
    const absent = items.filter((item) => item.status === "absent").length;
    return { present, absent, total: items.length };
  }, [items]);

  return (
    <AdminShell title="Attendance" subtitle="Training-day compliance">
      <SectionHeader
        title="Attendance"
        description="Scheduled training-day attendance based on onboarding preferred days"
      />

      <div className="mt-4 rounded-none border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-muted-foreground">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-none border border-border bg-background px-3 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground">To (exclusive)</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-none border border-border bg-background px-3 text-sm" />
          </div>
          <button
            type="button"
            onClick={() => void fetchData()}
            className="h-9 rounded-none border border-border px-4 text-sm font-semibold hover:bg-accent"
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
          <div className="ml-auto text-xs text-muted-foreground">
            Present: <span className="text-emerald-500">{summary.present}</span> · Absent: <span className="text-rose-500">{summary.absent}</span> · Total: {summary.total}
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-none border border-border bg-card">
        {error ? (
          <div className="p-4 text-sm text-rose-500">{error}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="p-3">Date</th>
                <th className="p-3">Athlete</th>
                <th className="p-3">Team</th>
                <th className="p-3">Email</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={`${item.athleteId}:${item.date}`} className="border-b border-border/60">
                  <td className="p-3">{item.date}</td>
                  <td className="p-3">{item.athleteName}</td>
                  <td className="p-3">{item.team || "-"}</td>
                  <td className="p-3">{item.userEmail || "-"}</td>
                  <td className="p-3">
                    <span className={item.status === "present" ? "text-emerald-500" : "text-rose-500"}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 ? (
                <tr>
                  <td className="p-4 text-muted-foreground" colSpan={5}>No attendance rows for this range.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
