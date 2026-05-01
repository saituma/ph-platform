"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, Dumbbell, ExternalLink, Plus, User, X } from "lucide-react";

import { AdminShell } from "../../../../../components/admin/shell";
import { Badge } from "../../../../../components/ui/badge";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent } from "../../../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../../../components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "../../../../../components/ui/select";
import {
  useGetProgramsQuery,
  useAssignProgramToAthleteMutation,
  useUnassignProgramMutation,
  useGetAdultAthletesQuery,
} from "../../../../../lib/apiSlice";

type TeamMember = {
  athleteId: number;
  athleteName: string | null;
  age: number | null;
  currentProgramTier: string | null;
  sessionsCompleted: number;
  modulesCompleted: number;
};

type TeamDetail = {
  team: string;
  athleteType: string;
  summary: { memberCount: number };
  members: TeamMember[];
};

export default function AdultTeamMembersPage() {
  const params = useParams<{ teamName: string }>();
  const teamName = decodeURIComponent(String(params.teamName ?? ""));

  const [teamDetail, setTeamDetail] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: athletesData, refetch: refetchAthletes } = useGetAdultAthletesQuery();
  const { data: programsData } = useGetProgramsQuery();
  const [assignProgram, { isLoading: isAssigning }] = useAssignProgramToAthleteMutation();
  const [unassign, { isLoading: isUnassigning }] = useUnassignProgramMutation();

  const [assignDialog, setAssignDialog] = useState<{ athleteId: number; athleteName: string } | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState("");

  useEffect(() => {
    if (!teamName) return;
    setLoading(true);
    fetch(`/api/backend/admin/teams/${encodeURIComponent(teamName)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setTeamDetail(data))
      .catch((e) => setError(e?.message ?? "Failed to load team."))
      .finally(() => setLoading(false));
  }, [teamName]);

  const athleteAssignments = useMemo(() => {
    const map = new Map<number, any[]>();
    for (const a of athletesData?.athletes ?? []) {
      map.set(a.id, a.assignments ?? []);
    }
    return map;
  }, [athletesData]);

  const programs = programsData?.programs ?? [];
  const programItems = useMemo(
    () => [
      { label: "Select a program...", value: "" },
      ...programs.map((p: any) => ({ label: p.name, value: String(p.id) })),
    ],
    [programs],
  );

  const handleAssign = async () => {
    if (!assignDialog || !selectedProgramId) return;
    await assignProgram({ programId: Number(selectedProgramId), athleteId: assignDialog.athleteId }).unwrap();
    refetchAthletes();
    setAssignDialog(null);
    setSelectedProgramId("");
  };

  const handleUnassign = async (assignmentId: number) => {
    if (!window.confirm("Remove this program?")) return;
    await unassign({ assignmentId }).unwrap();
    refetchAthletes();
  };

  const members = teamDetail?.members ?? [];

  return (
    <AdminShell
      title={teamName}
      subtitle={
        <span className="flex items-center gap-2 text-xs">
          <Link href="/exercise-library?mode=team" className="text-muted-foreground hover:text-foreground">
            Teams
          </Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span>{teamName}</span>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span>Members</span>
        </span>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/exercise-library?mode=team">
            <Button variant="outline" size="sm">← Back to teams</Button>
          </Link>
          <Badge variant="outline" className="text-xs">Adult team</Badge>
          {!loading && (
            <span className="text-sm text-muted-foreground">
              {members.length} member{members.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {error ? (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-secondary/40" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <User className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="font-semibold text-foreground">No members yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Add athletes to this team first.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {members.map((member) => {
              const assignments = athleteAssignments.get(member.athleteId) ?? [];
              return (
                <Card key={member.athleteId} className="flex flex-col">
                  <CardContent className="flex flex-col gap-4 p-5">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {member.athleteName ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.age ? `Age ${member.age}` : "Age unknown"}
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-secondary/40 px-3 py-2 text-center">
                        <p className="text-lg font-bold text-foreground">{member.sessionsCompleted}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Sessions done</p>
                      </div>
                      <div className="rounded-xl bg-secondary/40 px-3 py-2 text-center">
                        <p className="text-lg font-bold text-foreground">{member.modulesCompleted}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Modules done</p>
                      </div>
                    </div>

                    {/* Assigned programs */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Programs</p>
                      {assignments.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No programs assigned</p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {assignments.map((a: any) => (
                            <Badge key={a.id} variant="secondary" className="gap-1 text-[10px]">
                              <Dumbbell className="h-2.5 w-2.5" />
                              {a.programName}
                              <button
                                type="button"
                                onClick={() => handleUnassign(a.id)}
                                disabled={isUnassigning}
                                className="ml-0.5 hover:text-destructive"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-auto flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => setAssignDialog({ athleteId: member.athleteId, athleteName: member.athleteName ?? "Athlete" })}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Assign
                      </Button>
                      <Link href={`/athletes/${member.athleteId}`} className="flex-1">
                        <Button variant="default" size="sm" className="w-full gap-1.5">
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open Profile
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={assignDialog !== null} onOpenChange={() => { setAssignDialog(null); setSelectedProgramId(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Program</DialogTitle>
            <DialogDescription>
              Choose a training program to assign to {assignDialog?.athleteName ?? "this athlete"}.
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
              <Button variant="outline" onClick={() => setAssignDialog(null)}>Cancel</Button>
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
