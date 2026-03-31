"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  const [plans, setPlans] = useState<Array<{ id: number; name: string; tier: string; isActive: boolean }>>([]);
  const [activeTab, setActiveTab] = useState<"age" | "others">("age");
  const [modalOpen, setModalOpen] = useState(false);
  const [audienceInput, setAudienceInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadAudiences = async () => {
    setIsLoading(true);
    try {
      const data = await trainingContentRequest<{ items: AudienceSummary[] }>("/admin/audiences");
      setAudiences(data.items ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audiences.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAudiences();
  }, []);

  useEffect(() => {
    if (activeTab !== "others") return;
    void fetch("/api/backend/admin/subscription-plans", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error ?? "Failed to load plans.");
        }
        return response.json();
      })
      .then((data) => {
        const nextPlans = Array.isArray(data?.plans) ? data.plans : [];
        setPlans(
          nextPlans
            .filter((plan: { name?: string }) => Boolean(plan?.name))
            .map((plan: { id: number; name: string; tier: string; isActive: boolean }) => ({
              id: plan.id,
              name: plan.name,
              tier: plan.tier,
              isActive: Boolean(plan.isActive),
            }))
        );
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load plans.");
      });
  }, [activeTab]);

  const preferredOtherPlan = useMemo(() => {
    if (!plans.length) return null;
    return plans.find((plan) => plan.isActive) ?? plans[0] ?? null;
  }, [plans]);

  useEffect(() => {
    if (activeTab !== "others" || !preferredOtherPlan) return;
    router.replace(`/exercise-library/${encodeURIComponent(preferredOtherPlan.name)}?view=others`);
  }, [activeTab, preferredOtherPlan, router]);

  const normalizedAudience = normalizeAudienceLabelInput(audienceInput);
  return (
    <AdminShell title="Training content" subtitle="Start from audience groups, then drill into modules and sessions.">
      <div className="space-y-6">
        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 text-sm">
          <p className="font-semibold text-foreground">Audience-first setup</p>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-muted-foreground">
            <li>Create or open audience groups like <strong className="text-foreground">5</strong>, <strong className="text-foreground">5-6</strong>, <strong className="text-foreground">6-10</strong>, or <strong className="text-foreground">All</strong>.</li>
            <li>Use the header tabs here to choose whether you are entering the <strong className="text-foreground">Age</strong> flow or the <strong className="text-foreground">Others</strong> flow.</li>
            <li>From Age, open modules, then sessions, then manage warmup, main session, and cool down blocks.</li>
          </ul>
        </div>

        <Card>
          <CardHeader>
            <div className="space-y-4">
              <div className="flex w-full items-center gap-2 rounded-full border border-border bg-card p-1">
                <Button className="flex-1" variant={activeTab === "age" ? "default" : "outline"} onClick={() => setActiveTab("age")}>
                  Age
                </Button>
                <Button className="flex-1" variant={activeTab === "others" ? "default" : "outline"} onClick={() => setActiveTab("others")}>
                  Others
                </Button>
              </div>
              <SectionHeader
                title="Audience groups"
                description="Choose the flow here first, then open or create the audience group you want to manage."
              />
              <Button
                className="w-full sm:w-auto"
                onClick={() => {
                  setAudienceInput("");
                  setModalOpen(true);
                }}
                disabled={activeTab === "others"}
              >
                + {activeTab === "age" ? "Add audience for age" : "Plans come from Billing"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-dashed border-border bg-secondary/10 p-4 text-sm text-muted-foreground">
              {activeTab === "age"
                ? "Age shows the audience groups that lead into modules and sessions."
                : preferredOtherPlan
                  ? `Opening Others for ${preferredOtherPlan.name}.`
                  : "Others uses your billing plans for mobility, recovery, in-season, off-season, and education content."}
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {isLoading && activeTab === "age" ? <p className="text-sm text-muted-foreground">Loading audiences...</p> : null}
            {activeTab === "age" ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {audiences.map((audience) => (
                  <Link
                    key={audience.label}
                    href={`/exercise-library/${encodeURIComponent(audience.label)}`}
                    className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-primary/5"
                  >
                    <p className="text-lg font-semibold text-foreground">{audience.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {`${audience.moduleCount} modules · ${audience.otherCount} other items`}
                    </p>
                  </Link>
                ))}
                {!isLoading && audiences.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No audiences created yet.
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                {preferredOtherPlan
                  ? `Redirecting to ${preferredOtherPlan.name}...`
                  : "No subscription plans yet. Add plans in Billing first."}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Dialog open={modalOpen && activeTab === "age"} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add age</DialogTitle>
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
                onClick={async () => {
                  if (!normalizedAudience) return;
                  try {
                    await trainingContentRequest("/admin/audiences", {
                      method: "POST",
                      body: JSON.stringify({ label: normalizedAudience }),
                    });
                    setAudienceInput("");
                    setModalOpen(false);
                    await loadAudiences();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to create audience.");
                  }
                }}
                disabled={!normalizedAudience}
              >
                Add age
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
