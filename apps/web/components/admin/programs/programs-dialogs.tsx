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
}: ProgramsDialogsProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [athleteId, setAthleteId] = useState("");
  const [templateId, setTemplateId] = useState("");

  useEffect(() => {
    if (active === "create") {
      setName("");
      setDescription("");
      return;
    }
    if (active === "manage" && selectedProgram) {
      setName(selectedProgram.name ?? "");
      setDescription(selectedProgram.summary ?? "");
      return;
    }
    if (active === "assign") {
      setAthleteId("");
      setTemplateId(selectedProgram?.id ? String(selectedProgram.id) : "");
    }
  }, [active, selectedProgram]);

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
              <Input placeholder="Program name" value={name} onChange={(e) => setName(e.target.value)} />
              <Textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button
                  disabled={isSaving || !name.trim()}
                  onClick={async () => {
                    await onCreate({
                      name: name.trim(),
                      type: "PHP",
                      description: description.trim() || undefined,
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
              <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
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
                        type: selectedProgram.type,
                        description: description.trim() || null,
                        minAge: null,
                        maxAge: null,
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
                  {users
                    .filter((user) => user.athleteId)
                    .map((user) => (
                      <SelectItem key={user.id} value={String(user.athleteId)}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
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
                  disabled={isSaving || !athleteId || !templateId}
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
