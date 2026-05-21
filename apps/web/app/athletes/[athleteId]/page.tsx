"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Calendar, CheckCircle2, ChevronRight, Clock, Dumbbell, Footprints, Play, Plus, Trophy, User, Utensils, Video, X, XCircle } from "lucide-react";

import { AdminShell } from "../../../components/admin/shell";
import { SectionHeader } from "../../../components/admin/section-header";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "../../../components/ui/select";
import {
  useGetAthleteDetailQuery,
  useGetProgramsQuery,
  useAssignProgramToAthleteMutation,
  useUnassignProgramMutation,
  useUpdateProgramAssignmentMutation,
} from "../../../lib/apiSlice";
import { SleepLogsSection } from "../../../components/admin/SleepLogsSection";

export default function AthleteDetailPage() {
  const params = useParams();
  const athleteId = Number(params?.athleteId);

  const { data, isLoading, refetch } = useGetAthleteDetailQuery(
    { athleteId },
    { skip: !Number.isFinite(athleteId) || athleteId <= 0 },
  );
  const { data: programsData } = useGetProgramsQuery();
  const [assignProgram, { isLoading: isAssigning }] = useAssignProgramToAthleteMutation();
  const [unassign, { isLoading: isUnassigning }] = useUnassignProgramMutation();
  const [updateAssignment] = useUpdateProgramAssignmentMutation();

  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const athlete = data?.athlete ?? null;
  const programs = programsData?.programs ?? [];

  const programItems = useMemo(
    () => [
      { label: "Select a program...", value: "" },
      ...programs.map((p: any) => ({ label: p.name, value: String(p.id) })),
    ],
    [programs],
  );

  const athleteSessionVideoGroups = (() => {
    const items = Array.isArray(athlete?.videoUploads) ? athlete.videoUploads : [];
    const groups = new Map<string, { key: string; label: string; uploads: number; awaiting: number; latestAt?: string | null }>();
    for (const item of items) {
      const label = item?.sessionTitle ?? "Session Uploads";
      const type = "program";
      const key = `${type}::${label}`;
      const existing = groups.get(key);
      const reviewed = Boolean(item?.reviewedAt);
      const createdAt = item?.createdAt ?? null;
      if (!existing) {
        groups.set(key, {
          key,
          label,
          uploads: 1,
          awaiting: reviewed ? 0 : 1,
          latestAt: createdAt,
        });
      } else {
        existing.uploads += 1;
        existing.awaiting += reviewed ? 0 : 1;
        if (createdAt && (!existing.latestAt || createdAt > existing.latestAt)) {
          existing.latestAt = createdAt;
        }
      }
    }
    return Array.from(groups.values()).sort((a, b) => {
      if (a.awaiting !== b.awaiting) return b.awaiting - a.awaiting;
      return (
        (b.latestAt ? new Date(b.latestAt).getTime() : 0) -
        (a.latestAt ? new Date(a.latestAt).getTime() : 0)
      );
    });
  })();

  const handleAssign = async () => {
    if (!selectedProgramId || !athlete) return;
    await assignProgram({ programId: Number(selectedProgramId), athleteId: athlete.id }).unwrap();
    await refetch();
    setAssignOpen(false);
    setSelectedProgramId("");
  };

  const handleUnassign = async (assignmentId: number) => {
    if (!window.confirm("Remove this program from the athlete?")) return;
    await unassign({ assignmentId }).unwrap();
    await refetch();
  };

  if (isLoading) {
    return (
      <AdminShell title="Athlete" subtitle="Loading...">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-secondary/40" />
          ))}
        </div>
      </AdminShell>
    );
  }

  if (!athlete) {
    return (
      <AdminShell title="Athlete not found" subtitle="">
        <p className="text-sm text-muted-foreground">This athlete could not be found.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={athlete.name ?? "Athlete"}
      subtitle={
        <span className="flex items-center gap-2 text-xs">
          <Link href="/exercise-library?mode=adult" className="text-muted-foreground hover:text-foreground">
            Adult Athletes
          </Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span>{athlete.name ?? "Athlete"}</span>
        </span>
      }
      actions={
        <Button onClick={() => setAssignOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Assign Program
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Stats row */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Age</p>
                <p className="text-2xl font-bold text-foreground">{athlete.age ?? "—"}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Sessions Done</p>
                <p className="text-2xl font-bold text-foreground">{athlete.sessionCompletionCount ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                <Video className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Video Responses</p>
                <p className="text-2xl font-bold text-foreground">{(athlete.videoUploads ?? []).length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Nutrition Onboarding */}
        <div className="space-y-3">
          <SectionHeader
            title="Nutrition Onboarding"
            description="Athlete nutrition profile for admin, coach, and team manager review."
          />
          {!athlete.nutritionOnboarding ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              <Utensils className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="font-semibold text-foreground">Not completed yet</p>
              <p className="mt-1">This athlete has not submitted nutrition onboarding.</p>
            </div>
          ) : (
            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-background p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Primary Goal</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {athlete.nutritionOnboarding.primaryGoal || "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Meals / Day</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {athlete.nutritionOnboarding.mealsPerDay ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Hydration L / Day</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {athlete.nutritionOnboarding.hydrationLitersPerDay ?? "—"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-background p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Allergies</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                      {athlete.nutritionOnboarding.allergies || "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Dietary Requirements</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                      {athlete.nutritionOnboarding.dietaryRequirements || "—"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">General Nutrition Habits</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                    {athlete.nutritionOnboarding.generalNutritionHabits || "—"}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-background p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Supplements</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                      {athlete.nutritionOnboarding.supplements || "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Medical Notes</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                      {athlete.nutritionOnboarding.medicalNotes || "—"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Additional Context</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                    {athlete.nutritionOnboarding.additionalContext || "—"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Assigned Programs */}
        <div className="space-y-3">
          <SectionHeader
            title="Assigned Programs"
            description={`${(athlete.assignments ?? []).length} program${(athlete.assignments ?? []).length !== 1 ? "s" : ""} assigned.`}
          />
          {(athlete.assignments ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              <Dumbbell className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="font-semibold text-foreground">No programs yet</p>
              <p className="mt-1">Click "Assign Program" to add one.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(athlete.assignments ?? []).map((a: any) => (
                <div
                  key={a.id}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Dumbbell className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{a.programName}</p>
                      <div className="mt-1 flex gap-2">
                        {a.status && (
                          <Badge variant={a.status === "active" ? "default" : "secondary"} className="text-[10px]">
                            {a.status}
                          </Badge>
                        )}
                        {a.programType && (
                          <Badge variant="outline" className="text-[10px]">{a.programType}</Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 shrink-0 p-0 text-destructive"
                      onClick={() => handleUnassign(a.id)}
                      disabled={isUnassigning}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Scheduled:</span>
                    <input
                      type="date"
                      className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                      value={a.scheduledDate ? new Date(a.scheduledDate).toISOString().split("T")[0] : ""}
                      onChange={(e) => {
                        updateAssignment({
                          assignmentId: a.id,
                          scheduledDate: e.target.value ? new Date(e.target.value).toISOString() : null,
                        });
                      }}
                    />
                    {a.scheduledDate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-xs text-muted-foreground"
                        onClick={() => updateAssignment({ assignmentId: a.id, scheduledDate: null })}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Uploaded Video Sessions */}
        <div className="space-y-3">
          <SectionHeader
            title="Uploaded Video Sessions"
            description={`${athleteSessionVideoGroups.length} session${athleteSessionVideoGroups.length !== 1 ? "s" : ""} with uploads.`}
          />
          {athleteSessionVideoGroups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              <Video className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="font-semibold text-foreground">No uploaded sessions yet</p>
              <p className="mt-1">When this athlete uploads session videos, they will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {athleteSessionVideoGroups.map((session) => (
                <Link
                  key={session.key}
                  href={`/athletes/${athlete.id}/videos/${encodeURIComponent(session.key)}`}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{session.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {session.uploads} upload{session.uploads !== 1 ? "s" : ""} ·{" "}
                      {session.latestAt ? new Date(session.latestAt).toLocaleString() : "Unknown"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.awaiting > 0 ? (
                      <Badge variant="secondary">{session.awaiting} awaiting</Badge>
                    ) : (
                      <Badge>Reviewed</Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Video Responses */}
        {(athlete.videoUploads ?? []).length > 0 && (
          <div className="space-y-3">
            <SectionHeader
              title="Video Responses"
              description="Videos submitted by this athlete."
            />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(athlete.videoUploads ?? []).map((v: any) => (
                <div key={v.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="relative aspect-video bg-secondary/40 flex items-center justify-center">
                    <video
                      src={v.videoUrl}
                      className="absolute inset-0 w-full h-full object-cover"
                      preload="none"
                    />
                    <a
                      href={v.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                    >
                      <Play className="h-4 w-4 fill-current" />
                    </a>
                  </div>
                  <div className="p-3">
                    {v.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{v.notes}</p>
                    )}
                    {v.feedback ? (
                      <div className="mt-2 rounded-lg bg-primary/5 border border-primary/10 p-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-primary mb-0.5">Coach feedback</p>
                        <p className="text-xs text-foreground">{v.feedback}</p>
                      </div>
                    ) : (
                      <p className="mt-1 text-[10px] text-muted-foreground italic">No coach feedback yet</p>
                    )}
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Run Attendance */}
        {(() => {
          const runs: any[] = athlete.runAttendance ?? [];
          if (runs.length === 0) return null;
          const completed = runs.filter((r) => r.status === "completed").length;
          const missed = runs.filter((r) => r.status === "missed").length;
          const due = runs.filter((r) => r.status === "due").length;
          return (
            <div className="space-y-3">
              <SectionHeader
                title="Run Attendance"
                description={`${runs.length} scheduled run${runs.length !== 1 ? "s" : ""} · ${completed} completed · ${missed} missed · ${due} due`}
              />

              {/* Summary pills */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {completed} Completed
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
                  <XCircle className="h-3.5 w-3.5" /> {missed} Missed
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/15 px-3 py-1 text-xs font-semibold text-orange-600">
                  <Clock className="h-3.5 w-3.5" /> {due} Due
                </span>
              </div>

              <div className="space-y-2">
                {runs.map((run: any) => {
                  const rc = run.runConfig as any;
                  const isCompleted = run.status === "completed";
                  const isMissed = run.status === "missed";
                  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|heic|heif)(\?|$)/i.test(url);
                  return (
                    <div
                      key={run.sessionExerciseId}
                      className={`rounded-2xl border bg-card p-4 transition-all ${
                        isCompleted ? "border-emerald-500/30" : isMissed ? "border-destructive/30" : "border-orange-500/30"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Status icon */}
                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                          isCompleted ? "bg-emerald-500/15" : isMissed ? "bg-destructive/10" : "bg-orange-500/15"
                        }`}>
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : isMissed ? (
                            <XCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <Clock className="h-4 w-4 text-orange-600" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-bold uppercase tracking-wide ${
                              isCompleted ? "text-emerald-600" : isMissed ? "text-destructive" : "text-orange-600"
                            }`}>
                              {run.status.toUpperCase()}
                            </span>
                            <span className="text-sm font-semibold text-foreground truncate">
                              {run.exerciseName}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {run.sessionTitle ?? `Week ${run.weekNumber} · Session ${run.sessionNumber}`}
                            {run.completedAt && ` · ${new Date(run.completedAt).toLocaleDateString()}`}
                          </p>

                          {/* Run config pills */}
                          {rc && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {rc.runType && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                  <Footprints className="h-2.5 w-2.5" />
                                  {rc.runType.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                </span>
                              )}
                              {rc.distanceMeters && (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                  {rc.distanceMeters >= 1000 ? `${(rc.distanceMeters / 1000).toFixed(1)} km` : `${rc.distanceMeters} m`}
                                </span>
                              )}
                              {rc.surface && (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground capitalize">
                                  {rc.surface}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Upload preview */}
                        {run.upload?.url && (
                          <button
                            onClick={() => setPreviewUrl(run.upload.url)}
                            className="shrink-0 overflow-hidden rounded-xl border border-border w-16 h-16 bg-secondary/40 hover:border-primary/40 transition relative group"
                            title="View run photo"
                          >
                            {isImage(run.upload.url) ? (
                              <img
                                src={run.upload.url}
                                alt="Run photo"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <video
                                src={run.upload.url}
                                className="w-full h-full object-cover"
                                preload="none"
                              />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition">
                              <Play className="h-4 w-4 text-white fill-current" />
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Sleep Tracking */}
        {athlete?.userId && (
          <SleepLogsSection userId={athlete.userId} />
        )}
      </div>

      {/* Inline photo/video preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Run Media</DialogTitle>
            <DialogDescription>Athlete run photo or video</DialogDescription>
          </DialogHeader>
          {previewUrl && /\.(jpg|jpeg|png|gif|webp|heic|heif)(\?|$)/i.test(previewUrl) ? (
            <img src={previewUrl} alt="Run media" className="w-full max-h-[80vh] object-contain bg-black" />
          ) : previewUrl ? (
            <video src={previewUrl} controls autoPlay playsInline className="w-full max-h-[80vh] bg-black" />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Program</DialogTitle>
            <DialogDescription>
              Choose a training program to assign to {athlete.name ?? "this athlete"}.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <Select
              items={programItems}
              value={selectedProgramId}
              onValueChange={(v) => setSelectedProgramId(v ?? "")}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectPopup>
                {programItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
              <Button onClick={handleAssign} disabled={!selectedProgramId || isAssigning}>
                {isAssigning ? "Assigning..." : "Assign"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
