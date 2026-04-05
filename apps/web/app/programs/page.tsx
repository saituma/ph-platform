"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { ProgramsDialogs, type ProgramsDialog } from "../../components/admin/programs/programs-dialogs";
import { ProgramsFilters } from "../../components/admin/programs/programs-filters";
import { ProgramsGrid } from "../../components/admin/programs/programs-grid";
import { useCreateProgramMutation, useGetProgramsQuery, useGetUsersQuery, useAssignProgramMutation, useUpdateProgramMutation } from "../../lib/apiSlice";

type ProgramRecord = {
  id: number;
  name: string;
  type: string;
  description?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
};

type GridProgram = {
  id: number;
  name: string;
  summary?: string | null;
  access: string;
  type: string;
  minAge?: number | null;
  maxAge?: number | null;
};

const accessLabel = (type: string) => {
  if (type === "PHP_Pro") return "Elite access";
  if (type === "PHP_Premium_Plus") return "Semi-private access";
  if (type === "PHP_Premium") return "Premium access";
  return "Self-enroll";
};

export default function ProgramsPage() {
  const searchParams = useSearchParams();
  const { data: programsData, isLoading: programsLoading } = useGetProgramsQuery();
  const { data: usersData } = useGetUsersQuery();
  const [createProgram, { isLoading: isCreating }] = useCreateProgramMutation();
  const [updateProgram, { isLoading: isUpdating }] = useUpdateProgramMutation();
  const [assignProgram, { isLoading: isAssigning }] = useAssignProgramMutation();
  const [activeDialog, setActiveDialog] = useState<ProgramsDialog>(null);
  const [selectedProgram, setSelectedProgram] = useState<GridProgram | null>(null);
  const [highlightedProgramId, setHighlightedProgramId] = useState<number | null>(null);
  const [activeChip, setActiveChip] = useState<string>("All");
  const chips = ["All", "Program", "Premium", "Premium Plus", "Pro", "Templates"];

  const filteredPrograms = useMemo(() => {
    const source = (programsData?.programs ?? []) as ProgramRecord[];
    if (activeChip === "All") return source;
    if (activeChip === "Templates") return source;
    if (activeChip === "Premium") return source.filter((program) => program.type === "PHP_Premium");
    if (activeChip === "Premium Plus") return source.filter((program) => program.type === "PHP_Premium_Plus");
    if (activeChip === "Pro") return source.filter((program) => program.type === "PHP_Pro");
    if (activeChip === "Program") return source.filter((program) => program.type === "PHP");
    return source;
  }, [activeChip, programsData]);

  const programs = useMemo<GridProgram[]>(
    () =>
      filteredPrograms.map((program) => ({
        id: program.id,
        name: program.name,
        summary: program.description ?? "",
        access: accessLabel(program.type),
        type: program.type,
        minAge: program.minAge ?? null,
        maxAge: program.maxAge ?? null,
      })),
    [filteredPrograms]
  );

  const users = useMemo(
    () =>
      (usersData?.users ?? []).map((user) => ({
        id: user.id,
        name: user.name ?? user.email,
        email: user.email,
        athleteId: user.athleteId ?? null,
      })),
    [usersData]
  );
  const isSaving = isCreating || isUpdating || isAssigning;

  useEffect(() => {
    const programIdParam = Number(searchParams.get("programId"));
    if (!Number.isFinite(programIdParam) || programIdParam <= 0) {
      setHighlightedProgramId(null);
      return;
    }

    const target = programs.find((program) => program.id === programIdParam);
    if (!target) return;

    setHighlightedProgramId(programIdParam);
    setSelectedProgram(target);

    if (target.type === "PHP_Pro") setActiveChip("Pro");
    else if (target.type === "PHP_Premium_Plus") setActiveChip("Premium Plus");
    else if (target.type === "PHP_Premium") setActiveChip("Premium");
    else if (target.type === "PHP") setActiveChip("Program");
    else setActiveChip("All");

    const actionParam = (searchParams.get("action") ?? "").toLowerCase();
    if (actionParam === "assign") {
      setActiveDialog("assign");
      return;
    }
    setActiveDialog("manage");
  }, [searchParams, programs]);

  return (
    <AdminShell
      title="Programs"
      subtitle="Templates, tiers, and assignments."
      actions={<Button onClick={() => setActiveDialog("create-template")}>Create Template</Button>}
    >
      <SectionHeader title="Program Tiers" description="Access rules and templates." />
      <ProgramsFilters chips={chips} onChipSelect={setActiveChip} />
      <ProgramsGrid
        programs={programs}
        isLoading={programsLoading}
        highlightedProgramId={highlightedProgramId}
        onManage={(program) => {
          setSelectedProgram(program);
          setActiveDialog("manage");
        }}
        onAssign={(program) => {
          setSelectedProgram(program);
          setActiveDialog("assign");
        }}
      />
      <Card className="mt-6">
        <CardHeader>
          <SectionHeader title="Template Workflow" />
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm">
            <p className="font-semibold text-foreground">Week Structure</p>
            <p className="text-xs text-muted-foreground">
              Define weekly sessions and focus areas.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm">
            <p className="font-semibold text-foreground">Exercise Blocks</p>
            <p className="text-xs text-muted-foreground">
              Attach exercises, cues, and video references.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm">
            <p className="font-semibold text-foreground">Assign to Users</p>
            <p className="text-xs text-muted-foreground">
              Push updates to approved athletes.
            </p>
          </div>
        </CardContent>
      </Card>

      <ProgramsDialogs
        active={activeDialog}
        onClose={() => setActiveDialog(null)}
        selectedProgram={selectedProgram}
        programs={programs}
        users={users}
        isSaving={isSaving}
        onCreate={async (input) => {
          await createProgram(input).unwrap();
        }}
        onUpdate={async (input) => {
          await updateProgram({
            programId: input.programId,
            data: {
              name: input.name,
              type: input.type,
              description: input.description ?? null,
              minAge: input.minAge ?? null,
              maxAge: input.maxAge ?? null,
            },
          }).unwrap();
        }}
        onAssign={async (input) => {
          await assignProgram(input).unwrap();
        }}
      />
    </AdminShell>
  );
}
