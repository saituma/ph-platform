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

const accessLabel = (type: string) => {
  if (type === "PHP_Premium") return "Approval required";
  if (type === "PHP_Plus") return "Coach assigned";
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
  const [selectedProgram, setSelectedProgram] = useState<any | null>(null);
  const [highlightedProgramId, setHighlightedProgramId] = useState<number | null>(null);
  const [activeChip, setActiveChip] = useState<string>("All");
  const chips = ["All", "Program", "Plus", "Premium", "Templates"];

  const filteredPrograms = useMemo(() => {
    const source = programsData?.programs ?? [];
    if (activeChip === "All") return source;
    if (activeChip === "Templates") return source;
    if (activeChip === "Premium") return source.filter((program: any) => program.type === "PHP_Premium");
    if (activeChip === "Plus") return source.filter((program: any) => program.type === "PHP_Plus");
    if (activeChip === "Program") return source.filter((program: any) => program.type === "PHP");
    return source;
  }, [activeChip, programsData]);

  const programs = useMemo(
    () =>
      filteredPrograms.map((program: any) => ({
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

  const users = useMemo(() => usersData?.users ?? [], [usersData]);
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

    if (target.type === "PHP_Premium") setActiveChip("Premium");
    else if (target.type === "PHP_Plus") setActiveChip("Plus");
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
