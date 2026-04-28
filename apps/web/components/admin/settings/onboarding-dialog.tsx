"use client";

import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";

type OnboardingDialogProps = {
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
};

/** Prefer the full page at /onboarding-config; dialog links there for discoverability. */
export function OnboardingDialog({ open, onClose }: OnboardingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Onboarding configuration</DialogTitle>
          <DialogDescription>
            Edit teams, levels, form fields, and documents on the dedicated admin page.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button render={<Link href="/onboarding-config" onClick={onClose} />}>
            Open editor
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
