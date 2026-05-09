"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { ProgramsDialogs, type ProgramsDialog } from "../../components/admin/programs/programs-dialogs";
import { ProgramsGrid } from "../../components/admin/programs/programs-grid";
import { useCreateProgramMutation, useGetProgramsQuery, useGetUsersQuery, useAssignProgramMutation, useUpdateProgramMutation, useDeleteProgramMutation } from "../../lib/apiSlice";
import { toast } from "@/lib/toast";

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
  type: string;
  minAge?: number | null;
  maxAge?: number | null;
};

export default function ProgramsPage() {
  return (
    <Suspense fallback={null}>
      <ProgramsPageInner />
    </Suspense>
  );
}

function ProgramsPageInner() {
  const searchParams = useSearchParams();
  const { data: programsData, isLoading: programsLoading } = useGetProgramsQuery();
  const [createProgram, { isLoading: isCreating }] = useCreateProgramMutation();
  const [updateProgram, { isLoading: isUpdating }] = useUpdateProgramMutation();
  const [assignProgram, { isLoading: isAssigning }] = useAssignProgramMutation();
  const [deleteProgram, { isLoading: isDeleting }] = useDeleteProgramMutation();
  const [activeDialog, setActiveDialog] = useState<ProgramsDialog>(null);
  const [selectedProgram, setSelectedProgram] = useState<GridProgram | null>(null);
  const [highlightedProgramId, setHighlightedProgramId] = useState<number | null>(null);
  const { data: usersData, isFetching: usersLoading } = useGetUsersQuery(undefined, {
    skip: activeDialog !== "assign",
  });

  const programs = useMemo<GridProgram[]>(
    () =>
      ((programsData?.programs ?? []) as ProgramRecord[]).map((program) => ({
        id: program.id,
        name: program.name,
        summary: program.description ?? "",
        type: program.type,
        minAge: program.minAge ?? null,
        maxAge: program.maxAge ?? null,
      })),
    [programsData]
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

  // Query params intentionally hydrate the dialog state after programs load.
  /* eslint-disable react-hooks/set-state-in-effect */
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

    const actionParam = (searchParams.get("action") ?? "").toLowerCase();
    if (actionParam === "assign") {
      setActiveDialog("assign");
      return;
    }
    setActiveDialog("manage");
  }, [searchParams, programs]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <AdminShell
      title="Programs"
      subtitle="Create and manage training programs."
      actions={<Button onClick={() => setActiveDialog("create")}>Create Program</Button>}
    >
      <SectionHeader title="All Programs" description="Click a program to manage its modules, sessions, and exercises." />
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
      <ProgramsDialogs
        active={activeDialog}
        onClose={() => setActiveDialog(null)}
        selectedProgram={selectedProgram}
        programs={programs}
        users={users}
        isSaving={isSaving}
        isDeleting={isDeleting}
        isLoadingUsers={usersLoading}
        onCreate={async (input) => {
          try {
            await createProgram(input).unwrap();
            toast.success("Program created");
          } catch {
            toast.error("Failed to create program");
          }
        }}
        onUpdate={async (input) => {
          try {
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
            toast.success("Program updated");
          } catch {
            toast.error("Failed to update program");
          }
        }}
        onDelete={async (programId) => {
          if (!window.confirm("Are you sure you want to delete this program?")) return;
          try {
            await deleteProgram(programId).unwrap();
            setSelectedProgram(null);
            toast.success("Program deleted");
          } catch {
            toast.error("Failed to delete program");
          }
        }}
        onAssign={async (input) => {
          try {
            await assignProgram(input).unwrap();
            toast.success("Program assigned");
          } catch {
            toast.error("Failed to assign program");
          }
        }}
      />
    </AdminShell>
  );
}
