"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";

export type SettingsDialog =
  | null
  | "legal"
  | "access"
  | "referrals"
  | "support"
  | "ui-controls";

type SettingsDialogsProps = {
  active: SettingsDialog;
  onClose: () => void;
};

export function SettingsDialogs({ active, onClose }: SettingsDialogsProps) {
  return (
    <Dialog open={active !== null} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {active === "legal" && "Legal Saved"}
            {active === "access" && "Access Rules Updated"}
            {active === "referrals" && "Referrals Saved"}
            {active === "support" && "Support Updated"}
            {active === "ui-controls" && "UI Controls Updated"}
          </DialogTitle>
          <DialogDescription>UI-only confirmation.</DialogDescription>
        </DialogHeader>
        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
