"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, User, BookOpen, CheckCircle2, Circle } from "lucide-react";

import { AdminShell } from "../../../../../components/admin/shell";
import { Badge } from "../../../../../components/ui/badge";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent } from "../../../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../../../../components/ui/dialog";

type TeamMember = {
  athleteId: number;
  athleteName: string | null;
  age: number | null;
  athleteType?: string | null;
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

type TrainingModule = {
  id: number;
  title: string;
  sessions: { id: number; title: string; completed: boolean }[];
};

type AthleteTraining = {
  age: number | null;
  athleteType: string | null;
  modules: TrainingModule[];
};

export default function TeamMembersPage() {
  const params = useParams<{ teamName: string }>();
  const teamName = decodeURIComponent(String(params.teamName ?? ""));

  const [teamDetail, setTeamDetail] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [trainingDialog, setTrainingDialog] = useState<{ member: TeamMember } | null>(null);
  const [training, setTraining] = useState<AthleteTraining | null>(null);
  const [trainingLoading, setTrainingLoading] = useState(false);

  useEffect(() => {
    if (!teamName) return;
    setLoading(true);
    fetch(`/api/backend/admin/teams/${encodeURIComponent(teamName)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setTeamDetail(data))
      .catch((e) => setError(e?.message ?? "Failed to load team."))
      .finally(() => setLoading(false));
  }, [teamName]);

  const openTraining = async (member: TeamMember) => {
    setTrainingDialog({ member });
    setTraining(null);
    setTrainingLoading(true);
    try {
      const r = await fetch(
        `/api/backend/training-content-v2/admin/athletes/${member.athleteId}/training`,
        { credentials: "include" },
      );
      const data = await r.json();
      setTraining(data);
    } catch {
      setTraining({ age: member.age, athleteType: null, modules: [] });
    } finally {
      setTrainingLoading(false);
    }
  };

  const members = teamDetail?.members ?? [];
  const isYouthTeam = teamDetail?.athleteType === "youth" || members.some((m) => m.athleteType === "youth" || (m.age ?? 99) < 18);

  return (
    <AdminShell
      title={teamName}
      subtitle={
        <span className="flex items-center gap-2 text-xs">
          <Link href="/exercise-library?mode=team" className="text-muted-foreground hover:text-foreground">Teams</Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <Link href={`/exercise-library/teams/${encodeURIComponent(teamName)}`} className="text-muted-foreground hover:text-foreground">{teamName}</Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span>Members</span>
        </span>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/exercise-library/teams/${encodeURIComponent(teamName)}`}>
            <Button variant="outline" size="sm">← Back to modules</Button>
          </Link>
          <Badge variant="outline" className="text-xs">
            {isYouthTeam ? "Youth team" : "Adult team"}
          </Badge>
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
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-secondary/40" />
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
            {members.map((member) => (
              <Card
                key={member.athleteId}
                className="flex flex-col cursor-pointer transition hover:shadow-md hover:border-primary/40"
                onClick={() => openTraining(member)}
              >
                <CardContent className="flex flex-col gap-4 p-5">
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
                        {member.currentProgramTier ? ` · ${member.currentProgramTier}` : ""}
                      </p>
                    </div>
                  </div>

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

                  <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                    <BookOpen className="h-3.5 w-3.5" />
                    View training content
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Training content dialog */}
      <Dialog open={trainingDialog !== null} onOpenChange={() => { setTrainingDialog(null); setTraining(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{trainingDialog?.member.athleteName ?? "Athlete"}</DialogTitle>
            <DialogDescription>
              {trainingDialog?.member.age ? `Age ${trainingDialog.member.age} · ` : ""}
              Age-matched training content
            </DialogDescription>
          </DialogHeader>

          {trainingLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary/40" />
              ))}
            </div>
          ) : !training || training.modules.length === 0 ? (
            <div className="py-8 text-center">
              <BookOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-semibold text-foreground">No training content</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {trainingDialog?.member.age
                  ? `No modules tagged for age ${trainingDialog.member.age} yet.`
                  : "Athlete has no age set."}
              </p>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {training.modules.map((module) => {
                const completedCount = module.sessions.filter((s) => s.completed).length;
                return (
                  <div key={module.id} className="rounded-xl border border-border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">{module.title}</p>
                      <span className="text-xs text-muted-foreground">
                        {completedCount}/{module.sessions.length} sessions
                      </span>
                    </div>
                    {module.sessions.length > 0 && (
                      <div className="space-y-1">
                        {module.sessions.map((session) => (
                          <div key={session.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                            {session.completed
                              ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                              : <Circle className="h-3.5 w-3.5 shrink-0" />}
                            {session.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
