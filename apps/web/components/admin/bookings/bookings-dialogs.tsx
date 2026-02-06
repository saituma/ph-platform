"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select } from "../../ui/select";
import { Textarea } from "../../ui/textarea";

export type BookingsDialog =
  | null
  | "new-service"
  | "open-slots"
  | "calendar"
  | "booking-details";

type BookingsDialogsProps = {
  active: BookingsDialog;
  onClose: () => void;
  selectedBooking?: { name: string; athlete: string; time: string; type: string } | null;
};

export function BookingsDialogs({ active, onClose, selectedBooking }: BookingsDialogsProps) {
  return (
    <Dialog open={active !== null} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {active === "new-service" && "Create New Service"}
            {active === "open-slots" && "Open Booking Slots"}
            {active === "calendar" && "Calendar View"}
            {active === "booking-details" && "Booking Details"}
          </DialogTitle>
          <DialogDescription>
            {selectedBooking
              ? `${selectedBooking.name} • ${selectedBooking.athlete}`
              : "UI-only for now."}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 space-y-4">
          {active === "new-service" ? (
            <>
              <Input placeholder="Service name" />
              <Select>
                <option>Service type</option>
                <option>Video</option>
                <option>In-person</option>
              </Select>
              <Input placeholder="Duration (mins)" />
              <Textarea placeholder="Service notes" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={onClose}>Create</Button>
              </div>
            </>
          ) : null}
          {active === "open-slots" ? (
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
          {active === "calendar" ? (
            <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm">
              Calendar view will display weekly sessions here.
            </div>
          ) : null}
          {active === "booking-details" && selectedBooking ? (
            <>
              <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm">
                <p className="font-semibold text-foreground">{selectedBooking.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedBooking.athlete} • {selectedBooking.time} • {selectedBooking.type}
                </p>
              </div>
              <Textarea placeholder="Coach notes" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button onClick={onClose}>Save Notes</Button>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
