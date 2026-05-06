"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select, SelectTrigger, SelectValue, SelectPopup, SelectItem } from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { useEffect, useState } from "react";

export type ProgramsDialog = null | "create" | "manage" | "assign";

type ProgramsDialogsProps = {
  active: ProgramsDialog;
  onClose: () => void;
  selectedProgram?: {
    id: number;
    name: string;
    summary?: string | null;
    type: string;
    minAge?: number | null;
    maxAge?: number | null;
  } | null;
  programs: { id: number; name: string; type: string }[];
  users: { id: number; name: string; email: string; athleteId?: number | null }[];
  onCreate: (input: {
    name: string;
    type: string;
    description?: string;
    minAge?: number | null;
    maxAge?: number | null;
  }) => Promise<void>;
  onUpdate: (input: {
    programId: number;
    name: string;
    type: string;
    description?: string | null;
    minAge?: number | null;
    maxAge?: number | null;
  }) => Promise<void>;
  onDelete: (programId: number) => Promise<void>;
  onAssign: (input: { athleteId: number; programType: string; programTemplateId: number }) => Promise<void>;
  isSaving?: boolean;
  isDeleting?: boolean;
  isLoadingUsers?: boolean;
};

export function ProgramsDialogs({
  active,
  onClose,
  selectedProgram,
  programs,
  users,
  onCreate,
  onUpdate,
  onDelete,
  onAssign,
  isSaving = false,
  isDeleting = false,
  isLoadingUsers = false,
}: ProgramsDialogsProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [programType, setProgramType] = useState("PHP");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [athleteId, setAthleteId] = useState("");
  const [templateId, setTemplateId] = useState("");

  // Dialog switches intentionally hydrate local form state from the selected record.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (active === "create") {
      setName("");
      setDescription("");
      setProgramType("PHP");
      setMinAge("");
      setMaxAge("");
      return;
    }
    if (active === "manage" && selectedProgram) {
      setName(selectedProgram.name ?? "");
      setDescription(selectedProgram.summary ?? "");
      setProgramType(selectedProgram.type ?? "PHP");
      setMinAge(selectedProgram.minAge != null ? String(selectedProgram.minAge) : "");
      setMaxAge(selectedProgram.maxAge != null ? String(selectedProgram.maxAge) : "");
      return;
    }
    if (active === "assign") {
      setAthleteId("");
      setTemplateId(selectedProgram?.id ? String(selectedProgram.id) : "");
    }
  }, [active, selectedProgram]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <Dialog open={active !== null} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {active === "create" && "Create Program"}
            {active === "manage" && `Manage ${selectedProgram?.name ?? "Program"}`}
            {active === "assign" && `Assign ${selectedProgram?.name ?? "Program"}`}
          </DialogTitle>
          <DialogDescription>
            {active === "create" && "Create a new training program."}
            {active === "manage" && "Edit program details."}
            {active === "assign" && "Assign this program to an athlete."}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 space-y-4">
          {active === "create" ? (
            <>
              <Input placeholder="Program title" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button
                  disabled={isSaving || !name.trim()}
                  onClick={async () => {
                    await onCreate({
                      name: name.trim(),
                      type: "PHP",
                    });
                    onClose();
                  }}
                >
                  Create
                </Button>
              </div>
            </>
          ) : null}
          {active === "manage" && selectedProgram ? (
            <>
              <Input placeholder="Program name" value={name} onChange={(e) => setName(e.target.value)} />
              <Select value={programType} onValueChange={(v) => setProgramType(v ?? "PHP")}>
                <SelectTrigger><SelectValue placeholder="Select program type" /></SelectTrigger>
                <SelectPopup>
                  <SelectItem value="PHP">PHP</SelectItem>
                  <SelectItem value="PHP_Premium">PHP Premium</SelectItem>
                  <SelectItem value="PHP_Premium_Plus">PHP Premium Plus</SelectItem>
                  <SelectItem value="PHP_Pro">PHP Pro</SelectItem>
                </SelectPopup>
              </Select>
              <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" placeholder="Min age (optional)" value={minAge} onChange={(e) => setMinAge(e.target.value)} />
                <Input type="number" placeholder="Max age (optional)" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="destructive"
                  disabled={isDeleting || isSaving}
                  onClick={async () => {
                    if (!confirm(`Delete "${selectedProgram.name}"? This will remove all modules, sessions, exercises, and assignments.`)) return;
                    await onDelete(selectedProgram.id);
                    onClose();
                  }}
                >
                  {isDeleting ? "Deleting…" : "Delete"}
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose}>Cancel</Button>
                  <Button
                    disabled={isSaving}
                    onClick={async () => {
                      await onUpdate({
                        programId: selectedProgram.id,
                        name: (name || selectedProgram.name).trim(),
                        type: programType,
                        description: description.trim() || null,
                        minAge: minAge ? Number(minAge) : null,
                        maxAge: maxAge ? Number(maxAge) : null,
                      });
                      onClose();
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </>
          ) : null}
          {active === "assign" && selectedProgram ? (
            <>
              <Select value={athleteId} onValueChange={(v) => setAthleteId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Select athlete" /></SelectTrigger>
                <SelectPopup>
                  {isLoadingUsers ? (
                    <SelectItem value="loading" disabled>
                      Loading athletes...
                    </SelectItem>
                  ) : (
                    users
                      .filter((user) => user.athleteId)
                      .map((user) => (
                        <SelectItem key={user.id} value={String(user.athleteId)}>
                          {user.name || user.email}
                        </SelectItem>
                      ))
                  )}
                </SelectPopup>
              </Select>
              <Select value={templateId} onValueChange={(v) => setTemplateId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                <SelectPopup>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={String(program.id)}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button
                  disabled={isSaving || isLoadingUsers || !athleteId || !templateId || athleteId === "loading"}
                  onClick={async () => {
                    await onAssign({
                      athleteId: Number(athleteId),
                      programType: selectedProgram.type,
                      programTemplateId: Number(templateId),
                    });
                    setAthleteId("");
                    onClose();
                  }}
                >
                  Assign
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
