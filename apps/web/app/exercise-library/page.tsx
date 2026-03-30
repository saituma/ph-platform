"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  AudienceSummary,
  normalizeAudienceLabelInput,
  trainingContentRequest,
} from "../../components/admin/training-content-v2/api";

export default function ExerciseLibraryAudiencePage() {
  const [audiences, setAudiences] = useState<AudienceSummary[]>([]);
  const [audienceInput, setAudienceInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    void trainingContentRequest<{ items: AudienceSummary[] }>("/admin/audiences")
      .then((data) => {
        if (!cancelled) setAudiences(data.items ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load audiences.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedAudience = normalizeAudienceLabelInput(audienceInput);

  return (
    <AdminShell title="Training content" subtitle="Start from audience groups, then drill into modules and sessions.">
      <div className="space-y-6">
        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 text-sm">
          <p className="font-semibold text-foreground">Audience-first setup</p>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-muted-foreground">
            <li>Create or open audience groups like <strong className="text-foreground">5</strong>, <strong className="text-foreground">5-6</strong>, <strong className="text-foreground">6-10</strong>, or <strong className="text-foreground">All</strong>.</li>
            <li>Click an audience to open its detail page with two tabs: <strong className="text-foreground">Age</strong> and <strong className="text-foreground">Others</strong>.</li>
            <li>From the Age tab, open modules, then sessions, then manage warmup, main session, and cool down blocks.</li>
          </ul>
        </div>

        <Card>
          <CardHeader>
            <SectionHeader title="Audience groups" description="Only audience labels are listed here. Modules and sessions live one level deeper." />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full max-w-xs space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Audience</label>
                <Input
                  placeholder="5, 5-6, 6-10, 5-15, All"
                  value={audienceInput}
                  onChange={(event) => setAudienceInput(event.target.value)}
                />
              </div>
              <Link href={`/exercise-library/${encodeURIComponent(normalizedAudience)}`}>
                <Button>Open audience</Button>
              </Link>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {isLoading ? <p className="text-sm text-muted-foreground">Loading audiences...</p> : null}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {audiences.map((audience) => (
                <Link
                  key={audience.label}
                  href={`/exercise-library/${encodeURIComponent(audience.label)}`}
                  className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-primary/5"
                >
                  <p className="text-lg font-semibold text-foreground">{audience.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {audience.moduleCount} modules · {audience.otherCount} other items
                  </p>
                </Link>
              ))}
              {!isLoading && audiences.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No audiences created yet.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
