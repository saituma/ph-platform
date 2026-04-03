"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
  AudienceWorkspace,
  OTHER_TYPES,
  normalizeAudienceLabelInput,
  trainingContentRequest,
} from "../../components/admin/training-content-v2/api";

type TeamSummary = {
  team: string;
  memberCount: number;
  guardianCount: number;
};

export default function ExerciseLibraryAudiencePage() {
  const [contentMode, setContentMode] = useState<"audience" | "team">("audience");
  const [audiences, setAudiences] = useState<AudienceSummary[]>([]);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [plans, setPlans] = useState<Array<{ id: number; name: string; tier: string; isActive: boolean }>>([]);
  const [otherWorkspace, setOtherWorkspace] = useState<AudienceWorkspace | null>(null);
  const [otherPlanWorkspaces, setOtherPlanWorkspaces] = useState<Record<string, AudienceWorkspace>>({});
  const [activeTab, setActiveTab] = useState<"age" | "others">("age");
  const [modalOpen, setModalOpen] = useState(false);
  const [otherLockModalOpen, setOtherLockModalOpen] = useState(false);
  const [audienceInput, setAudienceInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [isUpdatingOtherLocks, setIsUpdatingOtherLocks] = useState(false);
  const [otherLockForm, setOtherLockForm] = useState<{
    type: string;
    label: string;
    lockedPlanNames: string[];
  }>({
    type: "",
    label: "",
    lockedPlanNames: [],
  });

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
    if (activeTab !== "others" || contentMode !== "audience") return;
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
  }, [activeTab, contentMode]);

  useEffect(() => {
    if (activeTab !== "others" || contentMode !== "audience") return;
    void trainingContentRequest<AudienceWorkspace>("/admin?audienceLabel=All")
      .then((data) => {
        setOtherWorkspace(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load Others content.");
      });
  }, [activeTab, contentMode]);

  useEffect(() => {
    if (activeTab !== "others" || contentMode !== "audience" || !plans.length) return;
    void Promise.all(
      plans.map(async (plan) => {
        const data = await trainingContentRequest<AudienceWorkspace>(`/admin?audienceLabel=${encodeURIComponent(plan.name)}`);
        return [plan.name, data] as const;
      })
    )
      .then((entries) => {
        setOtherPlanWorkspaces(Object.fromEntries(entries));
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load plan locks.");
      });
  }, [activeTab, plans, contentMode]);

  useEffect(() => {
    if (contentMode !== "team") return;
    const loadTeams = async () => {
      setIsLoadingTeams(true);
      setError(null);
      try {
        const response = await fetch("/api/backend/admin/teams", { credentials: "include" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error ?? "Failed to load teams.");
        }
        setTeams(Array.isArray(payload?.teams) ? payload.teams : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load teams.");
      } finally {
        setIsLoadingTeams(false);
      }
    };

    void loadTeams();
  }, [contentMode]);

  const loadOtherWorkspace = async () => {
    const data = await trainingContentRequest<AudienceWorkspace>("/admin?audienceLabel=All");
    setOtherWorkspace(data);
  };

  const loadOtherPlanWorkspaces = async (nextPlans: Array<{ name: string }>) => {
    if (!nextPlans.length) {
      setOtherPlanWorkspaces({});
      return;
    }
    const entries = await Promise.all(
      nextPlans.map(async (plan) => {
        const data = await trainingContentRequest<AudienceWorkspace>(`/admin?audienceLabel=${encodeURIComponent(plan.name)}`);
        return [plan.name, data] as const;
      })
    );
    setOtherPlanWorkspaces(Object.fromEntries(entries));
  };

  const saveOtherTypeLocks = async (type: string, lockedPlanNames: string[]) => {
    setIsUpdatingOtherLocks(true);
    try {
      setError(null);
      await Promise.all(
        plans.map((plan) =>
          trainingContentRequest("/others/settings", {
            method: "PUT",
            body: JSON.stringify({
              audienceLabel: plan.name,
              type,
              enabled: !lockedPlanNames.includes(plan.name),
            }),
          })
        )
      );
      await Promise.all([loadOtherWorkspace(), loadOtherPlanWorkspaces(plans)]);
      setOtherLockModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update section locks.");
    } finally {
      setIsUpdatingOtherLocks(false);
    }
  };

  const normalizedAudience = normalizeAudienceLabelInput(audienceInput);
  return (
    <AdminShell title="Training content" subtitle="Start from audience groups, then drill into modules and sessions.">
      <div className="space-y-6">
        <div className="flex w-full items-center gap-2 rounded-full border border-border bg-card p-1">
          <Button className="flex-1" variant={contentMode === "audience" ? "default" : "outline"} onClick={() => setContentMode("audience")}>
            Audience mode
          </Button>
          <Button className="flex-1" variant={contentMode === "team" ? "default" : "outline"} onClick={() => setContentMode("team")}>
            Team mode
          </Button>
        </div>
        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 text-sm">
          <p className="font-semibold text-foreground">{contentMode === "audience" ? "Audience-first setup" : "Team-first setup"}</p>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-muted-foreground">
            {contentMode === "audience" ? (
              <>
                <li>Create or open audience groups like <strong className="text-foreground">5</strong>, <strong className="text-foreground">5-6</strong>, <strong className="text-foreground">6-10</strong>, or <strong className="text-foreground">All</strong>.</li>
                <li>Use the header tabs here to choose whether you are entering the <strong className="text-foreground">Age</strong> flow or the <strong className="text-foreground">Others</strong> flow.</li>
                <li>From Age, open modules, then sessions, then manage warmup, main session, and cool down blocks.</li>
              </>
            ) : (
              <>
                <li>Open a team to manage team-specific training content.</li>
                <li>In <strong className="text-foreground">Age</strong>, coaches can create and post modules and sessions for that team.</li>
                <li>In <strong className="text-foreground">Others</strong>, coaches can post team-specific section content.</li>
              </>
            )}
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
                title={contentMode === "audience" ? "Audience groups" : "Teams"}
                description={
                  contentMode === "audience"
                    ? "Choose the flow here first, then open or create the audience group you want to manage."
                    : "Choose the flow here first, then open the team you want to manage."
                }
              />
              {contentMode === "audience" ? (
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
              ) : (
                <Button className="w-full sm:w-auto" asChild>
                  <Link href="/users/add-team">+ Add team</Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-dashed border-border bg-secondary/10 p-4 text-sm text-muted-foreground">
              {contentMode === "audience"
                ? activeTab === "age"
                  ? "Age shows the audience groups that lead into modules and sessions."
                  : "Others is managed here once, and you can lock each section for any plan."
                : activeTab === "age"
                  ? "Age shows each team so coaches can post modules and sessions for that team."
                  : "Others shows each team so coaches can post section content for that team."}
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {isLoading && activeTab === "age" && contentMode === "audience" ? <p className="text-sm text-muted-foreground">Loading audiences...</p> : null}
            {isLoadingTeams && contentMode === "team" ? <p className="text-sm text-muted-foreground">Loading teams...</p> : null}
            {activeTab === "age" ? (
              contentMode === "audience" ? (
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
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {teams.map((team) => (
                    <Link
                      key={team.team}
                      href={`/exercise-library/${encodeURIComponent(team.team)}`}
                      className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      <p className="text-lg font-semibold text-foreground">{team.team}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {team.memberCount} athlete{team.memberCount === 1 ? "" : "s"} · {team.guardianCount} guardian{team.guardianCount === 1 ? "" : "s"}
                      </p>
                    </Link>
                  ))}
                  {!isLoadingTeams && teams.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                      No teams yet. Create one from Add team.
                    </div>
                  ) : null}
                </div>
              )
            ) : (
              contentMode === "audience" ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {OTHER_TYPES.map((type) => {
                    const group = otherWorkspace?.others.find((item) => item.type === type.value);
                    const lockedPlans = plans
                      .filter((plan) => {
                        const planGroup = otherPlanWorkspaces[plan.name]?.others.find((item) => item.type === type.value);
                        return planGroup ? !planGroup.enabled : false;
                      })
                      .map((plan) => plan.name);

                    return (
                      <div
                        key={type.value}
                        className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-primary/5"
                      >
                        <p className="text-lg font-semibold text-foreground">{type.label}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {group?.items.length ? `${group.items.length} item${group.items.length === 1 ? "" : "s"} added` : "No content created yet."}
                        </p>
                        {lockedPlans.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {lockedPlans.map((planName) => (
                              <span
                                key={`${type.value}-${planName}`}
                                className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800"
                              >
                                Locked for {planName}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link href={`/exercise-library/${encodeURIComponent("All")}/others/${type.value}`}>
                            <Button size="sm">Open section</Button>
                          </Link>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setOtherLockForm({
                                type: type.value,
                                label: type.label,
                                lockedPlanNames: lockedPlans,
                              });
                              setOtherLockModalOpen(true);
                            }}
                          >
                            Lock plans
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {!plans.length ? (
                    <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                      No subscription plans yet. Add plans in Billing first.
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {teams.map((team) => (
                    <div
                      key={team.team}
                      className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      <p className="text-lg font-semibold text-foreground">{team.team}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Choose a section to post team content.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {OTHER_TYPES.map((type) => (
                          <Link key={`${team.team}-${type.value}`} href={`/exercise-library/${encodeURIComponent(team.team)}/others/${type.value}`}>
                            <Button size="sm" variant="outline">{type.label}</Button>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                  {!isLoadingTeams && teams.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                      No teams yet. Create one from Add team.
                    </div>
                  ) : null}
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>
      <Dialog open={modalOpen && contentMode === "audience" && activeTab === "age"} onOpenChange={setModalOpen}>
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
      <Dialog open={otherLockModalOpen && contentMode === "audience" && activeTab === "others"} onOpenChange={setOtherLockModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lock plans for {otherLockForm.label || "section"}</DialogTitle>
            <DialogDescription>
              Check each plan that should be locked for this section.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              {plans.map((plan) => {
                const checked = otherLockForm.lockedPlanNames.includes(plan.name);
                return (
                  <label key={plan.id} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        const nextLockedPlans = event.target.checked
                          ? [...otherLockForm.lockedPlanNames, plan.name]
                          : otherLockForm.lockedPlanNames.filter((value) => value !== plan.name);
                        setOtherLockForm((current) => ({ ...current, lockedPlanNames: nextLockedPlans }));
                      }}
                    />
                    <span className="text-sm font-medium text-foreground">{plan.name}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOtherLockModalOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={isUpdatingOtherLocks || !otherLockForm.type}
                onClick={() => void saveOtherTypeLocks(otherLockForm.type, otherLockForm.lockedPlanNames)}
              >
                {isUpdatingOtherLocks ? "Saving..." : "Save locks"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
