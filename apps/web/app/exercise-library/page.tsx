"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import {
  AudienceSummary,
  normalizeAudienceLabelInput,
  trainingContentRequest,
} from "../../components/admin/training-content-v2/api";

export default function ExerciseLibraryAudiencePage() {
  const router = useRouter();
  const [audiences, setAudiences] = useState<AudienceSummary[]>([]);
  const [activeTab, setActiveTab] = useState<"age" | "others">("age");
  const [modalOpen, setModalOpen] = useState(false);
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
  const audienceHref = `/exercise-library/${encodeURIComponent(normalizedAudience)}${activeTab === "others" ? "?view=others" : ""}`;

  return (
    <AdminShell title="Training content" subtitle="Start from audience groups, then drill into modules and sessions.">
      <div className="space-y-6">
        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 text-sm">
          <p className="font-semibold text-foreground">Audience-first setup</p>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-muted-foreground">
            <li>Create or open audience groups like <strong className="text-foreground">5</strong>, <strong className="text-foreground">5-6</strong>, <strong className="text-foreground">6-10</strong>, or <strong className="text-foreground">All</strong>.</li>
            <li>Use the header tabs here to choose whether you are entering the <strong className="text-foreground">Age adding</strong> flow or the <strong className="text-foreground">Others</strong> flow.</li>
            <li>From Age adding, open modules, then sessions, then manage warmup, main session, and cool down blocks.</li>
          </ul>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <SectionHeader
                title="Audience groups"
                description="Choose the flow here first, then open or create the audience group you want to manage."
              />
              <div className="ml-auto flex items-center gap-2 rounded-full border border-border bg-card p-1">
                <Button variant={activeTab === "age" ? "default" : "outline"} onClick={() => setActiveTab("age")}>
                  Age adding
                </Button>
                <Button variant={activeTab === "others" ? "default" : "outline"} onClick={() => setActiveTab("others")}>
                  Others
                </Button>
              </div>
              <Button
                onClick={() => {
                  setModalOpen(true);
                }}
              >
                + {activeTab === "age" ? "Add audience for age" : "Add audience for others"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-dashed border-border bg-secondary/10 p-4 text-sm text-muted-foreground">
              {activeTab === "age"
                ? "Age adding shows the audience groups that lead into modules and sessions."
                : "Others shows the audience groups that lead into mobility, recovery, in-season, off-season, and education content."}
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {isLoading ? <p className="text-sm text-muted-foreground">Loading audiences...</p> : null}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {audiences.map((audience) => (
                <Link
                  key={audience.label}
                  href={`/exercise-library/${encodeURIComponent(audience.label)}${activeTab === "others" ? "?view=others" : ""}`}
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
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeTab === "age" ? "Open age audience" : "Open others audience"}</DialogTitle>
            <DialogDescription>
              Enter an audience label like 5, 5-6, 6-10, 5-15, or All and we will open that audience in the current flow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="5, 5-6, 6-10, 5-15, All"
              value={audienceInput}
              onChange={(event) => setAudienceInput(event.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setModalOpen(false);
                  router.push(audienceHref);
                }}
              >
                Open audience
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
