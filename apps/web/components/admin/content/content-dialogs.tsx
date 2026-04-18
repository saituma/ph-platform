"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";

export type ContentDialog = null | "home" | "parent" | "programs";

type ContentDialogsProps = {
  active: ContentDialog;
  onClose: () => void;
};

export function ContentDialogs({ active, onClose }: ContentDialogsProps) {
  const description =
    active === "home"
      ? "Saved. Changes will show in the mobile app after the next refresh."
      : active === "parent"
        ? "Published. The parent portal will show the latest version on refresh."
        : active === "programs"
          ? "Saved. Updates will appear in the app shortly."
          : "";
  return (
    <Dialog open={active !== null} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {active === "home" && "Home Content Saved"}
            {active === "parent" && "Parent Article Published"}
            {active === "programs" && "Program Card Updated"}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
