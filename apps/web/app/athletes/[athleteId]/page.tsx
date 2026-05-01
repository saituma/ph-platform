"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, Dumbbell, Play, Plus, Trophy, User, Video, X } from "lucide-react";

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
} from "../../../lib/apiSlice";

export default function AthleteDetailPage() {
  const params = useParams();
  const athleteId = Number(params?.athleteId);

  const { data, isLoading } = useGetAthleteDetailQuery(
    { athleteId },
    { skip: !Number.isFinite(athleteId) || athleteId <= 0 },
  );
  const { data: programsData } = useGetProgramsQuery();
  const [assignProgram, { isLoading: isAssigning }] = useAssignProgramToAthleteMutation();
  const [unassign, { isLoading: isUnassigning }] = useUnassignProgramMutation();

  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState("");

  const athlete = data?.athlete ?? null;
  const programs = programsData?.programs ?? [];

  const programItems = useMemo(
    () => [
      { label: "Select a program...", value: "" },
      ...programs.map((p: any) => ({ label: p.name, value: String(p.id) })),
    ],
    [programs],
  );

  const handleAssign = async () => {
    if (!selectedProgramId || !athlete) return;
    await assignProgram({ programId: Number(selectedProgramId), athleteId: athlete.id }).unwrap();
    setAssignOpen(false);
    setSelectedProgramId("");
  };

  const handleUnassign = async (assignmentId: number) => {
    if (!window.confirm("Remove this program from the athlete?")) return;
    await unassign({ assignmentId }).unwrap();
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
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
                >
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
      </div>

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
