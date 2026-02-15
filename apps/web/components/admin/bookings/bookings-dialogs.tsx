"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select } from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import {
  useCreateAvailabilityMutation,
  useCreateServiceMutation,
  useUpdateServiceMutation,
} from "../../../lib/apiSlice";

export type BookingsDialog =
  | null
  | "new-service"
  | "edit-service"
  | "open-slots"
  | "calendar"
  | "booking-details";

type ServiceType = {
  id: number;
  name: string;
  type: string;
  durationMinutes: number;
  capacity?: number | null;
  fixedStartTime?: string | null;
  attendeeVisibility?: boolean | null;
  defaultLocation?: string | null;
  defaultMeetingLink?: string | null;
  programTier?: string | null;
};

type BookingsDialogsProps = {
  active: BookingsDialog;
  onClose: () => void;
  selectedBooking?: { name: string; athlete: string; time: string; type: string } | null;
  services?: { id: number; name: string; type: string }[];
  selectedService?: ServiceType | null;
  onRefresh?: () => void;
};

export function BookingsDialogs({
  active,
  onClose,
  selectedBooking,
  services = [],
  selectedService,
  onRefresh,
}: BookingsDialogsProps) {
  const [serviceName, setServiceName] = useState("");
  const [serviceType, setServiceType] = useState("group_call");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [capacity, setCapacity] = useState("");
  const [fixedStartTime, setFixedStartTime] = useState("");
  const [fixedStartHour, setFixedStartHour] = useState("");
  const [fixedStartMinute, setFixedStartMinute] = useState("");
  const [programTier, setProgramTier] = useState("");
  const [attendeeVisibility, setAttendeeVisibility] = useState(true);
  const [defaultLocation, setDefaultLocation] = useState("");
  const [defaultVideoLink, setDefaultVideoLink] = useState("");
  const [availabilityServiceId, setAvailabilityServiceId] = useState("");
  const [availabilityStartDate, setAvailabilityStartDate] = useState("");
  const [availabilityStartHour, setAvailabilityStartHour] = useState("");
  const [availabilityStartMinute, setAvailabilityStartMinute] = useState("");
  const [availabilityEndDate, setAvailabilityEndDate] = useState("");
  const [availabilityEndHour, setAvailabilityEndHour] = useState("");
  const [availabilityEndMinute, setAvailabilityEndMinute] = useState("");
  const [bookingLocation, setBookingLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [createService, { isLoading: isCreatingService }] = useCreateServiceMutation();
  const [updateService, { isLoading: isUpdatingService }] = useUpdateServiceMutation();
  const [createAvailability, { isLoading: isCreatingAvailability }] = useCreateAvailabilityMutation();

  useEffect(() => {
    if (serviceType === "role_model") {
      setFixedStartTime("13:00");
      setFixedStartHour("13");
      setFixedStartMinute("00");
      setProgramTier((prev) => prev || "PHP_Premium");
    }
  }, [serviceType]);

  useEffect(() => {
    if (active === "new-service") {
      setServiceName("");
      setServiceType("group_call");
      setDurationMinutes("30");
      setCapacity("");
      setFixedStartTime("");
      setFixedStartHour("");
      setFixedStartMinute("");
      setProgramTier("");
      setAttendeeVisibility(true);
      setDefaultLocation("");
      setDefaultVideoLink("");
      return;
    }

    if (active === "edit-service" && selectedService) {
      setServiceName(selectedService.name ?? "");
      setServiceType(selectedService.type ?? "group_call");
      setDurationMinutes(String(selectedService.durationMinutes ?? 30));
      setCapacity(selectedService.capacity ? String(selectedService.capacity) : "");
      const startTime = selectedService.fixedStartTime ?? "";
      setFixedStartTime(startTime);
      setFixedStartHour(startTime ? startTime.split(":")[0] : "");
      setFixedStartMinute(startTime ? startTime.split(":")[1] : "");
      setProgramTier(selectedService.programTier ?? "");
      setAttendeeVisibility(selectedService.attendeeVisibility ?? true);
      setDefaultLocation(selectedService.defaultLocation ?? "");
      setDefaultVideoLink("");
    }
  }, [active, selectedService]);
  return (
    <Dialog open={active !== null} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {active === "new-service" && "Create New Service"}
            {active === "edit-service" && "Edit Service"}
            {active === "open-slots" && "Open Booking Slots"}
            {active === "calendar" && "Calendar View"}
            {active === "booking-details" && "Booking Details"}
          </DialogTitle>
          <DialogDescription>
            {selectedBooking
              ? `${selectedBooking.name} • ${selectedBooking.athlete}`
              : "Manage scheduling actions."}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 space-y-4">
          {active === "new-service" || active === "edit-service" ? (
            <>
              <Input placeholder="Service name" value={serviceName} onChange={(e) => setServiceName(e.target.value)} />
              <Select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                <option value="call">Call</option>
                <option value="group_call">Group Call</option>
                <option value="individual_call">Individual Call</option>
                <option value="lift_lab_1on1">Lift Lab 1:1</option>
                <option value="role_model">Role Model (Premium)</option>
              </Select>
              <Input placeholder="Duration (mins)" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
              <Input placeholder="Capacity (optional)" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
              <div className="grid gap-2">
                <div className="text-xs text-muted-foreground">Fixed start time</div>
                <div className="flex gap-2">
                  <Select
                    value={fixedStartHour}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFixedStartHour(value);
                      if (value && fixedStartMinute) {
                        setFixedStartTime(`${value}:${fixedStartMinute}`);
                      } else {
                        setFixedStartTime("");
                      }
                    }}
                    disabled={serviceType === "role_model"}
                  >
                    <option value="">Hour</option>
                    {Array.from({ length: 24 }).map((_, idx) => {
                      const value = String(idx).padStart(2, "0");
                      return (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      );
                    })}
                  </Select>
                  <Select
                    value={fixedStartMinute}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFixedStartMinute(value);
                      if (fixedStartHour && value) {
                        setFixedStartTime(`${fixedStartHour}:${value}`);
                      } else {
                        setFixedStartTime("");
                      }
                    }}
                    disabled={serviceType === "role_model"}
                  >
                    <option value="">Min</option>
                    {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <Select value={programTier} onChange={(e) => setProgramTier(e.target.value)}>
                <option value="">Program tier (optional)</option>
                <option value="PHP">PHP</option>
                <option value="PHP_Plus">PHP Plus</option>
                <option value="PHP_Premium">PHP Premium</option>
              </Select>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={attendeeVisibility}
                  onChange={(e) => setAttendeeVisibility(e.target.checked)}
                />
                Show attendee list for group calls
              </label>
              <Input
                placeholder="Default location (optional)"
                value={defaultLocation}
                onChange={(e) => setDefaultLocation(e.target.value)}
              />
              {/* Default video link removed */}
              {error ? <p className="text-sm text-red-500">{error}</p> : null}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    setError(null);
                    try {
                      if (active === "new-service") {
                        await createService({
                          name: serviceName,
                          type: serviceType,
                          durationMinutes: Number(durationMinutes),
                          capacity: capacity ? Number(capacity) : undefined,
                          fixedStartTime: fixedStartTime || undefined,
                          attendeeVisibility,
                          defaultLocation: defaultLocation || undefined,
                          defaultMeetingLink: undefined,
                          programTier: programTier || undefined,
                        }).unwrap();
                      } else if (active === "edit-service" && selectedService) {
                        await updateService({
                          id: selectedService.id,
                          data: {
                            name: serviceName,
                            type: serviceType,
                            durationMinutes: Number(durationMinutes),
                            capacity: capacity ? Number(capacity) : null,
                            fixedStartTime: fixedStartTime || null,
                            attendeeVisibility,
                            defaultLocation: defaultLocation || null,
                            defaultMeetingLink: null,
                            programTier: programTier || null,
                          },
                        }).unwrap();
                      }
                      onRefresh?.();
                      onClose();
                    } catch (err: any) {
                      setError(err.message ?? "Failed to save service");
                    }
                  }}
                  disabled={isCreatingService || isUpdatingService}
                >
                  {active === "edit-service" ? "Save Changes" : "Create"}
                </Button>
              </div>
            </>
          ) : null}
          {active === "open-slots" ? (
            <>
              <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input type="date" placeholder="Start date" value={availabilityStartDate} onChange={(e) => setAvailabilityStartDate(e.target.value)} />
                <div className="flex gap-2">
                  <Input type="number" min={0} max={23} placeholder="Hour" value={availabilityStartHour} onChange={(e) => setAvailabilityStartHour(e.target.value)} />
                  <Input type="number" min={0} max={59} placeholder="Min" value={availabilityStartMinute} onChange={(e) => setAvailabilityStartMinute(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input type="date" placeholder="End date" value={availabilityEndDate} onChange={(e) => setAvailabilityEndDate(e.target.value)} />
                <div className="flex gap-2">
                  <Input type="number" min={0} max={23} placeholder="Hour" value={availabilityEndHour} onChange={(e) => setAvailabilityEndHour(e.target.value)} />
                  <Input type="number" min={0} max={59} placeholder="Min" value={availabilityEndMinute} onChange={(e) => setAvailabilityEndMinute(e.target.value)} />
                </div>
              </div>
              </>
              <Select value={availabilityServiceId} onChange={(e) => setAvailabilityServiceId(e.target.value)}>
                <option value="">Service type</option>
                {services.map((service) => (
                  <option key={service.id} value={String(service.id)}>
                    {service.name}
                  </option>
                ))}
              </Select>
              {error ? <p className="text-sm text-red-500">{error}</p> : null}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    setError(null);
                    if (!availabilityStartDate || !availabilityStartHour || !availabilityStartMinute || !availabilityEndDate || !availabilityEndHour || !availabilityEndMinute) {
                      setError("Select a start and end time.");
                      return;
                    }
                    const pad = (value: string) => value.padStart(2, "0");
                    const startsAt = new Date(`${availabilityStartDate}T${pad(availabilityStartHour)}:${pad(availabilityStartMinute)}`);
                    const endsAt = new Date(`${availabilityEndDate}T${pad(availabilityEndHour)}:${pad(availabilityEndMinute)}`);
                    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
                      setError("Invalid date or time.");
                      return;
                    }
                    if (endsAt <= startsAt) {
                      setError("End time must be after start time.");
                      return;
                    }
                    try {
                      await createAvailability({
                        serviceTypeId: Number(availabilityServiceId),
                        startsAt: startsAt.toISOString(),
                        endsAt: endsAt.toISOString(),
                      }).unwrap();
                      onClose();
                    } catch (err: any) {
                      setError(err.message ?? "Failed to open slots");
                    }
                  }}
                  disabled={isCreatingAvailability}
                >
                  Open Slots
                </Button>
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
              <Input
                placeholder="Location (optional)"
                value={bookingLocation}
                onChange={(e) => setBookingLocation(e.target.value)}
              />
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
