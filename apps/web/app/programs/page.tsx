"use client";

import { useMemo, useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { ProgramsDialogs, type ProgramsDialog } from "../../components/admin/programs/programs-dialogs";
import { ProgramsFilters } from "../../components/admin/programs/programs-filters";
import { ProgramsGrid } from "../../components/admin/programs/programs-grid";

const programs = [
  {
    name: "PHP Program",
    summary: "Core performance training",
    access: "Self-enroll",
  },
  {
    name: "PHP Plus",
    summary: "Structured + parent platform",
    access: "Coach assigned",
  },
  {
    name: "PHP Premium",
    summary: "Individualized high-touch",
    access: "Approval required",
  },
];

export default function ProgramsPage() {
  const isLoading = false;
  const [activeDialog, setActiveDialog] = useState<ProgramsDialog>(null);
  const [selectedProgram, setSelectedProgram] = useState<(typeof programs)[number] | null>(null);
  const [activeChip, setActiveChip] = useState<string>("All");
  const chips = ["All", "Program", "Plus", "Premium", "Templates"];

  const filteredPrograms = useMemo(() => {
    if (activeChip === "All") return programs;
    if (activeChip === "Templates") return programs;
    return programs.filter((program) => program.name.includes(activeChip));
  }, [activeChip]);

  return (
    <AdminShell
      title="Programs"
      subtitle="Templates, tiers, and assignments."
      actions={<Button onClick={() => setActiveDialog("create-template")}>Create Template</Button>}
    >
      <SectionHeader title="Program Tiers" description="Access rules and templates." />
      <ProgramsFilters chips={chips} onChipSelect={setActiveChip} />
      <ProgramsGrid
        programs={filteredPrograms}
        isLoading={isLoading}
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
      />
    </AdminShell>
  );
}
