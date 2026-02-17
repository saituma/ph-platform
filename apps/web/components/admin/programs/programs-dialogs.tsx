"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select } from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { useMemo, useState } from "react";

export type ProgramsDialog = null | "create-template" | "manage" | "assign";

type ProgramsDialogsProps = {
  active: ProgramsDialog;
  onClose: () => void;
  selectedProgram?: { id: number; name: string; summary?: string | null; type: string } | null;
  programs: { id: number; name: string; type: string }[];
  users: { id: number; name: string; email: string; athleteId?: number | null }[];
  onCreate: (input: { name: string; type: string; description?: string }) => Promise<void>;
  onUpdate: (input: { programId: number; name: string; type: string; description?: string | null }) => Promise<void>;
  onAssign: (input: { athleteId: number; programType: string; programTemplateId: number }) => Promise<void>;
  isSaving?: boolean;
};

const programLabel = (type: string) => {
  if (type === "PHP_Plus") return "PHP Plus";
  if (type === "PHP_Premium") return "PHP Premium";
  return "PHP Program";
};

export function ProgramsDialogs({
  active,
  onClose,
  selectedProgram,
  programs,
  users,
  onCreate,
  onUpdate,
  onAssign,
  isSaving = false,
}: ProgramsDialogsProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("PHP");
  const [description, setDescription] = useState("");
  const [athleteId, setAthleteId] = useState("");
  const [templateId, setTemplateId] = useState("");

  const templatesForType = useMemo(() => {
    return programs.filter((program) => program.type === (selectedProgram?.type ?? type));
  }, [programs, selectedProgram?.type, type]);

  const assignTemplates = templatesForType.length ? templatesForType : programs;

  const resetCreate = () => {
    setName("");
    setType("PHP");
    setDescription("");
  };

  const resetAssign = () => {
    setAthleteId("");
    setTemplateId(selectedProgram?.id ? String(selectedProgram.id) : "");
  };

  const openLabel = active;
  if (openLabel === "create-template") {
    if (!name && !description) resetCreate();
  } else if (openLabel === "assign") {
    if (!templateId && selectedProgram?.id) {
      setTemplateId(String(selectedProgram.id));
    }
  }

  return (
    <Dialog open={active !== null} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {active === "create-template" && "Create Program Template"}
            {active === "manage" && `Manage ${selectedProgram?.name ?? "Program"}`}
            {active === "assign" && `Assign ${selectedProgram?.name ?? "Program"}`}
          </DialogTitle>
          <DialogDescription>Templates and assignments update live.</DialogDescription>
        </DialogHeader>
        <div className="mt-6 space-y-4">
          {active === "create-template" ? (
            <>
              <Input placeholder="Template name" value={name} onChange={(e) => setName(e.target.value)} />
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="PHP">PHP Program</option>
                <option value="PHP_Plus">PHP Plus</option>
                <option value="PHP_Premium">PHP Premium</option>
              </Select>
              <Textarea placeholder="Template summary" value={description} onChange={(e) => setDescription(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  disabled={isSaving || !name.trim()}
                  onClick={async () => {
                    await onCreate({ name: name.trim(), type, description: description.trim() || undefined });
                    resetCreate();
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
              <Input
                placeholder="Program name"
                defaultValue={selectedProgram.name}
                onChange={(e) => setName(e.target.value)}
              />
              <Textarea
                placeholder="Summary"
                defaultValue={selectedProgram.summary ?? ""}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Select defaultValue={selectedProgram.type} onChange={(e) => setType(e.target.value)}>
                <option value="PHP">PHP Program</option>
                <option value="PHP_Plus">PHP Plus</option>
                <option value="PHP_Premium">PHP Premium</option>
              </Select>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  disabled={isSaving}
                  onClick={async () => {
                    await onUpdate({
                      programId: selectedProgram.id,
                      name: (name || selectedProgram.name).trim(),
                      type: type || selectedProgram.type,
                      description: description.trim() || null,
                    });
                    onClose();
                  }}
                >
                  Save
                </Button>
              </div>
            </>
          ) : null}
          {active === "assign" && selectedProgram ? (
            <>
              <Select value={athleteId} onChange={(e) => setAthleteId(e.target.value)}>
                <option value="">Select athlete</option>
                {users
                  .filter((user) => user.athleteId)
                  .map((user) => (
                    <option key={user.id} value={String(user.athleteId)}>
                      {user.name || user.email} • Athlete #{user.athleteId}
                    </option>
                  ))}
              </Select>
              <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                <option value="">Select template</option>
                {assignTemplates.map((program) => (
                  <option key={program.id} value={String(program.id)}>
                    {program.name} ({programLabel(program.type)})
                  </option>
                ))}
              </Select>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  disabled={isSaving || !athleteId || !templateId}
                  onClick={async () => {
                    await onAssign({
                      athleteId: Number(athleteId),
                      programType: selectedProgram.type,
                      programTemplateId: Number(templateId),
                    });
                    resetAssign();
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
