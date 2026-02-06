"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { OnboardingBuilder } from "./onboarding-builder";

type OnboardingDialogProps = {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
};

export function OnboardingDialog({ open, onClose, onSave }: OnboardingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Onboarding Form Builder</DialogTitle>
          <DialogDescription>Update the mobile onboarding fields.</DialogDescription>
        </DialogHeader>
        <div className="mt-6">
          <OnboardingBuilder onSave={onSave} />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
