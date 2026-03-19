"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

import { AdminShell } from "../../../../components/admin/shell";
import { Card, CardContent } from "../../../../components/ui/card";
import { SectionHeader } from "../../../../components/admin/section-header";
import { useGetFoodDiaryQuery, useReviewFoodDiaryMutation } from "../../../../lib/apiSlice";
import { toast } from "../../../../lib/toast";

export default function FoodDiaryEntryDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const entryId = Number(params?.entryId);
  const fromAthleteRaw = searchParams.get("fromAthlete");
  const fromAthleteId = fromAthleteRaw ? Number(fromAthleteRaw) : null;
  const { data } = useGetFoodDiaryQuery(
    fromAthleteId && Number.isFinite(fromAthleteId) ? { athleteId: fromAthleteId } : undefined
  );
  const [reviewFoodDiary, { isLoading: isSubmitting }] = useReviewFoodDiaryMutation();
  const [feedback, setFeedback] = useState("");

  const entries = data?.items ?? [];
  const entry = entries.find((e: any) => e.id === entryId);

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

  const handleSubmitFeedback = useCallback(async () => {
    if (!Number.isFinite(entryId)) return;
    try {
      await reviewFoodDiary({ entryId, feedback: feedback.trim() || null }).unwrap();
      toast.success("Feedback saved", "The guardian will be notified.");
      setFeedback("");
    } catch (e: any) {
      toast.error("Failed to save", e?.data?.error ?? e?.message ?? "Please try again.");
    }
  }, [entryId, feedback, reviewFoodDiary]);

  if (!entry && data !== undefined) {
    return (
      <AdminShell title="Food Diary entry" subtitle="Entry not found.">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">This entry may have been removed.</p>
            <Link href="/food-diary" className="mt-4 inline-block text-sm text-foreground hover:underline">
              ← Back to Food Diary
            </Link>
          </CardContent>
        </Card>
      </AdminShell>
    );
  }

  const meals = formatMeals(entry?.meals);
  const isReviewed = Boolean(entry?.reviewedAt);

  return (
    <AdminShell
      title={`Food diary – ${entry?.athleteName ?? "Athlete"}`}
      subtitle={formatDate(entry?.date)}
    >
      <div className="space-y-6">
        <div>
          <Link
            href={
              fromAthleteId && Number.isFinite(fromAthleteId)
                ? `/food-diary/athletes/${fromAthleteId}`
                : "/food-diary"
            }
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back
          </Link>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[2px] text-muted-foreground">
                  {formatDate(entry?.date)}
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {entry?.athleteName ?? "Athlete"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Guardian: {entry?.guardianName ?? entry?.guardianEmail ?? "Unknown"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                  {isReviewed ? "Reviewed" : "Awaiting review"}
                </span>
                {entry?.guardianUserId ? (
                  <a
                    href={`/users?userId=${entry.guardianUserId}`}
                    className="rounded-full border border-border px-3 py-2 text-xs text-foreground hover:bg-secondary/40"
                  >
                    View Guardian
                  </a>
                ) : null}
                {entry?.athleteId ? (
                  <a
                    href={`/users?athleteId=${entry.athleteId}`}
                    className="rounded-full border border-border px-3 py-2 text-xs text-foreground hover:bg-secondary/40"
                  >
                    View Athlete
                  </a>
                ) : null}
                {entry?.photoUrl ? (
                  <a
                    href={entry.photoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-border px-3 py-2 text-xs text-foreground hover:bg-secondary/40"
                  >
                    View Photo
                  </a>
                ) : null}
              </div>
            </div>

            {meals.length > 0 ? (
              <div>
                <SectionHeader title="Meals" />
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  {meals.map((meal) => (
                    <div
                      key={meal.label}
                      className="rounded-2xl border border-border bg-background/40 p-3"
                    >
                      <p className="text-[11px] uppercase tracking-[1.4px] text-muted-foreground">
                        {meal.label}
                      </p>
                      <p className="mt-2 text-sm text-foreground">{meal.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {entry?.notes ? (
              <div>
                <SectionHeader title="Notes" />
                <p className="mt-2 text-sm text-foreground">{entry.notes}</p>
              </div>
            ) : null}

            {entry?.photoUrl ? (
              <div>
                <SectionHeader title="Photo" />
                <a
                  href={entry.photoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block"
                >
                  <img
                    src={entry.photoUrl}
                    alt="Food diary"
                    className="rounded-2xl max-w-md w-full object-cover"
                  />
                </a>
              </div>
            ) : null}

            {isReviewed && entry?.feedback ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <p className="text-[11px] uppercase tracking-[1.4px] text-muted-foreground">
                  Your feedback
                </p>
                <p className="mt-2 text-sm text-foreground">{entry.feedback}</p>
                {entry.reviewedAt ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(entry.reviewedAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
            ) : null}

            {!isReviewed ? (
              <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                <SectionHeader title="Add feedback" description="The guardian will be notified." />
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Add your feedback for this entry..."
                  rows={4}
                  className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={handleSubmitFeedback}
                  disabled={isSubmitting}
                  className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save feedback"}
                </button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
