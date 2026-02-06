"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select } from "../../ui/select";
import { Textarea } from "../../ui/textarea";

export type ProgramsDialog = null | "create-template" | "manage" | "assign";

type ProgramsDialogsProps = {
  active: ProgramsDialog;
  onClose: () => void;
  selectedProgram?: { name: string; summary: string; access: string } | null;
};

export function ProgramsDialogs({ active, onClose, selectedProgram }: ProgramsDialogsProps) {
  return (
    <Dialog open={active !== null} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {active === "create-template" && "Create Program Template"}
            {active === "manage" && `Manage ${selectedProgram?.name ?? "Program"}`}
            {active === "assign" && `Assign ${selectedProgram?.name ?? "Program"}`}
          </DialogTitle>
          <DialogDescription>UI-only for now.</DialogDescription>
        </DialogHeader>
        <div className="mt-6 space-y-4">
          {active === "create-template" ? (
            <>
              <Input placeholder="Template name" />
              <Select>
                <option>Tier</option>
                <option>PHP Program</option>
                <option>PHP Plus</option>
                <option>PHP Premium</option>
              </Select>
              <Textarea placeholder="Template summary" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={onClose}>Create</Button>
              </div>
            </>
          ) : null}
          {active === "manage" && selectedProgram ? (
            <>
              <Input placeholder="Program name" defaultValue={selectedProgram.name} />
              <Textarea placeholder="Summary" defaultValue={selectedProgram.summary} />
              <Select defaultValue={selectedProgram.access}>
                <option>Self-enroll</option>
                <option>Coach assigned</option>
                <option>Approval required</option>
              </Select>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={onClose}>Save</Button>
              </div>
            </>
          ) : null}
          {active === "assign" && selectedProgram ? (
            <>
              <Input placeholder="Assign to athlete" />
              <Select>
                <option>Template</option>
                <option>{selectedProgram.name} Week 1</option>
                <option>{selectedProgram.name} Week 2</option>
              </Select>
              <Textarea placeholder="Assignment notes" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={onClose}>Assign</Button>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
