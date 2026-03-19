"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { SectionHeader } from "../../components/admin/section-header";
import { EmptyState } from "../../components/admin/empty-state";
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

export default function FoodDiaryPage() {
  const { data, isLoading } = useGetFoodDiaryQuery();
  const [search, setSearch] = useState("");

  const entries: FoodDiaryItem[] = useMemo(() => data?.items ?? [], [data]);
  const awaitingReview = useMemo(() => entries.filter((e) => !e.reviewedAt), [entries]);
  const reviewed = useMemo(() => entries.filter((e) => e.reviewedAt), [entries]);
  const filtered = useMemo(() => {
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
    const rows = filtered.map((entry) => {
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
      ...rows.map((row) =>
        headers.map((key) => escape(String((row as Record<string, string>)[key] ?? ""))).join(",")
      ),
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
          <SectionHeader title="Food Diary Entries" description="Filter by athlete or parent email." />
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
                Showing {filtered.length} of {entries.length}
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
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No food diary entries"
              description="Guardian submissions will appear here."
            />
          ) : (
            <div className="space-y-4">
              {filtered.map((entry) => {
                const meals = formatMeals(entry.meals);
                return (
                  <Link
                    key={entry.id}
                    href={`/food-diary/entry/${entry.id}`}
                    className="block rounded-3xl border border-border bg-secondary/20 p-5 transition-colors hover:bg-secondary/30"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-[2px] text-muted-foreground">
                          {formatDate(entry.date)}
                        </p>
                        <p className="text-lg font-semibold text-foreground">
                          {entry.athleteName ?? "Athlete"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Guardian: {entry.guardianName ?? entry.guardianEmail ?? "Unknown"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                          {entry.reviewedAt ? "Reviewed" : "Awaiting review"}
                        </span>
                        {entry.guardianUserId ? (
                          <a
                            href={`/users?userId=${entry.guardianUserId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-full border border-border px-3 py-2 text-xs text-foreground hover:bg-secondary/40"
                          >
                            View Guardian
                          </a>
                        ) : null}
                        {entry.athleteId ? (
                          <a
                            href={`/users?athleteId=${entry.athleteId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-full border border-border px-3 py-2 text-xs text-foreground hover:bg-secondary/40"
                          >
                            View Athlete
                          </a>
                        ) : null}
                        {entry.photoUrl ? (
                          <a
                            href={entry.photoUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-full border border-border px-3 py-2 text-xs text-foreground"
                          >
                            View Photo
                          </a>
                        ) : null}
                      </div>
                    </div>

                    {meals.length ? (
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {meals.map((meal) => (
                          <div key={meal.label} className="rounded-2xl border border-border bg-background/40 p-3">
                            <p className="text-[11px] uppercase tracking-[1.4px] text-muted-foreground">
                              {meal.label}
                            </p>
                            <p className="mt-2 text-sm text-foreground">{meal.value}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {entry.notes ? (
                      <p className="mt-4 text-sm text-foreground">{entry.notes}</p>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
