"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select } from "../../ui/select";
import { Textarea } from "../../ui/textarea";

export type DashboardDialog =
  | null
  | "message"
  | "program"
  | "exercise"
  | "article"
  | "slots";

type ActionDialogsProps = {
  active: DashboardDialog;
  onClose: () => void;
};

export function ActionDialogs({ active, onClose }: ActionDialogsProps) {
  return (
    <Dialog open={active !== null} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {active === "message" && "New Message"}
            {active === "program" && "Create Program Template"}
            {active === "exercise" && "Add Exercise Video"}
            {active === "article" && "Publish Parent Article"}
            {active === "slots" && "Open Booking Slots"}
          </DialogTitle>
          <DialogDescription>
            Fill the details below. This is UI-only for now.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 space-y-4">
          {active === "message" ? (
            <>
              <Input placeholder="Recipient" />
              <Textarea placeholder="Write your message..." />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={onClose}>Send</Button>
              </div>
            </>
          ) : null}
          {active === "program" ? (
            <>
              <Input placeholder="Template name" />
              <Select>
                <option>Tier</option>
                <option>PHP Program</option>
                <option>PHP Plus</option>
                <option>PHP Premium</option>
              </Select>
              <Textarea placeholder="Summary" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={onClose}>Create</Button>
              </div>
            </>
          ) : null}
          {active === "exercise" ? (
            <>
              <Input placeholder="Exercise name" />
              <Input placeholder="Video URL" />
              <Textarea placeholder="Coaching notes" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={onClose}>Add</Button>
              </div>
            </>
          ) : null}
          {active === "article" ? (
            <>
              <Input placeholder="Article title" />
              <Select>
                <option>Category</option>
                <option>Growth & Maturation</option>
                <option>Nutrition</option>
                <option>Mindset</option>
              </Select>
              <Textarea placeholder="Write the article..." />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={onClose}>Publish</Button>
              </div>
            </>
          ) : null}
          {active === "slots" ? (
            <>
              <Input placeholder="Date range" />
              <Select>
                <option>Service type</option>
                <option>Role Model Meeting</option>
                <option>Lift Lab 1:1</option>
                <option>Group Call</option>
              </Select>
              <Select>
                <option>Fixed call window</option>
                <option>13:00 - 13:30</option>
                <option>15:30 - 16:00</option>
              </Select>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={onClose}>Open Slots</Button>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
