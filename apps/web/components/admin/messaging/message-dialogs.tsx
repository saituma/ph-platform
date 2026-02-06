"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";

export type MessagingDialog = null | "new-message";

type MessageDialogsProps = {
  active: MessagingDialog;
  onClose: () => void;
};

export function MessageDialogs({ active, onClose }: MessageDialogsProps) {
  return (
    <Dialog open={active !== null} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
          <DialogDescription>Start a new conversation.</DialogDescription>
        </DialogHeader>
        <div className="mt-6 space-y-4">
          <Input placeholder="Recipient" />
          <Textarea placeholder="Write your message..." />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onClose}>Send</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
