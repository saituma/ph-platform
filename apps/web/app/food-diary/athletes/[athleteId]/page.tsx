"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { AdminShell } from "../../../../components/admin/shell";
import { Card, CardContent } from "../../../../components/ui/card";
import { SectionHeader } from "../../../../components/admin/section-header";
import { EmptyState } from "../../../../components/admin/empty-state";
import { Tabs, TabsList, TabsTrigger } from "../../../../components/ui/tabs";
import { Badge } from "../../../../components/ui/badge";
import { useGetFoodDiaryQuery } from "../../../../lib/apiSlice";

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

const FILTER_TABS = [
  { value: "all", label: "All" },
  { value: "awaiting", label: "Awaiting review" },
  { value: "reviewed", label: "Reviewed" },
] as const;

export default function FoodDiaryAthletePage() {
  const params = useParams<{ athleteId: string }>();
  const searchParams = useSearchParams();
  const athleteId = Number(params.athleteId);
  const initialFilter = searchParams.get("filter") ?? "all";
  const [activeFilter, setActiveFilter] = useState<string>(
    FILTER_TABS.some((t) => t.value === initialFilter) ? initialFilter : "all"
  );

  const { data, isLoading } = useGetFoodDiaryQuery(
    Number.isFinite(athleteId) ? { athleteId } : undefined
  );

  const entries: FoodDiaryItem[] = useMemo(() => data?.items ?? [], [data]);
  const athleteName = entries[0]?.athleteName ?? `Athlete #${Number.isFinite(athleteId) ? athleteId : "?"}`;

  const awaitingCount = useMemo(() => entries.filter((e) => !e.reviewedAt).length, [entries]);
  const reviewedCount = useMemo(() => entries.filter((e) => e.reviewedAt).length, [entries]);

  const filtered = useMemo(() => {
    if (activeFilter === "awaiting") return entries.filter((e) => !e.reviewedAt);
    if (activeFilter === "reviewed") return entries.filter((e) => e.reviewedAt);
    return entries;
  }, [activeFilter, entries]);

  const formatDateTime = (value?: string | null) => {
    if (!value) return "Unknown time";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "Unknown time";
    return d.toLocaleString();
  };

  const summarizeMeals = (mealData?: Record<string, string> | null) => {
    if (!mealData) return "";
    const labels = Object.entries(mealData)
      .filter(([, value]) => value && value.trim())
      .map(([key]) => key.replace(/^\w/, (c) => c.toUpperCase()));
    return labels.slice(0, 4).join(" • ");
  };

  return (
    <AdminShell title={athleteName} subtitle="Food diary history by date/time.">
      <div className="space-y-6">
        <div>
          <Link href="/food-diary" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Food Diary
          </Link>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <SectionHeader
              title="Entries"
              description="Click an entry to see details and add feedback."
            />
            <div className="flex flex-wrap items-center gap-2">
              {awaitingCount > 0 ? <Badge variant="accent">{awaitingCount} awaiting</Badge> : <Badge>All reviewed</Badge>}
              <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                {reviewedCount} reviewed
              </span>
            </div>

            <Tabs value={activeFilter} onValueChange={setActiveFilter} className="w-full">
              <TabsList className="flex w-full flex-wrap justify-start gap-2 bg-transparent">
                {FILTER_TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="rounded-full px-4">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {isLoading ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
                Loading entries...
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                title="No entries"
                description="This athlete has no food diary entries in this view yet."
              />
            ) : (
              <div className="space-y-4">
                {filtered.map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/food-diary/entry/${entry.id}?fromAthlete=${encodeURIComponent(String(athleteId))}`}
                    className="block rounded-3xl border border-border bg-secondary/20 p-5 transition-colors hover:bg-secondary/30"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[2px] text-muted-foreground">
                          {formatDateTime(entry.date)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Guardian: {entry.guardianName ?? entry.guardianEmail ?? "Unknown"}
                        </p>
                        <p className="mt-2 text-sm text-foreground">
                          {summarizeMeals(entry.meals) || (entry.notes ? "Notes included" : "No meals logged")}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                          {entry.reviewedAt ? "Reviewed" : "Awaiting review"}
                        </span>
                        {entry.photoUrl ? (
                          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                            Photo
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-foreground">
                      View details →
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}

