"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AdminShell } from "../../components/admin/shell";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { SectionHeader } from "../../components/admin/section-header";
import { EmptyState } from "../../components/admin/empty-state";
import { Badge } from "../../components/ui/badge";
import { useGetFoodDiaryQuery } from "../../lib/apiSlice";
import { toast } from "../../lib/toast";

type FoodDiaryItem = {
  id: number;
  date?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
  meals?: Record<string, string> | null;
  feedback?: string | null;
  reviewedAt?: string | null;
  athleteName?: string | null;
  guardianName?: string | null;
  guardianEmail?: string | null;
  guardianUserId?: number | null;
  athleteId?: number | null;
};

type AthleteSummary = {
  athleteId: number;
  athleteName: string;
  guardianName?: string | null;
  guardianEmail?: string | null;
  awaiting: number;
  reviewed: number;
  total: number;
  lastEntryAt?: string | null;
};

export default function FoodDiaryPage() {
  const router = useRouter();
  const { data, isLoading } = useGetFoodDiaryQuery();
  const [search, setSearch] = useState("");

  const entries: FoodDiaryItem[] = useMemo(() => data?.items ?? [], [data]);
  const awaitingReview = useMemo(() => entries.filter((e) => !e.reviewedAt), [entries]);
  const reviewed = useMemo(() => entries.filter((e) => e.reviewedAt), [entries]);
  const filteredEntries = useMemo<FoodDiaryItem[]>(() => {
    if (!search.trim()) return entries;
    const needle = search.trim().toLowerCase();
    return entries.filter((entry) => {
      const athlete = entry.athleteName ?? "";
      const guardian = entry.guardianName ?? "";
      const email = entry.guardianEmail ?? "";
      return (
        athlete.toLowerCase().includes(needle) ||
        guardian.toLowerCase().includes(needle) ||
        email.toLowerCase().includes(needle)
      );
    });
  }, [entries, search]);
  const athletes = useMemo<AthleteSummary[]>(() => {
    const map = new Map<number, AthleteSummary>();
    for (const entry of entries) {
      const athleteId = entry.athleteId ? Number(entry.athleteId) : null;
      if (!athleteId || !Number.isFinite(athleteId)) continue;
      const existing = map.get(athleteId);
      const isReviewed = Boolean(entry.reviewedAt);
      const lastEntryAt = entry.date ?? null;
      const entryMs = lastEntryAt ? new Date(lastEntryAt).getTime() : 0;

      if (!existing) {
        map.set(athleteId, {
          athleteId,
          athleteName: entry.athleteName ?? `Athlete #${athleteId}`,
          guardianName: entry.guardianName ?? null,
          guardianEmail: entry.guardianEmail ?? null,
          awaiting: isReviewed ? 0 : 1,
          reviewed: isReviewed ? 1 : 0,
          total: 1,
          lastEntryAt,
        });
        continue;
      }

      const existingMs = existing.lastEntryAt ? new Date(existing.lastEntryAt).getTime() : 0;
      map.set(athleteId, {
        ...existing,
        awaiting: existing.awaiting + (isReviewed ? 0 : 1),
        reviewed: existing.reviewed + (isReviewed ? 1 : 0),
        total: existing.total + 1,
        lastEntryAt: entryMs > existingMs ? lastEntryAt : existing.lastEntryAt,
      });
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.awaiting !== b.awaiting) return b.awaiting - a.awaiting;
      const aMs = a.lastEntryAt ? new Date(a.lastEntryAt).getTime() : 0;
      const bMs = b.lastEntryAt ? new Date(b.lastEntryAt).getTime() : 0;
      return bMs - aMs;
    });
  }, [entries]);

  const filteredAthletes = useMemo(() => {
    if (!search.trim()) return athletes;
    const needle = search.trim().toLowerCase();
    return athletes.filter((athlete) => {
      const name = athlete.athleteName ?? "";
      const guardian = athlete.guardianName ?? "";
      const email = athlete.guardianEmail ?? "";
      return (
        name.toLowerCase().includes(needle) ||
        guardian.toLowerCase().includes(needle) ||
        email.toLowerCase().includes(needle)
      );
    });
  }, [athletes, search]);

  const formatDate = (value?: string | null) => {
    if (!value) return "Today";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "Today";
    return d.toLocaleDateString();
  };

  const formatMeals = (mealData?: Record<string, string> | null) => {
    if (!mealData) return [];
    return Object.entries(mealData)
      .filter(([, value]) => value && value.trim())
      .map(([key, value]) => ({
        label: key.replace(/^\w/, (c) => c.toUpperCase()),
        value,
      }));
  };

  const exportCsv = () => {
    const rows: Record<string, string>[] = filteredEntries.map((entry) => {
      const meals = formatMeals(entry.meals)
        .map((meal) => `${meal.label}: ${meal.value}`)
        .join(" | ");
      return {
        date: formatDate(entry.date),
        athlete: entry.athleteName ?? "",
        guardian: entry.guardianName ?? "",
        email: entry.guardianEmail ?? "",
        meals,
        notes: entry.notes ?? "",
        photoUrl: entry.photoUrl ?? "",
      };
    });
    const headers = ["date", "athlete", "guardian", "email", "meals", "notes", "photoUrl"];
    const escape = (value: string) => `"${value.replace(/\"/g, '""')}"`;
    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((key) => escape(String(row[key] ?? ""))).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `food-diary-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Export complete", "Food diary CSV downloaded.");
  };

  return (
    <AdminShell title="Food Diary" subtitle="Review parent-submitted meal logs.">
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/food-diary/awaiting"
          className="rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-secondary/30"
        >
          <p className="text-xs uppercase tracking-[2px] text-muted-foreground">Awaiting review</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{awaitingReview.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">View and add feedback</p>
        </Link>
        <Link
          href="/food-diary/reviewed"
          className="rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-secondary/30"
        >
          <p className="text-xs uppercase tracking-[2px] text-muted-foreground">Reviewed</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{reviewed.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">View past feedback</p>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <SectionHeader title="Athletes" description="Pick an athlete to view their food diary history by date/time." />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search athlete or parent"
              className="w-full rounded-2xl border border-border bg-secondary/40 px-4 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground sm:max-w-xs"
            />
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs text-muted-foreground">
                Showing {filteredAthletes.length} of {athletes.length}
              </p>
              <button
                type="button"
                onClick={exportCsv}
                className="rounded-full border border-border px-3 py-1 text-xs text-foreground hover:bg-secondary/40"
              >
                Export CSV
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
              Loading food diary entries...
            </div>
          ) : filteredAthletes.length === 0 ? (
            <EmptyState
              title="No athletes yet"
              description="Guardian submissions will appear here."
            />
          ) : (
            <div className="space-y-4">
              {filteredAthletes.map((athlete) => (
                <Card
                  key={athlete.athleteId}
                  className="cursor-pointer rounded-3xl border-border bg-secondary/20 transition hover:border-primary/40 hover:bg-secondary/30"
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/food-diary/athletes/${athlete.athleteId}`)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    router.push(`/food-diary/athletes/${athlete.athleteId}`);
                  }}
                >
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[2px] text-muted-foreground">
                          Last entry: {athlete.lastEntryAt ? new Date(athlete.lastEntryAt).toLocaleString() : "Unknown"}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-foreground">{athlete.athleteName}</p>
                        <p className="text-xs text-muted-foreground">
                          Guardian: {athlete.guardianName ?? athlete.guardianEmail ?? "Unknown"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {athlete.awaiting > 0 ? (
                          <Badge variant="accent">{athlete.awaiting} awaiting</Badge>
                        ) : (
                          <Badge>All reviewed</Badge>
                        )}
                        <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                          {athlete.total} entr{athlete.total === 1 ? "y" : "ies"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
