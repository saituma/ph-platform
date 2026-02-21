"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select } from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import {
  useCreateAvailabilityMutation,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useCreateAdminBookingMutation,
} from "../../../lib/apiSlice";

export type BookingsDialog =
  | null
  | "new-service"
  | "edit-service"
  | "new-booking"
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
  bookings?: {
    id: number;
    name: string;
    athlete: string;
    time: string;
    type: string;
    status?: string | null;
    location?: string | null;
    meetingLink?: string | null;
    startsAt?: string | null;
    endTime?: string | null;
  }[];
  selectedBooking?: {
    id: number;
    name: string;
    athlete: string;
    time: string;
    type: string;
    status?: string | null;
    location?: string | null;
    meetingLink?: string | null;
    startsAt?: string | null;
    endTime?: string | null;
  } | null;
  services?: ServiceType[];
  users?: { id: number; name?: string | null; email?: string | null; role?: string | null; athleteName?: string | null }[];
  selectedService?: ServiceType | null;
  onRefresh?: () => void;
  onApproveBooking?: (bookingId: number) => Promise<void>;
  onDeclineBooking?: (bookingId: number) => Promise<void>;
  isApproving?: boolean;
};

const BOOKING_TYPE_LABELS: Record<string, string> = {
  group_call: "Group Call",
  individual_call: "1:1",
  one_on_one: "1:1",
  lift_lab_1on1: "Lift Lab 1:1",
  role_model: "Premium",
  call: "Call",
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  pending: "Pending",
  requested: "Requested",
  declined: "Declined",
  cancelled: "Cancelled",
};

const STATUS_STYLES: Record<string, string> = {
  confirmed: "border-emerald-200/70 bg-emerald-50/80 text-emerald-700",
  pending: "border-amber-200/70 bg-amber-50/80 text-amber-700",
  requested: "border-amber-200/70 bg-amber-50/80 text-amber-700",
  declined: "border-rose-200/70 bg-rose-50/80 text-rose-700",
  cancelled: "border-slate-200/70 bg-slate-50/80 text-slate-700",
};

const pad = (value: number) => String(value).padStart(2, "0");

const getDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const formatDay = (date: Date) =>
  date.toLocaleDateString("en-US", { weekday: "short" });

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

const formatTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function BookingsDialogs({
  active,
  onClose,
  bookings = [],
  selectedBooking,
  services = [],
  users = [],
  selectedService,
  onRefresh,
  onApproveBooking,
  onDeclineBooking,
  isApproving = false,
}: BookingsDialogsProps) {
  const [serviceName, setServiceName] = useState("");
  const [serviceType, setServiceType] = useState("group_call");
  const [durationMinutes, setDurationMinutes] = useState("");
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
  const [bookingUserId, setBookingUserId] = useState("");
  const [bookingServiceId, setBookingServiceId] = useState("");
  const [guardianSearch, setGuardianSearch] = useState("");
  const [showGuardianSuggestions, setShowGuardianSuggestions] = useState(false);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingHour, setBookingHour] = useState("");
  const [bookingMinute, setBookingMinute] = useState("");
  const [bookingStatus, setBookingStatus] = useState("confirmed");
  const [bookingLocation, setBookingLocation] = useState("");
  const [bookingMeetingLink, setBookingMeetingLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [createService, { isLoading: isCreatingService }] = useCreateServiceMutation();
  const [updateService, { isLoading: isUpdatingService }] = useUpdateServiceMutation();
  const [createAvailability, { isLoading: isCreatingAvailability }] = useCreateAvailabilityMutation();
  const [createAdminBooking, { isLoading: isCreatingBooking }] = useCreateAdminBookingMutation();

  const availabilityService = useMemo(
    () => services.find((service) => String(service.id) === availabilityServiceId) ?? null,
    [services, availabilityServiceId],
  );
  const availabilityFixedTime = useMemo(() => {
    if (availabilityService?.fixedStartTime) return availabilityService.fixedStartTime;
    if (availabilityService?.type === "role_model") return "13:00";
    return "";
  }, [availabilityService]);

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
      setDurationMinutes("");
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

    if (active === "new-booking") {
      setBookingUserId("");
      setBookingServiceId("");
      setGuardianSearch("");
      setShowGuardianSuggestions(false);
      setBookingDate("");
      setBookingHour("");
      setBookingMinute("");
      setBookingStatus("confirmed");
      setBookingLocation("");
      setBookingMeetingLink("");
      setError(null);
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

  useEffect(() => {
    if (active !== "new-booking") return;
    const service = services.find((item) => String(item.id) === bookingServiceId);
    const fixedStart = service?.fixedStartTime ?? "";
    if (fixedStart) {
      const [hour, minute] = fixedStart.split(":");
      setBookingHour(hour ?? "");
      setBookingMinute(minute ?? "");
    }
  }, [active, bookingServiceId, services]);

  const filteredGuardians = useMemo(() => {
    const guardians = users.filter((user) => user.role === "guardian");
    const query = guardianSearch.trim().toLowerCase();
    if (!query) return guardians;
    return guardians.filter((user) => {
      const name = user.name?.toLowerCase() ?? "";
      const email = user.email?.toLowerCase() ?? "";
      const athlete = user.athleteName?.toLowerCase() ?? "";
      return name.includes(query) || email.includes(query) || athlete.includes(query);
    });
  }, [guardianSearch, users]);

  const suggestionGuardians = useMemo(() => {
    if (!guardianSearch.trim() || !showGuardianSuggestions) return [];
    return filteredGuardians.slice(0, 6);
  }, [filteredGuardians, guardianSearch, showGuardianSuggestions]);

  const calendarDays = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const dayMap = new Map<string, { date: Date; items: typeof bookings }>();
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dayMap.set(getDateKey(date), { date, items: [] });
    }
    bookings.forEach((booking) => {
      if (!booking.startsAt) return;
      const startsAt = new Date(booking.startsAt);
      if (Number.isNaN(startsAt.getTime())) return;
      if (startsAt < start || startsAt > end) return;
      const key = getDateKey(startsAt);
      const day = dayMap.get(key);
      if (day) {
        day.items.push(booking);
      }
    });
    return Array.from(dayMap.values()).map((day) => ({
      ...day,
      items: [...day.items].sort((a, b) => {
        const aTime = a.startsAt ? new Date(a.startsAt).getTime() : 0;
        const bTime = b.startsAt ? new Date(b.startsAt).getTime() : 0;
        return aTime - bTime;
      }),
    }));
  }, [bookings]);

  const totalWeekBookings = useMemo(
    () => calendarDays.reduce((count, day) => count + day.items.length, 0),
    [calendarDays],
  );

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
              <Input
                placeholder="Service name"
                value={serviceName}
                onChange={(e) => {
                  setServiceName(e.target.value);
                  setError(null);
                }}
              />
              <Select
                value={serviceType}
                onChange={(e) => {
                  setServiceType(e.target.value);
                  setError(null);
                }}
              >
                <option value="call">Call</option>
                <option value="group_call">Group Call</option>
                <option value="individual_call">Individual Call</option>
                <option value="lift_lab_1on1">Lift Lab 1:1</option>
                <option value="role_model">Role Model (Premium)</option>
              </Select>
              <Input
                placeholder="Duration (mins)"
                value={durationMinutes}
                onChange={(e) => {
                  setDurationMinutes(e.target.value);
                  setError(null);
                }}
              />
              <div className="space-y-1">
                <Input
                  placeholder="Slots available (optional)"
                  value={capacity}
                  onChange={(e) => {
                    setCapacity(e.target.value);
                    setError(null);
                  }}
                />
                <div className="text-xs text-muted-foreground">
                  Number of parents allowed per time slot. Leave blank for unlimited.
                </div>
              </div>
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
                      console.error("Service save error:", err);
                      let msg = "Failed to save service.";
                      if (err?.data?.error === "Invalid request" && err?.data?.issues) {
                        const issues = err.data.issues as any[];
                        const errors = issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
                        msg = `Validation Error: ${errors.join(" | ")}`;
                      } else if (err?.data?.error) {
                        msg = err.data.error;
                      } else if (err?.message) {
                        msg = err.message;
                      }
                      setError(msg);
                    }
                  }}
                  disabled={isCreatingService || isUpdatingService}
                >
                  {active === "edit-service" ? "Save Changes" : "Create"}
                </Button>
              </div>
            </>
          ) : null}
          {active === "new-booking" ? (
            <>
              <Input
                placeholder="Search guardians"
                value={guardianSearch}
                onChange={(e) => {
                  setGuardianSearch(e.target.value);
                  setShowGuardianSuggestions(true);
                }}
                onFocus={() => {
                  if (guardianSearch.trim()) setShowGuardianSuggestions(true);
                }}
              />
              {suggestionGuardians.length > 0 ? (
                <div className="rounded-xl border border-border bg-background shadow-sm">
                  {suggestionGuardians.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setBookingUserId(String(user.id));
                        setGuardianSearch(user.name ?? user.email ?? "");
                        setShowGuardianSuggestions(false);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-foreground hover:bg-secondary/50"
                    >
                      <span>
                        {user.name ?? user.email ?? `User #${user.id}`}
                        {user.athleteName ? ` • ${user.athleteName}` : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">Select</span>
                    </button>
                  ))}
                </div>
              ) : null}
              <Select value={bookingUserId} onChange={(e) => setBookingUserId(e.target.value)}>
                <option value="">Select guardian</option>
                {filteredGuardians.map((user) => (
                  <option key={user.id} value={String(user.id)}>
                    {user.name ?? user.email ?? `User #${user.id}`}
                    {user.athleteName ? ` • ${user.athleteName}` : ""}
                  </option>
                ))}
              </Select>
              <Select value={bookingServiceId} onChange={(e) => setBookingServiceId(e.target.value)}>
                <option value="">Service type</option>
                {services.map((service) => (
                  <option key={service.id} value={String(service.id)}>
                    {service.name}
                  </option>
                ))}
              </Select>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input type="date" placeholder="Date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    placeholder="Hour"
                    value={bookingHour}
                    onChange={(e) => setBookingHour(e.target.value)}
                    disabled={Boolean(services.find((item) => String(item.id) === bookingServiceId)?.fixedStartTime)}
                  />
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    placeholder="Min"
                    value={bookingMinute}
                    onChange={(e) => setBookingMinute(e.target.value)}
                    disabled={Boolean(services.find((item) => String(item.id) === bookingServiceId)?.fixedStartTime)}
                  />
                </div>
              </div>
              <Select value={bookingStatus} onChange={(e) => setBookingStatus(e.target.value)}>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="declined">Declined</option>
                <option value="cancelled">Cancelled</option>
              </Select>
              <Input
                placeholder="Location (optional)"
                value={bookingLocation}
                onChange={(e) => setBookingLocation(e.target.value)}
              />
              <Input
                placeholder="Meeting link (optional)"
                value={bookingMeetingLink}
                onChange={(e) => setBookingMeetingLink(e.target.value)}
              />
              {error ? <p className="text-sm text-red-500">{error}</p> : null}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    setError(null);
                    if (!bookingUserId || !bookingServiceId) {
                      setError("Select a guardian and service.");
                      return;
                    }
                    if (!bookingDate || !bookingHour || !bookingMinute) {
                      setError("Select a date and time.");
                      return;
                    }
                    const pad = (value: string) => value.padStart(2, "0");
                    const startsAt = new Date(`${bookingDate}T${pad(bookingHour)}:${pad(bookingMinute)}:00`);
                    if (Number.isNaN(startsAt.getTime())) {
                      setError("Invalid date or time.");
                      return;
                    }
                    const service = services.find((item) => String(item.id) === bookingServiceId);
                    const duration = service?.durationMinutes ?? 0;
                    if (!duration) {
                      setError("Selected service has no duration.");
                      return;
                    }
                    const endsAt = new Date(startsAt.getTime() + duration * 60000);
                    try {
                      await createAdminBooking({
                        userId: Number(bookingUserId),
                        serviceTypeId: Number(bookingServiceId),
                        startsAt: startsAt.toISOString(),
                        endsAt: endsAt.toISOString(),
                        location: bookingLocation || undefined,
                        meetingLink: bookingMeetingLink || undefined,
                        status: bookingStatus,
                      }).unwrap();
                      onRefresh?.();
                      onClose();
                    } catch (err: any) {
                      setError(err?.data?.error || err?.message || "Failed to create booking");
                    }
                  }}
                  disabled={isCreatingBooking}
                >
                  Create Booking
                </Button>
              </div>
            </>
          ) : null}
          {active === "open-slots" ? (
            <>
              <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input type="date" placeholder="Start date" value={availabilityStartDate} onChange={(e) => setAvailabilityStartDate(e.target.value)} />
                {availabilityFixedTime ? (
                  <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
                    Fixed time at {availabilityFixedTime}.
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input type="number" min={0} max={23} placeholder="Hour" value={availabilityStartHour} onChange={(e) => setAvailabilityStartHour(e.target.value)} />
                    <Input type="number" min={0} max={59} placeholder="Min" value={availabilityStartMinute} onChange={(e) => setAvailabilityStartMinute(e.target.value)} />
                  </div>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input type="date" placeholder="End date" value={availabilityEndDate} onChange={(e) => setAvailabilityEndDate(e.target.value)} />
                {availabilityFixedTime ? (
                  <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
                    End time uses service duration.
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input type="number" min={0} max={23} placeholder="Hour" value={availabilityEndHour} onChange={(e) => setAvailabilityEndHour(e.target.value)} />
                    <Input type="number" min={0} max={59} placeholder="Min" value={availabilityEndMinute} onChange={(e) => setAvailabilityEndMinute(e.target.value)} />
                  </div>
                )}
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
                    if (!availabilityServiceId) {
                      setError("Select a service.");
                      return;
                    }
                    if (!availabilityStartDate || !availabilityEndDate) {
                      setError("Select a start and end date.");
                      return;
                    }
                    const service = availabilityService;
                    const duration = service?.durationMinutes ?? 0;
                    if (!duration) {
                      setError("Selected service has no duration.");
                      return;
                    }
                    const padValue = (value: string) => value.padStart(2, "0");
                    if (availabilityFixedTime) {
                      const [hour, minute] = availabilityFixedTime.split(":");
                      const startDate = new Date(availabilityStartDate);
                      const endDate = new Date(availabilityEndDate);
                      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
                        setError("Invalid date.");
                        return;
                      }
                      if (endDate < startDate) {
                        setError("End date must be after start date.");
                        return;
                      }
                      const days: Date[] = [];
                      const cursor = new Date(startDate);
                      cursor.setHours(0, 0, 0, 0);
                      const endCursor = new Date(endDate);
                      endCursor.setHours(0, 0, 0, 0);
                      while (cursor <= endCursor) {
                        days.push(new Date(cursor));
                        cursor.setDate(cursor.getDate() + 1);
                      }
                      try {
                        for (const day of days) {
                          const startsAt = new Date(day);
                          startsAt.setHours(Number(hour), Number(minute), 0, 0);
                          const endsAt = new Date(startsAt.getTime() + duration * 60000);
                          await createAvailability({
                            serviceTypeId: Number(availabilityServiceId),
                            startsAt: startsAt.toISOString(),
                            endsAt: endsAt.toISOString(),
                          }).unwrap();
                        }
                        onClose();
                      } catch (err: any) {
                        setError(err.message ?? "Failed to open slots");
                      }
                      return;
                    }

                    if (!availabilityStartHour || !availabilityStartMinute || !availabilityEndHour || !availabilityEndMinute) {
                      setError("Select a start and end time.");
                      return;
                    }
                    const startsAt = new Date(`${availabilityStartDate}T${padValue(availabilityStartHour)}:${padValue(availabilityStartMinute)}`);
                    const endsAt = new Date(`${availabilityEndDate}T${padValue(availabilityEndHour)}:${padValue(availabilityEndMinute)}`);
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
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm">
                <div>
                  <p className="text-sm font-semibold text-foreground">Next 7 days</p>
                  <p className="text-xs text-muted-foreground">
                    {totalWeekBookings} booking{totalWeekBookings === 1 ? "" : "s"} scheduled.
                  </p>
                </div>
                <Badge variant="outline" className="border-border text-muted-foreground">
                  {formatDate(new Date())}
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {calendarDays.map((day) => (
                  <div
                    key={getDateKey(day.date)}
                    className="rounded-2xl border border-border bg-secondary/20 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{formatDay(day.date)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(day.date)}</p>
                      </div>
                      <Badge variant="accent">{day.items.length}</Badge>
                    </div>
                    <div className="mt-3 space-y-3">
                      {day.items.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                          No bookings.
                        </div>
                      ) : (
                        day.items.map((booking) => {
                          const startsAt = booking.startsAt ? new Date(booking.startsAt) : null;
                          const statusKey = booking.status ?? "confirmed";
                          return (
                            <div
                              key={`${booking.id}-${booking.startsAt}`}
                              className="rounded-xl border border-border bg-background px-3 py-2 text-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-foreground">
                                  {startsAt ? formatTime(startsAt) : booking.time}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={STATUS_STYLES[statusKey] ?? "border-border text-muted-foreground"}
                                >
                                  {STATUS_LABELS[statusKey] ?? "Scheduled"}
                                </Badge>
                              </div>
                              <p className="mt-1 text-[13px] text-foreground">
                                {BOOKING_TYPE_LABELS[booking.type] ?? booking.name}
                              </p>
                              <p className="text-muted-foreground">{booking.athlete}</p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {bookings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-4 text-center text-xs text-muted-foreground">
                  No bookings found yet. Create a booking or open slots to populate the calendar.
                </div>
              ) : null}
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
              <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm space-y-2">
                <div>Status: {selectedBooking.status ?? "unknown"}</div>
                <div>
                  Starts:{" "}
                  {selectedBooking.startsAt
                    ? new Date(selectedBooking.startsAt).toLocaleString()
                    : "--"}
                </div>
                <div>
                  Ends:{" "}
                  {selectedBooking.endTime
                    ? new Date(selectedBooking.endTime).toLocaleString()
                    : "--"}
                </div>
                <div>Location: {selectedBooking.location ?? "None"}</div>
                <div>Meeting link: {selectedBooking.meetingLink ?? "None"}</div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                {selectedBooking.status === "pending" ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        setError(null);
                        if (!onDeclineBooking) return;
                        try {
                          await onDeclineBooking(selectedBooking.id);
                        } catch (err: any) {
                          setError(err.message ?? "Failed to decline booking");
                        }
                      }}
                      disabled={isApproving}
                    >
                      Decline Booking
                    </Button>
                    <Button
                      onClick={async () => {
                        setError(null);
                        if (!onApproveBooking) return;
                        try {
                          await onApproveBooking(selectedBooking.id);
                        } catch (err: any) {
                          setError(err.message ?? "Failed to approve booking");
                        }
                      }}
                      disabled={isApproving}
                    >
                      Approve Booking
                    </Button>
                  </>
                ) : null}
              </div>
              {error ? (
                <div className="text-sm text-red-500">{error}</div>
              ) : null}
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
