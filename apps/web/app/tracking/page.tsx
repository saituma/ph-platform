"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Flag,
  MapPinned,
  Plus,
  RefreshCw,
  Route,
  Target,
  Trash2,
  Users,
} from "lucide-react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Badge } from "../../components/ui/badge";
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
import { Label } from "../../components/ui/label";
import { Skeleton } from "../../components/ui/skeleton";
import { Textarea } from "../../components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "../../components/ui/select";
import {
  useGetAdminRunTrackingQuery,
  useGetTrackingGoalsQuery,
  useCreateTrackingGoalMutation,
  useDeleteTrackingGoalMutation,
  useGetAdultAthletesQuery,
} from "../../lib/apiSlice";

function formatKm(meters?: number | null) {
  return `${((Number(meters ?? 0) || 0) / 1000).toFixed(1)} km`;
}

function formatDuration(seconds?: number | null) {
  const total = Math.max(0, Number(seconds ?? 0) || 0);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const UNIT_LABELS: Record<string, string> = {
  km: "km",
  sec: "seconds",
  min: "minutes",
  reps: "reps",
  custom: "custom",
};

const AUDIENCE_LABELS: Record<string, string> = {
  adult: "Adult Athletes",
  premium_team: "Premium Teams",
  all: "Everyone",
};

const emptyForm = {
  title: "",
  description: "",
  unit: "km",
  customUnit: "",
  targetValue: "",
  scope: "all",
  athleteId: "",
  audience: "adult",
  teamId: "",
  dueDate: "",
};

export default function TrackingPage() {
  const [tab, setTab] = useState<"tracking" | "goals">("tracking");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading, error, refetch } = useGetAdminRunTrackingQuery({ limit: 200 });
  const { data: goalsData, isLoading: goalsLoading } = useGetTrackingGoalsQuery();
  const { data: athletesData } = useGetAdultAthletesQuery();
  const [createGoal, { isLoading: isCreating }] = useCreateTrackingGoalMutation();
  const [deleteGoal] = useDeleteTrackingGoalMutation();

  const items = data?.items ?? [];
  const summary = data?.summary;
  const goals = goalsData?.goals ?? [];

  const athletes = athletesData?.athletes ?? [];

  const athleteItems = useMemo(() => [
    { label: "— All athletes —", value: "" },
    ...athletes.map((a: any) => ({ label: a.name ?? `Athlete ${a.id}`, value: String(a.id) })),
  ], [athletes]);

  const unitItems = [
    { label: "km", value: "km" },
    { label: "Seconds", value: "sec" },
    { label: "Minutes", value: "min" },
    { label: "Reps", value: "reps" },
    { label: "Custom", value: "custom" },
  ];
  const scopeItems = [
    { label: "All members", value: "all" },
    { label: "Individual athlete", value: "individual" },
  ];
  const audienceItems = [
    { label: "Adult Athletes", value: "adult" },
    { label: "Premium Teams", value: "premium_team" },
    { label: "Everyone", value: "all" },
  ];

  const handleCreate = async () => {
    if (!form.title.trim() || !form.targetValue) return;
    await createGoal({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      unit: form.unit as any,
      customUnit: form.unit === "custom" ? form.customUnit.trim() : undefined,
      targetValue: Number(form.targetValue),
      scope: form.scope as any,
      athleteId: form.scope === "individual" && form.athleteId ? Number(form.athleteId) : undefined,
      audience: form.audience as any,
      dueDate: form.dueDate || undefined,
    }).unwrap();
    setForm(emptyForm);
    setDialogOpen(false);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this goal?")) return;
    await deleteGoal({ id }).unwrap();
  };

  const field = (key: keyof typeof emptyForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <AdminShell
      title="Tracking"
      subtitle="Monitor athlete route logs and manage training goals."
      actions={
        tab === "tracking" ? (
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        ) : (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Goal
          </Button>
        )
      }
    >
      {/* Tab bar */}
      <div className="mb-6 flex items-center gap-1 rounded-xl border border-border bg-secondary/30 p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab("tracking")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === "tracking"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Route className="h-4 w-4" />
          Tracking
        </button>
        <button
          type="button"
          onClick={() => setTab("goals")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === "goals"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Target className="h-4 w-4" />
          Goals
        </button>
      </div>

      {/* Tracking tab */}
      {tab === "tracking" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <Activity className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{summary?.totalRuns ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Runs</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <Route className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{formatKm(summary?.totalMeters)}</p>
                  <p className="text-xs text-muted-foreground">Total distance</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <MapPinned className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{summary?.teamRunCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Team runs</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-semibold tabular-nums">{formatDuration(summary?.totalSeconds)}</p>
                <p className="text-xs text-muted-foreground">Total time</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="border-b border-border/80">
              <SectionHeader
                title="Route logs"
                description="Review athlete route history."
              />
            </CardHeader>
            <CardContent className="pt-6">
              {isLoading && (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              )}
              {error && (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  Could not load tracking logs.
                </p>
              )}
              {!isLoading && !error && items.length === 0 && (
                <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  No tracking logs yet.
                </p>
              )}
              {!isLoading && !error && items.length > 0 && (
                <div className="overflow-x-auto rounded-2xl border border-border/90">
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="bg-secondary/50 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Athlete</th>
                        <th className="px-4 py-3 font-medium">Team</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Distance</th>
                        <th className="px-4 py-3 font-medium">Duration</th>
                        <th className="px-4 py-3 font-medium">Effort</th>
                        <th className="px-4 py-3 font-medium">Route</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((row) => (
                        <tr key={row.id} className="border-t border-border/80">
                          <td className="px-4 py-3 font-medium">{row.athleteName ?? `User ${row.userId}`}</td>
                          <td className="px-4 py-3 text-muted-foreground">{row.teamName ?? "Solo adult"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(row.date)}</td>
                          <td className="px-4 py-3 tabular-nums">{formatKm(row.distanceMeters)}</td>
                          <td className="px-4 py-3 tabular-nums">{formatDuration(row.durationSeconds)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{row.effortLevel ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{row.coordinates ? "Available" : "No map"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Goals tab */}
      {tab === "goals" && (
        <div className="space-y-6">
          <SectionHeader
            title="Training Goals"
            description="Create goals for premium teams and adult athletes. Goals can target all members or individual athletes."
          />

          {goalsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40 w-full rounded-2xl" />
              ))}
            </div>
          ) : goals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <Target className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="font-semibold text-foreground">No goals yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Click "Create Goal" to set a target for your athletes.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {goals.map((goal: any) => (
                <Card key={goal.id} className="relative overflow-hidden">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <Flag className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground leading-tight">{goal.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">by {goal.coachName ?? "Coach"}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 shrink-0 p-0 text-destructive"
                        onClick={() => handleDelete(goal.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {goal.description && (
                      <p className="text-xs text-muted-foreground">{goal.description}</p>
                    )}

                    <div className="flex items-center gap-2 rounded-xl bg-secondary/50 px-3 py-2">
                      <Target className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm font-bold text-foreground">
                        {goal.targetValue} {goal.unit === "custom" ? (goal.customUnit || "units") : UNIT_LABELS[goal.unit] ?? goal.unit}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Users className="h-2.5 w-2.5" />
                        {AUDIENCE_LABELS[goal.audience] ?? goal.audience}
                      </Badge>
                      <Badge variant={goal.scope === "individual" ? "secondary" : "outline"} className="text-[10px]">
                        {goal.scope === "individual" ? (goal.athleteName ?? "Individual") : "All members"}
                      </Badge>
                      {goal.dueDate && (
                        <Badge variant="outline" className="text-[10px]">
                          Due {new Date(goal.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create goal dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setForm(emptyForm); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Goal</DialogTitle>
            <DialogDescription>
              Set a training goal for adult athletes or premium teams.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Goal title *</Label>
              <Input placeholder="e.g. Run 5 km this week" value={form.title} onChange={(e) => field("title", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea placeholder="Optional details..." value={form.description} onChange={(e) => field("description", e.target.value)} className="min-h-[60px]" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Unit</Label>
                <Select items={unitItems} value={form.unit} onValueChange={(v) => field("unit", v ?? "km")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectPopup>
                    {unitItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                  </SelectPopup>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Target value *</Label>
                <Input
                  type="number"
                  placeholder={form.unit === "km" ? "5" : form.unit === "sec" ? "30" : "10"}
                  value={form.targetValue}
                  onChange={(e) => field("targetValue", e.target.value)}
                />
              </div>
            </div>

            {form.unit === "custom" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Custom unit label</Label>
                <Input placeholder="e.g. jumps, push-ups" value={form.customUnit} onChange={(e) => field("customUnit", e.target.value)} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Audience</Label>
              <Select items={audienceItems} value={form.audience} onValueChange={(v) => field("audience", v ?? "adult")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectPopup>
                  {audienceItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectPopup>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Scope</Label>
              <Select items={scopeItems} value={form.scope} onValueChange={(v) => field("scope", v ?? "all")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectPopup>
                  {scopeItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectPopup>
              </Select>
            </div>

            {form.scope === "individual" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Athlete</Label>
                <Select items={athleteItems} value={form.athleteId} onValueChange={(v) => field("athleteId", v ?? "")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectPopup>
                    {athleteItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                  </SelectPopup>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Due date (optional)</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => field("dueDate", e.target.value)} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={isCreating || !form.title.trim() || !form.targetValue}>
                {isCreating ? "Creating..." : "Create Goal"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
