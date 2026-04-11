"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select } from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import {
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useCreateAdminBookingMutation,
} from "../../../lib/apiSlice";

export type BookingsDialog =
  | null
  | "new-service"
  | "edit-service"
  | "new-booking"
  | "calendar"
  | "booking-details";

function getRtkErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "data" in err) {
    const data = (
      err as {
        data?: {
          error?: string;
          issues?: { path: string[]; message: string }[];
        };
      }
    ).data;
    if (data?.error === "Invalid request" && Array.isArray(data.issues)) {
      return data.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(" | ");
    }
    if (typeof data?.error === "string") return data.error;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

type ServiceType = {
  id: number;
  name: string;
  description?: string | null;
  type: string;
  durationMinutes: number;
  capacity?: number | null;
  attendeeVisibility?: boolean | null;
  defaultLocation?: string | null;
  defaultMeetingLink?: string | null;
  programTier?: string | null;
  eligiblePlans?: string[] | null;
  schedulePattern?: string | null;
  recurrenceEndMode?: string | null;
  recurrenceCount?: number | null;
  weeklyEntries?: { weekday: number; time: string }[] | null;
  oneTimeDate?: string | null;
  oneTimeTime?: string | null;
  slotMode?: string | null;
  slotIntervalMinutes?: number | null;
  slotDefinitions?: { time: string; capacity?: number | null }[] | null;
  isActive?: boolean | null;
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
  users?: {
    id: number;
    name?: string | null;
    email?: string | null;
    role?: string | null;
    athleteName?: string | null;
  }[];
  selectedService?: ServiceType | null;
  onRefresh?: () => void;
  onApproveBooking?: (bookingId: number) => Promise<void>;
  onDeclineBooking?: (bookingId: number) => Promise<void>;
  isApproving?: boolean;
};

export const BOOKING_TYPE_LABELS: Record<string, string> = {
  one_to_one: "1-to-1 session",
  semi_private: "Semi-private session",
  in_person: "In-person session",
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

const DEFAULT_SERVICE_DURATION_MINUTES: Record<string, number> = {
  one_to_one: 60,
  semi_private: 75,
  in_person: 60,
};

function getEndTimeHint(
  startTime: string,
  durationMinutes: string,
): string | null {
  const duration = Number(durationMinutes);
  if (!startTime || !Number.isFinite(duration) || duration <= 0) return null;
  const match = /^(\d{2}):(\d{2})$/.exec(startTime);
  if (!match) return null;
  const startHours = Number(match[1]);
  const startMins = Number(match[2]);
  if (!Number.isFinite(startHours) || !Number.isFinite(startMins)) return null;
  const startTotal = startHours * 60 + startMins;
  const endTotal = startTotal + duration;
  const dayOffset = Math.floor(endTotal / (24 * 60));
  const endInDay = ((endTotal % (24 * 60)) + 24 * 60) % (24 * 60);
  const endHours = Math.floor(endInDay / 60);
  const endMins = endInDay % 60;
  const label = `${pad(endHours)}:${pad(endMins)}${dayOffset > 0 ? ` (+${dayOffset}d)` : ""}`;
  return `Ends ${label}`;
}

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
  const [serviceDescription, setServiceDescription] = useState("");
  const [serviceType, setServiceType] = useState("one_to_one");
  const [durationMinutes, setDurationMinutes] = useState("");
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
  const [createService, { isLoading: isCreatingService }] =
    useCreateServiceMutation();
  const [updateService, { isLoading: isUpdatingService }] =
    useUpdateServiceMutation();
  const [createAdminBooking, { isLoading: isCreatingBooking }] =
    useCreateAdminBookingMutation();

  useEffect(() => {
    if (active === "new-service") {
      setServiceName("");
      setServiceDescription("");
      setServiceType("one_to_one");
      setDurationMinutes(String(DEFAULT_SERVICE_DURATION_MINUTES.one_to_one));
      setError(null);
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
      setServiceDescription(selectedService.description ?? "");
      setServiceType(selectedService.type ?? "one_to_one");
      setDurationMinutes(String(selectedService.durationMinutes ?? 30));
      setError(null);
    }
  }, [active, selectedService]);

  const filteredGuardians = useMemo(() => {
    const guardians = users.filter((user) => user.role === "guardian");
    const query = guardianSearch.trim().toLowerCase();
    if (!query) return guardians;
    return guardians.filter((user) => {
      const name = user.name?.toLowerCase() ?? "";
      const email = user.email?.toLowerCase() ?? "";
      const athlete = user.athleteName?.toLowerCase() ?? "";
      return (
        name.includes(query) || email.includes(query) || athlete.includes(query)
      );
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
              <div className="space-y-1">
                <Label htmlFor="service-name">Name</Label>
                <Input
                  id="service-name"
                  placeholder="Service name"
                  value={serviceName}
                  onChange={(e) => {
                    setServiceName(e.target.value);
                    setError(null);
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="service-description">Description</Label>
                <Textarea
                  id="service-description"
                  placeholder="What is this service for?"
                  value={serviceDescription}
                  onChange={(e) => {
                    setServiceDescription(e.target.value);
                    setError(null);
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="service-type">Type</Label>
                <Select
                  id="service-type"
                  value={serviceType}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    setServiceType(nextType);
                    if (active === "new-service") {
                      setDurationMinutes(
                        String(
                          DEFAULT_SERVICE_DURATION_MINUTES[nextType] ??
                            DEFAULT_SERVICE_DURATION_MINUTES.one_to_one,
                        ),
                      );
                    }
                    setError(null);
                  }}
                >
                  <option value="one_to_one">1-to-1 session</option>
                  <option value="semi_private">Semi-private session</option>
                  <option value="in_person">In-person session</option>
                </Select>
              </div>
              {error ? <p className="text-sm text-red-500">{error}</p> : null}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    setError(null);
                    if (!serviceName.trim()) {
                      setError("Service name is required.");
                      return;
                    }
                    try {
                      const duration = Number(durationMinutes);
                      const fallbackDuration =
                        DEFAULT_SERVICE_DURATION_MINUTES[serviceType] ??
                        DEFAULT_SERVICE_DURATION_MINUTES.one_to_one;
                      const payload = {
                        name: serviceName.trim(),
                        description: serviceDescription.trim() || null,
                        type: serviceType,
                        durationMinutes:
                          Number.isFinite(duration) && duration > 0
                            ? duration
                            : fallbackDuration,
                        capacity: null,
                        eligiblePlans: [],
                        schedulePattern: "weekly_recurring",
                        weeklyEntries: [],
                        oneTimeDate: null,
                        oneTimeTime: null,
                        isActive: true,
                      };
                      if (active === "new-service") {
                        await createService(payload).unwrap();
                      } else if (active === "edit-service" && selectedService) {
                        await updateService({
                          id: selectedService.id,
                          data: payload,
                        }).unwrap();
                      }
                      onRefresh?.();
                      onClose();
                    } catch (err: unknown) {
                      console.error("Service save error:", err);
                      setError(
                        getRtkErrorMessage(err, "Failed to save service."),
                      );
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
                      <span className="text-xs text-muted-foreground">
                        Select
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              <Select
                value={bookingUserId}
                onChange={(e) => setBookingUserId(e.target.value)}
              >
                <option value="">Select guardian</option>
                {filteredGuardians.map((user) => (
                  <option key={user.id} value={String(user.id)}>
                    {user.name ?? user.email ?? `User #${user.id}`}
                    {user.athleteName ? ` • ${user.athleteName}` : ""}
                  </option>
                ))}
              </Select>
              <Select
                value={bookingServiceId}
                onChange={(e) => setBookingServiceId(e.target.value)}
              >
                <option value="">Service type</option>
                {services.map((service) => (
                  <option key={service.id} value={String(service.id)}>
                    {service.name}
                  </option>
                ))}
              </Select>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  type="date"
                  placeholder="Date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    placeholder="Hour"
                    value={bookingHour}
                    onChange={(e) => setBookingHour(e.target.value)}
                  />
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    placeholder="Min"
                    value={bookingMinute}
                    onChange={(e) => setBookingMinute(e.target.value)}
                  />
                </div>
              </div>
              <Select
                value={bookingStatus}
                onChange={(e) => setBookingStatus(e.target.value)}
              >
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
                    const startsAt = new Date(
                      `${bookingDate}T${pad(bookingHour)}:${pad(bookingMinute)}:00`,
                    );
                    if (Number.isNaN(startsAt.getTime())) {
                      setError("Invalid date or time.");
                      return;
                    }
                    const service = services.find(
                      (item) => String(item.id) === bookingServiceId,
                    );
                    const duration = service?.durationMinutes ?? 0;
                    if (!duration) {
                      setError("Selected service has no duration.");
                      return;
                    }
                    const endsAt = new Date(
                      startsAt.getTime() + duration * 60000,
                    );
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
                    } catch (err: unknown) {
                      setError(
                        getRtkErrorMessage(err, "Failed to create booking"),
                      );
                    }
                  }}
                  disabled={isCreatingBooking}
                >
                  Create Booking
                </Button>
              </div>
            </>
          ) : null}
          {active === "calendar" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Next 7 days
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {totalWeekBookings} booking
                    {totalWeekBookings === 1 ? "" : "s"} scheduled.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="border-border text-muted-foreground"
                >
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
                        <p className="text-sm font-semibold text-foreground">
                          {formatDay(day.date)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(day.date)}
                        </p>
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
                          const startsAt = booking.startsAt
                            ? new Date(booking.startsAt)
                            : null;
                          const statusKey = booking.status ?? "confirmed";
                          return (
                            <div
                              key={`${booking.id}-${booking.startsAt}`}
                              className="rounded-xl border border-border bg-background px-3 py-2 text-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-foreground">
                                  {startsAt
                                    ? formatTime(startsAt)
                                    : booking.time}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={
                                    STATUS_STYLES[statusKey] ??
                                    "border-border text-muted-foreground"
                                  }
                                >
                                  {STATUS_LABELS[statusKey] ?? "Scheduled"}
                                </Badge>
                              </div>
                              <p className="mt-1 text-[13px] text-foreground">
                                {BOOKING_TYPE_LABELS[booking.type] ??
                                  booking.name}
                              </p>
                              <p className="text-muted-foreground">
                                {booking.athlete}
                              </p>
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
                  No bookings found yet. Create a booking to populate the
                  calendar.
                </div>
              ) : null}
            </div>
          ) : null}
          {active === "booking-details" && selectedBooking ? (
            <>
              <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm">
                <p className="font-semibold text-foreground">
                  {selectedBooking.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedBooking.athlete} • {selectedBooking.time} •{" "}
                  {selectedBooking.type}
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
                        } catch (err: unknown) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Failed to decline booking",
                          );
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
                        } catch (err: unknown) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Failed to approve booking",
                          );
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
