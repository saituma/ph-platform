"use client";

import Link from "next/link";

import { AdminShell } from "../../../components/admin/shell";
import { Card, CardContent } from "../../../components/ui/card";
import { SectionHeader } from "../../../components/admin/section-header";
import { EmptyState } from "../../../components/admin/empty-state";
import { useGetFoodDiaryQuery } from "../../../lib/apiSlice";

export default function FoodDiaryAwaitingPage() {
  const { data, isLoading } = useGetFoodDiaryQuery();
  const entries = (data?.items ?? []).filter((e: any) => !e.reviewedAt);

  const formatDate = (value?: string | null) => {
    if (!value) return "Today";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "Today";
    return d.toLocaleDateString();
  };

  return (
    <AdminShell title="Food Diary – Awaiting review" subtitle="Add feedback for parent submissions.">
      <Card>
        <CardContent className="pt-6">
          <SectionHeader
            title="Awaiting review"
            description={`${entries.length} entr${entries.length === 1 ? "y" : "ies"} pending coach feedback.`}
          />
          <div className="mt-4">
            <Link
              href="/food-diary"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to Food Diary
            </Link>
          </div>
          {isLoading ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : entries.length === 0 ? (
            <EmptyState
              title="No entries awaiting review"
              description="New guardian submissions will appear here."
            />
          ) : (
            <div className="mt-6 space-y-4">
              {entries.map((entry: any) => (
                <Link
                  key={entry.id}
                  href={`/food-diary/entry/${entry.id}`}
                  className="block rounded-3xl border border-border bg-secondary/20 p-5 transition-colors hover:bg-secondary/30"
                >
                  <p className="text-xs uppercase tracking-[2px] text-muted-foreground">
                    {formatDate(entry.date)}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {entry.athleteName ?? "Athlete"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Guardian: {entry.guardianName ?? entry.guardianEmail ?? "Unknown"}
                  </p>
                  <p className="mt-2 text-sm text-foreground">View and add feedback →</p>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
