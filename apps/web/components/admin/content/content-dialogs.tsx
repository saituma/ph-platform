"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";

export type ContentDialog = null | "home" | "parent" | "programs" | "legal";

type ContentDialogsProps = {
  active: ContentDialog;
  onClose: () => void;
};

export function ContentDialogs({ active, onClose }: ContentDialogsProps) {
  return (
    <Dialog open={active !== null} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {active === "home" && "Home Content Saved"}
            {active === "parent" && "Parent Article Published"}
            {active === "programs" && "Program Card Updated"}
            {active === "legal" && "Legal Content Saved"}
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
